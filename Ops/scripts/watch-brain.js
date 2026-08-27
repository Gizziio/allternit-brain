#!/usr/bin/env node

/**
 * Allternit Brain — repo watcher / suggestion generator
 *
 * Scans sibling repositories for changes that should be reflected in the brain
 * and writes structured update files to Allternit Brain/.incoming/. The human
 * (or agent) can review and apply them with apply-brain-updates.js, or set
 * auto_apply=true when generated from a trusted hook.
 *
 * Usage:
 *   node watch-brain.js [--write] [--auto-apply]
 *
 * Without --write, it prints the suggested updates as JSON.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const ALLTERNIT_ROOT = path.join(HOME, 'Desktop', 'Allternit');
const BRAIN_ROOT = path.join(ALLTERNIT_ROOT, 'Allternit Brain');
const INCOMING_ROOT = path.join(BRAIN_ROOT, '.incoming');
const WEBSITES_ROOT = path.join(ALLTERNIT_ROOT, 'Allternit Websites');
const CLIENT_OPS_ROOT = path.join(ALLTERNIT_ROOT, 'Allternit LLC', '06 Client Ops And Contracts');
const PROJECTS_ROOT = path.join(WEBSITES_ROOT, 'Projects');

const DIVISION_SITES = {
  compute: { division: 'Divisions/Compute/INDEX.md', label: 'Allternit Compute' },
  manufacturing: { division: 'Divisions/Manufacturing/INDEX.md', label: 'Allternit Manufacturing' },
  robotics: { division: 'Divisions/Robotics/INDEX.md', label: 'Allternit Robotics' },
  spaces: { division: 'Divisions/Spaces/INDEX.md', label: 'Allternit Spaces' },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => e.name);
}

function fileContains(filePath, substring) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath, 'utf8').includes(substring);
}

function discoverWebsites() {
  const sites = [];
  for (const dir of listDirs(PROJECTS_ROOT)) {
    const sourceDir = path.join(PROJECTS_ROOT, dir, 'source');
    const designDir = path.join(PROJECTS_ROOT, dir, 'design');
    if (!fs.existsSync(sourceDir) && !fs.existsSync(designDir)) continue;

    const domain = dir.endsWith('.allternit.com') || dir.endsWith('.gizziio.com') ? dir : '';
    sites.push({
      folder: dir,
      domain,
      hasSource: fs.existsSync(sourceDir),
      hasDesign: fs.existsSync(designDir),
    });
  }
  return sites;
}

function normalizeClientName(name) {
  return name.toLowerCase().replace(/_/g, '-');
}

function discoverClients() {
  return listDirs(CLIENT_OPS_ROOT)
    .filter((d) => d !== 'business_ops_kit')
    .map((name) => ({ folder: name, docName: normalizeClientName(name) }));
}

function discoverMediaPrompts(siteFolder) {
  const prompts = [];
  const siteDir = path.join(PROJECTS_ROOT, siteFolder);
  if (!fs.existsSync(siteDir)) return prompts;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(full);
      } else if (entry.name.endsWith('.prompt.md') || entry.name.endsWith('_prompt.md')) {
        prompts.push(path.relative(siteDir, full));
      }
    }
  }
  walk(siteDir);
  return prompts;
}

function buildUpdate() {
  const updates = [];
  const sites = discoverWebsites();
  const clients = discoverClients();

  // Surface index: ensure every website project is listed
  for (const site of sites) {
    const display = site.domain || site.folder;
    const sourcePath = `Allternit Websites/Projects/${site.folder}`;
    const marker = `- **${display}**`;
    if (!fileContains(path.join(BRAIN_ROOT, 'Surfaces/INDEX.md'), marker)) {
      updates.push({
        doc: 'Surfaces/INDEX.md',
        action: 'ensure-section',
        section: '## Current surfaces',
        content: `${marker} — source: \`${sourcePath}\``,
        reason: `Discovered website project ${site.folder}`,
      });
    }
  }

  // Division product indexes: link division sites to product docs
  for (const [division, info] of Object.entries(DIVISION_SITES)) {
    const divisionSite = sites.find((s) => s.folder === `${division}.allternit.com`);
    if (!divisionSite) continue;

    const divisionDoc = info.division;
    const publicSurfaceLine = `- Public surface: [${division}.allternit.com](../../Surfaces/INDEX.md)`;
    if (!fileContains(path.join(BRAIN_ROOT, divisionDoc), publicSurfaceLine)) {
      updates.push({
        doc: divisionDoc,
        action: 'ensure-section',
        section: '## Related surfaces',
        content: publicSurfaceLine,
        reason: `Discovered ${division}.allternit.com site`,
      });
    }
  }

  // Clients: ensure every client folder has a brain doc
  for (const client of clients) {
    const brainDoc = `Clients/${client.docName}.md`;
    const fullPath = path.join(BRAIN_ROOT, brainDoc);
    if (!fs.existsSync(fullPath)) {
      updates.push({
        doc: brainDoc,
        action: 'create-or-replace',
        template: 'client.md',
        content: `## Engagement snapshot\n\n- Client folder: \`Allternit LLC/06 Client Ops And Contracts/${client.folder}/\`\n- Status: active\n\n## Hot state\n\n_Add per-cycle updates here._\n`,
        reason: `Discovered new client folder ${client.folder}`,
      });
    }
  }

  // Image/media prompt tracking per site
  for (const site of sites) {
    const prompts = discoverMediaPrompts(site.folder);
    if (prompts.length === 0) continue;
    const marker = `### ${site.folder} media`;
    if (!fileContains(path.join(BRAIN_ROOT, 'Surfaces/INDEX.md'), marker)) {
      updates.push({
        doc: 'Surfaces/INDEX.md',
        action: 'ensure-section',
        section: '## Image and media pipeline',
        content: `${marker}\n\n- Prompts: ${prompts.map((p) => `\`${p}\``).join(', ')}`,
        reason: `Discovered media prompts in ${site.folder}`,
      });
    }
  }

  return {
    source: 'watch-brain.js repo scanner',
    date: today(),
    auto_apply: false,
    updates,
  };
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const autoApply = args.includes('--auto-apply');

  const update = buildUpdate();

  if (update.updates.length === 0) {
    console.log('No brain updates suggested.');
    return;
  }

  if (write || autoApply) {
    ensureDir(INCOMING_ROOT);
    if (autoApply) update.auto_apply = true;
    const filename = `${today()}_watch-brain_${Date.now()}.json`;
    const filepath = path.join(INCOMING_ROOT, filename);
    fs.writeFileSync(filepath, JSON.stringify(update, null, 2));
    console.log(`Wrote ${update.updates.length} suggested updates to ${filepath}`);
  } else {
    console.log(JSON.stringify(update, null, 2));
  }
}

main();
