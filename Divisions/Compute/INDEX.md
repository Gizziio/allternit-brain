---
doc: division
updated: 2026-09-07
status: draft
---

# Allternit Compute

## What it is

Allternit's compute division designs the **software-defined AI computer**: hardware appliances, compute capability classes, and the product requirements that turn heterogeneous silicon into one inference fabric.

It is the **design authority** for Allternit's physical compute layer — what gets built, how it connects, and how agents request capacity from it. The canonical software substrate that orchestrates this hardware is **AllternitOS**; Compute's standalone Python Fabric Runtime is being normalized into AllternitOS Layer 2 inference workers.

## Current phase

R&D. Core documentation and software scaffold exist; no hardware prototype has been built yet.

## What it owns

- **Product architecture** — Compute Box family (Mini, Pro, Hybrid, Mobile, Edge, Rack), 20 product families
- **Hardware catalog** — validated BOMs, combination matrix, chassis/cooling direction
- **Compute capability classes** — definitions of GPU/NPU/CPU/memory/network capabilities that AllternitOS schedules against
- **Inference runtime requirements** — which backends (vLLM, llama.cpp, MLX, EXO, etc.) must be supported and how
- **Phone-agent harness requirements** — what edge/phone capabilities need to be exposed
- **Public surface** — content and visuals for compute.allternit.com

## What lives in AllternitOS (not owned by Compute)

- **Fabric Runtime** — canonical Layer 2 runtime, scheduler, topology, and adapters live in `/Users/joe/Desktop/AllternitOS/fabric/execution/runtime/`.
- **Node capability schema** — canonical `NodeCapabilityRecord` lives in `AllternitOS/contracts/fabric-os/`.
- **Control plane** — node enrollment, heartbeat, capability directory, and lease authority live in `AllternitOS/fabric/os/control-plane/`.
- **OS substrate** — the headless host distribution and node agent are canonical AllternitOS Layer 1 concerns.

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

- [Allternit Platform](../../Products/Platform.md) — the agent workspace and SDK that consume compute leases
- [Allternit OS](../../Products/OS.md) — future on-chip play

## Source of truth

- Browser capability mapping (browser-act): [BROWSER_CAPABILITY.md](BROWSER_CAPABILITY.md)
- Division workspace: `Allternit Compute/`
- Start here: `Allternit Compute/Content/ALLTERNIT_COMPUTE_ONE_PAGER.md`
- Product family: `Allternit Compute/Products/ALLTERNIT_COMPUTE_20_PRODUCT_FAMILIES.md`
- Fabric Runtime design source: `Allternit Compute/Software/ALLTERNIT_COMPUTE_FABRIC_RUNTIME_v0.1.md`
- Canonical OS integration: `AllternitOS/ALLTERNITOS_PYTHON_FABRIC_RUNTIME_DONOR_HANDOFF.md`
- Division integration spec: `AllternitOS/ALLTERNITOS_DIVISION_INTEGRATION_SPEC.md`
- Public site: `Allternit Websites/Projects/compute.allternit.com/`
