import { exists, which } from '../lib.js'

export default {
  key: 'qwen',
  label: 'Qwen Code',
  installed: () => which('qwen') || exists('~/.qwen'),
  skillsDir: '~/.qwen/skills',
  rulesFile: null,
  mcp: {
    kind: 'cli',
    bin: 'qwen',
    addArgs: ['mcp', 'add', 'allternit-ops', 'node', '/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js', '-s', 'user'],
    removeArgs: ['mcp', 'remove', 'allternit-ops', '-s', 'user'],
    configPath: '~/.qwen/settings.json',
    configFormat: 'json',
    serversKey: 'mcpServers',
  },
}
