---
doc: surface
updated: 2026-08-31
status: draft
---

# Brain Viewer (local)

A complete local, read-only UI over the Allternit Brain vault. Inspired by an X Knowledge Base shot Joe liked (AI-generated, 2026-08-31). Steal the feel. Do not clone the fake SaaS.

## Decision

Joe: build it if it is worth it and not half-scope. Ops judgment: **yes**, as a local vault viewer only. Not a public site. Not Notion. Cloud Agents were unavailable on the current plan (2026-08-31), so implementation waits on a PR in `Gizziio/allternit-brain` rather than a pretty empty shell.

## What a user sees / does here

Operator (Joe) opens a local app that looks like a polished knowledge base:

- Header: Allternit Brain wordmark, search, optional notification slot (real stale/dashboard counts only), no fake `+` editor (or `+` that only points at `Templates/` / Obsidian)
- Left rail: Home, vault, tags, dashboard
- Folder tree with recursive markdown counts: Company, Divisions, Products, Surfaces, Infra, Clients, Real World, Strategy, Projects, Templates, Ops, Dashboard
- Folder cards for the selected tree (3D-style colored folders, file counts, no Drive/Notion/Slack chips)
- File table: title (H1), path, `updated` / git mtime, frontmatter `status`
- Markdown reader for the selected doc, with in-vault link navigation
- ⌘K search over title, path, and body
- Tags from frontmatter `doc` / `status` (and `#tags` if present)
- Light / dark toggle, persisted

Home defaults to Dashboard (Now, Decisions, Stale, Campaigns, Ships) plus `INDEX.md` and `BRAIN.md`.

## What it is not

- Not public. No Cloudflare Pages, no `docs.allternit.com`, no custom domain. Brain has client and infra knowledge.
- Not a second editor. Obsidian and agents remain the writers. This surface is browse + search + read.
- Not a mock with placeholder people, dates, or integrations.

## Product it belongs to

Allternit Brain (operator vault), not the Allternit Platform / ACI product. Visual language may later inform ACI; this surface does not become ACI.

## URL / repo / deploy target

- Repo: `https://github.com/Gizziio/allternit-brain` (app lives in `viewer/` or `ui/` so it does not clutter vault markdown)
- Run: `make viewer` from Brain root (localhost only)
- Deploy: **none**
- Mock reference: `Surfaces/brain-viewer-mock.png` (the X shot)

## Success criteria (full scope)

1. `make viewer` starts a local UI.
2. Tree, folder cards, and file table reflect the live vault, not fixtures.
3. Opening `BRAIN.md`, `Dashboard/Now.md`, and a nested doc renders readable markdown.
4. Search finds a known string from `BRAIN.md`.
5. Dark mode toggles and persists.
6. No Drive/Notion/Slack logos. No placeholder employees.
7. Ships as a PR. Do not merge or go live without Joe's go-ahead.

## Assets and copy status

- Images: mock saved as `Surfaces/brain-viewer-mock.png`
- Copy: Allternit Brain (not the mock's generic “Knowledge Base”)
- Generated media prompts: none

## Known gaps

- Cloud Agents not available on the current Cursor plan (blocked 2026-08-31). Implementation is waiting; this spec is the contract.
- Brand tokens live in `Allternit Assets/Docs/design-tokens.md` (outside this repo). If unread at build time, use black / white / graphite plus one purple accent.

## Related brain docs

- [Surfaces](INDEX.md)
- [BRAIN.md](../BRAIN.md)
- [Products](../Products/INDEX.md)
- [Dashboard/Now](../Dashboard/Now.md)
