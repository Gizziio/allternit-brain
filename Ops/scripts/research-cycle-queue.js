#!/usr/bin/env node
// research-cycle-queue.js — Research/queue.json state ops for research-pipeline-cycle.sh
//
// env: BRAIN_ROOT (required), QUEUE (optional override)
//
// commands:
//   counts                                  → "approved=N executing=M spawned_today=S spec_ready=K total=T"
//   shadow --max-day N --max-conc M         → cap report + `would_execute <id> <slug> <spec>` +
//                                             `awaiting_approval <id> <slug>` lines (queue order)
//   event <id> <event> [key=value ...]      → set fields + append history {ts, event, by}
//
// Every mutation appends a history event and writes the queue atomically.
//
// ESM (Ops/package.json is "type": "module").
import fs from 'fs';
import path from 'path';

const BRAIN_ROOT = process.env.BRAIN_ROOT || process.cwd();
const QUEUE = process.env.QUEUE || path.join(BRAIN_ROOT, 'Research', 'queue.json');
const BY = 'research-pipeline-cycle';

function load() {
  return JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
}

function save(q) {
  const tmp = `${QUEUE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(q, null, 2)}\n`);
  fs.renameSync(tmp, QUEUE);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function item(q, id) {
  const it = (q.items || []).find(i => i.id === id);
  if (!it) {
    console.error(`no queue item ${id}`);
    process.exit(1);
  }
  return it;
}

function addHistory(it, event, extra) {
  it.history = it.history || [];
  it.history.push(Object.assign({ ts: new Date().toISOString(), event, by: BY }, extra));
}

function slugOf(it) {
  if (it.slug) return it.slug;
  if (it.spec) return path.basename(it.spec).replace(/\.md$/, '');
  return it.id;
}

function counters(items) {
  let approved = 0;
  let executing = 0;
  let specReady = 0;
  let spawnedToday = 0;
  for (const it of items) {
    if (it.status === 'approved') approved += 1;
    if (it.status === 'executing') executing += 1;
    if (it.status === 'spec_ready') specReady += 1;
    for (const h of it.history || []) {
      if (h.event === 'spawned' && String(h.ts || '').startsWith(today())) spawnedToday += 1;
    }
  }
  return { approved, executing, specReady, spawnedToday };
}

const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case 'counts': {
    const items = load().items || [];
    const c = counters(items);
    console.log(`approved=${c.approved} executing=${c.executing} spawned_today=${c.spawnedToday} spec_ready=${c.specReady} total=${items.length}`);
    break;
  }

  case 'shadow': {
    const maxDay = Number(args[args.indexOf('--max-day') + 1] || 2);
    const maxConc = Number(args[args.indexOf('--max-conc') + 1] || 1);
    const items = load().items || [];
    const c = counters(items);
    console.log(`spawned_today=${c.spawnedToday} executing=${c.executing} max_per_day=${maxDay} max_concurrent=${maxConc}`);
    const room = Math.min(Math.max(0, maxDay - c.spawnedToday), Math.max(0, maxConc - c.executing));
    for (const it of items.filter(i => i.status === 'approved').slice(0, room)) {
      console.log(`would_execute ${it.id} ${slugOf(it)} ${it.spec || ''}`);
    }
    for (const it of items.filter(i => i.status === 'spec_ready')) {
      console.log(`awaiting_approval ${it.id} ${slugOf(it)}`);
    }
    break;
  }

  case 'event': {
    const [id, event, ...kvs] = args;
    const q = load();
    const it = item(q, id);
    const fields = {};
    for (const kv of kvs) {
      const i = kv.indexOf('=');
      if (i > 0) fields[kv.slice(0, i)] = kv.slice(i + 1);
    }
    for (const [k, v] of Object.entries(fields)) it[k] = v;
    addHistory(it, event, fields);
    save(q);
    console.log(`${id}: ${event}`);
    break;
  }

  default:
    console.error('usage: research-cycle-queue.js counts | shadow --max-day N --max-conc M | event <id> <event> [k=v...]');
    process.exit(2);
}
