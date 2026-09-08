import { exists, which } from '../lib.js'

export default {
  key: 'gizzi',
  label: 'Gizzi Code',
  installed: () => exists('~/.gizzi') || which('gizzi'),
  skillsDir: '~/.gizzi/skills',
  rulesFile: null,
  mcp: { kind: 'json', path: '~/.config/gizzi/gizzi.json', serversKey: 'mcp' },
}
