---
doc: product
updated: 2026-08-29
status: active
---

# Allternit OS

## What it is

Allternit OS is the **canonical distributed operating system** for Allternit's agentic compute, manufacturing, robotics, and spaces fabric. It virtualizes infrastructure, model execution, and AI workloads while exposing reusable execution through typed workers/functions/triggers protected by non-bypassable capability authority.

It is built in three layers:

- **Layer 1 — Fabric OS:** nodes, resources, topology, transport, VM/container lifecycle, accelerator management.
- **Layer 2 — Distributed Execution:** model planner, runtime scheduler, topology-aware placement, KV cache fabric, inference adapters.
- **Layer 3 — Workload / Meta-Harness:** workloads, steps, harness router, worker registry, artifact/evidence registry, policy.

Allternit OS is also the substrate for a future on-chip/headless Linux distribution for Allternit-built hardware, but its scope is broader: it orchestrates heterogeneous devices regardless of host OS.

## Current phase

Active implementation. Canonical contracts, node agent, topology/scheduler skeletons, worker registry, harness router, artifact registry, and control-plane boundary exist in `/Users/joe/Desktop/AllternitOS/`. Division-built software (Compute's Fabric Runtime, Manufacturing's CAD OS) is being normalized into AllternitOS workers/services.

## Key answered questions

1. **First hardware target:** x86_64 reference ISO for Compute Box family; ARM/Apple and phone targets follow.
2. **Relation to desktop platform and divisions:** Platform and divisions are product surfaces and design authorities; AllternitOS is the shared substrate they consume.
3. **Surfaces:** Desktop, Web, iOS, Gizzi CLI, Cloud Console, division websites, and customer portals are surfaces over AllternitOS.

## What Allternit OS is not

- Not just a future on-chip OS.
- Not a product surface by itself.
- Not owned or duplicated by any single division.

## Related divisions

- [Compute](../Divisions/Compute/INDEX.md) — designs hardware and defines compute capability classes; its Fabric Runtime is being integrated as Layer 2 workers.
- [Manufacturing](../Divisions/Manufacturing/INDEX.md) — owns production authority; its CAD OS and Engineering workers are being packaged as AllternitOS workers.
- [Robotics](../Divisions/Robotics/INDEX.md) — consumes compute and simulation workers for autonomy.
- [Spaces](../Divisions/Spaces/INDEX.md) — consumes BIM/MEP and manufacturing workers for installations.

## Source of truth

- Canonical repo: `/Users/joe/Desktop/AllternitOS/`
- Master plan: `AllternitOS/docs/MASTER_PLAN.md`
- Convergence status: `AllternitOS/ALLTERNITOS_CONVERGENCE_INTEGRATION_STATUS.md`
- Division integration spec: `AllternitOS/ALLTERNITOS_DIVISION_INTEGRATION_SPEC.md`
