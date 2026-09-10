---
doc: project
updated: 2026-09-09
status: draft
---

# ao-harness-port (P4)

## Goal

P4 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md` §5): port
`Allternit Brain/Ops/harness-sync.js` + `Ops/harness-sync/lib.js` (600 lines of
Node) into the `ao` binary as `ao harness sync|status|uninstall` with
**byte-parity** against the JS implementation. The JS harness sync is the
operating contract that keeps 16 agent CLIs (kimi, claude, codex, grok, cursor,
gizzi, agy, opencode, antigravity, qwen, codebuddy, workbuddy, openclaw,
hermes, dsh, qoder) wired to Allternit skills, rules, and the
allternit-ops MCP server. P3 (fabric node) must land first.

Note the corrected scope: the plan doc §2.4/P4 says "six tools" — the live
manifest `Ops/harness.json` covers **16 tools** and is the contract. Acceptance
scope = all 16.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §5 P4, §2.4
- Port map (binding): `Research/drafts/prep-p4-harness-port.md` — every
  mechanic below is documented there with file:line evidence; where this spec
  and the memo disagree, the memo wins (update this spec)
- JS sources: `Ops/harness-sync.js` (205 lines), `Ops/harness-sync/lib.js`
  (395 lines), `Ops/harness-sync/drivers/*.js` (16 files)
- Manifest: `Ops/harness.json` (156 lines, authoritative config)
- Spike: `Research/drafts/spike-p3-clerk-device-auth.md` (P3; not this phase)

## Affected repo / surface

- Repo: `Gizziio/allternit-platform` (checkout `~/Desktop/allternit-workspace/allternit`)
- New module: `ao-core/src/harness/` — `mod.rs` (CLI dispatch + table
  printing), `skills.rs`, `rules.rs`, `mcp_json.rs`, `mcp_toml.rs`,
  `mcp_cli.rs`; `ao harness` subcommand wiring in the P1 CLI surface
- The manifest ships in the repo (copied verbatim from `Ops/harness.json`) —
  do NOT port the 16 driver config bodies; only the `key`/`label`/`installed()`
  table
- NO engine/UDS interaction; NO network; pure stdlib + serde + sha2. The MCP
  server itself stays a node process (`node …/Ops/index.js`) — `ao harness`
  keeps requiring node for that, by design

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

fork_reskin (continues queue `rq-20260908-028`; same fork as P0–P3).

## Binding decisions (from memo, condensed)

1. **Manifest is the single source of truth.** Driver-file `skillsDir`/`rulesFile`/`mcp` fields are dead code (gizzi has drifted — proof); config comes only from `manifest.tools[key]`. Port the manifest verbatim; port only `key`/`label`/`installed()` from drivers.
2. **Detection table verbatim** — 16 entries per memo §2 (`exists ~/.x || which bin` in the stated order; cursor also `/Applications/Cursor.app`; agy also `~/.local/bin/agy`). `which` = PATH walk for executable; `exists` = naive leading-`~` → `$HOME` expansion.
3. **Manifest serde**: every optional field `#[serde(default)]`; NO `deny_unknown_fields` (`_convention`/`_notes`/`_skipped` keys must parse).
4. **Skills mechanics**: enumerate dirs-or-symlinks containing `SKILL.md`, byte-order sort (memo risk 3: pin byte order; current 17 names are ASCII so it matches JS `localeCompare` today — note in code). Drift hash = sha256 over sorted-recursive walk `relpath\0bytes\0` per entry. Managed manifest `<targetDir>/.allternit-harness.json` = `JSON.stringify(next, null, 2) + "\n"`. Actions: install/update/remove(no-longer-in-source, driven by previous manifest)/nothing. Uninstall removes only manifest-listed skills. `syncedAt` is wall-clock UTC ISO-8601 — excluded from byte-diff or fixed-clock injected in both.
5. **Rules mechanics**: marker block `<!-- allternit-harness:start -->\n<content.trimEnd()>\n<!-- allternit-harness:end -->\n`; first-occurrence marker search; replace `[unitStart, endOfEndMarker)`; append = strip ALL trailing whitespace + exactly `\n\n`; cursor frontmatter unit (`---\n<fm>\n---\n\n`) replaced only when it immediately precedes MARK_START; remove = splice + `trim()` remainder, empty → delete file, else write `remainder + "\n"`.
6. **MCP kinds, three**:
   - `json`: full-file pretty-print rewrite `JSON.stringify(obj, null, 2) + "\n"` (unrelated key order normalized — parity requires this); match = exact command string + exact args array (`type` only for commandArray entries, only qoder `stdio`; gizzi/opencode use `{type:"local", command:[cmd,...args]}`).
   - `toml-block`: regex `^\[<section>\]\s*$` multiline, block to next `^\[` or EOF; rendered block `[<section>]\ncommand = "node"\nargs = <JSON args array>\n`; status = command-line substring + every-args-line substring; sync append = trailing-whitespace strip + `\n\n` + block; remove = splice + collapse `\n{3,}` → `\n\n`. All TOML handling is line/regex splicing — hand-rolled, no TOML crate.
   - `cli`: sync FIRST checks status against configPath — `ok` → unchanged, never shells out; else exec `<bin> <addArgs>` (no shell, stdio pipe). Remove: configFormat json → direct file edit regardless of removeArgs; else exec `<bin> <removeArgs>`, exec failure → `nothing (not registered)`.
7. **`.bak-harness` side effects are parity**: every `writeText` copies an existing file to `<file>.bak-harness` first; direct fs writes (skill copies, manifest write) bypass. Uninstall does not clean backups — replicate.
8. **Output byte-parity**: status padded table (widths = max content or header minimums, two-space separator, dash rule), the two header lines + legend line; sync/uninstall per-tool `== <label> ==` blocks with `describe()` action strings, footer `Done. N action(s) reported.` / `Dry run — no changes written. N action(s) reported.`; absent-tool `syncWhenAbsent` message (cursor only); dry-run renames kinds to `would-*`.
9. **CLI surface parity**: `ao harness [status|sync|uninstall] [--dry-run] [--tools=a,b,c]`; default command status; unknown command → stderr + exit 1; missing source skills dir → stderr + exit 1; all other missing files are per-tool actions, not errors.
10. **opencode.jsonc verified strict JSON** (checked 2026-09-09) — port `readJson` as strict parse; the JS fragility (comments silently null the file) is reproduced deliberately, noted in code.
11. **JS stays until Rust proves parity** — retirement is a separate, later decision after the byte-diff gate passes on a real sync.

## Work items

1. `ao-core/src/harness/` module skeleton + manifest serde type + verbatim manifest copy.
2. Detection table + `which`/`exists` helpers.
3. `skills.rs` — enumerate/hash/manifest/actions/uninstall.
4. `rules.rs` — block build/upsert/remove/status.
5. `mcp_json.rs`, `mcp_toml.rs`, `mcp_cli.rs`.
6. `mod.rs` — CLI dispatch, status table, describe(), footers; `ao harness` clap wiring.
7. Conformance test: driver-file cfg fields match manifest (catches the gizzi-drift class).
8. Byte-parity harness: run JS then Rust against fixture HOME trees (mktemp), diff — skill dirs, `.allternit-harness.json` minus `syncedAt`, rules files incl. cursor frontmatter unit, pretty-printed JSON configs, TOML block text, `.bak-harness` files, stdout of all three verbs × dry-run × --tools filter.
9. Update plan doc §2.4/P4 "six tools" → 16 (this spec's note).

## Verify

- `cargo test -p herdr` green (excluding the two documented pre-existing flake classes: SIGPIPE harness death, detect:: parallel flakes — classify honestly).
- Byte-parity gate: fixtures covering install/update/remove/drift/unchanged across all three MCP kinds + dir/flat skills + cursor frontmatter + absent-tool + dry-run + uninstall — JS tree vs Rust tree diff clean (excluding `syncedAt`), stdout byte-identical.
- Live smoke: `ao harness status` on this Mac matches `node harness-sync.js status` output byte-for-byte.
- Parity across **all 16 tools** in the manifest (not six).

## Done

`docs/AO_HARNESS_PORT_NOTES.md` sentinel in the P4 worktree with byte-diff
evidence and honest deferrals; PR merged; queue history event on
`rq-20260908-028`; dashboard regen; ledger attestation.
