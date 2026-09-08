import { exists, which } from '../lib.js'

export default {
  key: 'kimi',
  label: 'Kimi Code CLI',
  installed: () => exists('~/.kimi-code') || which('kimi'),
  skillsDir: '~/.kimi-code/skills',
  rulesFile: '~/.kimi-code/AGENTS.md',
  mcp: { kind: 'json', path: '~/.kimi-code/mcp.json', serversKey: 'mcpServers' },
}
