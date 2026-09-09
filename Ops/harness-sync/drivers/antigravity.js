import { exists, which } from '../lib.js'

export default {
  key: 'antigravity',
  label: 'Antigravity IDE',
  installed: () => exists('~/.gemini/antigravity-cli') || which('antigravity'),
  skillsDir: '~/.gemini/antigravity/skills',
  rulesFile: null,
  mcp: null,
}
