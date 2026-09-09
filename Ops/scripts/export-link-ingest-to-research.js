#!/usr/bin/env node
/**
 * Export link-ingest inbox cards to Research/.incoming/links.md
 *
 * Reads Projects/link-ingest/inbox/ (recursive li-*.md) cards with a non-empty
 * url and bucket in {allternit, website}, appends "url note" lines to the
 * research drop file (dedupe vs existing non-comment lines by normalized URL).
 * Does not run ingest-research.js — call that next.
 *
 * Usage:
 *   node export-link-ingest-to-research.js [--inbox <dir>] [--drop <file>] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAIN_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_INBOX = path.join(BRAIN_ROOT, 'Projects', 'link-ingest', 'inbox');
const DEFAULT_DROP = path.join(BRAIN_ROOT, 'Research', '.incoming', 'links.md');
const ALLOWED_BUCKETS = new Set(['allternit', 'website']);

function argValue(args, flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : fallback;
}

/** Same rules as ingest-research.js — keep in sync. */
function normalizeUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  parsed.hostname = parsed.hostname.toLowerCase();
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.startsWith('utm_') || key === 'fbclid') parsed.searchParams.delete(key);
  }
  let out = parsed.toString();
  if (parsed.search === '') out = out.replace(/\/$/, '');
  return out;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = raw.slice(4, end);
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function walkCards(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkCards(full, acc);
    else if (name.startsWith('li-') && name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function existingDropUrls(dropPath) {
  const set = new Set();
  if (!fs.existsSync(dropPath)) return set;
  for (const line of fs.readFileSync(dropPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const url = trimmed.split(/\s+/)[0];
    const n = normalizeUrl(url);
    if (n) set.add(n);
  }
  return set;
}

function main() {
  const args = process.argv.slice(2);
  const inbox = argValue(args, '--inbox', DEFAULT_INBOX);
  const dropPath = argValue(args, '--drop', DEFAULT_DROP);
  const dryRun = args.includes('--dry-run');

  const seen = existingDropUrls(dropPath);
  // Also skip URLs already in the research queue (normalized).
  const queuePath = path.join(BRAIN_ROOT, 'Research', 'queue.json');
  if (fs.existsSync(queuePath)) {
    try {
      const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      for (const item of q.items || []) {
        const n = normalizeUrl(item.url);
        if (n) seen.add(n);
      }
    } catch {
      /* ignore bad queue */
    }
  }
  const lines = [];
  let scanned = 0;
  let skippedBucket = 0;
  let skippedNoUrl = 0;
  let skippedDup = 0;

  for (const file of walkCards(inbox).sort()) {
    scanned++;
    const fm = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!fm) continue;
    const url = (fm.url || '').trim();
    if (!url) {
      skippedNoUrl++;
      continue;
    }
    const bucket = (fm.bucket || '').trim();
    if (!ALLOWED_BUCKETS.has(bucket)) {
      skippedBucket++;
      continue;
    }
    const n = normalizeUrl(url);
    if (!n) {
      skippedNoUrl++;
      continue;
    }
    if (seen.has(n)) {
      skippedDup++;
      continue;
    }
    seen.add(n);
    const id = fm.id || path.basename(file, '.md');
    const title = fm.title || '';
    const note = [id, title].filter(Boolean).join(' — ');
    lines.push(`${url} ${note}`.trim());
  }

  if (lines.length && !dryRun) {
    fs.mkdirSync(path.dirname(dropPath), { recursive: true });
    let existing = fs.existsSync(dropPath) ? fs.readFileSync(dropPath, 'utf8') : '';
    if (!existing.trim()) {
      existing =
        '# Research link drop — one URL per line; optional note after URL. Lines starting with # are comments.\n';
    } else if (!existing.endsWith('\n')) {
      existing += '\n';
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const chunk =
      `# exported from link-ingest ${stamp}\n` + lines.map((l) => `${l}\n`).join('');
    fs.writeFileSync(dropPath, existing + chunk);
  }

  console.log(
    JSON.stringify(
      {
        scanned,
        appended: lines.length,
        skippedNoUrl,
        skippedBucket,
        skippedDup,
        drop: dropPath,
        dryRun,
        sample: lines.slice(0, 5),
      },
      null,
      2
    )
  );
}

main();
