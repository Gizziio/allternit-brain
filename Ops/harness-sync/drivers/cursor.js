import { exists, which } from '../lib.js'

export default {
  key: 'cursor',
  label: 'Cursor',
  installed: () => exists('~/.cursor') || which('cursor') || exists('/Applications/Cursor.app'),
  skillsDir: '~/.cursor/skills',
  rulesFile: '~/.cursor/rules/allternit.mdc',
  mcp: { kind: 'json', path: '~/.cursor/mcp.json', serversKey: 'mcpServers' },
}
