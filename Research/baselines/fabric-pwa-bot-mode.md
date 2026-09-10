---
doc: project
updated: 2026-09-10
status: active
---

# Baseline: fabric-pwa-bot-mode

Source of truth for the area: Fabric Session PWA at `surfaces/ai.allternit.com/src/fabric-session/` in `~/Desktop/allternit-workspace/allternit` (live at `fabrictransport.allternit.com`), bot mode per `docs/GIZZI_BOT_MODE_SPEC.md`, ACI per `docs/public/aci/index.md`. Sibling baseline: [bot-computers.md](bot-computers.md) (governance/computer layer — this one is the **mobile UX layer**).

## What we already have

- **Fabric Session PWA**: real PWA — `display: standalone`, `portrait-primary`, service worker + push worker (`public/fabric-session-service-worker.js`), iOS meta/splash tags, QR pairing, install prompt. Source: own Vite entry (`vite.fabric-session.config.ts`) with tree at `src/fabric-session/`; whole phone UI is one `DashboardPage.tsx` (machines, operator keys, session panel, per-runtime Web Push subscribe)
- **ACI watch on the phone**: `FabricSessionPanel.tsx` can `startAci`/`streamAci` (SSE screenshot frames per session); `FabricSessionDriveViews.tsx` has `FabricAciDrive` — the PWA can *watch* ACI screenshot streams of desktop sessions (push-based frames)
- **Bot mode platform UI (web surface, not PWA)**: `src/views/bots/` — `BotHomeView`, `BotChatSessionView` (1:1 canonical chat), `GroupChatSessionView`/`GroupChatView`, `BotLaunchpadView`, `BotPickerSheet`, `BotConfigTab`, `BotInboxView`; services in `src/lib/bots/` (canonical chat, routines, unified roster, 13-code failure taxonomy)
- **Bot computer**: `BotComputerViewport.tsx` (noVNC cloud-desktop, layouts `page | pane | aci`), single-connection arbitration (`bot-computer-vnc.ts`, ACI has highest claim)
- **Push infra**: VAPID Web Push per runtime in the PWA — notifications reach the phone; no notification *actions* yet
- **Design intent**: `docs/GIZZI_BOT_MODE_SPEC.md` (bot = profile over gizzi sessions/cron/Rails peers), `docs/BOT_TEAMMATES_SPEC.md` (groups/teammates)

## Gaps (vs OpenMausBot mobile bot UX, rq-20260910-007)

- **No bot UI in the PWA at all**: `botmode-0910` proved CLI/web/desktop; the PWA phase had no bot surface to prove on. Dashboard = machines/keys/sessions only
- **Zero touch/responsive engineering**: no `@media` queries, no `touch-action`, no pointer/touch handlers, no safe-area-aware chrome (only `viewport-fit=cover` in HTML) — "mobile by default" is single-column luck, not design
- **No streaming chat presentation** on any surface: no caret-at-frontier live bubble, no three-rung (thinking chamber → typing dots → live bubble) progression, no scroll-follow keyed on character count
- **No tool-run folding**: no receipt-chip / "Ran N steps ✓" run folding; failures never get special breakout treatment because runs aren't a concept in the transcript UI
- **No approval layer for phone**: approvals exist server-side (grants/receipts, `openbot-policy-gateway` Phase 1 adds verdict chips) but there is no compact mobile approve/deny surface — no inline option capsules, no "always allow" link, no top-pinned island/pill, no notification actions
- **Screens pushed, not pulled**: ACI frames stream over SSE continuously; OpenMausBot's `screens=off` discipline (pixels fetched on demand, never pushed to cellular) is unimplemented
- **No per-bot color/identity parity** across surfaces (palette resolved identically everywhere); avatar/identity visuals are queued in `openbot-policy-gateway` Phase 2 for web — PWA not in that loop
- **No phone composer patterns**: no predictive quick-reply chips, no slash-command HUD (natural home: bot routines), no tap-to-talk dictation, no bottom-anchored action sheet, no Interrupt-when-busy affordance
- **No SSE discipline**: no reconnect-by-cursor, no stream teardown on backgrounding (hand-off to SW + push), no Reduce Motion handling

## Delta log

- 2026-09-10 — rq-20260910-007 / OpenMausBot: baseline written (first touch, full short baseline). Decision **reverse_engineer** (Apache-2.0; port UI design patterns, clean-room TS/CSS reimplementation in the PWA, sync shared components back to web bot views). Human clarified 2026-09-10: no Clerk sign-in blocker for the PWA — the parked `botmode-0910` PWA phase is unblocked from the auth side.
