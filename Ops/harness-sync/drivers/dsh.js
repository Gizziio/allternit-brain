import { exists, which } from '../lib.js'

export default {
  key: 'dsh',
  label: 'DeepSeek Harness',
  installed: () => which('dsh') || exists('~/.dsh'),
  skillsDir: '~/.dsh/skills',
  rulesFile: null,
  mcp: null,
}
