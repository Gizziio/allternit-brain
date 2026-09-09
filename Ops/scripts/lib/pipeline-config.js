#!/usr/bin/env node

/**
 * Allternit Brain — research pipeline config reader (CJS)
 *
 * Loads Ops/config/research-pipeline.json deep-merged over the built-in
 * defaults, so a missing or partial config file still yields a complete
 * config. Plain CJS because the .sh pipeline scripts call node with require.
 *
 *   const { loadConfig } = require('./lib/pipeline-config');
 *   const config = loadConfig();              // brain root derived from here
 *   const config = loadConfig(brainRoot);     // explicit root
 *
 * Brain root resolution: explicit arg > process.env.BRAIN_ROOT > derived
 * from this file's location (Ops/scripts/lib/../../..).
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  autonomy: {
    mode: 'shadow',
    harness: 'auto',
    sweep_max_items: 3,
    execute_max_per_day: 3,
    execute_max_concurrent: 1,
    tier_ceiling: 'A://C',
    review_sendback_limit: 1,
    execution_timeout_minutes: 90,
  },
  schedule: { mechanical: '09:05', agent_sweep: '21:37' },
  notify: { macos: true, rails_mail: true },
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function defaultBrainRoot() {
  if (process.env.BRAIN_ROOT) return path.resolve(process.env.BRAIN_ROOT);
  return path.resolve(__dirname, '..', '..', '..');
}

function loadConfig(brainRoot) {
  const root = path.resolve(brainRoot || defaultBrainRoot());
  const configPath = path.join(root, 'Ops', 'config', 'research-pipeline.json');
  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      throw new Error(`Invalid JSON in ${configPath}: ${err.message}`);
    }
  }
  return deepMerge(DEFAULTS, fileConfig);
}

module.exports = { loadConfig, DEFAULTS };
