import { exists, which } from '../lib.js'

export default {
  key: 'grok',
  label: 'Grok CLI',
  installed: () => exists('~/.grok') || which('grok'),
  skillsDir: '~/.grok/skills',
  rulesFile: null,
  mcp: {
    kind: 'cli',
    bin: 'grok',
    addArgs: ['mcp', 'add', 'allternit-ops', '-s', 'user', '--', 'node', '/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js'],
    removeArgs: ['mcp', 'remove', 'allternit-ops'],
    configPath: '~/.grok/config.toml',
    section: 'mcp_servers.allternit-ops',
  },
}
