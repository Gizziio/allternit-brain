#!/usr/bin/env node
// harness-sync — distribute the Allternit ops harness (skills, rules, MCP
// registration) from its single source of truth to every AI CLI tool.
//
//   node harness-sync.js status              per-tool coverage table
//   node harness-sync.js sync [--dry-run]    push harness to all tools
//   node harness-sync.js uninstall           remove only harness-managed resources
//   --tools=codex,kimi                       restrict to a subset of tools
//
// Source of truth (see harness.json):
//   skills  → /Users/joe/Desktop/Allternit/.claude/skills/ (17 ops skills)
//   rules   → /Users/joe/Desktop/Allternit/CLAUDE.md
//   MCP     → allternit-ops server (this directory's index.js)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildRulesBlock,
  cliMcpRemove,
  cliMcpStatus,
  cliMcpSync,
  exists,
  jsonMcpRemove,
  jsonMcpStatus,
  jsonMcpSync,
  listSkills,
  removeRulesBlock,
  rulesBlockStatus,
  skillsStatus,
  syncSkills,
  tomlMcpRemove,
  tomlMcpStatus,
  tomlMcpSync,
  uninstallSkills,
  upsertRulesBlock,
} from './harness-sync/lib.js'
import claudeDriver from './harness-sync/drivers/claude.js'
import codexDriver from './harness-sync/drivers/codex.js'
import kimiDriver from './harness-sync/drivers/kimi.js'
import grokDriver from './harness-sync/drivers/grok.js'
import cursorDriver from './harness-sync/drivers/cursor.js'
import gizziDriver from './harness-sync/drivers/gizzi.js'
import agyDriver from './harness-sync/drivers/agy.js'
import opencodeDriver from './harness-sync/drivers/opencode.js'
import qwenDriver from './harness-sync/drivers/qwen.js'
import codebuddyDriver from './harness-sync/drivers/codebuddy.js'
import workbuddyDriver from './harness-sync/drivers/workbuddy.js'
import openclawDriver from './harness-sync/drivers/openclaw.js'
import hermesDriver from './harness-sync/drivers/hermes.js'
import dshDriver from './harness-sync/drivers/dsh.js'
import piDriver from './harness-sync/drivers/pi.js'
import qoderDriver from './harness-sync/drivers/qoder.js'

const OPS_DIR = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(fs.readFileSync(path.join(OPS_DIR, 'harness.json'), 'utf8'))
const drivers = [claudeDriver, codexDriver, kimiDriver, grokDriver, cursorDriver, gizziDriver, agyDriver, opencodeDriver, qwenDriver, codebuddyDriver, workbuddyDriver, openclawDriver, hermesDriver, dshDriver, piDriver, qoderDriver]
const server = manifest.source.mcpServer

const args = process.argv.slice(2)
const command = args.find(a => !a.startsWith('--')) || 'status'
const dryRun = args.includes('--dry-run')
const toolsFilter = (args.find(a => a.startsWith('--tools=')) || '').slice('--tools='.length).split(',').filter(Boolean)

function tools() {
  return drivers
    .map(d => ({ driver: d, cfg: manifest.tools[d.key] }))
    .filter(t => t.cfg)
    .filter(t => toolsFilter.length === 0 || toolsFilter.includes(t.driver.key))
}

function mcpStatus(cfg) {
  const m = cfg.mcp
  if (m.kind === 'json') return jsonMcpStatus(m.path, m, server.name, server)
  if (m.kind === 'toml-block') return tomlMcpStatus(m.path, m.section, server)
  if (m.kind === 'cli') {
    if (m.configFormat === 'json') return jsonMcpStatus(m.configPath, m, server.name, server)
    return cliMcpStatus(m.configPath, m.section, server)
  }
  return 'unknown'
}

function mcpSync(cfg, dry) {
  const m = cfg.mcp
  if (m.kind === 'json') return jsonMcpSync(m.path, m, server.name, server, dry)
  if (m.kind === 'toml-block') return tomlMcpSync(m.path, m.section, server, dry)
  if (m.kind === 'cli') {
    if (mcpStatus(cfg) === 'ok') return [{ kind: 'unchanged' }]
    return cliMcpSync(m.bin, m.addArgs, dry)
  }
  return [{ kind: 'unknown' }]
}

function mcpRemove(cfg, dry) {
  const m = cfg.mcp
  if (m.kind === 'json') return jsonMcpRemove(m.path, m, server.name, dry)
  if (m.kind === 'toml-block') return tomlMcpRemove(m.path, m.section, dry)
  if (m.kind === 'cli') {
    if (m.configFormat === 'json') return jsonMcpRemove(m.configPath, m, server.name, dry)
    return cliMcpRemove(m.bin, m.removeArgs, dry)
  }
  return [{ kind: 'unknown' }]
}

function describe(a) {
  if (a.kind === 'unchanged') return 'unchanged'
  if (a.kind === 'nothing') return `nothing (${a.detail || 'n/a'})`
  const bits = [a.kind]
  if (a.name) bits.push(a.name)
  if (a.detail) bits.push(`— ${a.detail}`)
  if (a.reason) bits.push(`(${a.reason})`)
  return bits.join(' ')
}

function absentSkipsSync(driver, cfg) {
  return !driver.installed() && !cfg.syncWhenAbsent
}

function cmdStatus() {
  console.log(`Harness source: ${manifest.source.skillsDir} (${listSkills(manifest.source.skillsDir).length} skills), rules: ${manifest.source.rulesFile}`)
  console.log(`MCP server: ${server.name} → ${server.command} ${server.args[0]}`)
  console.log('')
  const rows = tools().map(({ driver, cfg }) => {
    if (absentSkipsSync(driver, cfg)) {
      return { tool: driver.label, installed: 'no', skills: 'skipped', mcp: 'skipped', rules: 'skipped' }
    }
    return {
      tool: driver.label,
      installed: 'yes',
      skills: cfg.skillsDir ? skillsStatus(manifest.source.skillsDir, cfg.skillsDir, cfg.skillsFormat || 'dir') : 'n/a',
      mcp: cfg.mcp ? mcpStatus(cfg) : 'n/a',
      rules: cfg.rulesFile ? rulesBlockStatus(cfg.rulesFile) : 'n/a',
    }
  })
  const w = {
    tool: Math.max(...rows.map(r => r.tool.length), 4),
    installed: 9,
    skills: Math.max(...rows.map(r => r.skills.length), 6),
    mcp: Math.max(...rows.map(r => r.mcp.length), 3),
    rules: Math.max(...rows.map(r => r.rules.length), 5),
  }
  console.log(`${'tool'.padEnd(w.tool)}  ${'installed'.padEnd(w.installed)}  ${'skills'.padEnd(w.skills)}  ${'mcp'.padEnd(w.mcp)}  rules`)
  console.log(`${'-'.repeat(w.tool)}  ${'-'.repeat(w.installed)}  ${'-'.repeat(w.skills)}  ${'-'.repeat(w.mcp)}  ${'-'.repeat(w.rules)}`)
  for (const r of rows) {
    console.log(`${r.tool.padEnd(w.tool)}  ${r.installed.padEnd(w.installed)}  ${r.skills.padEnd(w.skills)}  ${r.mcp.padEnd(w.mcp)}  ${r.rules}`)
  }
  console.log('')
  console.log('mcp: ok = registered with correct command/args · broken = registered but stale · missing = not registered')
}

function cmdSync() {
  const rulesContent = fs.readFileSync(manifest.source.rulesFile, 'utf8')
  let total = 0
  for (const { driver, cfg } of tools()) {
    console.log(`\n== ${driver.label} ==`)
    if (absentSkipsSync(driver, cfg)) {
      console.log('   not installed (skipped) — install the tool and re-run sync to pick it up')
      continue
    }
    if (!driver.installed()) console.log('   (tool not detected on this machine — writing config anyway: syncWhenAbsent)')
    if (cfg.skillsDir) {
      for (const a of syncSkills(manifest.source.skillsDir, cfg.skillsDir, dryRun, cfg.skillsFormat || 'dir')) {
        console.log(`   skills: ${describe(a)}`)
        total++
      }
    }
    if (cfg.mcp) {
      for (const a of mcpSync(cfg, dryRun)) {
        console.log(`   mcp:    ${describe(a)}`)
        total++
      }
    }
    if (cfg.rulesFile) {
      const block = buildRulesBlock(rulesContent)
      for (const a of upsertRulesBlock(cfg.rulesFile, block, dryRun, cfg.rulesFrontmatter || null)) {
        console.log(`   rules:  ${describe(a)}`)
        total++
      }
    }
  }
  console.log(`\n${dryRun ? 'Dry run — no changes written.' : 'Done.'} ${total} action(s) reported.`)
}

function cmdUninstall() {
  for (const { driver, cfg } of tools()) {
    console.log(`\n== ${driver.label} ==`)
    if (cfg.skillsDir) for (const a of uninstallSkills(cfg.skillsDir, dryRun, cfg.skillsFormat || 'dir')) console.log(`   skills: ${describe(a)}`)
    if (cfg.mcp) for (const a of mcpRemove(cfg, dryRun)) console.log(`   mcp:    ${describe(a)}`)
    if (cfg.rulesFile) for (const a of removeRulesBlock(cfg.rulesFile, dryRun, cfg.rulesFrontmatter || null)) console.log(`   rules:  ${describe(a)}`)
  }
  console.log(`\n${dryRun ? 'Dry run — nothing removed.' : 'Uninstall complete. Only harness-managed resources were touched.'}`)
}

if (!exists(manifest.source.skillsDir)) {
  console.error(`Source skills dir not found: ${manifest.source.skillsDir}`)
  process.exit(1)
}

if (command === 'status') cmdStatus()
else if (command === 'sync') cmdSync()
else if (command === 'uninstall') cmdUninstall()
else {
  console.error(`Unknown command: ${command} (expected status | sync | uninstall)`)
  process.exit(1)
}
