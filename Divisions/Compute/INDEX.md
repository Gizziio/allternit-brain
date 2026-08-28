---
doc: division
updated: 2026-08-28
status: draft
---

# Allternit Compute

## What it is

Allternit's compute division designs the **software-defined AI computer**: hardware appliances, the Fabric Runtime, and the substrate that turns heterogeneous silicon into one inference fabric.

It is the **design authority** for Allternit's physical compute layer — what gets built, how it connects, and how agents request capacity from it.

## Current phase

R&D. Core documentation and software scaffold exist; no hardware prototype has been built yet.

## What it owns

- **Product architecture** — Compute Box family (Mini, Pro, Hybrid, Mobile, Edge, Rack), 20 product families
- **Fabric Runtime** — discovery, topology graph, workload compiler, scheduler, OpenAI-compatible API
- **Hardware catalog** — validated BOMs, combination matrix, chassis/cooling direction
- **Software substrate** — OS design, inference runtimes, phone-agent harness
- **Public surface** — content and visuals for compute.allternit.com

## What it does not own

- **Physical production** — that lives in Allternit Manufacturing
- **Real-estate / installations** — that lives in Allternit Spaces
- **Robotics platforms** — that lives in Allternit Robotics

## Convergence with Manufacturing

Compute designs the hardware; Manufacturing produces it. The handoff:

| Compute delivers | Manufacturing receives |
|---|---|
| Product specs, CAD briefs, chassis/cooling designs | DFM review, material selection, prototype builds |
| Validated BOMs and vendor build sheets | Sourcing, print-farm / CNC production, QA |
| Visual concepts and website renders | Marketing photography, packaging, production assets |

Division boundary rule: if a doc is about **what to build and why**, it lives in Allternit Compute. If it is about **how to physically make it**, it lives in Allternit Manufacturing.

## Related surfaces

- Public surface: [compute.allternit.com](../../Surfaces/INDEX.md)
- Shared brand/assets: [Allternit Assets/Compute/](../../Surfaces/INDEX.md#brand-assets-and-design-tokens)

## Related products

- [Allternit Platform](../Products/Platform.md) — the agent workspace and SDK that consume compute leases
- [Allternit OS](../Products/OS.md) — future on-chip play

## Source of truth

- Division workspace: `Allternit Compute/`
- Start here: `Allternit Compute/Content/ALLTERNIT_COMPUTE_ONE_PAGER.md`
- Product family: `Allternit Compute/Products/ALLTERNIT_COMPUTE_20_PRODUCT_FAMILIES.md`
- Fabric Runtime: `Allternit Compute/Software/ALLTERNIT_COMPUTE_FABRIC_RUNTIME_v0.1.md`
- Public site: `Allternit Websites/Projects/compute.allternit.com/`
