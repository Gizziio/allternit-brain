---
doc: product
updated: 2026-09-09
status: active
---

# Computer Use — Competitive Packaging Analysis

How Allternit Computer Use packaging compares to OpenAI, Anthropic, and Browser Use (the company), and the five packaging gaps to close before launch. Sources: 2026-09-08 research reports R1 (OpenAI/Anthropic packaging, URL-backed) and R2 (Browser Use, Browserbase/Stagehand, Skyvern, Vercel, Grok Bot, Gemini), read alongside [ComputerUse.md](ComputerUse.md) (audited state) and `docs/public/aci/` + `docs/public/tools/tool-belt.md` (shipped docs surface).

## 1. Packaging scorecard

Legend: **has** / **partial** / **missing** / **unknown** (unknown = not verifiable from sources).

| Packaging element | Allternit Computer Use | OpenAI | Anthropic | Browser Use (company) |
|---|---|---|---|---|
| API shape & versioning | **partial** — branded `allternit.computer` toolset, dated versions 20250124/20251124 emitted; no published migration table or deprecation policy | **has** — `computer` tool on Responses API, batched `actions[]`, published migration table + changelog + deprecations page | **has** — date-stamped tool types (`computer_20250124`→`computer_toolset_20260801`), compat matrix, old versions keep working | **partial** — SDK v3 primitives (`sessions.create`/`run`/`browsers.create`); tool-surface versioning not a thing at this layer |
| SDK(s) | **partial** — `@allternit/computer-use` TS SDK + protocol package, tested; no Python SDK | **has** — Python, Node/TS, Agents SDK (both languages) | **has** — Python, TS under `beta.*`; Bedrock/Vertex/Foundry parity | **has** — `browser-use-sdk` v3 + MIT OSS Python library |
| Docs structure | **partial** — `docs/public/aci/index.md` and `tool-belt.md` are real and accurate; no guide/quickstart/recipes/changelog/deprecations structure | **has** — guide, integration recipes (Dockerfile, handlers, prompt patterns), changelog, deprecations | **has** — one dense guide with quickstart, agent-loop explainer, diagnostic symptom→fix tables, token-overhead numbers | **has** — docs.browser-use.com, including `llms-full.txt` machine-readable full reference |
| Environment/session lifecycle API | **partial** — sandbox capabilities endpoint, VM pooling (warm fail-closed pool, min_idle/idle_ttl), microVM-per-task target; session-preservation contract undocumented | **partial** — BYO environment, but explicit "API conversation ≠ execution environment" contract, resolution/coordinate-remapping guidance; no hosted computer-use env | **has** — BYO + prebuilt Docker reference; Managed Agents hosts sessions at $0.08/session-hour | **has** — `sessions.create()`/`browsers.create()`, hosted profiles, proxies, recordings |
| Pricing/quotas | **missing** — no published pricing, quotas, or spend controls | **has** — model token rates, image input costs, hard spend limits with 429 cutoffs, spend alerts | **has** — standard tool pricing, published per-request token overheads, token-counting endpoint, public RPM/ITPM/OTPM, Rate Limits API, spend caps | **has** — $0.02/hr browsers, model cost +20%, no-expiry credits from $5, lifetime-spend-gated concurrency |
| Time-to-first-run | **missing** — requires building/running the Rust gateway + Python ACU engine locally; no one-command demo | **has** — MIT `openai-cua-sample-app`: clone → pnpm install → canned labs + replay traces | **has** — one `docker run ghcr.io/anthropics/anthropic-quickstarts:computer-use-demo-latest` → UI at :8080 | **has** — fastest in category: pip install, key, 6-line `client.run(task)` |
| Developer onboarding | **missing** — no quickstart-to-first-run path; docs assume a running platform | **has** — sample app is the onboarding vehicle | **has** — docs explicitly say "try the reference implementation before reading the rest" | **has** — free $15 OAuth credit, no card, docs-as-API |
| Branding/naming | **has** — product-scoped "Allternit Computer Use", `allternitToolType`/`computerToolVersion`, upstream legacy adapters; D2: nothing user-facing says "CUA" | **has** — CUA → Operator → ChatGPT agent layered brands | **has** — deliberately plain "computer use", API-first, never product-named | **has** — clean two-layer brand: OSS library vs Browser Use Cloud |
| Safety/eval infrastructure | **partial** — hash-bound single-use expiring grants + immutable receipts, reversible/risky/irreversible taxonomy (server-side, `aci_safety.rs`), measured conformance suites (playwright/cdp 8/8, crawler 5/5, routing 6/6), monitor hook (heuristic + VLM swap-in); nothing published, no system card | **has** — Operator System Card, trained confirmations (92% recall), monitor model (99%/90%), tiered confirmation policy, safety dashboards; **but deprecated hosted Evals platform Jun 3 2026** | **has** — RSP/ASL-2 assessment, server-side injection classifiers, published OSWorld numbers, per-model tuning benchmarks | **unknown** — session recording exists (observability), no published safety taxonomy or eval numbers in sources |
| Human-handoff UX | **partial** — handoff approve/deny endpoints, `approval.required`/`approval.resolved` SSE, unified approval status, takeover/watch mode designed but not shipped on surfaces | **has** — takeover mode + watch mode, trained confirmations | **partial** — server-side classifier steers Claude to ask for confirmation; no product handoff UX | **unknown** — not covered in sources |

## 2. Where Allternit already matches or beats the field

Verified against the 2026-09-08 audit state ([ComputerUse.md](ComputerUse.md)) and both research reports:

1. **Record → replay → teach → workflow-run loop.** Shipped and live-verified 2026-09-08 (PRs #142/#138/#161): disk-backed recordings, deterministic replay with screenshot-diff deviation pause, recording → BrowserWorkflowSpec skill compilation, and `/v1/browser-skills/run` with `{{input}}` parameterization. Neither OpenAI nor Anthropic ships anything equivalent — recording/teaching is explicitly *their* gap in our synthesis. This is the flagship differentiator.
2. **Measured conformance, honestly graded.** Per-adapter conformance suites with real numbers (playwright 8/8, cdp 8/8, crawler 5/5, routing 6/6, browser-use/desktop honestly null) — vs competitors who publish vendor-run headline benchmarks (Astra's OSWorld numbers are vendor-run). Ours is measured; we just don't publish it yet (see Gap 4).
3. **Self-hosted data residency.** Code, screenshots, and credentials stay on the customer's host (Incus/Tart microVMs, no per-action cloud meter). Anthropic is ZDR-eligible but still API-side; Browser Use Cloud and Browserbase are vendor-cloud by definition. For clients with regulated data this is a structural beat.
4. **Cryptographic approval binding.** Hash-bound, single-use, expiring grants with immutable receipts — enforcement server-side, a modified client cannot approve its own actions. OpenAI/Anthropic ship policy-tier confirmation taxonomies; ours binds approval to the SHA-256 of the exact action payload. Finer-grained than anything in the research.
5. **Warm VM pooling + fail-closed sandbox.** Landed PR #164 (min_idle/max_total/idle_ttl, boot reclamation). Caveat: Perplexity's Firecracker-per-task (~150ms start) still beats our cold-start story — revisit only if benchmarking demands it (locked decision D1).

## 3. The 5 packaging gaps to close before launch


### Packaging sprint shipped (2026-09-08, PRs #174/#171/#173/#177)


### Follow-ups closed + Gap 4 shipped (2026-09-09, PRs #186/#187/#185)
- RECORDINGS ROUTES (follow-up from #173): gateway now serves GET /v1/computer-use/recordings/{id} (detail {manifest,steps,gif_url} per the surface client's TS contract), /file (verbatim JSONL), /gif — path-traversal-safe (regex allowlist + resolved-path containment). RecordingsPanel in remote-control now has live backend. 15/15 tests. PR #186.
- SANDBOX_ENV CONSUMPTION (follow-up from #177): Python ACU execute path consumes the top-level sandbox_env credential channel — core/sandbox_env.py (validate / run-scoped os.environ context / scrub_secrets), in-memory-only RunState.sandbox_secrets, frame+log+persistence scrubbing (incl. a real replay_engine leak the canary tests caught). 15/15 + 227 gateway suite. PR #187. Known v1 tradeoff: concurrent runs share os.environ (last-writer-wins during overlap).
- GAP 4 CLOSED: docs/public/aci/safety.md — measured eval/safety system card (Operator-system-card shape), every number reproduced live 2026-09-09 (playwright 8/8, cdp 8/8 vs live Chrome, crawler 5/5, hybrid 3/3, routing 6/6, cargo aci_ 40/40); pending measurements explicit; reproduce-it-yourself commands. PR #185. Remaining honest holes: browser-use + pyautogui desktop adapters still pending measurement; monitor-model recall not yet measured.
Ledger: summaries 2026-09-09-0057-cu{18,19,20}-*.md.
- ONE-COMMAND DEMO (Docker-free): `python demo.py` in domains/computer-use/core → gateway + /demo UI (canned run, live SSE, cost pills). Matches Anthropic time-to-first-run without containers.
- COST OBSERVABILITY (not pricing): per-run token counts + est_cost_usd on receipts; GET /runs/{id}/cost + /cost/summary (success rate, avg cost/task); honest zeros; all 4 execution paths.
- DOCS SPINE: index/quickstart/guide/recipes/changelog + llms.txt (unmerged features honestly marked coming-soon).
- REPLAY AS PRODUCT SURFACE: RecordingsPanel in remote-control dashboard (grid, GIF, replay w/ deviation threshold, run-as-workflow, approve/deny banner). FOLLOW-UP: gateway recordings detail/file/GIF-serving routes don't exist yet — UI degrades gracefully; add in domains scope.
- CREDENTIAL VAULT: AES-256-GCM sealed named credentials, sandbox_env-only injection (never model context/logs), action-hash-bound, RFC 6238 TOTP. FOLLOW-UP: ACU-side sandbox_env consumption.
Ledger: summaries 2026-09-08-1400-cu{14,15,16,17}-*.md. 14 PRs merged today total.


## Clarifications from joe (2026-09-08) — sprint scope locked
- GAP 2 REFRAMED: no pricing/charging. Cost OBSERVABILITY only: per-run token counts (vision/planning/monitor) + cost-per-completed-task + success rate on run receipts — evidence for effectiveness/client reports. No billing, no quotas UI.
- GAP 1 DOCKER-FREE: joe rejects heavy Docker deps. One-command try-it via native stack (ACU runs natively on macOS): `demo` command boots gateway + UI + opens browser; sandboxed variant via one tart microVM. Match Anthropic's time-to-first-run DX pattern, not their container.
- CODE MODE (new): add code-execution as a THIRD integration mode (structured actions + workflow runner + code mode). Model writes Playwright/pyautogui → runs in pooled microVM → screenshot/stdout back. Structured path stays for hash-bound gated actions; workflow runner stays the deterministic fast-path.
- Sprint = gaps 1, 3, 5 in these shapes (skip pricing story). Research reference: Browser Use (the company) is the DX benchmark.

For each: what the best competitor does (cited) and the concrete Allternit move.

### Gap 1 — One-command / in-browser try-it experience (time-to-first-run)
- **Best competitor:** Anthropic — a single `docker run` of the prebuilt computer-use-demo image gives a Streamlit UI + noVNC desktop at :8080 ([quickstarts README](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo)). OpenAI's MIT sample app with canned labs and replay traces is the runner-up ([repo](https://github.com/openai/openai-cua-sample-app)). Browser Use's hosted Chat UI means zero install for evaluation ([docs](https://docs.browser-use.com/)).
- **Allternit move:** publish a reference deployment — `docker compose up` (Rust gateway + ACU engine + headless Chromium + web console) with two canned labs and replay-trace viewing. This is the single highest-leverage packaging item; without it we are not in the conversation.

### Gap 2 — Pricing and quotas story
- **Best competitor:** Browser Use for buyer simplicity — $0.02/hr browsers, model cost +20%, credits from $5 with no expiry, concurrency gated on lifetime spend ([pricing](https://www.browser-use.com/pricing)). Anthropic for cost *predictability* — exact per-request token overheads, a token-counting endpoint, public rate limits ([pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)). OpenAI adds hard spend caps with 429 cutoffs ([changelog](https://developers.openai.com/api/docs/changelog)).
- **Allternit move:** price in tasks/session-hours, not tokens (clients reason in outcomes). Ship: a published rate card for the client-facing service, usage metering on the gateway, and spend-cap/quota controls per client. Map to the services ladder (dev-tier self-serve → enterprise). No launch without a number a client can sign.

### Gap 3 — Docs quickstart-to-first-run path
- **Best competitor:** Anthropic's docs structure — quickstart, agent-loop explainer, environment checklist, symptom→cause→fix diagnostic tables, per-model effort settings ([computer use docs](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/computer-use-tool)); onboarding docs push "try the reference implementation before reading the rest." OpenAI's integration recipes (Dockerfile, key normalization, injection prompt patterns) are the model for the second doc layer ([recipes](https://developers.openai.com/api/docs/guides/tools-computer-use-integration)).
- **Allternit move:** restructure `docs/public/aci/` into the same spine: quickstart → guide → integration recipes → changelog/deprecations. Add coordinate/resolution mapping guidance (Retina 2x), a session-preservation contract, and click-failure diagnostic tables. Add `llms.txt` (Browser Use's docs-as-API move) — cheap and differentiating.

### Gap 4 — Published eval and safety numbers
- **Best competitor:** OpenAI — system card, trained confirmations at 92% recall, monitor model at 99% recall / 90% precision, published OSWorld/WebArena numbers ([system card](https://openai.com/index/operator-system-card/), [CUA announcement](https://openai.com/index/computer-using-agent/)). Notable: OpenAI **deprecated its hosted Evals platform** (Jun 3, 2026) — the industry is moving to self-serve/measured evals, which plays to our in-repo conformance strength.
- **Allternit move:** publish a Computer Use safety/system doc: measured conformance grades (already real — promote `adapter_grades.json` numbers), approval-grant recall once the monitor model is measured, replay traces as evidence. "Safety as product feature" is locked decision D3; it only sells if the numbers are public.

### Gap 5 — Session recording as a product surface + credential/connector story
- **Best competitor:** Browserbase — session recording/replay is credited as *the* debugging killer feature ([Kanopy](https://kanopylabs.com/blog/stagehand-vs-browserbase-vs-steel-browser-ai)). Skyvern owns the credential story — 1Password/Bitwarden/Azure Key Vault, 2FA/TOTP, human-in-the-loop on Enterprise ([pricing](https://www.skyvern.com/pricing)). Grok Bot's persistent per-agent machine + identity ([Truescho](https://truescho.com/en/blog/grok-bot-xai-ai-teammates-2026)) models "each client gets a named, persistent agent."
- **Allternit move:** we already record JSONL + GIF per run — surface a watchable replay link on every run in the UI (client-trust feature, not just debugging). Then build the credential path: short-lived proxy tokens (Perplexity pattern, already in target architecture) plus a vault integration, and named persistent agent identities per client. Auth is the industry's load-bearing failure mode (~64% OSS ceiling on auth-heavy flows) — design the human handoff + credential story as a first-class feature, per the existing open question.

## 4. What we deliberately do NOT copy

- **Browserbase's five-line metered pricing** (browsers + search + fetch + proxies + tokens) — complexity a small shop shouldn't ship.
- **OpenAI's code-execution-as-primary-mode shift** — worth supporting (sandboxed code mode is in the packaging spec) but our record→teach loop is the differentiated surface; don't re-anchor the product on it.
- **Grok Bot's subscription bundling** ($300/mo SuperGrok Heavy) — distribution model, not packaging.
- **Hosted-only positioning** — every competitor except Skyvern-Enterprise treats compliance as an afterthought; our self-hosted residency (Section 2.3) is the wedge, not a compromise.
