#!/usr/bin/env node

/**
 * Allternit Brain — apply structured updates
 *
 * Reads brain-update JSON files from Allternit Brain/.incoming/ and applies them
 * to the right brain docs. This is the execution half of the automatic pipeline:
 * agents and repo watchers produce update files; this script applies them safely.
 *
 * Usage:
 *   node apply-brain-updates.js [--dry-run] [--file <path>]
 *
 * Without --file, it processes every *.json in Allternit Brain/.incoming/ in
 * filename order and moves applied files to .incoming/applied/.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const BRAIN_ROOT = path.join(HOME, 'Desktop', 'Allternit', 'Allternit Brain');
const INCOMING_ROOT = path.join(BRAIN_ROOT, '.incoming');
const APPLIED_ROOT = path.join(INCOMING_ROOT, 'applied');
const TEMPLATES_ROOT = path.join(BRAIN_ROOT, 'Templates');

const VALID_ACTIONS = ['append', 'ensure-section', 'replace-field', 'create-or-replace'];
const REQUIRED_FRONTMATTER_KEYS = ['doc', 'updated', 'status'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function resolveBrainDoc(relPath) {
  const resolved = path.resolve(BRAIN_ROOT, relPath);
  if (!resolved.startsWith(BRAIN_ROOT + path.sep) && resolved !== BRAIN_ROOT) {
    throw new Error(`Path escapes brain root: ${relPath}`);
  }
  return resolved;
}

function hasFrontmatter(text) {
  return /^---\s*\n([\s\S]*?)\n---\s*\n/.test(text);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fm;
}

function updateFrontmatter(text, key, value) {
  const match = text.match(/^(---\s*\n[\s\S]*?\n---\s*\n)/);
  if (!match) return text;
  const fmText = match[1];
  const updatedFm = fmText.replace(
    new RegExp(`^(${key}:).*$`, 'm'),
    `$1 ${value}`
  );
  return text.replace(fmText, updatedFm);
}

function applyUpdate(docPath, update) {
  const fullPath = resolveBrainDoc(docPath);
  const action = update.action;

  if (action === 'create-or-replace') {
    ensureDir(path.dirname(fullPath));
    let content = update.content || '';
    if (!hasFrontmatter(content)) {
      const templateName = update.template || 'company.md';
      const templatePath = path.join(TEMPLATES_ROOT, templateName);
      const template = fs.existsSync(templatePath)
        ? fs.readFileSync(templatePath, 'utf8')
        : `---\ndoc: company\nupdated: YYYY-MM-DD\nstatus: draft\n---\n\n`;
      content = template.replace(/updated: YYYY-MM-DD/, `updated: ${today()}`) + '\n' + content;
    } else {
      content = updateFrontmatter(content, 'updated', today());
    }
    fs.writeFileSync(fullPath, content);
    return { created: true };
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Doc does not exist (use create-or-replace): ${docPath}`);
  }

  let text = fs.readFileSync(fullPath, 'utf8');

  switch (action) {
    case 'append': {
      const suffix = update.content || '';
      if (text.includes(suffix.trim())) {
        return { unchanged: true, reason: 'content already present' };
      }
      text = text.trimEnd() + '\n\n' + suffix + '\n';
      break;
    }

    case 'ensure-section': {
      const section = update.section.replace(/^#+\s*/, '').trim();
      const content = update.content || '';
      const sectionRe = new RegExp(`^(##?#?\\s*${escapeRegex(section)})`, 'm');
      if (!sectionRe.test(text)) {
        throw new Error(`Section "${section}" not found in ${docPath}`);
      }
      if (text.includes(content.trim())) {
        return { unchanged: true, reason: 'content already present' };
      }
      // Insert after the section header (and any existing blank lines)
      text = text.replace(
        new RegExp(`^(##?#?\\s*${escapeRegex(section)}.*\\n(?:\\n)?)`, 'm'),
        `$1${content}\n`
      );
      break;
    }

    case 'replace-field': {
      const fieldRegex = new RegExp(update.field_regex, 'm');
      if (!fieldRegex.test(text)) {
        throw new Error(`Field regex did not match in ${docPath}: ${update.field_regex}`);
      }
      text = text.replace(fieldRegex, update.content);
      break;
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  text = updateFrontmatter(text, 'updated', today());
  fs.writeFileSync(fullPath, text);
  return { updated: true };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateUpdateFile(data) {
  if (!data || typeof data !== 'object') throw new Error('Update file must be an object');
  if (!data.source) throw new Error('Missing "source"');
  if (!Array.isArray(data.updates)) throw new Error('Missing "updates" array');
  for (const u of data.updates) {
    if (!u.doc) throw new Error('Update missing "doc"');
    if (!VALID_ACTIONS.includes(u.action)) {
      throw new Error(`Invalid action "${u.action}" for ${u.doc}`);
    }
    if (!u.content && u.action !== 'create-or-replace') {
      throw new Error(`Update for ${u.doc} missing "content"`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArgIdx = args.indexOf('--file');
  const singleFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;

  ensureDir(INCOMING_ROOT);
  ensureDir(APPLIED_ROOT);

  const files = singleFile
    ? [singleFile]
    : fs
        .readdirSync(INCOMING_ROOT)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(INCOMING_ROOT, f))
        .sort();

  if (files.length === 0) {
    console.log('No incoming brain updates to apply.');
    return;
  }

  const results = [];
  for (const file of files) {
    const basename = path.basename(file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
      validateUpdateFile(data);
    } catch (err) {
      results.push({ file: basename, error: err.message });
      continue;
    }

    const fileResults = [];
    if (dryRun) {
      console.log(`[DRY RUN] ${basename} from ${data.source} (${data.updates.length} updates)`);
    }
    for (const update of data.updates) {
      try {
        if (dryRun) {
          console.log(`  would ${update.action} → ${update.doc}`);
          fileResults.push({ doc: update.doc, action: update.action, dryRun: true });
        } else {
          const result = applyUpdate(update.doc, update);
          fileResults.push({ doc: update.doc, action: update.action, ...result });
        }
      } catch (err) {
        fileResults.push({ doc: update.doc, action: update.action, error: err.message });
      }
    }

    const hasErrors = fileResults.some((r) => r.error);
    const isIncoming = path.resolve(file).startsWith(INCOMING_ROOT + path.sep);

    if (!dryRun && !hasErrors && isIncoming) {
      const appliedPath = path.join(APPLIED_ROOT, `${today()}_${basename}`);
      fs.renameSync(file, appliedPath);
    }

    results.push({ file: basename, source: data.source, results: fileResults });
  }

  console.log(JSON.stringify(results, null, 2));

  const errors = results.filter((r) => r.error || r.results?.some((x) => x.error));
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
