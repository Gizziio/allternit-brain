---
doc: infra/deploy-runbook
updated: 2026-08-27
status: active
---

# Build & deploy runbook — platform surfaces

**Status note:** Reflects this Mac's toolchain state as of 2026-07-19/20 — verify version pins before relying on them.

Websites (Cloudflare Pages) are covered in `cloudflare.md`. This doc covers the Electron desktop app and iOS app, which live in the untouched `allternit-workspace` repo (`~/Desktop/allternit-workspace/allternit`), not under the `Allternit/` brain root.

## Electron Desktop

- Lives at `.../allternit-workspace/allternit/surfaces/allternit-desktop`, inside the pnpm monorepo (root `pnpm-lock.yaml`, pinned `pnpm@10.28.0`).
- Toolchain (installed via Homebrew 2026-07-19): `node@24` (24.18.0, force-linked — node 26 fails to compile `better-sqlite3` against its V8) + `pnpm 11.15.0`.
- No cargo/rustup on this Mac, but prebuilt Rust binaries (`allternit-api`, `gizzi-code`, `allternit-voice-service`) already sit in `resources/bin/` from 2026-07-14 builds — only needed if rebuilding the Rust side.
- **`BUILD.md` is stale** — references `../allternit-platform` and cloudflared; the real platform surface is `surfaces/ai.allternit.com` (static export copied by `scripts/prepare-platform-static.cjs`).
- Full pipeline: `pnpm run build:electron` → `config:company` → `prepare:platform-static` → `prepare:office-addins` → `prepare:cua-driver` → `download:lima` → `tsc build` → `electron-builder --mac`. `prepare:cua-driver` pulls cua-driver 0.8.2 (sha-pinned) into `resources/computer-use/`; `download:lima` pins lima 2.1.2 into `resources/lima/`.

## iOS App

- Lives at `.../allternit-workspace/allternit/surfaces/allternit-mobile/ios` (SwiftUI, iOS 17, Swift 6, XcodeGen `project.yml` — no checked-in `.xcodeproj`).
- Wire protocol: the LIVE agent-sessions + agent-chat endpoints on `allternit-api` — NOT the replies-runtime contract (scaffold only). Attachments are deferred (no backend upload endpoint).
- Toolchain ceiling: this Mac's macOS 14.6 caps Xcode at 16.2 → Swift 6.0. Package pins reflect that ceiling — **check current `project.yml` before assuming these are still current**: MarkdownView pinned below 2.6.0 (which needs `@MainActor deinit`), Clerk pinned below 1.2.0 (needs tools 6.2). Bump both after any macOS/Xcode upgrade.
- Clerk production publishable key wired via `project.yml` build setting (same `pk_live` as the web `.env.production`).
- **This machine cannot rebuild the Rust backend** (`cmd/allternit-api`) — no Rust toolchain at all. The `target/debug/allternit-api` binary is a stale prebuilt artifact; confirmed its `/api/v1/models` route serves the SPA HTML shell instead of real JSON (other v1 routes work fine). Fix requires installing Rust and rebuilding, or a fresher binary.
- Local dev gateway: `127.0.0.1:8013`. Chat only round-trips with that gateway up or a paired cloud runtime.
- Brand assets root: `~/Desktop/Allternit/Allternit Assets/01_brand/` (path updated after the 2026-07-20 reorg — logos/matrix, mascot/gizzi).

Related: [[cloudflare.md]], [[stripe.md]].
