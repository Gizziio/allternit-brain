import { exists, which } from '../lib.js'

export default {
  key: 'codex',
  label: 'Codex CLI',
  installed: () => exists('~/.codex') || which('codex'),
  skillsDir: '~/.codex/skills',
  rulesFile: '~/.codex/AGENTS.md',
  mcp: { kind: 'toml-block', path: '~/.codex/config.toml', section: 'mcp_servers.allternit-ops' },
}
