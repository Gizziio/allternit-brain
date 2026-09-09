---
doc: division
updated: 2026-08-28
status: draft
---

# Allternit Manufacturing

## What it is

Allternit's manufacturing division is the **digital microfactory**: software-controlled, AI-orchestrated design-to-ship capability for Allternit's own hardware and external B2B customers.

It is the **production authority** for Allternit's physical layer — how designs become prototypes, parts, and finished products.

## Current phase

R&D. Master plan and CAD/tooling specs exist; no production floor is operational yet.

## What it owns

- **Design Studio** — CAD, reverse engineering, material/process selection, DFM/DFAM
- **Prototype Lab** — same-day CAD → Print → Test → Revise → Print loop
- **Digital Manufacturing** — print farm organized by material/capability
- **Product Manufacturing** — internal production of Allternit's hardware catalog
- **Manufacturing Services** — external B2B prototyping and low-volume production
- **Hardware R&D** — next-gen physical products and robotics reference platforms
- **Allternit Spaces** — manufactured environments that house compute and robotics
- **Public surface** — content and visuals for manufacturing.allternit.com

## What lives in AllternitOS (not owned by Manufacturing)

- **Allternit CAD OS** — the unified polyglot CAD/CAM/CAE worker is being packaged as an AllternitOS v0.2 Worker (`wrk_allternit_cad_v1`) in `AllternitOS/fabric/workload/workers/`.
- **Allternit Engineering / Real Estate Platform** — scan-to-BIM/MEP/render capabilities are being packaged as an AllternitOS v0.2 Worker (`wrk_allternit_engineering_v1`).
- **Factory execution worker** — future print-farm/production control will be an AllternitOS Worker that emits `Receipt` and `UsageEvent` records.
- **Digital thread / project state** — canonical project state becomes `Memory`, `Checkpoint`, and `Artifact` objects in AllternitOS.

## What it does not own

- **Compute architecture or software** — that lives in Allternit Compute
- **Agent runtime and platform software** — that lives in Allternit Platform and the core product
- **Robotics autonomy / simulation** — that lives in Allternit Robotics

## Convergence with Compute

Manufacturing produces what Compute designs. The handoff:

| Manufacturing receives | Manufacturing delivers |
|---|---|
| Product specs, CAD briefs, chassis/cooling designs from Compute | DFM feedback, prototype builds, production quotes |
| Validated BOMs from Compute | Sourced parts, assembled units, QA records |
| Visual concepts from Compute | Production-ready renders, packaging, marketing assets |

Division boundary rule: if a doc is about **how to physically make something**, it lives in Allternit Manufacturing. If it is about **what to build and why**, it lives in Allternit Compute.

## Robotics and Spaces

- **Robotics** reference platforms (Project Quiver, reBot-DevArm, Asimov 1) are developed under Manufacturing's Hardware R&D division because they are physical products.
- **Spaces** is the seventh Manufacturing operating division: pods, furniture, and installations that house Allternit compute and robotics.
- The Allternit Robotics division focuses on autonomy, control, and simulation — not the physical platform design.

## Related surfaces

- Public surface: [manufacturing.allternit.com](../../Surfaces/INDEX.md)
- Shared brand/assets: [Allternit Assets/Manufacturing/](../../Surfaces/INDEX.md#brand-assets-and-design-tokens)

## Related products

- [Allternit Platform](../../Products/Platform.md) — the software layer that will eventually orchestrate the manufacturing cloud
- [Allternit OS](../../Products/OS.md) — future on-chip play

## Source of truth

- Division workspace: `Allternit Manufacturing/`
- Start here: `Allternit Manufacturing/Specifications/ALLTERNIT_MANUFACTURING_MASTER_PLAN.md`
- CAD/tooling design source: `Allternit Manufacturing/Allternit Cad/`
- Real-estate platform design source: `Allternit Manufacturing/Real Estate Platform/`
- Division integration spec: `AllternitOS/ALLTERNITOS_DIVISION_INTEGRATION_SPEC.md`
- Public site: `Allternit Websites/Projects/manufacturing.allternit.com/`
