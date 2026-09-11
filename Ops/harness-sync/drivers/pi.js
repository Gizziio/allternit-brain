import { exists, which } from '../lib.js'

export default {
  key: 'pi',
  label: 'Pi',
  installed: () => which('pi') || exists('~/.pi'),
  skillsDir: '~/.pi/agent/skills',
  rulesFile: null,
  mcp: null,
}
