---
doc: project
updated: 2026-09-08
status: active
---

# Baseline: media-skills

## What we already have
- `gpt-image-2-style-library` skill + box libraries for still image generation
- Marketing media pipeline (prompts → approve → sync-to-sites)
- No first-class local ffmpeg/video agent skill in the harness pack

## Gaps
- Agents lack a packaged local ffmpeg workflow (cut/join/captions/loudness) for site/video assets
- Video prompt pipeline exists; execution still manual / ad hoc

## Related products / paths
- `.claude/skills/gpt-image-2-style-library`
- `Marketing/Production/Website Assets/`
- Surfaces media workflow in `Surfaces/INDEX.md`

## Delta log
- 2026-09-08 — rq-20260908-003 / ffmpeg-skill: MIT local ffmpeg agent skill (npx), pairs beside gpt-image-2-style-library
