#!/usr/bin/env node

/**
 * Allternit Brain — research pipeline link ingest
 *
 * First step of every research-pipeline sweep. Consumes:
 *   - Research/.incoming/links.md  — the human drop file (one URL per line,
 *     optional free-text note after the URL; # lines are comments)
 *   - Research/.incoming/draft-*.json with "kind": "research_ingest" —
 *     links submitted via the research_ingest MCP tool
 *
 * Dedupes against Research/queue.json by normalized URL (lowercase host,
 * trailing slash stripped, utm_* / fbclid params stripped), appends new
 * entries as status "inbox", then archives the consumed inputs to
 * .incoming/applied/ and recreates an empty drop file.
 *
 * Usage:
 *   node ingest-research.js [--queue <path>] [--incoming <path>]
 *
 * Defaults derive from the script's location, not cwd. Exits 0 on success
 * and prints a one-line summary.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAIN_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_QUEUE = path.join(BRAIN_ROOT, 'Research', 'queue.json');
const DEFAULT_INCOMING = path.join(BRAIN_ROOT, 'Research', '.incoming');

function argValue(args, flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : fallback;
}

function todayCompact() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function nowIso() {
  return new Date().toISOString();
}

function archiveStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

// Lowercase host, strip trailing slash, strip utm_*/fbclid params.
// Returns null when the string is not an http(s) URL.
export function normalizeUrl(raw) {
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

function nextId(queue) {
  const day = todayCompact();
  const dayPrefix = `rq-${day}-`;
  let maxSeq = 0;
  for (const item of queue.items || []) {
    const match = item.id?.match(new RegExp(`^${dayPrefix}(\\d+)$`));
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  }
  return `${dayPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

function parseDropFile(incomingDir) {
  const dropPath = path.join(incomingDir, 'links.md');
  const inputs = [];
  if (!fs.existsSync(dropPath)) return { inputs, dropPath };
  const lines = fs.readFileSync(dropPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [url, ...rest] = trimmed.split(/\s+/);
    inputs.push({ url, note: rest.join(' ') || null, by: 'dropfile', source: null });
  }
  return { inputs, dropPath };
}

function parseMcpDrafts(incomingDir) {
  const inputs = [];
  const files = [];
  if (!fs.existsSync(incomingDir)) return { inputs, files };
  for (const name of fs.readdirSync(incomingDir).sort()) {
    if (!name.startsWith('draft-') || !name.endsWith('.json')) continue;
    const full = path.join(incomingDir, name);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch {
      continue; // not JSON we understand — leave it for other consumers
    }
    if (data?.kind !== 'research_ingest' || !data.url) continue;
    inputs.push({
      url: data.url,
      note: data.note || null,
      by: 'mcp',
      source: data.source || null,
    });
    files.push(full);
  }
  return { inputs, files };
}

function main() {
  const args = process.argv.slice(2);
  const queuePath = argValue(args, '--queue', DEFAULT_QUEUE);
  const incomingDir = argValue(args, '--incoming', DEFAULT_INCOMING);

  if (!fs.existsSync(queuePath)) {
    console.error(`Queue not found: ${queuePath}`);
    process.exit(1);
  }

  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  queue.items = queue.items || [];
  queue.version = queue.version || 1;

  const seen = new Set();
  for (const item of queue.items) {
    const norm = normalizeUrl(item.url);
    if (norm) seen.add(norm);
  }

  const { inputs: dropInputs, dropPath } = parseDropFile(incomingDir);
  const { inputs: draftInputs, files: draftFiles } = parseMcpDrafts(incomingDir);

  const incoming = [...dropInputs, ...draftInputs];
  const ts = nowIso();
  let added = 0;
  let dupes = 0;

  for (const input of incoming) {
    const norm = normalizeUrl(input.url);
    if (!norm) {
      console.error(`Skipping unparseable/non-http URL: ${input.url}`);
      continue;
    }
    if (seen.has(norm)) {
      dupes += 1;
      continue;
    }
    seen.add(norm);
    // Extract li_id from note when export format is "li-… — title"
    let liId = null;
    if (input.note) {
      const m = String(input.note).match(/\b(li-\d{8}-\d{3})\b/);
      if (m) liId = m[1];
    }
    const entry = {
      id: nextId(queue),
      url: input.url,
      note: input.note,
      title: null,
      category: null,
      status: 'inbox',
      spec: null,
      repo: null,
      worktree: null,
      branch: null,
      // Optional schema fields (default null) — see Projects/link-ingest/PIPELINE.md
      li_id: liId,
      decision: null,
      constraints_ok: null,
      paid_or_signup: null,
      docker_required: null,
      baseline_ref: null,
      area: null,
      history: [
        {
          ts,
          event: 'ingested',
          by: input.by,
          ...(input.source ? { source: input.source } : {}),
          ...(liId ? { li_id: liId } : {}),
        },
      ],
    };
    queue.items.push(entry);
    added += 1;
  }

  // Archive consumed inputs and recreate an empty drop file.
  const appliedDir = path.join(incomingDir, 'applied');
  fs.mkdirSync(appliedDir, { recursive: true });

  if (fs.existsSync(dropPath)) {
    fs.renameSync(dropPath, path.join(appliedDir, `links-${archiveStamp()}.md`));
    fs.writeFileSync(
      dropPath,
      '# Research pipeline — link drop file\n#\n# One URL per line. Everything after the first token on a line is treated as a\n# free-text note attached to the entry. Lines starting with # are ignored.\n#\n# The ingest script (Ops/scripts/ingest-research.js) consumes this file at the\n# start of every pipeline sweep: queued entries are archived to\n# .incoming/applied/ and this file is recreated empty.\n'
    );
  }
  for (const file of draftFiles) {
    fs.renameSync(file, path.join(appliedDir, path.basename(file)));
  }

  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n');

  console.log(
    `ingest-research: +${added} new, ${dupes} duplicate(s) skipped (${incoming.length} input line(s)/draft(s), queue now ${queue.items.length} item(s))`
  );
}

main();
