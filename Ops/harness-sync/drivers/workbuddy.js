import { exists, which } from '../lib.js'

export default {
  key: 'workbuddy',
  label: 'WorkBuddy',
  installed: () => which('workbuddy') || exists('~/.workbuddy'),
  skillsDir: '~/.workbuddy/skills',
  rulesFile: null,
  mcp: { kind: 'json', path: '~/.workbuddy/mcp.json', serversKey: 'mcpServers' },
}
