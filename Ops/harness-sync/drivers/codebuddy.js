import { exists, which } from '../lib.js'

export default {
  key: 'codebuddy',
  label: 'CodeBuddy',
  installed: () => which('codebuddy') || exists('~/.codebuddy'),
  skillsDir: '~/.codebuddy/skills',
  rulesFile: '~/.codebuddy/CODEBUDDY.md',
  mcp: { kind: 'json', path: '~/.codebuddy/mcp.json', serversKey: 'mcpServers' },
}
