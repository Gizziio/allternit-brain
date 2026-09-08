import { exists, which } from '../lib.js'

export default {
  key: 'claude',
  label: 'Claude Code',
  installed: () => exists('~/.claude') || which('claude'),
  skillsDir: '~/.claude/skills',
  rulesFile: '~/.claude/CLAUDE.md',
  mcp: { kind: 'json', path: '~/.claude/settings.json', serversKey: 'mcpServers' },
}
