---
doc: division
updated: 2026-08-28
status: draft
---

# Allternit Robotics

## What it is

Allternit's robotics division: autonomy, control, simulation, and the software that makes robots useful in Allternit workspaces.

It is the **autonomy authority** — not the hardware platform authority. Physical robot reference platforms are developed by Allternit Manufacturing's Hardware R&D division; Robotics owns the brain, control stack, and simulation layer that runs on them.

## Current phase

R&D.

## What it owns

- Autonomy stack and behavior models
- Simulation environments (Isaac Sim, Gazebo, etc.)
- ROS2 / LeRobot integration patterns
- Robot-to-agent interfaces
- Public surface: content and visuals for robotics.allternit.com

## What it does not own

- **Physical robot hardware design** — that lives in Allternit Manufacturing (Project Quiver, reBot-DevArm, Asimov 1)
- **Compute hardware** — that lives in Allternit Compute
- **Manufacturing / production** — that lives in Allternit Manufacturing

## Convergence with Manufacturing and Compute

| Robotics receives | Robotics delivers |
|---|---|
| Reference platforms from Manufacturing Hardware R&D | Autonomy firmware, control policies, simulation models |
| Compute substrates from Compute | Workload-aware autonomy that requests compute leases |

## Related surfaces

- Public surface: [robotics.allternit.com](../../Surfaces/INDEX.md)

## Related products

- [Allternit Platform](../../Products/Platform.md)
- [Allternit Compute](../Compute/INDEX.md)
- [Allternit Manufacturing](../Manufacturing/INDEX.md)

## Source of truth

- Division workspace: `Allternit LLC/07 Research And Robotics/` and `Research/Robotics Simulations/`
- Physical platforms: `Allternit Manufacturing/Specifications/ALLTERNIT_HUSKS_HUMANOID_PLAN.md`
- Public site: `Allternit Websites/Projects/robotics.allternit.com/`
