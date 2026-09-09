import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

export const MANAGED_MANIFEST = '.allternit-harness.json'
export const MARK_START = '<!-- allternit-harness:start -->'
export const MARK_END = '<!-- allternit-harness:end -->'

export function expand(p) {
  if (!p) return p
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p
}

export function exists(p) {
  try { fs.accessSync(expand(p)); return true } catch { return false }
}

export function which(bin) {
  try { execFileSync('which', [bin], { stdio: 'pipe' }); return true } catch { return false }
}

export function readJson(file) {
  try { return JSON.parse(fs.readFileSync(expand(file), 'utf8')) } catch { return null }
}

export function backup(file) {
  const f = expand(file)
  if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak-harness')
}

export function writeText(file, content) {
  const f = expand(file)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  backup(f)
  fs.writeFileSync(f, content)
}

export function writeJson(file, obj) {
  writeText(file, JSON.stringify(obj, null, 2) + '\n')
}

export function hashDir(dir) {
  const root = expand(dir)
  const h = crypto.createHash('sha256')
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(path.join(d, e.name), r)
      else if (e.isFile()) {
        h.update(r)
        h.update('\0')
        h.update(fs.readFileSync(path.join(d, e.name)))
        h.update('\0')
      }
    }
  }
  walk(root, '')
  return h.digest('hex')
}

export function copyDir(src, dest) {
  const s = expand(src)
  const d = expand(dest)
  fs.mkdirSync(d, { recursive: true })
  for (const e of fs.readdirSync(s, { withFileTypes: true })) {
    if (e.isDirectory()) copyDir(path.join(s, e.name), path.join(d, e.name))
    else if (e.isFile()) fs.copyFileSync(path.join(s, e.name), path.join(d, e.name))
  }
}

export function removeDir(dir) {
  fs.rmSync(expand(dir), { recursive: true, force: true })
}

export function listSkills(srcDir) {
  const dir = expand(srcDir)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => {
      if (!e.isDirectory() && !e.isSymbolicLink()) return false
      return fs.existsSync(path.join(dir, e.name, 'SKILL.md'))
    })
    .map(e => e.name)
    .sort()
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(expand(file))).digest('hex')
}

function skillTarget(tdir, name, format) {
  return format === 'flat' ? path.join(tdir, `${name}.md`) : path.join(tdir, name)
}

function skillHash(target, format) {
  return format === 'flat' ? hashFile(target) : hashDir(target)
}

export function syncSkills(srcDir, targetDir, dryRun, format = 'dir') {
  const actions = []
  const skills = listSkills(srcDir)
  const tdir = expand(targetDir)
  const manifestPath = path.join(tdir, MANAGED_MANIFEST)
  const prev = readJson(manifestPath) || { skills: {} }
  const next = { version: 1, syncedAt: new Date().toISOString(), skills: {} }

  if (!fs.existsSync(tdir)) {
    actions.push({ kind: dryRun ? 'would-create-dir' : 'create-dir', detail: tdir })
  }

  for (const name of skills) {
    const sSrc = path.join(expand(srcDir), name)
    const sDst = skillTarget(tdir, name, format)
    const hash = format === 'flat' ? hashFile(path.join(sSrc, 'SKILL.md')) : hashDir(sSrc)
    next.skills[name] = hash
    if (!fs.existsSync(sDst)) {
      actions.push({ kind: dryRun ? 'would-install' : 'install', name })
      if (!dryRun) {
        if (format === 'flat') {
          fs.mkdirSync(tdir, { recursive: true })
          fs.copyFileSync(path.join(sSrc, 'SKILL.md'), sDst)
        } else copyDir(sSrc, sDst)
      }
    } else if (skillHash(sDst, format) !== hash) {
      actions.push({ kind: dryRun ? 'would-update' : 'update', name })
      if (!dryRun) {
        if (format === 'flat') fs.copyFileSync(path.join(sSrc, 'SKILL.md'), sDst)
        else {
          removeDir(sDst)
          copyDir(sSrc, sDst)
        }
      }
    }
  }

  for (const name of Object.keys(prev.skills || {})) {
    const dst = skillTarget(tdir, name, format)
    if (next.skills[name] || !fs.existsSync(dst)) continue
    actions.push({ kind: dryRun ? 'would-remove' : 'remove', name, reason: 'no longer in source' })
    if (!dryRun) {
      if (format === 'flat') fs.rmSync(dst, { force: true })
      else removeDir(dst)
    }
  }

  if (!dryRun) {
    fs.mkdirSync(tdir, { recursive: true })
    fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + '\n')
  }
  return actions
}

export function skillsStatus(srcDir, targetDir, format = 'dir') {
  const skills = listSkills(srcDir)
  if (skills.length === 0) return 'no source skills'
  const tdir = expand(targetDir)
  if (!fs.existsSync(tdir)) return 'not synced'
  let synced = 0
  let drifted = []
  let missing = []
  for (const name of skills) {
    const dst = skillTarget(tdir, name, format)
    if (!fs.existsSync(dst)) missing.push(name)
    else if (skillHash(dst, format) !== (format === 'flat' ? hashFile(path.join(expand(srcDir), name, 'SKILL.md')) : hashDir(path.join(expand(srcDir), name)))) drifted.push(name)
    else synced++
  }
  const parts = [`${synced}/${skills.length} synced`]
  if (missing.length) parts.push(`${missing.length} missing`)
  if (drifted.length) parts.push(`${drifted.length} drifted`)
  return parts.join(', ')
}

export function uninstallSkills(targetDir, dryRun, format = 'dir') {
  const actions = []
  const tdir = expand(targetDir)
  const manifestPath = path.join(tdir, MANAGED_MANIFEST)
  const manifest = readJson(manifestPath)
  if (!manifest) {
    actions.push({ kind: 'nothing', detail: 'no managed manifest' })
    return actions
  }
  for (const name of Object.keys(manifest.skills || {})) {
    const dst = skillTarget(tdir, name, format)
    if (fs.existsSync(dst)) {
      actions.push({ kind: dryRun ? 'would-remove' : 'remove', name })
      if (!dryRun) {
        if (format === 'flat') fs.rmSync(dst, { force: true })
        else removeDir(dst)
      }
    }
  }
  actions.push({ kind: dryRun ? 'would-remove' : 'remove', detail: MANAGED_MANIFEST })
  if (!dryRun) fs.rmSync(manifestPath, { force: true })
  return actions
}

export function buildRulesBlock(content) {
  return `${MARK_START}\n${content.trimEnd()}\n${MARK_END}\n`
}

function frontmatterText(frontmatter) {
  return frontmatter ? `---\n${frontmatter}\n---\n\n` : ''
}

export function rulesBlockStatus(file) {
  const f = expand(file)
  if (!fs.existsSync(f)) return 'no-file'
  const text = fs.readFileSync(f, 'utf8')
  return text.includes(MARK_START) ? 'present' : 'missing'
}

export function upsertRulesBlock(file, block, dryRun, frontmatter) {
  const f = expand(file)
  const fm = frontmatterText(frontmatter)
  const managed = fm + block
  const actions = []
  if (!fs.existsSync(f)) {
    actions.push({ kind: dryRun ? 'would-create' : 'create', detail: f })
    if (!dryRun) writeText(f, managed)
    return actions
  }
  const old = fs.readFileSync(f, 'utf8')
  const s = old.indexOf(MARK_START)
  const e = old.indexOf(MARK_END)
  if (s !== -1 && e !== -1 && e > s) {
    const unitStart = fm && old.slice(0, s).endsWith(fm) ? s - fm.length : s
    const current = old.slice(unitStart, e + MARK_END.length)
    if (current === managed.trimEnd()) {
      actions.push({ kind: 'unchanged' })
      return actions
    }
    actions.push({ kind: dryRun ? 'would-update' : 'update', detail: f })
    if (!dryRun) writeText(f, old.slice(0, unitStart) + managed + old.slice(e + MARK_END.length))
    return actions
  }
  actions.push({ kind: dryRun ? 'would-append' : 'append', detail: f })
  if (!dryRun) writeText(f, old.replace(/\s*$/, '\n\n') + managed)
  return actions
}

export function removeRulesBlock(file, dryRun, frontmatter) {
  const f = expand(file)
  const fm = frontmatterText(frontmatter)
  const actions = []
  if (!fs.existsSync(f)) {
    actions.push({ kind: 'nothing', detail: 'no file' })
    return actions
  }
  const old = fs.readFileSync(f, 'utf8')
  const s = old.indexOf(MARK_START)
  const e = old.indexOf(MARK_END)
  if (s === -1 || e === -1) {
    actions.push({ kind: 'nothing', detail: 'no harness block' })
    return actions
  }
  const unitStart = fm && old.slice(0, s).endsWith(fm) ? s - fm.length : s
  const remainder = (old.slice(0, unitStart) + old.slice(e + MARK_END.length)).trim()
  if (remainder.length === 0) {
    actions.push({ kind: dryRun ? 'would-delete-file' : 'delete-file', detail: f })
    if (!dryRun) fs.rmSync(f, { force: true })
  } else {
    actions.push({ kind: dryRun ? 'would-update' : 'update', detail: f })
    if (!dryRun) writeText(f, remainder + '\n')
  }
  return actions
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findTomlBlock(text, section) {
  const re = new RegExp(`^\\[${escapeRegExp(section)}\\]\\s*$`, 'm')
  const m = re.exec(text)
  if (!m) return null
  const rest = text.slice(m.index + m[0].length)
  const next = rest.search(/^\[/m)
  const end = next === -1 ? text.length : m.index + m[0].length + next
  return { start: m.index, end: end, text: text.slice(m.index, end) }
}

export function tomlBlockText(section, server) {
  return `[${section}]\ncommand = "${server.command}"\nargs = ${JSON.stringify(server.args)}\n`
}

export function tomlMcpStatus(file, section, server) {
  const f = expand(file)
  if (!fs.existsSync(f)) return 'missing'
  const block = findTomlBlock(fs.readFileSync(f, 'utf8'), section)
  if (!block) return 'missing'
  const cmdLine = block.text.split('\n').find(l => l.trim().startsWith('command'))
  const argsLine = block.text.split('\n').find(l => l.trim().startsWith('args'))
  const cmdOk = cmdLine && cmdLine.includes(`"${server.command}"`)
  const argsOk = argsLine && server.args.every(a => argsLine.includes(a))
  return cmdOk && argsOk ? 'ok' : 'broken'
}

export function tomlMcpSync(file, section, server, dryRun) {
  const st = tomlMcpStatus(file, section, server)
  if (st === 'ok') return [{ kind: 'unchanged' }]
  const kind = st === 'missing' ? 'add' : 'fix'
  if (dryRun) return [{ kind: `would-${kind}`, detail: expand(file) }]
  const f = expand(file)
  const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''
  const block = findTomlBlock(old, section)
  const blockText = tomlBlockText(section, server)
  const out = block
    ? old.slice(0, block.start) + blockText + old.slice(block.end).replace(/^\n/, '')
    : old.replace(/\s*$/, '\n\n') + blockText
  writeText(f, out)
  return [{ kind }]
}

export function tomlMcpRemove(file, section, dryRun) {
  const f = expand(file)
  if (!fs.existsSync(f)) return [{ kind: 'nothing', detail: 'no file' }]
  const old = fs.readFileSync(f, 'utf8')
  const block = findTomlBlock(old, section)
  if (!block) return [{ kind: 'nothing', detail: 'no entry' }]
  if (dryRun) return [{ kind: 'would-remove', detail: section }]
  writeText(f, (old.slice(0, block.start) + old.slice(block.end)).replace(/\n{3,}/g, '\n\n'))
  return [{ kind: 'remove', detail: section }]
}

function mcpEntry(cfg, server) {
  if (cfg.commandArray) return { type: 'local', command: [server.command, ...server.args] }
  const e = { command: server.command, args: server.args }
  if (cfg.entryType) e.type = cfg.entryType
  return e
}

function arrEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i])
}

function mcpEntryMatches(cfg, cur, server) {
  if (!cur || typeof cur !== 'object') return false
  if (cfg.commandArray) {
    const expected = mcpEntry(cfg, server)
    return cur.type === expected.type && arrEqual(cur.command, expected.command)
  }
  return cur.command === server.command && arrEqual(cur.args, server.args)
}

export function jsonMcpStatus(file, cfg, name, server) {
  const obj = readJson(file)
  if (!obj || typeof obj !== 'object') return 'missing'
  const cur = obj[cfg.serversKey] && obj[cfg.serversKey][name]
  if (!cur) return 'missing'
  return mcpEntryMatches(cfg, cur, server) ? 'ok' : 'broken'
}

export function jsonMcpSync(file, cfg, name, server, dryRun) {
  const st = jsonMcpStatus(file, cfg, name, server)
  const entry = mcpEntry(cfg, server)
  if (st === 'ok') return [{ kind: 'unchanged' }]
  const kind = st === 'missing' ? 'add' : 'fix'
  if (dryRun) return [{ kind: `would-${kind}`, detail: expand(file) }]
  const obj = readJson(file) || {}
  obj[cfg.serversKey] = obj[cfg.serversKey] || {}
  obj[cfg.serversKey][name] = entry
  writeJson(file, obj)
  return [{ kind, detail: expand(file) }]
}

export function jsonMcpRemove(file, cfg, name, dryRun) {
  const obj = readJson(file)
  if (!obj || !obj[cfg.serversKey] || !obj[cfg.serversKey][name]) return [{ kind: 'nothing', detail: 'no entry' }]
  if (dryRun) return [{ kind: 'would-remove', detail: name }]
  delete obj[cfg.serversKey][name]
  writeJson(file, obj)
  return [{ kind: 'remove', detail: name }]
}

export function cliMcpStatus(configFile, section, server) {
  return tomlMcpStatus(configFile, section, server)
}

export function cliMcpSync(bin, addArgs, dryRun) {
  if (dryRun) return [{ kind: 'would-run', detail: `${bin} ${addArgs.join(' ')}` }]
  execFileSync(bin, addArgs, { stdio: 'pipe' })
  return [{ kind: 'add', detail: `${bin} ${addArgs.join(' ')}` }]
}

export function cliMcpRemove(bin, removeArgs, dryRun) {
  if (dryRun) return [{ kind: 'would-run', detail: `${bin} ${removeArgs.join(' ')}` }]
  try {
    execFileSync(bin, removeArgs, { stdio: 'pipe' })
    return [{ kind: 'remove', detail: `${bin} ${removeArgs.join(' ')}` }]
  } catch {
    return [{ kind: 'nothing', detail: 'not registered' }]
  }
}
