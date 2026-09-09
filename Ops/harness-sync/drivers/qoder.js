import { exists, which } from '../lib.js'

export default {
  key: 'qoder',
  label: 'Qoder',
  installed: () => which('qoder') || exists('~/.qoder'),
  skillsDir: '~/.qoder/skills',
  rulesFile: null,
  mcp: { kind: 'json', path: '~/.qoder/settings.json', serversKey: 'mcpServers', entryType: 'stdio' },
}
