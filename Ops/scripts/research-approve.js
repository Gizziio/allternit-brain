#!/usr/bin/env node

/**
 * Allternit Brain — research gate approval CLI
 *
 * Human gate for the research pipeline: moves a spec_ready queue item to
 * approved (see Ops/scripts/lib/research-approve-lib.js for the rules).
 *
 * Usage:
 *   node research-approve.js <slug> [--note "..."]     approve one item
 *   node research-approve.js --list                    items awaiting the gate
 *   node research-approve.js --consume-all             apply dropped .approve files
 *
 * File approvals: drop `Research/gate/approvals/<slug>.approve` (optional
 * one-line note as content) and run --consume-all. Consumed files move to
 * Research/gate/approvals/applied/<slug>.<ts>.approve.
 *
 * `--queue <path>` points at a different queue.json (tests/fixtures). The
 * lib always reads Research/queue.json under its brain root, so a custom
 * queue is staged into a temp brain root and copied back after each call.
 * BRAIN_ROOT overrides the default brain root (default: derived from this
 * script's location).
 *
 * Exits 0 on success / already-approved, 1 on rejection or usage error.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lib = require(path.join(__dirname, 'lib', 'research-approve-lib.js'));

const DEFAULT_BRAIN_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_QUEUE = path.join(DEFAULT_BRAIN_ROOT, 'Research', 'queue.json');

function argValue(args, flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : fallback;
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function resolveContext(args) {
  const queueOverride = argValue(args, '--queue', null);
  const brainRoot = process.env.BRAIN_ROOT
    ? path.resolve(process.env.BRAIN_ROOT)
    : DEFAULT_BRAIN_ROOT;
  return { brainRoot, queueOverride: queueOverride ? path.resolve(queueOverride) : null };
}

// Run fn(brainRoot) with the lib pointed at ctx's queue: either directly
// (default queue) or via a temp brain root whose Research/queue.json is a
// copy of the override, synced back afterwards. The temp dir is removed
// either way.
function withQueueCtx(ctx, fn) {
  if (!ctx.queueOverride) return fn(ctx.brainRoot);
  if (!fs.existsSync(ctx.queueOverride)) {
    throw new Error(`Queue not found: ${ctx.queueOverride}`);
  }
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-approve-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'Research'), { recursive: true });
    fs.copyFileSync(ctx.queueOverride, path.join(tmpRoot, 'Research', 'queue.json'));
    const result = fn(tmpRoot);
    fs.copyFileSync(path.join(tmpRoot, 'Research', 'queue.json'), ctx.queueOverride);
    return result;
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function fmtItem(item) {
  return `${item.id}  status=${item.status}  spec=${item.spec}`;
}

function cmdList(ctx) {
  const gate = withQueueCtx(ctx, (root) => lib.listGate(root));
  if (gate.length === 0) {
    console.log('Gate is clear: no spec_ready items awaiting approval.');
    return 0;
  }
  console.log(`Awaiting approval (${gate.length}):`);
  for (const g of gate) console.log(`- ${g.slug}  (${g.id})  ${g.spec}`);
  return 0;
}

function positionalArgs(args) {
  const valueFlags = new Set(['--queue', '--note']);
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (valueFlags.has(args[i])) {
      i++; // skip this flag's value
      continue;
    }
    if (!args[i].startsWith('--')) out.push(args[i]);
  }
  return out;
}

function cmdApprove(args, ctx) {
  const slug = positionalArgs(args)[0];
  if (!slug) {
    console.error('Usage: node research-approve.js <slug> [--note "..."] [--queue <path>]');
    return 1;
  }
  const note = argValue(args, '--note', null);
  const result = withQueueCtx(ctx, (root) =>
    lib.approve(root, slug, { note, by: 'cli' })
  );
  if (!result.ok) {
    console.error(`REJECTED ${slug}: ${result.reason}`);
    return 1;
  }
  if (result.reason === 'already-approved') {
    console.log(`OK ${slug}: already-approved (no change)`);
    console.log(`  ${fmtItem(result.item)}`);
    return 0;
  }
  console.log(`APPROVED ${slug}`);
  console.log(`  ${fmtItem(result.item)}`);
  console.log('  Next: executor may be spawned for this item.');
  return 0;
}

function cmdConsumeAll(ctx) {
  const approvalsDir = path.join(ctx.brainRoot, 'Research', 'gate', 'approvals');
  const appliedDir = path.join(approvalsDir, 'applied');
  const summary = { approved: [], rejected: [] };

  let files = [];
  if (fs.existsSync(approvalsDir)) {
    files = fs
      .readdirSync(approvalsDir)
      .filter((f) => f.endsWith('.approve'))
      .sort();
  }

  for (const file of files) {
    const filePath = path.join(approvalsDir, file);
    const slug = file.replace(/\.approve$/, '');
    const note = fs.readFileSync(filePath, 'utf8').split('\n')[0].trim() || null;
    const result = withQueueCtx(ctx, (root) =>
      lib.approve(root, slug, { note, by: 'file-drop' })
    );
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.mkdirSync(appliedDir, { recursive: true });
    fs.renameSync(filePath, path.join(appliedDir, `${slug}.${ts}.approve`));
    if (result.ok) {
      summary.approved.push(slug);
    } else {
      summary.rejected.push({ slug, reason: result.reason });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  return summary.rejected.length > 0 ? 1 : 0;
}

function main() {
  const args = process.argv.slice(2);
  const ctx = resolveContext(args);
  const effectiveQueue = ctx.queueOverride || path.join(ctx.brainRoot, 'Research', 'queue.json');
  if (!fs.existsSync(effectiveQueue)) {
    console.error(`Queue not found: ${effectiveQueue}`);
    process.exit(1);
  }
  if (hasFlag(args, '--list')) process.exit(cmdList(ctx));
  if (hasFlag(args, '--consume-all')) process.exit(cmdConsumeAll(ctx));
  process.exit(cmdApprove(args, ctx));
}

main();
