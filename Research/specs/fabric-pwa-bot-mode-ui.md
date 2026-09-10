---
doc: project
updated: 2026-09-10
status: draft
---

# fabric-pwa-bot-mode-ui — OpenMausBot mobile bot-mode UI patterns → Fabric Transport PWA

**Research origin:** `rq-20260910-007` ([OpenMausBot](https://github.com/milind-soni/OpenMausBot), Apache-2.0). Human directive 2026-09-10 (Eoj): Fabric Transport is the only Allternit surface that runs like an app on a phone; port OpenMausBot's mobile bot-mode UI patterns into its bot mode + ACI, and synchronize the shared components across Allternit surfaces. Human clarified 2026-09-10: **no Clerk sign-in blocker** — the parked `botmode-0910` PWA phase is unblocked from the auth side.

Companion reads:
- [`Research/baselines/fabric-pwa-bot-mode.md`](../baselines/fabric-pwa-bot-mode.md) — what we have, gap list vs OpenMausBot
- [`Research/baselines/bot-computers.md`](../baselines/bot-computers.md) + [`Research/specs/openbot-policy-gateway.md`](openbot-policy-gateway.md) — governance layer; Phase 1 there adds verdict chips/audit to the web bot session view. The transcript components in this spec must accommodate verdict chips without duplicating that work.
- [`Research/specs/bot-identity-computer.md`](bot-identity-computer.md) — bot + persistent computer surfaces

## Goal

The Fabric Session PWA (fabrictransport.allternit.com) becomes a first-class phone surface for bot mode: a bot roster and per-bot chat with the OpenMausBot interaction grammar — caret-at-frontier streaming bubble, three-rung working states, folded tool runs, inline approval cards with a top-pinned approval pill, and a one-handed composer (predictive chips from bot routines, bottom-anchored action sheet, tap-to-talk) — built as **surface-agnostic shared components** that the web bot views (`src/views/bots/BotChatSessionView.tsx`) then adopt, so a bot chat looks and behaves the same on PWA, web, and (later) desktop. ACI on the phone switches from pushed screenshot frames to on-demand pulls. All of it engineered for touch: safe-area chrome, 44px targets, cursor-based SSE reconnect, stream teardown on backgrounding, Reduce Motion respected.

## Source link(s)

- https://github.com/milind-soni/OpenMausBot (Apache-2.0; `enterprise/` excluded — do not copy from it) — mobile bot-mode UI reference. Key files: `ios/App/ChatView.swift` (transcript, streaming, approval `CardView`), `ios/App/Island.swift` (fake-Dynamic-Island approval surface), `ios/App/Composer/*` (typing dots, predictive chips, slash HUD), `ios/App/ActivityRunChip.swift` (tool-run folding), `ios/README.md` (SSE-only state, `screens=off`, no optimistic UI)
- License basis: Apache-2.0 permits adaptation with notice + change marking; the design *ideas* (island approvals, folded runs, caret streaming, gap timestamps) carry no encumbrance. Default to clean-room TS/CSS reimplementation; if any constants (e.g. Bézier tail geometry, palette hexes) are adapted directly, carry the Apache notice.

## Affected repo / surface

- `~/Desktop/allternit-workspace/allternit` — `surfaces/ai.allternit.com/`
  - NEW `src/components/bot-chat/` — surface-agnostic transcript/composer components (used by PWA and web)
  - `src/fabric-session/` — DashboardPage gains Bots section (roster → chat); new chat page; safe-area/touch chrome; SSE discipline
  - `src/views/bots/BotChatSessionView.tsx` — adopt the shared components (sync target)
  - `src/components/dispatch/FabricSessionDriveViews.tsx` — ACI screenshot pull mode (on-demand fetch replacing/alternating push)
  - `public/fabric-session-service-worker.js` — lifecycle hooks for stream teardown/backgrounding (no push-action changes in Phase 1)
  - Docs: `docs/GIZZI_BOT_MODE_SPEC.md` PWA section + fabric-session README note

## Division / owner

- [Platform](../../Divisions/INDEX.md) — Fabric Session PWA + bot-mode surfaces

## Integrate decision

- Approach: `reverse_engineer` — port the UI **design patterns** into our own components; no OpenMausBot code, runtime, or dependency adopted (clean-room reimplementation; attribution notice only if constants are adapted)
- constraints_ok: true
- paid_or_signup: false
- docker_required: false
- baseline_ref: `Research/baselines/fabric-pwa-bot-mode.md`
- Rationale: OpenMausBot is Apache-2.0 with zero runtime cost to borrow from, but its value here is pure UX design — its runtime (Electron/SwiftUI pairing harness) has no place in our Vite/React PWA. Consistent with ComputerUse.md D3 ("we port designs, not code").
- NOT ported (explicit): the Maus mascot face system (we keep Allternit identity; the avatar/palette mechanism lands separately via `openbot-policy-gateway` Phase 2), real Dynamic Island / Live Activities (native-app concern for `surfaces/allternit-mobile/` later), and anything under OpenMausBot `enterprise/`.

## Product contract (binding)

**State discipline:** the SSE event stream is the only source of transcript truth. No optimistic UI — actions call the server; state arrives via events. (OpenMausBot's rule: "a phone that draws its own version of what just happened is a phone that disagrees with the laptop.")

**Transcript grammar (three rungs):** (1) before any content, an expandable "working" chamber showing the last ~2000 chars of reasoning; (2) a 3-dot typing indicator tinted with the bot's accent; (3) a live bubble in the settled message's exact shape with a **caret at the token frontier** — a caret says how far along it is, a spinner says "something is happening somewhere." On arrival the live bubble swaps atomically to the settled message. Scroll-follow is keyed on character count and unanimated; Reduce Motion disables the dot animation.

**Tool runs:** a single tool call renders as a quiet receipt chip (tool name, mono duration, status badge running/✓/✗, tap to expand input/output). Runs of 2+ consecutive tool calls fold into one "Running N steps ➜ / Ran N steps ✓" capsule, expandable inline. **Failures are never folded** — they break out of runs and render fully. Verdict chips from `openbot-policy-gateway` Phase 1 attach to the same rows; this spec does not reimplement policy UI.

**Approvals:** pending approvals render as (a) an inline full-width card — header "Name is waiting on you", title, one capsule button per offered option (approval = accent fill, refusal = neutral fill), a text link "Always allow this tool" whose grant key comes from the server only, and a settled grey state after answering; (b) a **top-pinned approval pill** in the PWA chrome (fake-island equivalent): collapsed pill at the top safe-area inset showing the bot + question count, expanding inline to the full option set so you can answer without scrolling; (c) a roster "Waiting on you" pill per bot.

**Composer:** sibling of the scroll view (never a safe-area inset — that leaves the composer floating mid-screen), vertically growing input (1–5 lines). Idle state shows a horizontally scrolling row of **predictive quick-action chips sourced from the bot's routines** (tap submits immediately; user-editable later, not in Phase 1). A `/` prefix opens the routines HUD (colored cards; selecting either navigates or expands into a full natural-language prompt and sends). A **+ button** rotates to × and opens a **bottom-anchored action sheet** (never a centered modal): attach / new thread / watch computer / share transcript / **Interrupt** (red, only while busy). **Tap-to-talk** dictation via Web Speech API: tap starts, partial transcripts replace against a frozen draft, tap stops and leaves text editable. Return sends; tapping the transcript dismisses the keyboard.

**ACI on phone:** screenshots are **pulled on demand, never pushed** while the PWA is on a metered/background context — replace the always-on SSE frame stream in `FabricAciDrive` with an explicit "watch" toggle that fetches frames (and falls back to push only when the user holds the viewport open). SSE connections carry a `<streamId>:<seq>` reconnect cursor and are torn down on `visibilitychange`/backgrounding; the service worker + existing push subscription carry liveness instead.

**Touch/chrome (PWA-wide):** 44px minimum touch targets, `touch-action` discipline on scroll containers, safe-area-aware header/composer (`env(safe-area-inset-*)`), bottom sheets with half/full detents for all secondary surfaces, haptics via `navigator.vibrate` only on send/approval (never per token).

**Surface sync:** every transcript/composer component lives in `src/components/bot-chat/` with zero PWA imports; `src/views/bots/BotChatSessionView.tsx` adopts them in the same pass so web and PWA cannot drift. Bot accent color resolves from one shared source (palette placeholder is fine in Phase 1; the real per-bot palette arrives with `openbot-policy-gateway` Phase 2 identity work).

## Phased scope

- **Phase 1 (this handoff):** `src/components/bot-chat/` shared components (streaming bubble + caret, typing dots, working chamber, tool receipt chip + run folding, approval card, gap timestamps, composer with chips/action sheet/dictation, approval pill); PWA Bots section (roster from the unified roster API → chat page); SSE client with cursor reconnect + backgrounding teardown; ACI screenshot pull mode; touch/safe-area chrome pass on the PWA; `BotChatSessionView.tsx` adopts the shared components; verification on phone-form-factor viewport + install-to-homescreen smoke; tests for run-folding + SSE fold logic.
- **Phase 2+ (out of scope — spec separately when Phase 1 lands):** Web Push **notification actions** (approve/deny from the lock screen via the existing push worker); full ACI **operator** UI on phone (not just watch); desktop shell adoption of the shared components; group chat parity on PWA; per-bot palette/avatar parity (with `openbot-policy-gateway` Phase 2 identity); edit-and-retry version pager; slash-HUD routine editing; native iOS Live Activities (`surfaces/allternit-mobile/`).

## Gate checklist

- [ ] Client-facing copy? → bot-mode labels only — voice Register 1 (plain, direct, no hype, no guarantees)
- [ ] Money-adjacent? → no billing touch
- [ ] Deploy involved? → no production deploy; PWA is built from the same Vite tree but any Pages deploy previews first and never runs without sign-off
- [ ] Tier C? → no — UI surface over existing bot/chat/ACI APIs; no new integration, migration, or regulated data. Approvals remain server-side grants; the UI never invents permission keys

## Acceptance criteria (Phase 1)

- [ ] Shared components render a bot chat identically when mounted from the PWA route and from `BotChatSessionView.tsx` (same component files, zero PWA-specific imports in `src/components/bot-chat/`)
- [ ] Streaming: caret-at-frontier live bubble swaps atomically to the settled message; typing dots only before first content; working chamber collapses when answer tokens start; scroll-follow keyed on char count, no per-token animation
- [ ] Tool runs: 2+ consecutive calls fold to "Ran N steps ✓" with inline expand; single calls render as receipt chips with duration + status badge; a failure inside a run breaks out unfolded
- [ ] Approvals: inline card with per-option capsules (approval vs refusal tinting), "Always allow this tool" (server-provided grant key only), settled state after answer; top-pinned approval pill expands inline and is safe-area aware; roster shows "Waiting on you" pill
- [ ] Composer: 1–5 line growth, predictive chips sourced from routines, `/` routines HUD, + action sheet (bottom-anchored, Interrupt red-only-while-busy), tap-to-talk with replace-against-frozen-draft partials
- [ ] SSE: reconnect by `<streamId>:<seq>` cursor after killed connection (test); streams torn down on backgrounding; no transcript state mutations outside event fold
- [ ] ACI: `FabricAciDrive` pulls frames on demand by default; no always-on frame SSE while PWA is backgrounded
- [ ] Touch: 44px targets on all interactive chrome; safe-area insets respected on header/composer/pill; `prefers-reduced-motion` disables dot/caret animation
- [ ] PWA smoke: install-to-homeshell (display-mode standalone harness `bot-e2e-pwa.cjs` may be extended) renders the Bots section and a chat at 390×844 without horizontal overflow
- [ ] Suites pass: existing vitest/tsc; new tests for run-folding and SSE fold; no regressions in web bot views
- [ ] Docs: `docs/GIZZI_BOT_MODE_SPEC.md` PWA section updated; repo ritual (worktree, steering per `AGENTS.md`, PR + ledger attestation)

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5 (per `model_route` 2026-09-10)
- Spike/design judgment if needed: A://Fe / claude-fable-5

## /goal (Phase 1 — paste-ready)

Outcome: In `~/Desktop/allternit-workspace/allternit`, ship Phase 1 of `fabric-pwa-bot-mode-ui`: a new surface-agnostic `src/components/bot-chat/` component set (caret-at-frontier streaming bubble, three-rung working states, tool-run folding with never-folded failures, inline approval cards with per-option capsules and a server-keyed "Always allow" link, gap timestamps, and a one-handed composer with routine-sourced predictive chips, a `/` routines HUD, a bottom-anchored action sheet with Interrupt-when-busy, and tap-to-talk dictation); a Bots section in the Fabric Session PWA (`src/fabric-session/`) with roster and per-bot chat; a top-pinned, safe-area-aware approval pill; SSE discipline (cursor reconnect, backgrounding teardown, event-fold-only state); on-demand-pull ACI screenshots in `FabricAciDrive`; a touch/safe-area chrome pass; and adoption of the same components by `src/views/bots/BotChatSessionView.tsx` so PWA and web render identically.

Constraints:
- Read and follow: `Allternit Brain/Research/specs/fabric-pwa-bot-mode-ui.md` (this slug), `Research/baselines/fabric-pwa-bot-mode.md`, `docs/GIZZI_BOT_MODE_SPEC.md`, `surfaces/ai.allternit.com/src/lib/bots/BOT_AGENT_CONTRACT.md`
- Clean-room reimplementation of OpenMausBot UI patterns — no OpenMausBot code or dependency, nothing copied from its `enterprise/` directory; Apache-2.0 attribution notice only if any constants are adapted directly
- SSE event stream is the only transcript truth — no optimistic UI; state changes only inside the event fold
- Approvals render server-provided options and grant keys only — the client never invents permission keys; do not reimplement policy/verdict UI (that is `openbot-policy-gateway` Phase 1) — leave the row extension point
- Screenshots pulled on demand by default; no always-on ACI frame SSE while backgrounded; SSE reconnect carries a `<streamId>:<seq>` cursor
- All transcript/composer components in `src/components/bot-chat/` must have zero imports from `src/fabric-session/`; `BotChatSessionView.tsx` adopts them in the same PR
- Touch: 44px minimum targets, safe-area-aware chrome, `prefers-reduced-motion` respected, `navigator.vibrate` only on send/approval
- Client-facing copy in voice Register 1; no guarantee language
- No production deploy; verification via local Vite build + the standalone display-mode emulation harness (`bot-e2e-pwa.cjs`, may be extended)
- Follow workspace `AGENTS.md` ritual (worktree, steering, PR, ledger attestation)
- Brain updates as drafts only; no `confirm:true` anywhere

Acceptance:
- Shared components render identically from the PWA route and `BotChatSessionView.tsx` (zero PWA-specific imports in `src/components/bot-chat/`)
- Streaming rungs, tool-run folding (failures break out), approval card + top pill + roster pill all verified
- Composer: chips from routines, `/` HUD, action sheet with Interrupt, dictation replace-against-frozen-draft
- SSE cursor-reconnect test passes; backgrounding tears down streams; ACI pull mode default
- Touch pass: 44px targets, safe-area, reduced-motion honored; 390×844 standalone smoke renders Bots section + chat without overflow
- vitest/tsc green incl. new run-folding/SSE-fold tests; no regressions in web bot views
- `docs/GIZZI_BOT_MODE_SPEC.md` PWA section updated; PR + ledger attestation

Non-goals:
- Push notification actions (Phase 2), full ACI operator UI on phone (Phase 2), desktop shell adoption (Phase 2), group chat on PWA (Phase 2), per-bot palette/avatar identity (with openbot-policy-gateway Phase 2), edit-and-retry pager, native iOS Live Activities
- Policy engine, verdict chips, audit list (openbot-policy-gateway Phase 1 — leave only the extension point)

## Open questions

- Transcript event source for the PWA: reuse the canonical chat SSE that `BotChatSessionView.tsx` uses today, or the fabric session relay? (Recommend: reuse canonical chat SSE — one event grammar, both surfaces; the fabric relay is for machine/session pickup, not chat.)
- Approval event shape: do we already have server-sent `approval.required`-style events with option sets + grant keys, or does that land with `openbot-policy-gateway` Phase 1? If absent, Phase 1 ships the UI against a stubbed contract mirroring the final shape. (Check `src/lib/bots/` + approval status route before executing.)
- Dictation on iOS Safari: Web Speech API support is partial there — graceful degrade to keyboard-only is acceptable in Phase 1; confirm current support during execution.
- Should the PWA chat work offline-read (cached transcript from the service worker) or is online-only acceptable for Phase 1? (Recommend: online-only; offline cache is a Phase 2+ decision with real invalidation complexity.)

## Source of truth

- Spec: `Allternit Brain/Research/specs/fabric-pwa-bot-mode-ui.md`
- Workspace: `~/Desktop/allternit-workspace/allternit`
- Surface: Fabric Session PWA (fabrictransport.allternit.com) + web bot session view
- Tracking PR: (fill when opened)
