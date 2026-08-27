#!/usr/bin/env node

/**
 * Allternit Brain — install git hooks in sibling repos
 *
 * Installs post-commit hooks that keep the brain in sync with source repos.
 *
 * Usage:
 *   node install-hooks.js
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const ALLTERNIT_ROOT = path.join(HOME, 'Desktop', 'Allternit');
const HOOKS_DIR = path.join(ALLTERNIT_ROOT, 'Allternit Brain', 'Ops', 'scripts', 'git-hooks');

const HOOK_TARGETS = [
  {
    repo: path.join(ALLTERNIT_ROOT, 'Allternit Websites'),
    hook: 'post-commit-websites',
    targetName: 'post-commit',
  },
  {
    repo: path.join(ALLTERNIT_ROOT, 'Allternit Brain'),
    hook: 'post-commit-brain',
    targetName: 'post-commit',
  },
];

function installHook(target) {
  const gitDir = path.join(target.repo, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log(`SKIP: not a git repo: ${target.repo}`);
    return;
  }
  const hooksDir = path.join(gitDir, 'hooks');
  ensureDir(hooksDir);
  const source = path.join(HOOKS_DIR, target.hook);
  const dest = path.join(hooksDir, target.targetName);
  fs.copyFileSync(source, dest);
  fs.chmodSync(dest, 0o755);
  console.log(`INSTALLED: ${dest}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  for (const target of HOOK_TARGETS) {
    installHook(target);
  }
}

main();
