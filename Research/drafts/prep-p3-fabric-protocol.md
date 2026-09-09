---
doc: project
updated: 2026-09-08
status: draft
---

# Pre-gate spike: Fabric Transport pairing / proxy / push protocol (P3 grounding)

## Summary

Fabric Transport is a fully specified, deployed protocol with three legs: (1) an Ed25519 device-code pairing flow against `api.allternit.com`, (2) an outbound WebSocket relay from the node that tunnels HTTP requests and WebSockets from the cloud to the node's loopback gateway, and (3) a Web Push (VAPID) worker for waking a human when a node needs input. ao v3 does not need to invent anything: it must reimplement the node side (pairing client + relay client + heartbeat/rotation + push notify trigger) in Rust inside the `ao` binary. The server side (cloud-api routes, push worker, PWA) stays untouched. The QR handoff is just `https://fabrictransport.allternit.com/?runtime=rt_…`.

## Evidence base

Repo root for all paths below: `$FORK = /Users/joe/Desktop/allternit-workspace/allternit-ao-allternit-runtime-fork` (the ao worktree of the allternit monorepo).

| What | Where |
|---|---|
| Server-side pairing routes (axum/Rust) | `$FORK/cmd/allternit-cloud-api/src/routes/runtime_pairing.rs` (1673 lines, read fully) |
| Server-side relay/proxy/socket-tunnel routes | `$FORK/cmd/allternit-cloud-api/src/routes/runtime_relay.rs` (1455 lines, read fully) |
| Reference node implementation (VPS daemon) | `$FORK/cmd/agent-daemon/src/index.ts` (446 lines, read fully) |
| gizzi-code pairing client (device-code flow, second impl) | `$FORK/cmd/gizzi-code/src/runtime/services/pairing/pairing.ts` (358 lines, read fully) |
| Desktop approval broker (IPC → cloud API) | `$FORK/surfaces/allternit-desktop/src/main/device-pairing-manager.ts` |
| Desktop runtime identity + relay + heartbeat | `$FORK/surfaces/allternit-desktop/src/main/auth-manager.ts` (lines 187–270 and grep context) |
| Push worker (Cloudflare Worker, Hono) | `$FORK/services/remote-control-push/src/index.ts` (493 lines, read fully) + `wrangler.toml` (host `push.fabrictransport.allternit.com`) |
| gizzi-code push-notify trigger | `$FORK/cmd/gizzi-code/src/runtime/integrations/remote-control-push.ts` |
| PWA runtime list hook | `$FORK/surfaces/ai.allternit.com/src/components/dispatch/useRuntimes.ts` |
| PWA Fabric view + QR card | `$FORK/surfaces/ai.allternit.com/src/views/FabricTransportView.tsx`, `…/components/dispatch/FabricSessionQrCard.tsx` |
| PWA URL helpers + `?runtime=` persistence | `$FORK/surfaces/ai.allternit.com/src/lib/fabric-session-pwa.ts`, `…/lib/runtime-target.ts` |
| Operator SDK (proxy client, SSE, WebPush) | `$FORK/sdk/allternit-sdk/src/ai-runtime/runtime/index.ts` (lines 80–499 read) |
| fabrictransport.allternit.com API proxy Worker | `$FORK/infrastructure/fabrictransport-api-proxy/index.js`, `wrangler.toml` (`fabrictransport.allternit.com/api/*`) |

Deployed surfaces named in code: `https://api.allternit.com` (`ALLTERNIT_CLOUD_API_URL` default, `agent-daemon/src/index.ts:8`), `https://fabrictransport.allternit.com` (PWA origin, `fabric-session-pwa.ts:8`), `https://push.fabrictransport.allternit.com` (`fabric-session-client.ts:59`, `wrangler.toml:8`).

## Findings

### 1. Pairing protocol (device-code flow, OAuth-device-style)

Server: `runtime_pairing.rs`. Node client reference: `pairing.ts` + `agent-daemon/src/index.ts:68-146`. Wire contract (pinned verbatim in the comment at `pairing.ts:10-22`):

1. **Create** — `POST /api/v1/runtime-pairings` (no auth), body `{ name, runtimeType, hostname?, platform?, version?, publicKey, capabilities[], …bootstrap fields }`.
   - `runtimeType` must be one of `desktop | vps | hosted | provisioned | ios` (`runtime_pairing.rs:1154-1161`).
   - `publicKey`: base64url-no-pad of the raw 32-byte Ed25519 public key (`decode_public_key`, `runtime_pairing.rs:1195-1205`).
   - `capabilities` restricted to the fixed list; `runtime:connect` is mandatory (`DEFAULT_CAPABILITIES`, `runtime_pairing.rs:39-47`, `normalized_capabilities` 1166-1193).
   - Response **201**: `{ pairingId, deviceCode, userCode, challenge, verificationUrl, expiresAt, pollIntervalSeconds: 2 }` (`CreatePairingResponse`, `runtime_pairing.rs:83-93`; TTL 10 min, `PAIRING_TTL_MINUTES`, line 29).
   - `userCode` format `XXXX-XXXX` from Crockford-safe alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (`generate_user_code`, lines 1363-1372; normalization accepts any alphanumerics, `normalize_user_code` 1349-1361).
   - `verificationUrl` = `{ALLTERNIT_PLATFORM_URL}/pair?code={userCode}` (lines 331-337).
2. **Approve** — human in browser (Clerk session JWT) or an already-paired desktop (its device token acts as the approver, `approver_from_headers` lines 1056-1082):
   - `GET /api/v1/runtime-pairings/code/:code` → pairing info (desktop polls this to display the request, `device-pairing-manager.ts:89-96`).
   - `POST /api/v1/runtime-pairings/code/:code/approve` `{ email?, name?, imageUrl? }` → `{ status: "approved", pairingId, runtimeName, desktopCallbackUrl: "allternit://pairing/complete?pairing_id=…" }` (lines 364-454).
   - `POST …/code/:code/deny` (lines 456-474).
   - Server-side self-approval lanes for `hosted` / `vps`+`byo_bootstrap_token` / `provisioned` bypass the browser via one-time bootstrap tokens (lines 242-266, 1223-1347).
3. **Exchange (poll)** — `POST /api/v1/runtime-pairings/exchange` `{ pairingId, deviceCode, signature }`, unauthenticated; the pairing row is looked up by `pairing_id` + `sha256(deviceCode)`:
   - signature = base64url-no-pad Ed25519 over `"allternit-runtime-pairing:{pairingId}:{challenge}"` (`pairing_signature_message`, line 1207-1209; verified at `verify_pairing_signature` 1128-1146).
   - Status codes: **428** `authorization_pending` (poll again), **410** `expired_token`, **403** `access_denied`, **429** with `retry_after` (rate-limited poll), **200** success (`exchange_pairing` 491-716; client handling `pairing.ts:258-279`).
   - Success body (`RuntimeSessionResponse`, lines 111-122): `{ runtimeId: "rt_<uuid32>", userId, userEmail, organizationId?, deviceToken: "allternit_runtime_<48 random bytes b64url>", tokenType: "Bearer", expiresAt, capabilities[] }`. Credential TTL **90 days** (`CREDENTIAL_TTL_DAYS`, line 30); token prefix constant `DEVICE_TOKEN_PREFIX` line 38.
4. **Persist identity locally, mode 0600** — gizzi-code: `<data>/runtime-device.json` (`pairing.ts:105-107`, atomic write 119-129); agent-daemon: `~/.config/allternit/runtime-identity.json` (`agent-daemon/src/index.ts:10-11`); desktop: `app.getPath('userData')/auth/runtime-identity.json` (`auth-manager.ts:197`). Keypair is reused across re-pairs; only the token rotates (`pairing.ts:24-26`).

### 2. Device credential lifecycle

- **Heartbeat** — `POST /api/v1/runtime-devices/:id/heartbeat`, `Authorization: Bearer allternit_runtime_…` (route at `runtime_pairing.rs:209-212`; impl 791-809). Server flips `status='online'`, `last_seen_at=now`. Reference cadence: 30 s (`agent-daemon HEARTBEAT_INTERVAL_MS`, index.ts:12). List view shows `offline` when `last_seen_at` is older than 10 min (lines 739-747); the PWA tolerates up to 10 min between heartbeats without flapping (`useRuntimes.ts:86`).
- **Rotation** — `POST /api/v1/runtime-devices/:id/rotate` (auth: current device token) → `{ runtimeId, deviceToken, tokenType, expiresAt }` (lines 811-855). Server keeps the replaced hash in `previous_credential_hash` valid for **15 min** grace (`ROTATION_GRACE_MINUTES`, line 35) so a second component holding the old token self-heals. Clients rotate early: agent-daemon within 7 days of expiry (`ROTATION_SKEW_MS`, index.ts:13), gizzi-code within 30 days (`ROTATE_WITHIN_DAYS`, `pairing.ts:46`); both best-effort, old token kept on failure.
- **Revocation** — `DELETE /api/v1/runtime-devices/:id` (owner-scoped, Clerk or API key) and `POST …/revoke-self` (device token) (lines 767-789, 857-872). Heartbeat 401/403 ⇒ treat as revoked (`agent-daemon/src/index.ts:221-224`).
- **Introspection** — `POST /api/v1/runtime-devices/verify-token` (public; possession of a valid token is the credential) → `{ runtimeId, userId, name, status, email }` (lines 1015-1033). The push worker uses this to validate device-token-authed `/notify` calls (`remote-control-push/src/index.ts:132-152`).
- **Desktop-as-approver**: a paired desktop's device token authorizes approving *new* pairings for the same owner (`approver_from_headers` 1050-1082; desktop IPC `device-pairing-manager.ts:89-121`). ao on the same machine could piggyback on this by reading an existing identity file, but see Open questions.

### 3. Relay / proxy protocol (the "serve as proxyable node" leg)

Server: `runtime_relay.rs`. Reference node client: `agent-daemon/src/index.ts:239-423` (the desktop's `auth-manager.ts` contains a second, Electron-flavored copy: `relaySocket`, `relayLocalSockets`, `connectRuntimeRelay` at lines 192-195, 269).

**Connection**: node opens `wss://api.allternit.com/api/v1/runtime-relay/connect/{runtimeId}` (route at `runtime_relay.rs:293`; client index.ts:241-243). **First frame within 10 s must be** `{"type":"authenticate","runtime_id":"rt_…","device_token":"allternit_runtime_…"}` (`runtime_socket` 618-633). Server validates token + id match, registers an in-memory `RuntimeConnection` in a global hub, stamps `runtime_devices.relay_connected_at`, and replies `{"type":"authenticated","runtime_id":"…"}` (lines 659-691). Server pings every 25 s; node answers `{"type":"pong"}` (lines 693, 766-769; client index.ts:267-268). On drop: hub removal, `relay_connected_at=NULL`, all tunneled sockets closed with code 1012 (lines 773-795). Client reconnects with exponential backoff 1 s → 30 s (index.ts:271-278).

**HTTP tunnel over the socket** — cloud→node `{"type":"request","request_id","method","path","headers":{…},"body","body_encoding":"utf8"|"base64"}` (`CloudMessage::Request`, lines 135-165). Node forwards to its **loopback gateway** `http://127.0.0.1:8013{path}` (default `ALLTERNIT_GATEWAY_URL`, index.ts:14, 314), injecting `Authorization: Bearer <deviceToken>` (if the envelope didn't carry the caller's Clerk JWT), `X-Allternit-Desktop-Access-Token`, `X-Allternit-User-Id`, `X-Allternit-User-Email`, `X-Allternit-Tenant-Id` (index.ts:298-308). Response streamed back as `response_start {request_id,status,headers}` → N×`response_chunk {request_id,body(base64),body_encoding:"base64"}` → `response_end` (index.ts:320-341; server handling 705-726). Legacy single-frame `response` is still accepted (729-736). Server response timeout 90 s (`RELAY_TIMEOUT`, line 77; 340 s for the video-generate path, 893-897).

**Browser entry point**: `POST /api/v1/runtime-devices/:id/proxy` (Clerk or API-key authed, owner-scoped) with body `{ method, path, headers?, body?, body_encoding? }` (`BrowserProxyRequest`, lines 167-178; handler 798-822). Enforced before relaying (`relay_request_to_runtime`, 841-952):
- path allow-list prefixes: `/api /viz /sandbox /vm-session /rails /stream /terminal /mcp /platform /metrics /alabs /cowork /webhooks /ws /panes /status /health /v1` (`is_allowed_runtime_path`, 1039-1069) plus sanity checks (no `..`, no `://`, no `//`); body ≤ 5 MB (line 78).
- capability check per path (`required_capability`, 1071-1105): health/status/metrics → `runtime:connect`; provider paths → `providers:use|providers:connect`; terminal/pty/panes → `runtime:terminal`; files/workspace → `runtime:files`; `remote-control` → `runtime:remote_control`; everything else → `runtime:execute`.
- request header allow-list forwarded: `authorization, accept, content-type, if-none-match, if-modified-since, last-event-id, x-request-id` (`filtered_headers`, 1107-1127); response header allow-list: `content-type, cache-control, content-disposition, etag, last-modified, x-request-id` (994-1009).
- wake-on-demand: if the device maps to a stopped hosted instance, the cloud starts the container and polls up to 30 s for the relay to reconnect; otherwise 503 `runtime_warming` (with `retryAfterSeconds`) or 503 `runtime_offline` / 504 `runtime_timeout` (lines 232-284, 877-891).

**WebSocket tunnel** — cloud→node: `socket_open {socket_id,path,headers}` / `socket_data {socket_id,body,body_encoding}` / `socket_close {socket_id,code,reason}`; node dials `ws://127.0.0.1:8013{path}` and answers `socket_ready`, then relays frames both ways (module doc-comment lines 16-47; node `handleRelaySocketOpen` index.ts:359-407). Browser side cannot set `Authorization`, so it first mints a single-use ticket: `POST /api/v1/runtime-devices/:id/socket-ticket` `{path}` (Clerk-authed) → `{ticket, expiresInSeconds: 30}`, then `GET /api/v1/runtime-devices/:id/socket?ticket=…` upgrades (`issue_socket_ticket` 319-386, `connect_browser_socket` 472-485). The browser receives a sentinel text frame `{"type":"allternit_socket_ready"}` when the node's local dial completes (`runtime_frame_to_browser_message`, 511-522).

### 4. Push worker leg (wake-up fallback)

`services/remote-control-push/src/index.ts`, Hono on Cloudflare Workers, KV `REMOTE_CONTROL_PUSH_KV`, VAPID keys from env.

- `GET /vapid-public-key` (line 284) — PWA uses it for `pushManager.subscribe`.
- `POST /subscribe` — Clerk JWT + ownership check against `GET /api/v1/runtime-devices`; stores `{runtimeId, endpoint, keys:{p256dh,auth}, label}` at KV key `sub:{runtimeId}:{sha256(endpoint)[:32]}`, TTL 90 days (lines 292-327).
- `POST /unsubscribe {runtimeId, endpoint}` (329-338); `GET /subscriptions?endpoint=` (Clerk) (340-386).
- `POST /notify {runtimeId, title?, body?, tag?, sessionId?, type?}` — auth is either `NOTIFY_SECRET` (cloud-api → worker) **or the node's own device token** (worker verifies via `/verify-token` introspection; payload `runtimeId` must match the token's runtime, lines 388-429). Rate limit 30/min/runtime. Payload types: `permission | question | completed | error`. Sends Web Push + stores `pending:{endpointHash}` for 300 s (447-475).
- `GET /pending?endpoint=` — PWA polls this (5-min fallback) when the push itself is missed (477-489).
- Who calls it: the runtime's gateway, on permission/question/idle events — gizzi-code `remote-control-push.ts:83-133` subscribes to `PermissionNext.Event.Asked` (and question/completed events below line 90) and POSTs `/notify` with `ALLTERNIT_REMOTE_CONTROL_NOTIFY_SECRET` or its device token. CORS allow-list includes `https://fabrictransport.allternit.com`, `ai.allternit.com`, `platform.allternit.com`, localhost (lines 42-58).

### 5. QR / PWA handoff (session pickup)

- QR content = `fabricSessionPwaUrl(runtimeId)` = `https://fabrictransport.allternit.com/?runtime=rt_…` (`fabric-session-pwa.ts:12-16`; rendered by `FabricSessionQrCard.tsx:35` with `react-qr-code`, 168 px, level M).
- PWA (separate Vite build, `vite.fabric-session.config.ts`, service worker `public/fabric-session-service-worker.js`) reads `?runtime=` and persists it to `localStorage["allternit.active-runtime-id"]` if it matches `/^rt_[A-Za-z0-9_-]+$/` (`runtime-target.ts:31-43`, test `runtime-target.test.ts:10-15`). It is a **root-level PWA on its own hostname**; `ai.allternit.com/fabric-session/` is a same-origin alias only (`fabric-session-pwa.ts:1-8`).
- `fabrictransport.allternit.com/api/*` is fronted by the `fabrictransport-api-proxy` Worker which forwards to `api.allternit.com` so the PWA is same-origin with the API (`infrastructure/fabrictransport-api-proxy/index.js:1-6`, wrangler route).
- The PWA drives sessions through the SDK `FabricSessionClient`: when base URL is the cloud and a `runtimeId` is set, every call becomes `POST {base}/api/v1/runtime-devices/{runtimeId}/proxy` with `{method, path:"/api/v1/…", headers, body, body_encoding:"utf8"}` (`sdk/…/runtime/index.ts:167-202`); SSE event streams use one proxied HTTP GET with `Accept: text/event-stream`, explicitly **not** EventSource and not the socket-ticket path (`proxySse`, 393-428). Session surface on the node: `/api/v1/fabric/leases`, `/api/v1/session-worker/invoke` with capabilities `harness.session*` (listSessions/getSession/sendMessage/abortSession/createSession, permissions/questions list+reply — 250-391).
- The Desktop today shows this QR from the embedded platform `FabricTransportView` (`FabricTransportView.tsx:251`), with `runtimeId` coming from `window.allternit.auth.getSession().runtimeId` (lines 181-192), i.e. the desktop process's own paired identity (`auth-manager.ts:197,257-258`).
- Machine list in the PWA = `GET /api/v1/runtime-devices` (Clerk bearer), 10 s poll, merged with the local desktop runtime (`useRuntimes.ts:116-186`).

### 6. What "ao as a Fabric node" must implement (synthesis)

An `ao fabric` node is functionally the agent-daemon rewritten in Rust inside the `ao` binary:

1. Pairing client: Ed25519 keygen (persist keypair + token in an ao state dir, 0600), `runtime-pairings` create → show `userCode` + `verificationUrl` → poll exchange (2 s interval, honor 429 `retry_after`, handle 410/403) → store identity.
2. Lifecycle loop: heartbeat every 30 s; rotate when within 7 days of expiry; treat 401/403 as revoked.
3. Relay client: `wss://api.allternit.com/api/v1/runtime-relay/connect/{runtimeId}`, authenticate frame first, respond to `request` by forwarding to ao's own loopback HTTP surface (the engine socket API would need an HTTP shim, or ao exposes its own gateway on 127.0.0.1), stream `response_start/chunk/end`; answer `ping` with `pong`; reconnect backoff 1→30 s.
4. Socket tunnel: dial local WS per `socket_open`, answer `socket_ready`, relay frames with utf8/base64 encoding.
5. Push trigger: POST `/notify` to the push worker with device token on blocked/approval events (the P5 "who needs you" panel and P3 wakeups share this trigger).
6. `ao fabric serve` = item 2+3+4 running; `ao fabric pair` = item 1; `ao fabric status` = local identity + last heartbeat + relay connection state.

## Implications for the phase spec

- **Reuse, don't rebuild**: server side (`runtime_pairing.rs`, `runtime_relay.rs`, push worker, PWA) is unchanged per plan §6. P3 spec scope = a Rust node client crate (suggest `src/ao/fabric/` in the engine crate per §7's additive-module policy) implementing §6 items 1-5.
- **Pin the wire shapes as serde structs + round-trip tests**: `runtime_relay.rs:1204-1278` already pins the socket-tunnel envelopes in server tests; ao should carry the same golden JSON fixtures client-side so drift fails loudly on both sides.
- **Capability ask**: ao should request the same 7 capabilities as gizzi-code/agent-daemon (list in `pairing.ts:48-56`); `runtime:execute` + the `/api` prefix allow-list already covers any `/api/v1/…` the ao engine exposes — no server change needed for ao session endpoints.
- **runtimeType**: use `"desktop"` if ao replaces the desktop's pairing (kind=LOCAL per `runtime_device_kind`, `runtime_pairing.rs:481-489`) or `"vps"` for headless boxes; note `"ao"` is **not** in the allowed enum (line 1154-1161) — adding it is a server-side change, so prefer an existing value.
- **Local gateway seam**: the relay speaks HTTP/WS to `127.0.0.1:8013`. ao must either (a) expose its engine socket API over loopback HTTP, or (b) implement the relay message handlers in-process and translate directly to engine socket-API calls. (b) avoids standing up an HTTP server but duplicates the agent-daemon's proxy logic; (a) matches the existing contract exactly and lets the golden wire fixtures be reused verbatim.
- **QR**: `ao fabric pair` output / TUI panel can render the same URL shape `https://fabrictransport.allternit.com/?runtime={rt id}` (helpers in `fabric-session-pwa.ts:12-16`); no new PWA work.
- **Identity sharing decision needed before coding**: gizzi-code, agent-daemon, and Desktop each keep a *separate* identity file; the 15-min rotation grace exists precisely because two components share one device (`runtime_pairing.rs:31-35`). Decide whether ao gets its own runtime-device row (own keypair, cleanest) or shares the Desktop's identity file (fewer devices in the PWA list, but couples lifecycles).
- **Push notify trigger**: ao's blocked-agent detection (P5) should POST `/notify` with its device token (fallback path already supported, `remote-control-push/src/index.ts:394-405`) — no `NOTIFY_SECRET` needed for a node.

## Open questions / risks

1. **UNVERIFIED — live API behavior**: all findings are from source in the `allternit-ao-allternit-runtime-fork` worktree; I did not call the deployed `api.allternit.com` endpoints (read-only rules + auth requirements). The pairing/exchange shapes are triple-corroborated (Rust server, two TS clients, and server-side serde tests), so confidence is high, but a live `curl` smoke of `GET /api/v1/runtime-pairings/code/XXXX-XXXX` (expect 401/404 without auth) is cheap pre-spec validation.
2. **Loopback surface mismatch**: agent-daemon/desktop relay to an HTTP+WS gateway on `127.0.0.1:8013` (gizzi-code's allternit-api). The ao engine's native surface is ND-JSON over a unix socket (plan §2.2). The P3 spec must decide the seam (in-process translation vs. an ao loopback HTTP shim) — this is the single biggest design fork and affects P1's socket-API work.
3. **Device identity multiplicity**: if ao, gizzi-code, and Desktop each pair as separate runtime devices, the PWA machine list fragments and the user hits the active-device quota (`check_active_device_cap`, `runtime_pairing.rs:559-563`); sharing one identity file works but couples token rotation across processes (the 15-min grace covers races, not long outages).
4. **Approval UX on a headless box**: the human approves via browser at `platform.allternit.com/pair?code=…` (Clerk). For ao on a remote Linux host there is no desktop approver; the browser flow is the only path unless a bootstrap-token lane is reused (BYO wizard mints those, `byo_bootstrap_tokens`, lines 1296-1347 — minting requires the wizard, so ao should document the browser-approval flow as canonical).
5. **Rate limits and quotas on the poll loop**: exchange polling is rate-limited (429 + `retry_after`, handled at `pairing.ts:267-271`); ao must implement the same backoff or a fast reconnect loop will hard-fail pairing.
6. **Relay reconnection semantics**: one `RuntimeConnection` per runtime id in the hub — a second concurrent relay connection from the same device evicts nothing until the first drops, but messages route to the *latest* registered connection; ao must ensure single-relay-instance semantics inside its own process (mirror agent-daemon's `if (relay) return` guard, `index.ts:240`).
