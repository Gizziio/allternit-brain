import { exists, which } from '../lib.js'

export default {
  key: 'openclaw',
  label: 'OpenClaw',
  installed: () => which('openclaw') || exists('~/.openclaw'),
  skillsDir: '~/.openclaw/skills',
  rulesFile: '~/.openclaw/workspace/AGENTS.md',
  mcp: null,
}
