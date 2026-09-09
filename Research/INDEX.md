---
doc: index
updated: 2026-09-08
status: active
---

# Research — External R&D Watchlist

Bookmarks harvested from Safari (2026-09-08), categorized by where they feed. One line each: what it is → why it's here. This is a watchlist, not an endorsement — nothing here is vetted or integrated unless a linked doc says so.

## Pipeline

Links don't just sit here — they flow: drop a link in [`.incoming/links.md`](.incoming/links.md) (or via the `research_ingest` MCP tool) → the [`/research-pipeline`](../../.claude/skills/research-pipeline/SKILL.md) skill ingests it into [`queue.json`](queue.json), researches it, and specs feature candidates in [`specs/`](specs/) → a human approves the spec → an orchestrated coding executor lands the PR and does the repo ritual. Hard gate: no executor is ever spawned without explicit approval of the named spec. State lives in `queue.json`; the human's gate view is the [Dashboard](Dashboard.md) (regenerated every sweep). Runs on demand (`/research-pipeline`) and on a daily scheduled sweep (Phases A–D only — it always stops at the gate).

## Agent tooling & platform R&D

Inputs to the Allternit platform, ACI/Hermes, gizzi-code, and the agent-orchestrator skill.

| Link | What it is → why |
|---|---|
| [Bezalel](https://bezalel.sh) | Hosted MCP giving agents memory/email/money/computer/connectors → feature checklist for what agents expect from a platform |
| [bb](https://getbb.app) | Self-customizing agentic IDE (works with Claude Code, Codex, OpenCode) → UI reference for the agent workspace |
| [botmaker](https://github.com/techjanitor/botmaker) | Hermes Agent skill that mints/certified specialist sub-bots → bot-factory pattern for ACI + Hermes |
| [memanto](https://github.com/moorcheh-ai/memanto) | Memory layer for AI agents → agent-memory R&D for the workspace |
| [utopia](https://github.com/deeplethe/utopia) | Open-source bitemporal enterprise knowledge graph + RAG + agent harness (Rust+Postgres) → reference for the knowledge/memory layer |
| [iii](https://github.com/iii-hq/iii) | Real-time service composition engine (Rust, Elastic License 2.0) → reference for the service/fleet layer |
| [switch](https://github.com/sandbox-quantum/switch) | Open-source agent→Slack/Teams/Discord bridge → platform integration candidate / Agent Hub channel |
| [open-agent-view](https://github.com/xhluca/open-agent-view) | Claude's Agent View, open-source, works for any harness → session-observability reference |
| [sentrux](https://github.com/sentrux/sentrux) | Rust architectural sensor for agent code-quality feedback loops → self-improvement research |
| [headroom](https://github.com/headroomlabs-ai/headroom) | Local token compressor for coding agents (proxy/MCP/lib) → context-cost R&D, pairs with context-mode |
| [context-mode](https://github.com/mksglu/context-mode) | Context-window optimization, sandboxes tool output (98% reduction) → context-cost R&D |
| [uisight](https://github.com/sololabstr/uisight) | MCP server that measures UIs (contrast, touch targets, overflow) as text → QA tool for site work |
| [agent-browser](https://github.com/vercel-labs/agent-browser) | Browser automation CLI for agents → alternative/complement to browser-act (already in-tree) |
| [show-me skill](https://github.com/humanlayer/skills/blob/main/skills/show-me/SKILL.md) | Renders diagrams from code for agents → utility skill, vendor candidate |
| [refactoring-ui-skill](https://github.com/s0xDk/refactoring-ui-skill) | Refactoring UI design rules as a Claude Code skill → vendor candidate for site/UI work |
| [gstack](https://github.com/garrytan/gstack) | Garry Tan's 23-tool Claude Code setup (CEO/EM/QA roles) → reference for agent-orchestrator tool roster |
| [Assembly Instructions Are a Programming Language](https://www.tnkr.ai/blog/assembly-instructions-are-a-programming-language) | Essay on agent-computing → reading, thesis behind agent-needs-a-computer |
| [Claude Managed Agents](https://claude.com/blog/claude-managed-agents) | Anthropic's managed agent product → competitive reference for Agent Hub |

## Provider & routing research

Feeds [Products/ProviderRouting.md](../Products/ProviderRouting.md) and [Infra/model-routing.md](../Infra/model-routing.md).

| Link | What it is → why |
|---|---|
| [Z.ai API Platform (GLM-5.3)](https://z.ai) | Zhipu model API → provider-routing backend candidate |
| [Parallel — Responses API web research](https://parallel.ai/blog/parallel-web-research) | Web-research API product → provider research |
| [Hermes Agent — Browser Automation](https://hermes-agent.nousresearch.com/docs/user-guide/features/browser-automation) | Hermes' built-in browser feature → ACI mini-app reference |

## Local ML & hardware

Feeds [Divisions/Compute](../Divisions/Compute/INDEX.md) (Fabric Runtime, AllternitOS) and division sourcing.

| Link | What it is → why |
|---|---|
| [FreeToken](https://github.com/FlashML-org/FreeToken) | Datacenter-scale model serving on a desktop → local-serving R&D |
| [local-ai-registry](https://github.com/0xSero/local-ai-registry) | Registry of local models × hardware × speeds × prices (Apple Silicon + RTX/AMD) → pairs with Fabric Runtime capacity planning |
| [VoiceStudio](https://voicestudio.local) | Local voice AI studio → compute + marketing voiceover |
| [Open-Generative-AI](https://github.com/Anil-matcha/Open-Generative-AI) | Self-hosted studio, 600+ image/video models, MIT → compute + GTM content |
| [LIQING™50 Duo M.2 (后摩智能/Houmo)](https://www.houmoai.com) | Compute-in-memory storage → on-chip angle ties to Allternit OS research |
| [FS.com](https://www.fs.com) | Datacenter/networking hardware supplier → Compute/Manufacturing procurement reference |

## Marketing & content

Feeds `Allternit LLC/04 Go To Market And Marketing/` and the Marketing media pipeline.

| Link | What it is → why |
|---|---|
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | Auto AI short-video generator → content pipeline |
| [claude-ads](https://github.com/AgriciDaniel/claude-ads) | Paid-media ops skill across 12 ad platforms → GTM ops |
| [notfair-plugin](https://github.com/nowork-studio/notfair-plugin) | SEO/GEO/marketing skills for agents → GTM ops |
| [herdr-lantern](https://github.com/aigorahub/herdr-lantern) | Herdr plugin surfacing "who needs you" → overlaps the lead-intake-agent skill → **watch** (`rq-20260908-005`, UX patterns only) |
| [herdr v0.9.0](https://github.com/herdrdev/herdr/releases/tag/v0.9.0) | Multi-machine SSH agent management + pane state detection, Apache-2.0 local binary → **thin_adapter** under ao (`rq-20260908-028`, spec `Research/specs/herdr-v090-adapter.md`) |
| [ComfyUI-Ref2VA-VSA](https://github.com/Kablex/ComfyUI-Ref2VA-VSA) | ComfyUI reference-to-video node → media pipeline |
| [cinematique](https://vvsvs.pro/cinematique) | 150+ copy-ready cinematic prompts for AI video → media prompt library |
| [open-media (Shot Composer)](https://github.com/Anujatk1999/open-media) | Browser 3D shot previsualizer exporting AI-video prompts → media pipeline |
| [camera-to-blender](https://github.com/ahujasid/camera-to-blender) | Photo real objects → Blender meshes → Manufacturing/3D content |
| [ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | ffmpeg as an agent skill → vendor candidate next to gpt-image-2-style-library |

## Surfaces

| Link | What it is → why |
|---|---|
| [dayring-for-kids.vercel.app](https://dayring-for-kids.vercel.app) | Eoj's note: **recreate this setup for the division sites** → Surfaces project; belongs in site planning for the division pages |

## DevOps & ops-tooling

Agent-ops and machine-ops tooling that runs the Allternit working environment.

| Link | What it is → why |
|---|---|
| [Overwatch (grokbot.dev)](https://grokbot.dev) | Grok Bot recipe that keeps a shared VM clean and backed up → ops recipe for long-running agent boxes |
| [Gipp: 24/7 Repo Ops Desk on Grok Bot + Kimi K3](https://x.com/gippofficial/status/…) | X guide on unattended repo-ops desk → feeds the agent-orchestrator setup |
| [codenotch](https://github.com/vinzdg/codenotch) | macOS menu-bar app pinning Claude/Cursor/Codex/Antigravity usage limits → local quota visibility |
| [linux cdc_ncm Apple USB-C quirk (a5148bc)](https://github.com/torvalds/linux/commit/a5148bc) | Kernel patch: Mac USB-C direct networking → hardware quirk note for dev machines |
| [App-Store-Connect-CLI](https://github.com/rorkai/App-Store-Connect-CLI) | Scriptable App Store Connect CLI → note in [Infra/deploy-runbook.md](../Infra/deploy-runbook.md) (iOS pipeline) |

## Already integrated (no action)

- [awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2) — vendored at `Marketing/Templates/image-prompts/gpt-image-2-style-library/`
- [browser-act](https://github.com/browser-act/skills) — installed as the `browser-act` skill in `.kimi-code/skills/`

## Deliberately excluded

- **instagram-private-graph** — OSINT scraping of undocumented Instagram endpoints (ban risk). Personal tool, not an Allternit offering; not filed here.
- **DesignCode Three.js/Fable course** — personal learning, not company R&D.
