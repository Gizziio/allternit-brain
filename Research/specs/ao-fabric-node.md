---
doc: project
updated: 2026-09-09
status: draft
---

# ao-fabric-node (P3)

## Goal

P3 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md` §5): the `ao`
binary becomes a Fabric Transport node — `ao fabric pair|serve|status` —
pairable from the PWA, serving as a proxyable node so a running ao session can
be picked up from a second device while the TUI is detached. P2 landed;
engine is the P0/P1/P2 fork at `infrastructure/executor/ao-engine/`.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §5 P3, §2.3, §8
- Spike (BINDING): `Research/drafts/spike-p3-clerk-device-auth.md` (10
  decisions; corrects the prep memo: this is NOT Clerk OAuth device flow)
- Prior memo: `Research/drafts/prep-p3-fabric-protocol.md` (superseded where
  the spike disagrees — spike wins)
- Port source: `cmd/agent-daemon/src/index.ts` (446-line node, full relay
  client) + `pairing.ts` (cleanest pairing client) — TS, port line-faithfully

## Affected repo / surface

- `infrastructure/executor/ao-engine/` — new `src/ao/fabric*` modules
  (pairing, relay client, loopback shim) — additive
- `cmd/allternit-api/src/runtime_pairing.rs` — `runtimeType` enum gains
  `"ao"` (SMALL SERVER-SIDE CHANGE; spike finding — plan's "server unchanged"
  was wrong). Land as its own tiny PR first.
- Nothing in the PWA/proxy/push worker changes (additive only).

## Binding decisions (from spike, condensed)

1. Pairing = Allternit's own 3-leg Ed25519 protocol, NOT Clerk OAuth. Node
   generates keypair; proof-of-possession signs
   `allternit-runtime-pairing:{pairingId}:{challenge}`. The node NEVER holds a
   Clerk token; the approving browser holds the Clerk JWT.
2. Flow: `POST /runtime-pairings` → browser approve → poll `/exchange`
   (410/428/403/429/200) → 90-day `allternit_runtime_` token; rotation
   replaces it (15-min dual-valid grace, rotation forces reconnect).
3. Transport to engine = **loopback shim**: axum HTTP+WS on 127.0.0.1 at its
   OWN port (distinct from Desktop's 8013 — coexistence is a spike blocker to
   resolve at implementation time, default 8014), translating to the engine
   socket API (ND-JSON over UDS). In-process translation rejected (fidelity,
   three production implementations as oracle, P5/P6 want the HTTP surface).
4. Relay client = line-faithful Rust port of `cmd/agent-daemon`'s client:
   `authenticate`-first WSS handshake, `request`/chunked-response HTTP tunnel,
   `socket_*` WS tunnel with single-use socket tickets, path allow-list +
   per-path capabilities + header allow-lists, 90 s / 5 MB caps.
5. `runtimeType "ao"` added server-side (string-match enum at
   `runtime_pairing.rs:1154-1161`) — land the enum PR before node work.
6. Live sessions visible in the PWA connected-machines view come from the
   engine's workspace/agent state surfaced through the shim — no new
   aggregation service.
7. Push-worker wakeup: map relay push events to existing push fallback
   (`push.fabrictransport.allternit.com`); sleeping-machine wakeup is a
   documented limitation if unreachable.
8. Identity: one node identity per `--session ao` state dir; `ao fabric
   status` shows key fingerprint, pairing state, token expiry, relay
   connection state.

## Verify

- `ao fabric pair` against staging/live api.allternit.com: QR/URL flows,
  browser approve, token received (fresh pair is the intended test — spike
  caveat: no paired identity exists on this machine yet).
- `ao fabric serve` + PWA (`https://fabrictransport.allternit.com/`) sees the
  node with its live ao sessions listed.
- **Hard gate (plan §5):** pick up a running ao session from the PWA on a
  second device/browser profile while the TUI is detached — screenshot/typed
  proof in the pane.
- Engine test parity maintained (no new failures beyond the documented
  pre-existing classes).
- Fork-diff guardrail: ao-engine diff = additive fabric modules + wiring only.

## Done

`docs/AO_FABRIC_NODE_NOTES.md` sentinel in the P3 worktree with pair/serve
evidence, the hard-gate pickup proof, honest deferrals; server enum PR merged
first; queue event; dashboard regen.
