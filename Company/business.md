---
doc: business
updated: 2026-07-21
status: draft — reflects source docs as of 2026-07-20/21; review before agents rely on it
---

# What Allternit is

Allternit is registered as **Allternit LLC** (Minnesota, NAICS 541511 — Custom Computer Programming Services; **EIN 42-3788518**, issued 2026-07-24). It operates under the master brand **Allternit** and is building toward a larger structure: **Allternit, PBC** (Delaware) as parent — confirmed per Eoj 2026-07-24: the PBC is the parent, and when formed the MN LLC becomes its subsidiary with IP assigned up — with **Allternit Labs, Inc.** as a manufacturing/robotics subsidiary. Today, Allternit LLC is the live, invoicing entity. Corporate site: allternit.com. Contact: hello@ / sales@ / support@ / legal@allternit.com.

**Positioning line (phone/voicemail script, verbatim):** "We help businesses put AI to work through IT consulting, agentic systems, and hands-on implementation."

**Longer positioning (from workspace strategy docs):** "What if Claude Cowork and Codex lived on your machine, talked through open protocols, and never sent your data anywhere?" — sovereignty and privacy are the differentiator, not just capability.

## How Allternit makes money — two tiers that both count as "sellable today" (per Eoj, 2026-07-20)

**1. Services (the near-term, currently-invoicing revenue engine).** Custom Computer Programming Services per the LLC's own NAICS registration: hourly consulting ($85/hr list, seen at $60/hr on early engagements), fixed-fee project work, and 38 productized services across websites, content, data/ops, marketing automation, IT support, and admin — see `offer.md`. This is what's actually been quoted, contracted, and invoiced (first engagement: Swyft Market, SOW-2026-001 — a ~$1.5K fixed-scope project, completing; a normal client, not a strategic pillar).

**2. Platform / Build / Run / Retrofit / Husks (the tangible service lines Allternit stands behind publicly today, per its own phone script and website).**
- **Build** — custom RAG, workflow automation, agentic systems.
- **Retrofit** — upgrade existing equipment/operations with AI.
- **Run** — ongoing support/monitoring (tiers: Basic, Pro, Fleet — corrected 2026-07-25: there is no "Compute" tier; it never existed on the site or in Stripe).
- **Husks** — robotic work cells (current naming per the Revised doc: Eye, Hand, Pack, Guide, Rover, Builder — corrected 2026-07-25: "Booster T1" appears in no product doc; the GTM's Audit/Vision/Tend naming vs the Revised Eye/Hand naming is a known reconciliation item in the outline's decisions queue).

Husks and the wider Forge compute line are early-stage relative to the roadmap docs (pilots are Q4 2026+ per internal planning), but Eoj's call is to present them as part of the current offer, not defer them to a "someday" roadmap doc — so agents drafting quotes or proposals should treat Build/Retrofit/Run/Husks as real, askable-about service lines, scoped and priced case-by-case (not off the fixed-price catalog), same as any Tier C "audit first" catalog item.

## The long-term structure (context, not yet formed)

Allternit's target corporate architecture (direction confirmed per Eoj 2026-07-24; timing of all formation steps is tentative, not fixed):
- **Allternit, PBC** (Delaware) — **confirmed parent**; owns platform IP, models, brand, public-benefit mission. When formed, the MN LLC becomes its subsidiary and IP is assigned up to it (counsel mechanics pending).
- **Allternit Labs, Inc.** (Delaware C-corp subsidiary of the PBC) — manufacturing, compute, robotics; intended SBA 7(a) borrower.
- International subs (UK/Ireland) — later, only when there's nexus.

None of the new entities are formed yet — Allternit LLC (Minnesota) is the only entity that currently exists. Treat PBC/Labs as direction, not fact, in anything client-facing (contracts, W-9s, invoices all currently say "Allternit LLC"). The full layer-by-layer build-out, including the L6 infrastructure roadmap and the humanoid blueprint program, lives in `Allternit LLC/ALLTERNIT_FULL_STACK_BUSINESS_OUTLINE.md`.

## Brand architecture (for docs, marketing, naming — not for contracts)

- **Allternit** — master brand / parent.
- Customer-facing service brands: **Allternit Homes** (consumers/families), **Allternit Works** (SMBs/enterprise), **Allternit Care**, **Allternit Money**, **Allternit Learn**, **Allternit Guard**, **Allternit Build**.
- Platform layer: the **Allternit platform** (the product that exists today). **Current state, per Eoj 2026-07-26 + screen recording 2026-07-26 (authoritative):** the desktop app's top-level modes are **Home, Code, and ACI**, with a left rail of **Agent Hub, Projects, Artifacts Library, Automation Tasks, Dispatch (Beta), Customize**, plus **Allternit Design (Beta)** as a separate design app. What each contains, as observed:
  - **Agent Hub / Agent Studio** — build agents with identity, skills, and guardrails: full creation wizard (identity, sub-agent parent, character with personality sliders, runtime, harness, surfaces, trust & policy, tools & skills, avatar), agent types Orchestrator/Sub-Agent/Worker/Specialist/Reviewer, templates (Coding Agent, Research Analyst, Creative Partner, Team Orchestrator), deploy to chat/code/cowork/design.
  - **Code mode** — coding sessions with a usage dashboard (sessions, tokens, streaks, heatmap), workspace-folder gating, edit-approval controls, console, and a pluggable engine selector (Claude Code shown).
  - **Dispatch** — chat + computer-use: works with local files, browses Chrome, uses connectors; dispatch tasks/code sessions from the mobile app.
  - **Automation Tasks** — Goals, Routines, Loops, and Agent Heartbeats (persistent schedules synced with the scheduler).
  - **ACI (Allternit Computer Interface)** — the apps-and-extensions surface: Mini-apps Store (public registry — OpenClaw, Hermes, Oh My Pi, Activepieces, n8n, LobeChat, AnythingLLM), Office & Extensions (Allternit for Word/Excel/PowerPoint v1.0.0, Allternit Computer Agent browser extension), connectors & marketplace (Gizzi Code connector catalog, skills, plugins), A://Labs learning portal.
  - **Allternit Design (Beta)** — prompt-to-prototype/wireframe/slides/documents/animations with design systems and templates.
  - **Models:** embedded local model (Qwen 3.5 4B shown) via Ollama + "Local Brain" offline option, cloud providers connectable. **Engine (per Eoj): agent workspace + gizzi-code on the allternit-api runtime + SDK.**
  ⚠️ The repo's `docs/` tree is partially archived from reorganizations (including the L0–L6 layered model and the gap audits) — do NOT treat repo docs as living truth; Eoj's word + observed app state overrides them. **Kernel** (execution engine), **Protocol** (the `A://` glyph). **Allternit OS** is the planned future, not the current product: as LLMs move directly onto chips, an operating system layer becomes necessary — the platform evolves into the OS in that era (per Eoj, 2026-07-26). (No "Studio"/"Console" products — aspirational naming-doc labels, removed.)
- Model family: **Allternit Minds** — Hydrogen (fast/edge), Carbon (balanced), Iron (deep reasoning), Boson (creative), Hadron (guardrails/security). Elemental/alchemical mythology (Fechon/Anon/Chemit triad) underlies the brand story — see `voice.md` for when this register is appropriate.
- Agent persona: **Gizzi** (Gizzi Home, Gizzi Work, Gizzi Care, Gizzi Money, Gizzi Learn, Gizzi Guard, Gizzi Build).

This naming has evolved more than once in the source docs — treat the naming/scope doc's 2026-06-30 note as authoritative for current names; older `A://Fast/Balanced/Heavy/Creative` or `A://H/C/Fe/Boson/Hadron` competitor-tier naming (used internally for model routing, see the AI-native plan's Phase 5) is a parallel, engineering-facing scheme and does not need to match the customer-facing brand names above.

## What makes Allternit different (the moat, per its own strategy docs)

Not the agentic harness itself — that's commoditizing. The moat is being the **operating system layer**: private customer data and workflows, a real tooling/plugin ecosystem tied to enterprise systems, governance/receipts/auditability for multi-agent work, local/edge deployment (data never leaves the customer's box), and eventually proprietary distilled models tuned on Allternit's own workflows. "Your data never leaves the box" is the recurring privacy pitch across both the software and home-services lines.

## Beliefs / operating principles (extracted from the catalog and playbook — these are hard rules, not aspirations)

- Never promise a production result from an untested single AI prompt.
- Every regulated, consequential, or factual claim gets client verification and human approval before it ships.
- Audit first, quote after — for anything integrations/migrations/production-automation/regulated-data shaped (catalog Tier C). Never quote blind.
- New scope always goes through a change order — never absorbed silently into an existing SOW.
- Software platform execution comes first; don't let Labs/Husks ambition distract from finishing the platform and serving live clients.
- **Identity anchor (per Eoj, 2026-07-24):** Allternit is a **platform that has services — not a services company.** The long-term goal is to compete with real AI companies: own and operate the leading AI infrastructure stack — manufacturing, compute, inference, energy, resources, robotics, systems, data centers (PBC/Labs/Forge/Husks direction). The four GTM lanes (SaaS implementer, fractional AI executive, heavy-doc back office, niche compliance/certification prep) are **ancillary**: they make money today, fund the platform, and feed it evidence, workflow data, integration muscle, and customer relationships. Any lane that competes with the platform for priority gets cut, not the platform. Detail lives in `Allternit LLC/04 Go To Market And Marketing/ALLTERNIT_SEVEN_HUSTLE_REVENUE_MAP.md`. Lane operating method: the moat is expertise + process + authority with AI doing the heavy work — rebuild boring expert businesses with AI rather than selling "AI" itself. Regulated lanes sell prep/readiness only — never attestation — with a credentialed partner where the niche demands it. Lane 4 niche selection is mandate-driven: prefer compliance niches backed by a live legal mandate with a deadline (forced demand), tracked in the sourced mandate register — BUILT 2026-07-25 at `Allternit LLC/04 Go To Market And Marketing/ALLTERNIT_MANDATE_RADAR.md` (lead candidate: FSMA 204 Traceability Prep, vertical-synergistic with F&B packaging/Husks; volume play: tax-preparer WISP; local wedge: MN employer-compliance bundle). Third filter: the boring moat — lack of competition is itself a moat, so prefer unglamorous niches (recordkeeping, inspection docs, industry logs) with few or no specialized providers. A niche must pass all three: evidence (3+ repeat questions), mandate (deadline), boring (no specialists). Non-dilutive money is part of the setup: federal loans/SBIR-STTR/contracting set-asides and MN programs (Launch MN, MN R&D credit — partially refundable since 2025, MJSP, Dual Training, TG/ED/VO preferences) are cataloged with eligibility gates and sequencing in the outline's §3.7–§3.8; LLC tax classification DECIDED 2026-07-24: S-corp election filed with the EIN application; **effective date CONFIRMED 2026-07-09** — payroll can start immediately (Intuit setup in progress; CPA sanity-checks the first run + reasonable-salary documentation). Owner attributes ANSWERED 2026-07-24 (per Eoj): not a veteran; male; African American; formerly incarcerated (federal, fraud conviction involving PPP loans — an SBA program), currently on supervised release → **8(a) DEPRIORITIZED until after supervision ends** (near-term approval unlikely during SBA's 2026 fraud crackdown; revisit with a clean documented track record); before ANY SBA-touching filing, check SAM.gov exclusions (personal + entity) and CAIVRS/restitution status via counsel; absolute rule: full disclosure on every government form. Qualifies for MN TGB, CERT MBE, EELP, Launch MN priority; rules out VetCert and WOSB. Address facts (per Eoj 2026-07-24): 2688 Rice St (Little Canada) is an iPostal VIRTUAL address for marketing credibility only — never on government filings; the true operating address is the home at 3646 Penn Ave N, Minneapolis 55412 — tract 27053100800 — which IS a HUBZone qualified census tract (effective 2022-12-30) AND inside the Promise Act North Minneapolis eligible area (Promise Act viable via the home-based path, which requires the §280A home-office deduction on the last return).

Related: [[offer.md]], [[customer.md]], [[voice.md]].
