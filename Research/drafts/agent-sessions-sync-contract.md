---
doc: project
updated: 2026-09-10
status: draft
---

# agent-sessions /sync contract (P5 input)

Read-only investigation 2026-09-10 (explore agent against the platform repo).
Authoritative for the platform-sync section of `Research/specs/ao-visibility-peers.md`.

## What `/api/v1/agent-sessions/sync` actually is

**Not a state pull — a live SSE event channel** over the gizzi runtime bus.
Three hops:

1. Cloud edge: `cmd/allternit-cloud-api/src/routes/agent_sessions.rs:46,184`
   → `relay_data_plane_request` (`routes/data_plane.rs:99`) — Clerk auth,
   resolve default node, WS relay.
2. Node: allternit-api :8013, `cmd/allternit-api/src/agent_session_routes.rs:1200-1296`
   (`sync_sessions`) → opens `{gizzi_base}/v1/event` on the node's gizzi-code
   daemon (`cmd/gizzi-code/src/runtime/server/routes/event.ts:29-86`).
3. Events: `session.created/updated/deleted`, `message.updated`,
   `permission.asked/replied`, `question.asked`, message part deltas
   (`agent_session_routes.rs:1101-1197`). SSE comments `: connected`,
   `: heartbeat`; KeepAlive; `id:` sequence preserved.

**Resume**: `Last-Event-ID` header ONLY (forwarded upstream, gizzi replays via
`Bus.historySince(seq)`). The `?since=` query param is passed through the
cloud relay but **ignored by the node handler** (`sync_sessions` takes no
`Query` extractor) — do not use it.

**The native-session pull is a different surface:**
`GET /api/v1/native-sessions?cwd=&harness=` (`agent_session_routes.rs:1334` →
gizzi `native-session.ts:23-36`) — a read-only local filesystem scan by
harness adapters; `pickup` snapshots a native session into a Gizzi session.
It does **not** aggregate across paired runtimes.

## Auth chain

- **Cloud edge** (`resolve_user_scoped(.., "compute")`, `auth/resolve.rs:60`):
  Clerk session JWT **or** `allternit_*` user API token with `compute` scope.
  **Device tokens (`allternit_runtime_…`) are rejected here today** — unlike
  `me_usage` which explicitly accepts them (`lib.rs:326`).
- **Node** (`cmd/allternit-api/src/auth.rs:775-1005`): accepts desktop
  bootstrap secret, setup token, internal token, cloud DP JWT,
  **`Bearer allternit_runtime_…` device token** (introspected via cloud
  `POST /api/v1/runtime-devices/verify-token`, cached 60 s, fails closed 502),
  `at-` tokens, admin/access tokens, Clerk JWT, localhost bypass.
- Node → gizzi: attaches HTTP Basic from `GIZZI_PASSWORD`/`GIZZI_USERNAME`;
  caller tokens are not forwarded.

## Caller inventory

- Web session store: `surfaces/ai.allternit.com/src/lib/agents/mode-session-store.ts:2290`
  (`CloudApiEventSource('/api/v1/agent-sessions/sync')`, manual retry).
- Native-agent API: `native-agent-api.ts:649`; transport `cloud-api.ts:132`.
- Node gateway upstream leg + gizzi daemon server (above).
- gizzi CLI `native` command (in-process, not HTTP).
- gizzi → platform device-token precedent: `allternitApi.ts:89-105,436-450`
  (task/cron sync, agent-sessions canvases).
- iOS mobile: REST only, **no /sync caller**.
- ao fabric relay: transport only (`ao/fabric/relay.rs:380-388` injects the
  device Bearer for relayed requests lacking Authorization).

## ao-side call shape (P5 recommendation)

- **Co-located node (Desktop-style, allternit-api :8013 running):**
  `GET http://127.0.0.1:8013/api/v1/agent-sessions/sync`,
  `Authorization: Bearer allternit_runtime_<device_token>`,
  `Accept: text/event-stream`, resume via `Last-Event-ID`. Works with ao's
  existing P3 pairing credentials; zero new auth code.
- **Through `https://api.allternit.com`:** blocked today — the cloud edge
  rejects device tokens. Needs a platform change (teach
  `relay_data_plane_request` to accept runtime tokens, mirroring `me_usage`)
  OR a user-scoped API token with `compute` (headless runtimes cannot mint
  these today). **Out of P5 scope; separate platform PR if wanted.**

## Flag for the plan owner

P5's premise "ao sessions reach the platform catalog" conflates two surfaces:
/sync (SSE bus of *gizzi* session events) vs native-sessions (local scan).
A pure ao node has no gizzi runtime, so ao sessions appear in the platform
catalog via the P3 relay proxy surface (`/v1/remote-control/sessions`), not
via /sync. Cross-runtime native-session discovery would be new cloud-layer
contract work — not assumed by the P5 spec.
