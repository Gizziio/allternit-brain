---
doc: ops
updated: 2026-09-08
status: active
---

# Allternit Brain — Ops Gateway

MCP gateway for Allternit LLC business operations. Lives inside `Allternit Brain/Ops/` so agents can read brain knowledge and act on it through one system. Stdio MCP server — every business-ops skill, delegated CLI agent (kimi/codex/agy), and future autonomous agent should go through this instead of touching Stripe keys, wrangler, or the brain directly.

## Tools

| Tool | Effect | Safety |
|---|---|---|
| `stripe_charges_enabled` | Read-only account status check | none needed |
| `stripe_list_recent_invoices` | Read-only invoice list | none needed |
| `stripe_send_invoice` | Wraps `send_invoice.py` | defaults to `--dry-run`; needs `confirm: true` to actually finalize/send |
| `cloudflare_list_pages_projects` | Read-only `wrangler pages project list` | none needed |
| `cloudflare_deploy_pages` | Deploys a directory to a Pages project | prints the command only unless `confirm: true`; `project` restricted to a known-projects enum |
| `brain_search` | Grep over `Allternit Brain/**/*.md` | read-only |
| `brain_read` | Read one brain doc | read-only, path-traversal-guarded to the brain root |
| `model_route` | Look up which model tier/backend to use for a task class (`model-routing.json`) | read-only; only meaningful when spawning a subagent or autonomous agent — an interactive session stays on its own model |
| `client_new_folder_skeleton` | Creates `Allternit LLC/06 Client Ops And Contracts/<Client>/` and copies business-ops-kit templates in, named per the kickoff playbook's convention | local file writes only — never touches Stripe or sends anything; those steps stay manual per the playbook |
| `brain_audit` | Run `scripts/audit-brain.js` and return the report | read-only |
| `brain_update_draft` | Submit a structured brain update. Without `confirm:true` it writes to `.incoming/` for review; with `confirm:true` it applies immediately | local file writes to `Allternit Brain/` |
| `research_ingest` | Queue a link into the research pipeline (writes a draft under `Research/.incoming/`, picked up by the next `ingest-research.js` sweep) | local file writes only; deduped, never executes anything |
| `research_approve` | Approve a named spec at the human gate (slug must be `spec_ready`); consumed by the pipeline cycle, which then executes it per config | transitions queue status `spec_ready` → `approved`; the actual execution spend is governed by `Ops/config/research-pipeline.json` caps |
| `media_audit` | Run the website media audit (`Allternit Websites/Scripts/audit-media.js`) and return the summary | read-only; writes `Allternit Websites/Scripts/media-audit.json` |
| `media_sync` | Copy approved website media outputs into site source folders | dry-run by default; needs `confirm:true` to actually copy files |

## Harness sync

`harness-sync.js` fans the ops harness out to every AI CLI tool in the teamai class — installed or not — so skills, rules, and this MCP registration live in one canonical place instead of being copied per tool. It implements the same pattern as [Tencent's teamai-cli](https://github.com/Tencent/teamai-cli) (one shared harness, pulled into every agent) without vendoring it, and uses teamai's verified per-tool conventions (`src/types.ts` toolPaths, `src/resources/mcp-format.ts`) for agents not present on this machine.

```bash
node harness-sync.js status            # per-tool coverage table
node harness-sync.js sync --dry-run    # preview what would change
node harness-sync.js sync              # apply
node harness-sync.js uninstall         # remove only harness-managed resources
```

What it distributes, and from where:

| Resource | Source of truth | Targets |
|---|---|---|
| Skills (17 ops skills) | `~/Desktop/Allternit/.claude/skills/` | `~/.claude/skills`, `~/.codex/skills`, `~/.kimi-code/skills`, `~/.grok/skills`, `~/.cursor/skills`, `~/.gizzi/skills`, `~/.config/opencode/skills`, `~/.gemini/antigravity/skills`, `~/.qwen/skills` |
| Rules (business rules, review gates) | `~/Desktop/Allternit/CLAUDE.md` | `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.kimi-code/AGENTS.md`, `~/.cursor/rules/allternit.mdc` |
| MCP registration | this server | Claude settings, Codex config.toml, Kimi mcp.json, Grok config.toml, Cursor mcp.json, Gizzi gizzi.json (`~/.config/gizzi-code/`), agy (`agy mcp add` → `~/.gemini/config/mcp_config.json`), OpenCode (`opencode mcp add` → `~/.config/opencode/opencode.jsonc`), Qwen (`qwen mcp add -s user` → `~/.qwen/settings.json`) |

Coverage by tool — installed on this machine (synced now):

| Tool | Skills | Rules | MCP | Convention confidence |
|---|---|---|---|---|
| Claude Code | ✓ | ✓ | native config JSON | teamai + verified-live |
| Codex CLI | ✓ | ✓ | TOML block | teamai + verified-live |
| Kimi Code CLI | ✓ | ✓ | native config JSON | verified-live |
| Grok CLI | ✓ | — | native CLI (`grok mcp add`) | verified-live |
| Cursor | ✓ | ✓ (`.mdc`) | native config JSON | teamai + verified-live |
| Gizzi Code | ✓ | — | native config JSON (`{type, command[]}` shape) | verified-live |
| agy | — (no skills convention) | — | native CLI (`agy mcp add`) | verified-live |
| OpenCode | ✓ | — | native CLI (`opencode mcp add`, needs `--` before command) | teamai + verified-live |
| Antigravity IDE | ✓ | — | — (MCP lives in the IDE UI, no stable file) | inferred (platform crate) |
| Qwen Code | ✓ | — | native CLI (`qwen mcp add -s user`) | teamai + verified-live |

Supported when installed (skipped until the tool appears on the machine — `sync` picks them up automatically; `syncWhenAbsent` is false for all of these):

| Tool | Skills | Rules | MCP | Convention confidence |
|---|---|---|---|---|
| CodeBuddy | `~/.codebuddy/skills` | `~/.codebuddy/CODEBUDDY.md` | `~/.codebuddy/mcp.json` (`mcpServers`) | teamai (MCP schema from teamai source, not live-tested) |
| WorkBuddy | `~/.workbuddy/skills` | — | `~/.workbuddy/mcp.json` (`mcpServers`) | teamai (same caveat) |
| OpenClaw | `~/.openclaw/skills` | `~/.openclaw/workspace/AGENTS.md` | — (no stable file) | teamai |
| Hermes | `~/.hermes/skills` | — | — (no MCP path in teamai source) | teamai |
| DeepSeek Harness | `~/.dsh/skills` | — | — (no MCP path in teamai source) | teamai |
| Qoder | `~/.qoder/skills` | — (`~/.qoder/rules` is a rules *directory*, not a single file) | `~/.qoder/settings.json` (`mcpServers`, claude-family `{type: "stdio", command, args}` shape) | teamai (MCP schema from teamai source, not live-tested) |
| aider | — | — | skipped: no skills or file-based MCP concept (teamai lists `~/.aider/skills` but aider itself has no skills mechanism) | — |

"teamai" confidence = path/schema taken from Tencent/teamai-cli source (`src/types.ts` toolPaths — their comment: "MCP paths are only set for tools whose config location has been verified" — and `src/resources/mcp-format.ts`). "verified-live" = confirmed against the real tool on this machine. Per-tool sources are recorded in each entry's `_convention` field in `harness.json`.

Guarantees:

- Each target skills dir gets a `.allternit-harness.json` manifest (skill names + content hashes). `status`, update, and `uninstall` only ever touch skills listed there — your other tools' personal skills are never affected.
- Rules are written as a marker-delimited block (`<!-- allternit-harness:start/end -->`) upserted into existing instruction files; the rest of those files is preserved, and pre-existing configs are backed up to `<file>.bak-harness` before each write.
- MCP upserts are idempotent per tool config format (JSON merge, TOML block replace, or the tool's native CLI — `grok mcp add`, `agy mcp add`, `opencode mcp add`, `qwen mcp add`). Native-CLI tools are status-checked against the config file they actually write (`configFormat: json` in `harness.json`), and matching tolerates extra keys the tool adds itself (e.g. agy's `disabled: false`).
- The registry is not limited to installed CLIs: it covers the full teamai-class agent universe. Tools absent from the machine show `installed: no` in `status` and are skipped by `sync`/`uninstall` (nothing written) unless their entry sets `syncWhenAbsent: true` — currently only Cursor (config-only install here). Install a skipped tool later and the next `sync` picks it up automatically.
- Skills supports two layouts: `dir` (default — `<name>/SKILL.md`) and `flat` (`skillsFormat: "flat"` — one `<name>.md` per skill). No current tool needs flat, but the engine supports it.

Brain stays the knowledge plane: `harness-sync` distributes skills/rules/MCP only. It does not duplicate `brain_search`, the `.incoming/` review path, or session-sync.

## Setup

```bash
cd ~/Desktop/Allternit/Allternit Brain/Ops
npm install
```

Requires: `python3` (for `stripe_send_invoice`), the Stripe key in the macOS Keychain (`security find-generic-password -s stripe-allternit -w`, fallback env var `STRIPE_KEY`), and network access to `api.stripe.com`. Cloudflare tools shell out to `npx wrangler`, which resolves an already-OAuth-authed `wrangler` — no separate credential needed on this Mac.

## Register with your agent

This MCP server should be available to whichever agent is driving. Register it in each tool you use.

### Claude Code

```bash
claude mcp add allternit-ops node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js"
claude mcp list
```

### Kimi Code CLI

Add to `~/.kimi-code/mcp.json`:

```json
{
  "mcpServers": {
    "allternit-ops": {
      "command": "node",
      "args": ["/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js"]
    }
  }
}
```

Then start a new Kimi session and run `/mcp` to confirm connection. In prompt mode, `kimi -p "/mcp"` will list the available `mcp__allternit-ops__*` tools.

### Codex CLI

```bash
codex mcp add allternit-ops -- node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js"
codex mcp list
```

## Known gap (2026-07-21)

`stripe_charges_enabled` fails with a permission error on the current `claude-setup` restricted key — it lacks the `accounts_kyc_basic_read` scope needed for `GET /v1/account`. Add that scope via the Stripe dashboard (link is in the error message) if this tool needs to work; everything else (invoices, customers) already has write access per `Allternit Brain/infra/stripe.md`.

## Brain pipeline

Scripts that keep `Allternit Brain/` in sync automatically:

- `scripts/watch-brain.js` — scans `Allternit Websites/` and `Allternit LLC/06 Client Ops And Contracts/` and writes suggested updates to `.incoming/`.
- `scripts/apply-brain-updates.js` — applies structured update files from `.incoming/` to brain docs.
- `scripts/audit-brain.js` — flags stale docs, missing frontmatter, and invalid statuses.
- `scripts/install-hooks.js` — installs `post-commit` hooks in `Allternit Websites/` and `Allternit Brain/`.
- `scripts/launchd/install.sh` — installs a nightly `audit-brain.js` launchd job.

Run the watcher and apply suggestions:

```bash
node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/watch-brain.js" --write
node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/apply-brain-updates.js" --dry-run
node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/apply-brain-updates.js"
```

Agents can submit updates through the `brain_update_draft` MCP tool; humans review the `.incoming/` files before applying.

## Website media pipeline

The website media pipeline is intentionally front-and-center so approved assets move from generation → review → site folders without manual copying:

| Step | Location | Agent trigger |
|---|---|---|
| Generate images / video prompts | `Marketing/Production/Website Assets/prompts/` | human + image-generation tooling |
| Track status | `Marketing/Production/Website Assets/tracker.md` | `parse-prompts-v2.js` |
| Approve outputs | `Marketing/Production/Website Assets/outputs/approved/<site>/...` | human review |
| Sync into sites | `Allternit Websites/Projects/<site>/source/...` | `media_sync` MCP tool |
| Audit on-disk media | `Allternit Websites/Scripts/media-audit.json` | `media_audit` MCP tool |

Run the pipeline from the shell:

```bash
# Audit what each site currently has
node "/Users/joe/Desktop/Allternit/Allternit Websites/Scripts/audit-media.js"

# Preview what approved media would be copied
node "/Users/joe/Desktop/Allternit/Marketing/Production/Website Assets/scripts/sync-to-sites.js" --dry-run

# Actually copy approved media into site folders
node "/Users/joe/Desktop/Allternit/Marketing/Production/Website Assets/scripts/sync-to-sites.js"
```

Or invoke through the MCP server via `media_audit` and `media_sync`.

## Design notes

- Money- and deploy-affecting tools mirror `send_invoice.py`'s own `--dry-run`-by-default pattern: nothing irreversible happens without an explicit `confirm: true`.
- `cloudflare_deploy_pages` only accepts project names from a fixed list (sourced from `Allternit Brain/infra/cloudflare.md`) so a typo can't push to the wrong project.
- This is intentionally a separate package from the platform's own `mcp/servers` (which turned out to be an unrelated MCP-Apps/interactive-capsules protocol library, not a tool-server scaffold) — company-ops tooling stays out of the product repo.
