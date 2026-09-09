#!/usr/bin/env node

/**
 * Allternit Brain — research gate approval library (CJS)
 *
 * The single implementation behind every approval path (CLI, MCP tool,
 * dropped .approve files). Slugs are derived from a queue item's spec path:
 * "Research/specs/app-store-connect-cli.md" → slug "app-store-connect-cli".
 * An item's id (e.g. "rq-20260908-004") is accepted as an alias.
 *
 *   const lib = require('./lib/research-approve-lib');
 *   lib.approve(brainRoot, slug, { note, by, source });
 *   lib.listGate(brainRoot);
 *
 * approve() → { ok, reason?, item? }:
 *   - item missing                    → ok:false, "no queue item matches slug"
 *   - status "approved"               → ok:true,  reason "already-approved"
 *   - any status other than spec_ready → ok:false, names the actual status
 *   - spec file missing on disk        → ok:false, names the path
 *   - success                          → status approved + history event,
 *                                        queue.json rewritten, ok:true
 */

const fs = require('fs');
const path = require('path');

function queuePath(brainRoot) {
  return path.join(brainRoot, 'Research', 'queue.json');
}

function loadQueue(brainRoot) {
  const qpath = queuePath(brainRoot);
  if (!fs.existsSync(qpath)) {
    throw new Error(`Queue not found: ${qpath}`);
  }
  return JSON.parse(fs.readFileSync(qpath, 'utf8'));
}

function saveQueue(brainRoot, queue) {
  fs.writeFileSync(queuePath(brainRoot), JSON.stringify(queue, null, 2) + '\n');
}

function slugForItem(item) {
  if (!item.spec) return null;
  return path.basename(String(item.spec)).replace(/\.md$/i, '');
}

function findItem(queue, slug) {
  return (queue.items || []).find(
    (item) => slugForItem(item) === slug || item.id === slug
  );
}

function specAbsPath(brainRoot, item) {
  return path.isAbsolute(item.spec)
    ? item.spec
    : path.join(brainRoot, item.spec);
}

function approve(brainRoot, slug, options = {}) {
  const root = path.resolve(brainRoot);
  const { note = null, by = null, source = null } = options || {};
  const queue = loadQueue(root);
  const item = findItem(queue, slug);

  if (!item) {
    return { ok: false, reason: `no queue item matches slug "${slug}"` };
  }
  if (item.status === 'approved') {
    return { ok: true, reason: 'already-approved', item };
  }
  if (item.status !== 'spec_ready') {
    return {
      ok: false,
      reason: `"${slugForItem(item) || item.id}" has status "${item.status}" — expected spec_ready`,
    };
  }
  if (!item.spec || !fs.existsSync(specAbsPath(root, item))) {
    return { ok: false, reason: `spec file missing: ${item.spec}` };
  }

  item.status = 'approved';
  (item.history = item.history || []).push({
    ts: new Date().toISOString(),
    event: 'approved',
    by: by || source || 'unknown',
    note: note || null,
  });
  saveQueue(root, queue);
  return { ok: true, item };
}

function listGate(brainRoot) {
  const queue = loadQueue(path.resolve(brainRoot));
  return (queue.items || [])
    .filter((item) => item.status === 'spec_ready')
    .map((item) => ({ slug: slugForItem(item), id: item.id, spec: item.spec }));
}

module.exports = { approve, listGate, slugForItem };
