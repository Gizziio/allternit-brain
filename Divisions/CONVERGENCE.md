---
doc: division
updated: 2026-08-28
status: active
---

# Division Convergence Map

How Allternit's four physical divisions relate to each other and to the core platform.

## Division authorities

| Division | Authority | Owns |
|---|---|---|
| [Allternit Compute](Compute/INDEX.md) | **Design authority for physical compute** | Compute hardware, Fabric Runtime, product architecture |
| [Allternit Manufacturing](Manufacturing/INDEX.md) | **Production authority for physical layer** | Digital microfactory, CAD, prototyping, production, robot platforms, spaces |
| [Allternit Robotics](Robotics/INDEX.md) | **Autonomy authority** | Robot control, simulation, agent-robot interfaces |
| [Allternit Spaces](Spaces/INDEX.md) | **Environment authority** | Physical spaces, installations, experience design |

## Handoff graph

```
Compute designs ──────┐
                      ▼
Manufacturing produces ──► Robotics runs autonomy on ──► Spaces installs and experiences
        │                         │                           │
        └─────────────────────────┴───────────────────────────┘
              All served by Allternit Platform (software layer)
```

## Concrete convergence rules

1. **Compute ↔ Manufacturing**
   - Compute decides **what** to build and **why**.
   - Manufacturing decides **how** to physically make it.
   - Handoff artifacts: product specs, CAD briefs, validated BOMs → DFM review, prototypes, production.

2. **Manufacturing ↔ Robotics**
   - Manufacturing's Hardware R&D designs and produces reference robot platforms.
   - Robotics writes the autonomy, control, and simulation stack that runs on those platforms.
   - Handoff artifacts: platform BOM, STEP files, sensor layout → firmware, control policies, sim models.

3. **Manufacturing ↔ Spaces**
   - Spaces defines environment concepts, layouts, and integration requirements.
   - Manufacturing produces the physical spaces, pods, furniture, and installations.
   - Handoff artifacts: experience brief, layout spec, power/cooling requirements → buildable designs, BOMs, install guides.

4. **Compute ↔ Robotics**
   - Compute provides inference substrate and workload leases.
   - Robotics consumes compute for perception, planning, and control.
   - Handoff artifacts: compute capacity API, latency/power budgets → autonomy workloads.

5. **Compute ↔ Spaces**
   - Compute provides the hardware that lives inside spaces.
   - Spaces defines power, cooling, networking, and physical housing requirements.
   - Handoff artifacts: compute appliance specs → rack/pod integration specs.

6. **Platform ↔ all divisions**
   - The core platform provides the agent runtime, SDK, memory, and orchestration.
   - Divisions expose capabilities as platform primitives (compute lease, manufacturing job, robot action, space state).

## Where overlapping work should live

| Topic | Lives in | Why |
|---|---|---|
| Compute hardware design | Compute | Design authority |
| Chassis/CAD production files | Manufacturing | Production authority |
| Robot platform mechanical design | Manufacturing | Physical product authority |
| Robot autonomy software | Robotics | Autonomy authority |
| Space concept and layout | Spaces | Environment authority |
| Space fabrication drawings | Manufacturing | Production authority |
| Compute-robot integration spec | Robotics | Consumes both; autonomy perspective |
| Compute-space integration spec | Spaces | Consumes compute; environment perspective |

## Open convergence questions

1. What is the first joint Compute + Manufacturing prototype to build?
2. Which Manufacturing reference robot platform should Robotics prioritize?
3. What is the first Spaces installation concept that uses Compute + Robotics?
4. How does the platform expose compute/manufacturing/robotics/space primitives through one API?

## Updated

Last aligned: 2026-08-28
