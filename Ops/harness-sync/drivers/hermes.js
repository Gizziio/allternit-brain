import { exists, which } from '../lib.js'

export default {
  key: 'hermes',
  label: 'Hermes',
  installed: () => which('hermes') || exists('~/.hermes'),
  skillsDir: '~/.hermes/skills',
  rulesFile: null,
  mcp: null,
}
