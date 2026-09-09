---
doc: project
updated: 2026-09-08
status: draft
---

# prep-p4-harness-port — Port map: harness-sync.js → `ao harness` (Rust)

## Summary

`ao harness sync|status|uninstall` must byte-replicate a 205-line Node CLI (`Ops/harness-sync.js`) + 395-line lib (`Ops/harness-sync/lib.js`) + 16 tiny driver files, all data-driven by `Ops/harness.json` (16 tools, not the "six" the plan doc §2.4/P4 claims). The engine is fully declarative: per-tool config (skills dir, rules file, MCP wiring) lives in `harness.json`; driver files contribute only `key`, `label`, and an `installed()` probe — their embedded config fields are dead code and one (gizzi) has drifted from the manifest. Three MCP mechanisms (JSON-file, TOML-block, CLI-invocation) and two skills formats (dir, flat) cover all 16 tools. Parity hazards are concentrated in: exact sha256 dir-hash semantics, exact marker-block text surgery, JSON 2-space-indent output, TOML args rendered as JSON, `.bak-harness` backup side effects, and `which`-based detection. No herdr engine interaction is needed — this is a pure stdlib+serde port, independent of the engine crate.

## Evidence base

- `/Users/joe/Desktop/Allternit/Allternit Brain/Products/AgentOrchestratorRuntime.md` (plan; §2.4 = harness sync, P4 = the phase)
- `/Users/joe/Desktop/Allternit/Allternit Brain/Ops/harness-sync.js` (205 lines, main CLI)
- `/Users/joe/Desktop/Allternit/Allternit Brain/Ops/harness-sync/lib.js` (395 lines, all mechanics)
- `/Users/joe/Desktop/Allternit/Allternit Brain/Ops/harness-sync/drivers/*.js` (16 files, 10–19 lines each)
- `/Users/joe/Desktop/Allternit/Allternit Brain/Ops/harness.json` (156 lines, the manifest — authoritative config)
- Live state verification on this machine: `~/.kimi-code/skills/.allternit-harness.json` (manifest shape), `~/.codex/config.toml` and `~/.grok/config.toml` (TOML block shape), `~/.cursor/rules/allternit.mdc` (frontmatter + markers), source skills dir `/Users/joe/Desktop/Allternit/.claude/skills/` (17 SKILL.md dirs), rules source `/Users/joe/Desktop/Allternit/CLAUDE.md`

## Findings

### 1. CLI surface and control flow (harness-sync.js)

- Usage: `node harness-sync.js status|sync|uninstall [--dry-run] [--tools=a,b,c]` (harness-sync.js:5-8). Default command is `status` if no non-`--` arg (line 61). Unknown command → stderr `Unknown command: …` exit 1 (lines 202-204). Missing source skills dir → stderr + exit 1 (lines 194-197).
- No other exit codes; success paths always exit 0. No machine-readable output mode — everything is a fixed-format stdout table / per-tool action log. `--dry-run` only changes action kinds to `would-*` and skips writes.
- Driver selection: `tools()` maps each driver through `manifest.tools[d.key]`, skipping tools absent from the manifest and applying the `--tools` filter (lines 65-70). **Config comes exclusively from `manifest.tools[key]`** — the `skillsDir`/`rulesFile`/`mcp` fields inside driver files are never read by the main script. Verified: gizzi driver says `~/.config/gizzi/gizzi.json`, no `commandArray` (drivers/gizzi.js:9) while the manifest says `~/.config/gizzi-code/gizzi.json` + `commandArray: true` (harness.json:55-60). Manifest wins.
- Absence semantics: `absentSkipsSync` = `!driver.installed() && !cfg.syncWhenAbsent` (line 115-117). Only `cursor` sets `syncWhenAbsent: true` (harness.json:51). In `sync`, an absent-but-syncWhenAbsent tool prints "(tool not detected on this machine — writing config anyway: syncWhenAbsent)" (line 160). In `status`, absent tools show `installed=no`, all columns `skipped` (lines 124-126).

### 2. Driver detection (`installed()`), per driver file

Each driver exports `{ key, label, installed }`. `installed()` is `exists(path) || which(bin)` in varying order. Rust port needs this table verbatim (label matters — it is the `tool` column in status output):

| key | label | installed() probe (drivers/*.js) |
|---|---|---|
| claude | Claude Code | `exists ~/.claude \|\| which claude` |
| codex | Codex CLI | `exists ~/.codex \|\| which codex` |
| kimi | Kimi Code CLI | `exists ~/.kimi-code \|\| which kimi` |
| grok | Grok CLI | `exists ~/.grok \|\| which grok` |
| cursor | Cursor | `exists ~/.cursor \|\| which cursor \|\| exists /Applications/Cursor.app` |
| gizzi | Gizzi Code | `exists ~/.gizzi \|\| which gizzi` |
| agy | agy | `which agy \|\| exists ~/.local/bin/agy` |
| opencode | OpenCode | `which opencode \|\| exists ~/.config/opencode` |
| antigravity | Antigravity IDE | `exists ~/.gemini/antigravity-cli \|\| which antigravity` |
| qwen | Qwen Code | `which qwen \|\| exists ~/.qwen` |
| codebuddy | CodeBuddy | `which codebuddy \|\| exists ~/.codebuddy` |
| workbuddy | WorkBuddy | `which workbuddy \|\| exists ~/.workbuddy` |
| openclaw | OpenClaw | `which openclaw \|\| exists ~/.openclaw` |
| hermes | Hermes | `which hermes \|\| exists ~/.hermes` |
| dsh | DeepSeek Harness | `which dsh \|\| exists ~/.dsh` |
| qoder | Qoder | `which qoder \|\| exists ~/.qoder` |

`which` is `execFileSync('which', [bin])` success/failure (lib.js:20-22) → Rust: check `PATH` walk for executable. `exists` expands a leading `~` to `$HOME` (lib.js:11-13).

### 3. Manifest schema (harness.json — must be reused unchanged)

```jsonc
{
  "version": 2,
  "source": {
    "skillsDir": "/Users/joe/Desktop/Allternit/.claude/skills",   // 17 SKILL.md dirs, verified
    "rulesFile": "/Users/joe/Desktop/Allternit/CLAUDE.md",
    "mcpServer": { "name": "allternit-ops",
                   "command": "node",
                   "args": ["/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js"] }
  },
  "tools": { "<key>": { ... } }
}
```

Per-tool cfg shape (union; all fields optional):
- `skillsDir: string|null`, `skillsFormat: "dir"|"flat"` (default `dir`; flat = one `<name>.md` per skill, engine-supported, currently unused — harness.json:151).
- `rulesFile: string|null`, `rulesFrontmatter: string|null` (multiline YAML, no fences; only cursor uses it).
- `syncWhenAbsent: bool` (only cursor).
- `mcp: null | { kind: "json", path, serversKey, entryType?, commandArray? }
          | { kind: "toml-block", path, section }
          | { kind: "cli", bin, addArgs, removeArgs|null, configPath, configFormat?: "json", section?, serversKey?, commandArray?, entryType? }`.
- `_convention`/`_notes`/`_skipped` keys are documentation only — serde must ignore them (deny_unknown_fields must NOT be set, or use `#[serde(default)]` catch-all).
- Tools with `mcp: null`: antigravity, openclaw, hermes, dsh. Tools with `rulesFile: null`: grok, gizzi, agy, opencode, antigravity, qwen, workbuddy, hermes, dsh, qoder. `skillsDir: null`: agy only.

### 4. Skills sync mechanics (lib.js:101-197)

- Source enumeration: immediate children of `skillsDir` that are directories **or symlinks** and contain `SKILL.md`, sorted by name (lib.js:77-87). Symlinks are followed for `existsSync(SKILL.md)` but copied via `copyFileSync` (follows link, copies target content) — Rust must replicate (fs::copy follows symlinks by default; canonicalization not wanted).
- Drift hash: sha256 over the walk `for each entry (sorted, recursive): update(relpath); update("\0"); update(file bytes); update("\0")` (lib.js:44-61). Sort is `localeCompare` — for ASCII names identical to byte order; non-ASCII skill names could differ (macOS locale-aware collation). Current 17 names are all ASCII → byte sort is safe today; flag if non-ASCII names ever land.
- `dir` format target = `<targetDir>/<name>/`; `flat` = `<targetDir>/<name>.md` (hash of just SKILL.md).
- Managed manifest: `<targetDir>/.allternit-harness.json`, shape `{"version":1,"syncedAt":"<ISO-8601 UTC>","skills":{<name>:<sha256 hex>}}`, written `JSON.stringify(next, null, 2) + "\n"` (lib.js:107, 148-151). Verified live at `~/.kimi-code/skills/.allternit-harness.json`.
- Action algorithm per skill: target missing → `install`; hash differs → `update` (dir: removeDir + copyDir; flat: copyFileSync overwrite) (lib.js:113-136). Then **removal pass**: for each name in *previous manifest* not in next manifest whose target still exists → `remove` with reason `no longer in source` (lib.js:138-146). Note: removal is driven by the old manifest, not by comparing source — skills never in the manifest are never touched.
- `uninstallSkills`: read manifest; remove each listed skill that exists; remove manifest itself; no manifest → single action `{kind:"nothing", detail:"no managed manifest"}` (lib.js:175-197). Uninstall does NOT remove skills that exist but aren't in the manifest.
- Status string: `N/M synced[, K missing][, J drifted]`, or `no source skills` / `not synced` (lib.js:155-173).
- Every non-dry-run file write goes through `writeText`, which first copies an existing file to `<file>.bak-harness` (lib.js:28-38). **Parity includes these backup files.** Direct `fs.writeFileSync`/`copyFileSync`/`rmSync` calls bypass backup (skill copies, manifest write).

### 5. Rules block mechanics (lib.js:199-268)

- Block text: `<!-- allternit-harness:start -->\n<rulesContent.trimEnd()>\n<!-- allternit-harness:end -->\n` (MARK_START/MARK_END, lib.js:8-9, 199-201). Verified live in `~/.kimi-code/AGENTS.md` and `~/.cursor/rules/allternit.mdc`.
- With `rulesFrontmatter` (cursor only): managed unit = `---\n<fm>\n---\n\n` + block; on update the frontmatter is considered part of the unit and replaced if it immediately precedes the marker (lib.js:203-205, 227-235). Verified in `~/.cursor/rules/allternit.mdc`.
- `upsertRulesBlock` cases (lib.js:214-241):
  1. File absent → `create`, write managed unit.
  2. Both markers found, end after start → replace slice `[unitStart, endOfEndMarker)`; if equals managed content → `unchanged`; else `update`.
  3. Otherwise → `append`: `old.replace(/\s*$/, "\n\n") + managed` (strips ALL trailing whitespace, adds exactly two newlines).
  Marker search uses `indexOf` = first occurrence; pairing requires `e > s` where `e`/`s` are first occurrences of each marker.
- `removeRulesBlock` (lib.js:243-268): no file → `nothing (no file)`; markers missing → `nothing (no harness block)`; else remove `[unitStart, endOfEndMarker)`, `trim()` the remainder; empty → `delete-file` (rm), else `update` writing `remainder + "\n"`.
- Status: `no-file` / `present` / `missing` by MARK_START inclusion only (lib.js:207-212).

### 6. MCP mechanics — three kinds (harness-sync.js:72-103 dispatch)

**json** (claude, kimi, cursor, codebuddy, workbuddy, qwen-via-cli, agy-via-cli, opencode-via-cli, qoder, gizzi):
- Entry shape: `{command, args}` (+ `type: <entryType>` if set — only qoder `stdio`; gizzi/opencode use `commandArray: true` → `{type:"local", command:[cmd, ...args]}`) (lib.js:327-345).
- Match test (status): exact `command` string equality + exact args-array equality; `type` compared only for commandArray entries (lib.js:338-353).
- Sync: if ok → `unchanged`; missing/broken → upsert `obj[serversKey][name] = entry`, write with `JSON.stringify(obj, null, 2) + "\n"` (lib.js:355-366). **This is a full-file pretty-print rewrite — key order and formatting of unrelated content are normalized; byte-parity requires the same.** Existing target files verified to be 2-space-indented JSON.
- Remove: delete `obj[serversKey][name]`; missing → `nothing (no entry)` (lib.js:368-375).

**toml-block** (codex; also grok/opencode/agy config status):
- `findTomlBlock`: regex `^\[<section>\]\s*$` multiline, block runs to the next `^\[` or EOF (lib.js:274-282). Section names contain dots (`mcp_servers.allternit-ops`) — dot is not escaped specially, and regex `.` matches the literal dot too, so it works; a section containing regex metachars other than `.` would break — none do.
- Rendered block (lib.js:284-286): `[<section>]\ncommand = "node"\nargs = <JSON.stringify(args)>\n` → `args = ["…"]` with double quotes. Verified in `~/.codex/config.toml`.
- Status: `ok` if a `command` line contains `"<command>"` AND an `args` line contains every arg substring; else `broken` if block exists, `missing` otherwise (lib.js:288-298). Substring matching is loose (grok's file has extra `enabled = true` line and still reads ok).
- Sync: ok → unchanged; missing → append `old.replace(/\s*$/, "\n\n") + blockText`; existing → replace block slice, then `.replace(/^\n/, "")` on the tail (lib.js:300-314).
- Remove: splice block out, collapse `\n{3,}` → `\n\n` (lib.js:316-325).

**cli** (grok, agy, opencode, qwen):
- Sync quirk (harness-sync.js:87-90): FIRST checks status against `configPath` — if `ok`, returns `unchanged` and never shells out. Otherwise execs `<bin> <addArgs…>` and reports `add` (detail = the command line). So for qwen/agy/opencode (configFormat json) status is `jsonMcpStatus(configPath, cfg, server.name, server)`; for grok (no configFormat) it's `tomlMcpStatus(configPath, section, server)`.
- Remove (harness-sync.js:98-101): configFormat json → `jsonMcpRemove(configPath, …)` regardless of removeArgs; else exec `<bin> <removeArgs>`; exec failure → `nothing (not registered)` (lib.js:387-394). opencode has `removeArgs: null` but configFormat json, so uninstall edits `~/.config/opencode/opencode.jsonc` directly — and since `readJson` is plain `JSON.parse`, the `.jsonc` must in practice parse as strict JSON (comments would crash the whole status/sync path — worth a live check on that file before porting).
- CLI subprocess: `execFileSync(bin, args, {stdio:"pipe"})` — no shell, inherit nothing, exceptions swallowed in remove only.

### 7. Output formats to replicate byte-for-byte

- `status`: two header lines (`Harness source: <skillsDir> (<n> skills), rules: <rulesFile>`; `MCP server: allternit-ops → node <args[0]>`), blank line, then a padded table — column widths = max content/4/6/3/5 header minimums, two-space separator, dash rule (harness-sync.js:119-148), blank line, legend line `mcp: ok = registered with correct command/args · broken = registered but stale · missing = not registered`.
- `sync`/`uninstall`: per tool `== <label> ==`, then `   skills: <describe(a)>`, `   mcp:    …`, `   rules:  …` lines; describe = `unchanged` | `nothing (<detail|n/a>)` | `<kind> [<name>] [— <detail>] [(<reason>)]` (harness-sync.js:105-113). Footer: `Dry run — no changes written. N action(s) reported.` or `Done. N action(s) reported.` / uninstall equivalents.
- `sync` also prints the two absent-tool messages (§1) and reads the rules file once up front.

### 8. What the port does NOT need

- No network, no daemon, no engine/UDS interaction — `ao harness` is a self-contained filesystem CLI inside the `ao` binary. Deps: `serde`+`serde_json`, a TOML writer only for the codex/grok block text (hand-rolled string splicing is actually required for parity — generic TOML serialization would not reproduce the exact block render/edit semantics), `sha2`, and PATH-walk + `std::process::Command` for the cli kind. No TOML parser needed: all TOML handling is line/regex splicing.
- `~` expansion is naive: leading `~` only (lib.js:11-13) — `~user` forms collapse to `$HOME + "user"`; replicate or improve deliberately.

## Implications for the phase spec

- **Single source of truth:** port `harness.json` verbatim into the repo (or read it in place from `Ops/`). Do NOT port the 16 driver config bodies — only the `key`/`label`/`installed()` table from §2 above. Add a conformance test asserting driver-file cfg fields match the manifest if the JS is kept during transition (catches the gizzi drift class of bug).
- **Module shape (suggested):** `ao-core/src/harness/` with `mod.rs` (CLI dispatch + table printing), `skills.rs` (`sync_skills/skills_status/uninstall_skills/list_skills/hash_dir/copy_dir`), `rules.rs` (`build_rules_block/upsert/remove/status` with `MARK_START`/`MARK_END` consts), `mcp_json.rs`, `mcp_toml.rs`, `mcp_cli.rs`, and a `harness.json` → `Manifest` serde type with `#[serde(default)]` on every optional field and no `deny_unknown_fields` ( `_convention` keys).
- **Action enum** mirroring JS kinds exactly: `Unchanged | Nothing{detail} | CreateDir{…} | Install{name} | Update{…} | Remove{name,reason} | Create{…} | Append{…} | DeleteFile{…} | Add{…} | Fix{…} | Would(kind)` — dry-run as a flag on the writer layer, not parallel code paths, but note JS dry-run changes the *kind string* (`would-install`), so keep kinds parameterized.
- **Byte-parity checklist** for the P4 verify gate (run JS then Rust, diff trees): synced skill dirs; `.allternit-harness.json` contents except `syncedAt`; rules files incl. cursor frontmatter unit; `settings.json`/`mcp.json` pretty-print output; `config.toml` block text; `.bak-harness` files created; stdout of all three verbs.
- **Update plan doc §2.4 / P4 verify line** ("six tools") to 16 before spec'ing — the P4 acceptance criterion "parity across all six tools" is under-specified as written.
- **Manifest `syncedAt` is wall-clock UTC ISO-8601** — exclude from byte-diff or inject a fixed clock in both implementations.
- **The `ao` binary must ship the MCP server command path** (`node …/Ops/index.js`) — confirm whether `ao harness` should keep requiring node for the MCP server itself (yes for parity; a future phase could re-implement index.js, out of P4 scope).
- Consider `ao harness doctor`-style preflight parity: JS crashes (exit 1) only when the *source skills dir* is missing; all other missing files are per-tool actions. Keep that asymmetry.

## Open questions / risks

1. **JSONC reality of opencode's config:** `~/.config/opencode/opencode.jsonc` is parsed with strict `JSON.parse` (lib.js:24-26); if that file ever contains comments/commas, the whole JS tool errors silently (`readJson` returns null → treated as missing). Rust parity means reproducing that fragility — or a deliberate decision to deviate. UNVERIFIED whether the current file is strict JSON (did not read it in this pass — read-only scope allowed it but it wasn't needed for the map; spec phase should check).
2. **Plan/manifest count mismatch:** plan §2.4 and P4 say "six tools"; the live system has 16. Which set is the P4 acceptance scope? Cheap answer: all 16 (the manifest is the contract).
3. **`localeCompare` sort in `hashDir`:** byte-order assumption holds for the current 17 ASCII skill names but is not guaranteed by JS semantics; if a non-ASCII skill name is ever added, JS and Rust hashes could diverge silently (drift detection would flag every skill as drifted). Decide: pin sort to byte order in both, or accept divergence.
4. **`which` semantics:** JS shells out to `/usr/bin/which` (lib.js:20-22), which on macOS has specific PATH and alias behavior; a Rust PATH-walk is equivalent in practice but not byte-identical in edge cases (e.g. `which` finding shell builtins/aliases — not applicable here since inputs are binary names).
5. **Backup side effects:** `.bak-harness` files accumulate forever; uninstall does not clean them. Confirm intended before porting (replicate as-is recommended — parity first).
6. **MCP server path is absolute and machine-specific** (`/Users/joe/Desktop/Allternit/...` in both harness.json and the CLI addArgs of grok/agy/opencode/qwen drivers). `ao harness` on a second machine (P2 multi-machine pilot) would sync a broken MCP command. Not P4's problem to solve, but the spec should note the manifest is not portable as-is.
7. **`rulesFrontmatter` replace heuristic:** upsert treats frontmatter as part of the managed unit only when it *immediately* precedes MARK_START (lib.js:228) — user edits to the YAML between frontmatter and marker silently orphan the frontmatter. Parity note, not a blocker.
