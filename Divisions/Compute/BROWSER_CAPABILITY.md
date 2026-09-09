---
doc: capability
updated: 2026-09-08
status: draft
---

# Browser Capability (browser-act integration)

How [BrowserAct](https://github.com/browser-act/skills) maps onto AllternitOS Workload/Worker/Function/Capability/Lease semantics, and how bots on Allternit surfaces consume it.

## What BrowserAct is

A local CLI (`browser-act`, installed via `uv tool install browser-act-cli`) plus an agent Skill package. Not a hosted API. It gives agents: stealth web extraction, full browser automation with indexed element interaction, CAPTCHA solving, multi-browser/multi-account isolation with fingerprint + proxy management, and human handoff via `remote-assist` live links. Confirmation-gated at the skill layer: browser create/delete, profile import, proxy changes, login, form submit, and file upload all require explicit user approval.

Installed and handshake-verified on joe's machine 2026-09-07: CLI v1.4.2, Skill v2.0.2 (entry at `~/.kimi-code/skills/browser-act/SKILL.md`).

## Capability mapping (AllternitOS semantics)

| BrowserAct concept | AllternitOS mapping | Notes |
|---|---|---|
| `stealth-extract <url>` | **Function** (stateless, no lease) | One-shot read-only extraction with JS rendering + anti-bot. Parallelizes naturally across URLs. Closest existing analog: WebFetch. |
| `solve-captcha` | **Function**, session-scoped | Stateless in effect (returns solved=True), but runs inside a session. |
| Browser session (`--session <name>`) | **Lease** on a browser resource | A live browser *is* the lease-able resource. Session name carries ownership; the CLI's 4-step ownership procedure (check your own tool history) is exactly lease-ownership semantics. |
| Multiple sessions on one browser | Shared-login parallel leases | Same cookies, independent windows, non-interfering. For many pages under one account. |
| Multiple stealth browsers | Isolated identity leases | Independent cookies/fingerprint/proxy — sites cannot correlate. For multi-account and batch collection. |
| Stealth browser lifecycle (create/delete/renew) | Worker lifecycle under **lease authority** | Create/delete/renew return a `request_id` and complete asynchronously — same shape as lifecycle authorization flows. |
| `browser-act` CLI install | **Worker** runtime hosting the browser capability class | One CLI = one worker node; registers `browser.*` functions and browser resource classes. |
| Static proxy binding | Capability **Constraint** on a lease | Fixed-IP constraint for account nurturing / allowlisted portals. Dynamic proxy = rotating-IP variant. |
| `remote-assist` link | **Evidence / human-interrupt channel** | See handoff design below. |

Proposed typed capability surface:
- `browser.extract(url, opts)` → Function
- `browser.session.open(browser_id, url)` / `close` → Lease acquire/release
- `browser.session.*` (state, click, input, get, network, upload) → Operations on a held lease
- `browser.captcha.solve(session)` → Function on leased session
- `browser.handoff(session, objective)` → Human-interrupt channel, returns takeover URL

## Guardrail alignment

BrowserAct's Confirmation Gate is a feature, not friction — mirror it in Agent Studio trust & policy instead of bypassing:
- Policy-controlled: browser create/delete, profile import, proxy purchase/binding.
- Per-action approval: login, form submission, file upload.
- `remote-assist` invocation puts the agent in lockdown: no session commands until the user signals done. Map this to the agent harness's pause/resume.

## remote-assist chat-surface handoff (design)

Most demo-able surface feature. Flow:
1. Bot on chat/ACI surface hits a login, CAPTCHA, or payment wall it can't pass.
2. Bot calls `browser.handoff` → gets a live takeover URL.
3. Bot posts the URL to the chat thread with a one-line explanation; agent loop pauses (lockdown).
4. User (or client) opens the link on any device, completes the step; BrowserAct resumes the session.
5. Bot detects completion, resumes, records what happened in browser `desc` (semantic memory).

Surface integration points (platform repo, `surfaces/ai.allternit.com`): a `handoff` message type in the chat protocol that renders a deep-link card; harness pause/resume hooks keyed to the handoff event.

## Cost / licensing facts (verified 2026-09-07)

- Automation + local Chrome modes: free.
- Stealth browsers ≤5, stealth-extract, solve-captcha, remote-assist, private mode: free **but require a BrowserAct account/API key** — `stealth-extract` errors 230103 without one. Registration is browser-based (quick-register link), key lands via `browser-act auth poll`.
- Paid: stealth browsers >5, managed dynamic/static proxies.
- Data boundary: all cookies/profiles/content stay local; only outbound is the CAPTCHA challenge image when solve-captcha is invoked.

## Cloud-mode decision

**Decision: local-first.** Ship `browser-act` as a skill/tool in the desktop runtime and cowork/code agent harnesses; treat the CLI install as a Worker in AllternitOS terms. Evaluate BrowserAct Cloud (managed bots) as a hosted Function provider only after the local pilot shows real usage. Criteria for revisiting: >5 concurrent stealth browsers needed, managed-proxy spend exceeding self-hosted residential proxy cost, or a client requirement for zero-local-footprint scraping.

## Pilot status

- [x] CLI + skill installed, `get-skills core` handshake OK.
- [ ] API key registration (user must complete browser registration; then `browser-act auth poll`).
- [ ] Pilot extraction task against a Swyft-style research target.
- [ ] Token-efficiency comparison: indexed `state` output vs raw HTML fetch.

## Open questions


## CUA positioning (updated 2026-09-07)

Industry direction confirmed: away from pure screenshot/pixel loops toward structured page input (DOM / accessibility tree / Set-of-Mark) — cheaper, faster, more reliable. CUA-style models (Anthropic `computer_20250124`, OpenAI `computer-use-preview`) remain the best *general* computer control (arbitrary desktop apps, no API available), and the CUA driver stays the control plane.

Integration slot already exists: `sdk/computer-use` exports `BrowserProvider` and `ComputerEnvironmentProviderManifest`. The self-hosted browser tool should register there — giving the CUA planning loop structured page state instead of pixels whenever the target is a web page. Browser tool = fast path for web inside the CUA driver; ACI pixel control = fallback for non-web.


## Relationship to ACI (updated 2026-09-07)

ACI (`docs/public/aci/index.md`) is the general-purpose bot computer: vision/pixel-based control (screenshot stream + mouse/keyboard coordinates) through the ACU gateway. It can drive any app including browsers, but pays vision-model tokens for every step and cannot read the DOM.

The browser capability is a **complementary, cheaper layer**, not a replacement:
- **DOM-level browser tool** (indexed elements, markdown extraction, network capture) → primary path for web tasks; belongs in the native Tool Belt as a `browser.*` tool family (owner: platform, self-hosted — Patchright-style anti-detect fork, no third-party API key).
- **ACI** → fallback for what DOM can't touch: desktop apps, canvas/WebGL-heavy pages, flows needing human eyes.

Decision (joe, 2026-09-07): no BrowserAct API-key dependency. The third-party CLI was evaluated and rejected as a platform dependency; its *design* (indexed state output, session ownership, remote-assist human handoff, confirmation gating) is the reference for the self-hosted implementation. The doc above is kept as the design source.

1. Does the browser capability class belong to Compute (as a workload class alongside inference) or to Platform (as an agent tool)? Leaning Compute — it's a resource class, not a UI concern.
2. Skill Forge packaging (`browser-act-skill-forge`) as an Agent Studio template — in scope for platform monetization?
3. Per-client browser identity management (stealth fixed-identity + static proxy per client account) — policy lives where, Agent Studio or Ops?
