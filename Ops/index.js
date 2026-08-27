#!/usr/bin/env node

/**
 * Allternit Brain — Ops MCP server
 *
 * The single gateway for Allternit LLC business operations: Stripe, Cloudflare
 * Pages deploys, the company brain (Allternit Brain/), and new-client folder
 * setup. Lives inside Allternit Brain/Ops/ so agents can read brain knowledge
 * and act through one system. Every business-ops skill and delegated agent
 * should go through this instead of touching keys/wrangler/the brain directly.
 *
 * Money- and deploy-affecting tools default to a dry-run / preview mode and
 * require an explicit confirm: true to actually act — mirrors send_invoice.py's
 * own --dry-run default and the review-gate rule in company/business.md.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const HOME = os.homedir();
const ALLTERNIT_ROOT = path.join(HOME, 'Desktop', 'Allternit');
const BRAIN_ROOT = path.join(ALLTERNIT_ROOT, 'Allternit Brain');
const LLC_ROOT = path.join(ALLTERNIT_ROOT, 'Allternit LLC');
const CLIENT_OPS_ROOT = path.join(LLC_ROOT, '06 Client Ops And Contracts');
const TEMPLATE_ROOT = path.join(CLIENT_OPS_ROOT, 'business_ops_kit');
const REVENUE_OPS_ROOT = path.join(LLC_ROOT, '08 Revenue Operations');
const SEND_INVOICE_PY = path.join(REVENUE_OPS_ROOT, 'send_invoice.py');
const WEBSITES_ROOT = path.join(ALLTERNIT_ROOT, 'Allternit Websites');
const MODEL_ROUTING_PATH = path.join(ALLTERNIT_ROOT, 'Allternit Brain', 'Ops', 'model-routing.json');

// Known Cloudflare Pages projects — from Allternit Brain/infra/cloudflare.md.
// Deploys are restricted to this list so a typo can't push to the wrong project.
const KNOWN_PAGES_PROJECTS = [
  'allternit',
  'allternit-learning-labs',
  'allternit-services',
  'ai-allternit',
  'allternit-platform',
  'allternit-docs',
  'gizziio',
  'gizzi-code-docs',
  'install-allternit',
];

// Client-folder templates, in the numbered order the kickoff playbook expects
// (see 06 Client Ops And Contracts/00_New_Client_Kickoff_Playbook.md, Step 3's
// naming convention: "<Client>/04_Client_Intake_<Client>.md").
// If a matching .docx file exists next to the .md source, it is copied too.
const CLIENT_TEMPLATES = [
  { file: '01_Master_Services_Agreement.md', label: 'Master_Services_Agreement' },
  { file: '02_Statement_of_Work_Template.md', label: 'Statement_of_Work' },
  { file: '04_Client_Intake_Form.md', label: 'Client_Intake' },
  { file: '05_Mutual_NDA.md', label: 'Mutual_NDA' },
  { file: '06_Change_Order_Form.md', label: 'Change_Order_Form' },
  { file: '08_Support_and_SLA_Addendum.md', label: 'Support_and_SLA_Addendum' },
];

function getStripeKey() {
  try {
    const out = execFileSync(
      'security',
      ['find-generic-password', '-s', 'stripe-allternit', '-w'],
      { encoding: 'utf8' }
    ).trim();
    if (out.startsWith('rk_')) return out;
  } catch {
    // fall through to env
  }
  const envKey = process.env.STRIPE_KEY;
  if (!envKey) {
    throw new Error(
      'No Stripe key found: add it to the macOS Keychain (service "stripe-allternit") or set STRIPE_KEY.'
    );
  }
  return envKey;
}

async function stripeApi(pathSuffix, params) {
  const key = getStripeKey();
  const url = new URL('https://api.stripe.com/v1' + pathSuffix);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + key },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Stripe error on ${pathSuffix}: ${body?.error?.message || res.statusText}`
    );
  }
  return body;
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function resolveInsideBrain(relPath) {
  const resolved = path.resolve(BRAIN_ROOT, relPath);
  if (!resolved.startsWith(BRAIN_ROOT + path.sep) && resolved !== BRAIN_ROOT) {
    throw new Error('Path escapes the brain root — refusing to read.');
  }
  return resolved;
}

function walkMarkdownFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'allternit-ops', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: 'stripe_charges_enabled',
    description:
      'Check whether the Allternit Stripe account can currently accept charges (read-only). Returns charges_enabled and any pending verification requirements.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'stripe_list_recent_invoices',
    description: 'List recent Stripe invoices (read-only).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max invoices to return (default 10).' },
        customer: { type: 'string', description: 'Filter to a specific Stripe customer id (e.g. cus_...).' },
      },
      required: [],
    },
  },
  {
    name: 'stripe_send_invoice',
    description:
      'Draft (and optionally send) a Stripe invoice by wrapping send_invoice.py. Defaults to a dry run that creates the draft and prints totals without sending — pass confirm:true to actually finalize and send.',
    inputSchema: {
      type: 'object',
      properties: {
        lines_csv_path: { type: 'string', description: 'Path to a CSV of hours,description rows (one line item each). Use exactly one of lines_csv_path or hours.' },
        hours: { type: 'number', description: 'Single-line-item total hours. Use exactly one of lines_csv_path or hours.' },
        period: { type: 'string', description: 'Billing period label, e.g. "Jul 21 - Aug 3, 2026".' },
        customer: { type: 'string', description: 'Stripe customer id (default: swyft market, Inc.).' },
        rate: { type: 'number', description: 'Hourly rate in dollars (default 60).' },
        sow: { type: 'string', description: 'SOW reference for the invoice memo (default SOW-2026-001).' },
        confirm: { type: 'boolean', description: 'Set true to actually finalize and send. Omit or false to dry-run only.' },
      },
      required: [],
    },
  },
  {
    name: 'cloudflare_list_pages_projects',
    description: 'List Cloudflare Pages projects via wrangler (read-only).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'cloudflare_deploy_pages',
    description:
      'Deploy a directory to a known Cloudflare Pages project. Without confirm:true, only prints the command that would run — does not deploy.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', enum: KNOWN_PAGES_PROJECTS, description: 'Target Pages project name — must be one of the known projects.' },
        directory: { type: 'string', description: 'Directory to deploy, relative to the Allternit Websites repo root (e.g. "Projects/services.allternit.com/source").' },
        confirm: { type: 'boolean', description: 'Set true to actually run the deploy. Omit or false to preview the command only.' },
      },
      required: ['project', 'directory'],
    },
  },
  {
    name: 'brain_search',
    description: 'Search Allternit Brain markdown docs for a text query (case-insensitive substring match). Returns matching file paths, line numbers, and lines.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'brain_read',
    description: 'Read a specific Allternit Brain doc by path relative to the brain root (e.g. "company/offer.md").',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to Allternit Brain/, e.g. "company/offer.md".' },
      },
      required: ['path'],
    },
  },
  {
    name: 'model_route',
    description:
      "Look up which model tier/backend to use for a task class, per model-routing.json (Allternit's A:// tier policy). Only meaningful when explicitly spawning a subagent or an autonomous agent — an already-running interactive session stays on its own model.",
    inputSchema: {
      type: 'object',
      properties: {
        task_class: {
          type: 'string',
          description:
            'One of: classification, draft_generation, client_coding_work, quote_routine, architecture_or_novel_judgment, quote_tier_c_scoping, creative_or_long_form, guardrail_check. Omit to list all task classes.',
        },
      },
      required: [],
    },
  },
  {
    name: 'client_new_folder_skeleton',
    description:
      'Create a new client folder under Allternit LLC/06 Client Ops And Contracts/<Client>/ and copy in the standard business-ops-kit templates (MSA, SOW, Intake, NDA, Change Order, Support/SLA), named per the kickoff playbook convention. Does not create Stripe customers or send anything — those steps stay manual per the playbook.',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client folder name, e.g. "Acme_Corp" (use underscores, matching the Swyft_Market convention).' },
      },
      required: ['client_name'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'stripe_charges_enabled': {
        const account = await stripeApi('/account');
        return textResult(
          JSON.stringify(
            {
              charges_enabled: account.charges_enabled,
              currently_due: account.requirements?.currently_due || [],
              pending_verification: account.requirements?.pending_verification || [],
            },
            null,
            2
          )
        );
      }

      case 'stripe_list_recent_invoices': {
        const body = await stripeApi('/invoices', {
          limit: args.limit || 10,
          customer: args.customer,
        });
        const simplified = (body.data || []).map((inv) => ({
          id: inv.id,
          number: inv.number,
          customer: inv.customer,
          status: inv.status,
          amount_due: inv.amount_due,
          currency: inv.currency,
          hosted_invoice_url: inv.hosted_invoice_url,
        }));
        return textResult(JSON.stringify(simplified, null, 2));
      }

      case 'stripe_send_invoice': {
        const hasLines = Boolean(args.lines_csv_path);
        const hasHours = args.hours !== undefined && args.hours !== null;
        if (hasLines === hasHours) {
          throw new Error('Provide exactly one of lines_csv_path or hours.');
        }
        const cliArgs = [SEND_INVOICE_PY];
        if (hasLines) cliArgs.push('--lines', args.lines_csv_path);
        if (hasHours) cliArgs.push('--hours', String(args.hours));
        if (args.period) cliArgs.push('--period', args.period);
        if (args.customer) cliArgs.push('--customer', args.customer);
        if (args.rate !== undefined) cliArgs.push('--rate', String(args.rate));
        if (args.sow) cliArgs.push('--sow', args.sow);
        const confirmed = args.confirm === true;
        if (!confirmed) cliArgs.push('--dry-run');

        const { stdout, stderr } = await execFileAsync('python3', cliArgs);
        const prefix = confirmed
          ? '[SENT — invoice finalized and emailed to the customer]\n\n'
          : '[DRY RUN — nothing was sent. Pass confirm:true to actually finalize and send.]\n\n';
        return textResult(prefix + stdout + (stderr ? '\n' + stderr : ''));
      }

      case 'cloudflare_list_pages_projects': {
        try {
          const { stdout } = await execFileAsync('npx', ['wrangler', 'pages', 'project', 'list'], {
            cwd: WEBSITES_ROOT,
          });
          return textResult(stdout);
        } catch (err) {
          return textResult(
            `Live query failed (${err.message}). Known projects from Allternit Brain/infra/cloudflare.md:\n` +
              KNOWN_PAGES_PROJECTS.map((p) => '- ' + p).join('\n')
          );
        }
      }

      case 'cloudflare_deploy_pages': {
        const { project, directory } = args;
        if (!KNOWN_PAGES_PROJECTS.includes(project)) {
          throw new Error(
            `Unknown project "${project}". Must be one of: ${KNOWN_PAGES_PROJECTS.join(', ')}`
          );
        }
        const cliArgs = ['wrangler', 'pages', 'deploy', directory, '--project-name', project];
        const commandPreview = `npx ${cliArgs.join(' ')}  (cwd: ${WEBSITES_ROOT})`;
        if (args.confirm !== true) {
          return textResult(
            `[PREVIEW ONLY — nothing was deployed. Pass confirm:true to actually run this.]\n\n${commandPreview}`
          );
        }
        const { stdout, stderr } = await execFileAsync('npx', cliArgs, { cwd: WEBSITES_ROOT });
        return textResult(`[DEPLOYED]\n\n${stdout}${stderr ? '\n' + stderr : ''}`);
      }

      case 'brain_search': {
        const query = args.query.toLowerCase();
        const files = walkMarkdownFiles(BRAIN_ROOT);
        const matches = [];
        for (const file of files) {
          const rel = path.relative(BRAIN_ROOT, file);
          const lines = fs.readFileSync(file, 'utf8').split('\n');
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(query)) {
              matches.push(`${rel}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
        if (matches.length === 0) return textResult(`No matches for "${args.query}".`);
        return textResult(matches.slice(0, 50).join('\n'));
      }

      case 'brain_read': {
        const resolved = resolveInsideBrain(args.path);
        if (!fs.existsSync(resolved)) {
          throw new Error(`No such file in the brain: ${args.path}`);
        }
        return textResult(fs.readFileSync(resolved, 'utf8'));
      }

      case 'model_route': {
        const policy = JSON.parse(fs.readFileSync(MODEL_ROUTING_PATH, 'utf8'));
        if (!args.task_class) {
          return textResult(JSON.stringify(Object.keys(policy.task_classes), null, 2));
        }
        const classInfo = policy.task_classes[args.task_class];
        if (!classInfo) {
          throw new Error(
            `Unknown task_class "${args.task_class}". Known: ${Object.keys(policy.task_classes).join(', ')}`
          );
        }
        const tier = policy.tiers[classInfo.tier];
        return textResult(
          JSON.stringify(
            {
              task_class: args.task_class,
              allternit_tier: classInfo.tier,
              tier_role: tier.role,
              concrete_backend: tier.concrete_backend,
              agent_tool_alias: tier.agent_tool_alias,
              note: tier.note || null,
            },
            null,
            2
          )
        );
      }

      case 'client_new_folder_skeleton': {
        const clientName = args.client_name;
        if (!/^[A-Za-z0-9_-]+$/.test(clientName)) {
          throw new Error('client_name must be alphanumeric/underscore/hyphen only.');
        }
        const clientDir = path.join(CLIENT_OPS_ROOT, clientName);
        if (fs.existsSync(clientDir)) {
          throw new Error(`Folder already exists: ${clientDir}`);
        }
        fs.mkdirSync(clientDir, { recursive: true });
        const created = [];
        for (const tpl of CLIENT_TEMPLATES) {
          const numPrefix = tpl.file.match(/^(\d+)_/)?.[1] || '00';
          const baseName = `${numPrefix}_${tpl.label}_${clientName}`;

          const mdSrc = path.join(TEMPLATE_ROOT, tpl.file);
          if (fs.existsSync(mdSrc)) {
            const mdDest = `${baseName}.md`;
            fs.copyFileSync(mdSrc, path.join(clientDir, mdDest));
            created.push(mdDest);
          }

          const docxSrc = path.join(TEMPLATE_ROOT, tpl.file.replace(/\.md$/, '.docx'));
          if (fs.existsSync(docxSrc)) {
            const docxDest = `${baseName}.docx`;
            fs.copyFileSync(docxSrc, path.join(clientDir, docxDest));
            created.push(docxDest);
          }
        }
        return textResult(
          `Created ${clientDir}\nCopied templates:\n` + created.map((f) => '- ' + f).join('\n') +
            '\n\nNext steps (manual, per the kickoff playbook): NDA if data comes up, walk the intake form live with the client, draft the SOW from Phase-1 findings, create the Stripe customer, then start the time log.'
        );
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Allternit Brain Ops MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
