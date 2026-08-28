---
doc: index
updated: 2026-08-28
status: active
---

# Allternit Brain — Daily Entry

Welcome. This is the agent-readable operating system for Allternit LLC.

## Start here

- [AGENTS.md](AGENTS.md) — how agents work in this vault.
- [BRAIN.md](BRAIN.md) — full operator's manual and source-of-truth pointers.

## Dashboards (auto-generated)

- [Dashboard/Now.md](Dashboard/Now.md) — active work this week
- [Dashboard/Decisions.md](Dashboard/Decisions.md) — open and resolved decisions
- [Dashboard/Stale.md](Dashboard/Stale.md) — docs needing refresh
- [Dashboard/Campaigns.md](Dashboard/Campaigns.md) — pending marketing campaigns
- [Dashboard/Ships.md](Dashboard/Ships.md) — recent deploys and releases

## Knowledge tree

- [Company/](Company/) — identity, offer, customer, voice
- [Divisions/](Divisions/) — Compute, Manufacturing, Robotics, Spaces
- [Products/](Products/) — Platform, Desktop, SDK, Gizzi Code, OS
- [Surfaces/](Surfaces/) — websites, apps, docs, installers
- [Infra/](Infra/) — Cloudflare, Stripe, deploy, monitoring
- [Clients/](Clients/) — hot client state
- [Real World/](Real%20World/) — pointers to `Allternit LLC/` records
- [Strategy/](Strategy/) — long-form planning pointers
- [Projects/](Projects/) — active engineering projects
- [Templates/](Templates/) — doc templates

## Run the pipeline

```bash
cd "/Users/joe/Desktop/Allternit/Allternit Brain"
make brain-pipeline
```

## Add knowledge

Pick a template from [Templates/](Templates/), copy it to the right folder, fill it in, link it from the relevant `INDEX.md`, then run the pipeline.
