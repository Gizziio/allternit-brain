---
doc: product
updated: 2026-09-08
status: active
---

# Provider Routing

## What it is (one paragraph)

Provider routing gives Allternit Cloud customers fine-grained control over *which backend* serves a model request — cost-sorted, latency-sorted, pinned to specific providers, or excluded providers — with per-model overrides. It is the Hermes Agent `provider_routing` feature (sort / only / ignore / order / require_parameters / data_collection + a `models:` per-model override map, [docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/provider-routing)) re-platformed as an Allternit Cloud policy. It fills the "provider optimization" half of the division-map sentence: *Cloud adds commercial policy, credits, and provider optimization on top of OS resource scheduling* (`Divisions/CONVERGENCE.md`).

## Division / owner

- Product layer: [Allternit Platform](Platform.md) (allternit-api + SDK)
- Future native backend: [Allternit Compute](../Divisions/Compute/INDEX.md) (Fabric Runtime inference workers via AllternitOS)

## Current phase

- **v1 implemented and merged (PR #132, Gizziio/allternit-platform, 2026-09-08)** — V133 migration (`agent_cloud_routes` + `provider_route_overrides`), `provider_routing.rs` resolution/failover/pin with admin `GET`/`PUT /api/v1/gateway/provider-routing`, proxy injection with per-failover-attempt re-resolution, and a gizzi-code session pin path (`PromptInput.provider` → message metadata → `@ai-sdk/openai-compatible` injection). Verified: cargo 658 pass (9/9 routing module), gizzi 109 session tests, tsc clean, live admin API round-trip. No wire-level e2e yet — first live provider traffic in production is the confirmation.
- Deferred follow-ups: BYO-subscription keys, Ops gateway `model_route` MCP extension, Agent Hub UI pins, ACI → Hermes `config.yaml` bridge.
- Design locked 2026-09-07.

## How it works

**Orthogonal to A:// tier routing.** The existing A:// policy ([`Infra/model-routing.md`](../Infra/model-routing.md)) decides *which model* serves a task class; provider routing decides *which provider serves that model*. They compose as two axes of one policy, not two systems.

**Policy shape** (same keys as Hermes, plus scope):

```json
"provider_routing": {
  "sort": "price",
  "only": [],
  "ignore": [],
  "order": [],
  "require_parameters": false,
  "data_collection": null,
  "models": {
    "claude-fable-5.1": { "only": ["anthropic"] },
    "kimi-k2.6":        { "order": ["moonshotai", "together"], "sort": "throughput" }
  }
}
```

Per-model entries override flat values for that model only; unset keys fall through to flat defaults. Model matching is spelling-tolerant (with/without `openrouter/` prefix, dash/dot variants). **The override follows the currently-active resolved model** — model switches, fallback activation, cron jobs, and delegated subagents on another model each get their own pins.

**Execution modes** (same policy object, different backend catalogs):

1. **Passthrough (v1)** — Cloud proxies to an aggregator (OpenRouter-style) and forwards the `provider` object per request, exactly as Hermes does. Backend set = aggregator's provider catalog.
2. **Native (later)** — routing sorts internal AllternitOS Fabric Runtime capacity alongside external providers. Backend set includes Allternit's own inference workers; the policy shape does not change.

**Scope hierarchy:** org → project → workload → model. Per-model `models:` entries are the deepest pin.

## Surfaces

- **allternit-api + SDK** — the ProviderRouting policy object; enforcement point in v1.
- **Agent Hub / Agent Studio** — per-agent routing pins in the creation wizard (sibling of the existing trust & policy step).
- **ACI** — Hermes is already in the mini-apps registry; the connector renders cloud policy into `~/.hermes/config.yaml`, so routing defined in Allternit Cloud is enforced in the locally installed mini-app.
- **Code surface / gizzi-code, desktop + mobile apps** — inherit org/project defaults in v1; no new UI.
- **Ops gateway** — extend the `model_route` MCP tool to also answer "which provider serves this model under current policy."

## Commercial policy

`order`/`only` is the hook that makes a customer's own cloud subscription first-class later: pin `only: ["google"]` and requests bill to their GCP console instead of Allternit credits, or `sort: "price"` stretches Allternit credits further.

## Key open questions

- BYO-subscription routing (customer-supplied provider credentials billed to their own cloud sub) — deferred past v1; v1 is Allternit-operated routing only.
- Native-mode backend catalog format once Fabric Runtime workers join the provider set.

## Related surfaces

- [ACI](../Company/business.md) (mini-apps registry, incl. Hermes)
- [Products/INDEX.md](INDEX.md)

## Source of truth

- Engineering repo: Gizziio/allternit-platform — plan at `spec/provider-routing/plan.md`, merged to main via PR #132 (merge 9c3a8a134); ledger attestation `agent-ledger/summaries/2026-09-08-0841-11f1b5c8-kimi-provider-routing.md`
- Reference behavior: [Hermes Agent provider routing docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/provider-routing)
