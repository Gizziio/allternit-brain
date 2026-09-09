#!/usr/bin/env node
/**
 * Allternit Brain — research queue integrity check
 *
 * Reports (and optionally fails) when:
 *   - item.spec points at a missing file
 *   - status/spec disagree (e.g. spec_ready without a real spec file;
 *     researched/spec_ready/approved+ with a dangling phantom path)
 *
 * Usage:
 *   node research-queue-integrity.js [--queue <path>] [--json] [--strict]
 *
 * Exit 0 when clean (or only warnings without --strict).
 * Exit 1 when --strict and any issue is found.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAIN_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_QUEUE = path.join(BRAIN_ROOT, 'Research', 'queue.json');

const STATUSES_EXPECTING_SPEC = new Set([
  'spec_ready',
  'approved',
  'executing',
  'pr_open',
  'quarantined',
]);

function argValue(args, flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : fallback;
}

function resolveSpec(spec) {
  if (!spec) return null;
  if (path.isAbsolute(spec)) return spec;
  return path.join(BRAIN_ROOT, spec);
}

function main() {
  const args = process.argv.slice(2);
  const queuePath = argValue(args, '--queue', DEFAULT_QUEUE);
  const asJson = args.includes('--json');
  const strict = args.includes('--strict');

  if (!fs.existsSync(queuePath)) {
    console.error(`Queue not found: ${queuePath}`);
    process.exit(1);
  }

  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const items = queue.items || [];
  const issues = [];

  for (const item of items) {
    const id = item.id || '(no-id)';
    const status = item.status || '(no-status)';
    const spec = item.spec || null;
    const abs = resolveSpec(spec);
    const exists = abs ? fs.existsSync(abs) : false;

    if (spec && !exists) {
      issues.push({
        id,
        kind: 'dangling_spec',
        severity: 'error',
        message: `spec path missing on disk: ${spec}`,
        status,
        spec,
      });
    }

    if (STATUSES_EXPECTING_SPEC.has(status) && !spec) {
      issues.push({
        id,
        kind: 'status_spec_disagree',
        severity: 'error',
        message: `status=${status} but spec is null`,
        status,
        spec,
      });
    }

    if (STATUSES_EXPECTING_SPEC.has(status) && spec && !exists) {
      issues.push({
        id,
        kind: 'status_spec_disagree',
        severity: 'error',
        message: `status=${status} but spec file missing`,
        status,
        spec,
      });
    }

    // Soft: researched with a real spec is unusual (usually would be spec_ready)
    if (status === 'researched' && spec && exists) {
      issues.push({
        id,
        kind: 'status_spec_disagree',
        severity: 'warn',
        message: `status=researched but a real spec exists (${spec}); consider promoting to spec_ready`,
        status,
        spec,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warns = issues.filter((i) => i.severity === 'warn');
  const summary = {
    ok: errors.length === 0,
    items: items.length,
    errors: errors.length,
    warnings: warns.length,
    issues,
  };

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      `research-queue-integrity: ${items.length} item(s), ${errors.length} error(s), ${warns.length} warning(s)`
    );
    for (const i of issues) {
      console.log(`  [${i.severity}] ${i.id}: ${i.message}`);
    }
    if (issues.length === 0) console.log('  clean');
  }

  if (strict && errors.length > 0) process.exit(1);
}

main();
