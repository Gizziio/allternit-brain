import { exists, which } from '../lib.js'

export default {
  key: 'agy',
  label: 'agy',
  installed: () => which('agy') || exists('~/.local/bin/agy'),
  skillsDir: null,
  rulesFile: null,
  mcp: {
    kind: 'cli',
    bin: 'agy',
    addArgs: ['mcp', 'add', 'allternit-ops', 'node', '/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js'],
    removeArgs: ['mcp', 'remove', 'allternit-ops'],
    configPath: '~/.gemini/config/mcp_config.json',
    configFormat: 'json',
    serversKey: 'mcpServers',
  },
}
