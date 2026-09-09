import { exists, which } from '../lib.js'

export default {
  key: 'opencode',
  label: 'OpenCode',
  installed: () => which('opencode') || exists('~/.config/opencode'),
  skillsDir: '~/.config/opencode/skills',
  rulesFile: null,
  mcp: {
    kind: 'cli',
    bin: 'opencode',
    addArgs: ['mcp', 'add', 'allternit-ops', '--', 'node', '/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js'],
    removeArgs: null,
    configPath: '~/.config/opencode/opencode.jsonc',
    configFormat: 'json',
    serversKey: 'mcp',
    commandArray: true,
  },
}
