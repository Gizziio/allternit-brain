#!/usr/bin/env node

/**
 * Allternit Brain — cross-link validator
 *
 * Checks that relative markdown links in the Brain resolve to existing files.
 * Exits with non-zero code if any broken links are found.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const BRAIN_ROOT = path.join(HOME, 'Desktop', 'Allternit', 'Allternit Brain');

function findMarkdownFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...findMarkdownFiles(full));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function extractLinks(text) {
  const links = [];
  // Markdown links: [text](url)
  const mdRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdRe.exec(text)) !== null) {
    links.push({ text: m[1], url: m[2] });
  }
  return links;
}

function resolveLink(sourceFile, linkUrl) {
  if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('#')) {
    return null; // external or anchor only — skip
  }
  // Strip anchor
  const [url] = linkUrl.split('#');
  if (!url) return null;
  // URL-decode spaces encoded as %20
  const decoded = decodeURIComponent(url);
  const resolved = path.resolve(path.dirname(sourceFile), decoded);
  return resolved;
}

function main() {
  const files = findMarkdownFiles(BRAIN_ROOT);
  let broken = 0;
  const results = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const links = extractLinks(text);
    for (const link of links) {
      const target = resolveLink(file, link.url);
      if (!target) continue;
      if (!fs.existsSync(target)) {
        broken++;
        results.push({
          source: path.relative(BRAIN_ROOT, file),
          linkText: link.text,
          url: link.url,
        });
      }
    }
  }

  if (broken === 0) {
    console.log('validate-links: OK — no broken relative links');
    process.exit(0);
  }

  console.error(`validate-links: ${broken} broken relative link(s)`);
  for (const r of results) {
    console.error(`  ${r.source} -> "${r.linkText}" (${r.url})`);
  }
  process.exit(1);
}

main();
