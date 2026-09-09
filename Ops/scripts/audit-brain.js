#!/usr/bin/env node

/**
 * Allternit Brain — audit ritual
 *
 * Scans all markdown files under Allternit Brain for required YAML frontmatter and freshness.
 * Flags:
 *   - missing `doc:` or `updated:` frontmatter
 *   - `updated:` values older than 30 days
 *   - `status:` values that are empty or unrecognized
 *
 * Run manually:
 *   node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/audit-brain.js"
 *
 * Run via the allternit-ops MCP server (future):
 *   tool: brain_audit
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const BRAIN_ROOT = path.join(HOME, 'Desktop', 'Allternit', 'Allternit Brain');
const STALE_DAYS = 30;
const VALID_STATUSES = ['draft', 'active', 'completing', 'paused', 'archived', 'stable'];

function walkMarkdownFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.incoming') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return null;
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    frontmatter[key] = value;
  }
  return frontmatter;
}

function daysSince(dateStr) {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return NaN;
  const diff = Date.now() - parsed.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function main() {
  const files = walkMarkdownFiles(BRAIN_ROOT);
  const missing = [];
  const stale = [];
  const invalidStatus = [];
  const templatePlaceholders = [];
  let okCount = 0;

  for (const file of files) {
    const rel = path.relative(BRAIN_ROOT, file);
    const text = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(text);

    if (!fm || !fm.doc || !fm.updated) {
      missing.push(rel);
      continue;
    }

    if (fm.updated === 'YYYY-MM-DD') {
      templatePlaceholders.push(`${rel} (template placeholder date)`);
    } else {
      const age = daysSince(fm.updated);
      if (isNaN(age)) {
        invalidStatus.push(`${rel} (updated: "${fm.updated}" is not a valid date)`);
      } else if (age > STALE_DAYS) {
        stale.push(`${rel} (${age} days old)`);
      }
    }

    if (!fm.status) {
      invalidStatus.push(`${rel} (missing status)`);
    } else if (!VALID_STATUSES.includes(fm.status)) {
      invalidStatus.push(`${rel} (status: "${fm.status}" not in [${VALID_STATUSES.join(', ')}])`);
    }

    if (
      !stale.some((s) => s.startsWith(rel)) &&
      !invalidStatus.some((s) => s.startsWith(rel)) &&
      !templatePlaceholders.some((s) => s.startsWith(rel))
    ) {
      okCount++;
    }
  }

  console.log(`Allternit Brain audit`);
  console.log(`Root: ${BRAIN_ROOT}`);
  console.log(`Scanned: ${files.length} markdown files`);
  console.log(`OK: ${okCount}`);
  console.log(`Template placeholders (expected): ${templatePlaceholders.length}`);
  for (const t of templatePlaceholders) console.log(`  - ${t}`);
  console.log(`Stale (> ${STALE_DAYS} days): ${stale.length}`);
  for (const s of stale) console.log(`  - ${s}`);
  console.log(`Missing required frontmatter (doc / updated): ${missing.length}`);
  for (const m of missing) console.log(`  - ${m}`);
  console.log(`Invalid status or date: ${invalidStatus.length}`);
  for (const i of invalidStatus) console.log(`  - ${i}`);

  if (stale.length > 0 || missing.length > 0 || invalidStatus.length > 0) {
    process.exitCode = 1;
  }
}

main();
