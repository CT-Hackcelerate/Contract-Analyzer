# Contract Reviewer / Contract Analyzer

A Node.js + Express web app that turns a customer contract into an interactive, management-ready risk & commercial dashboard.

Upload a contract (**PDF** or **DOCX**), and the app extracts the text, runs it through the **Claude API** using a detailed contract-analysis prompt, and generates a single, self-contained **HTML dashboard**. Every generated report is saved and tracked in an analysis history so you can re-open or download it later.

> This README is the single reference for the project — it covers prerequisites, inputs/outputs, installation, commands, configuration, how it works, the architecture/rebuild steps, security, and troubleshooting.
>
> **Built with Claude Code.** The agent design, the analysis prompt, and the entire Node.js codebase were developed using **Claude Code**. At runtime the app calls the **Claude API** to analyze each uploaded contract.

---

## Contents

- [Business value](#business-value)
- [Built with Claude Code](#built-with-claude-code)
- [Prerequisites](#prerequisites)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Features](#features)
- [Project structure](#project-structure)
- [Installation & setup](#installation--setup)
- [Commands](#commands)
- [Using the app](#using-the-app)
- [Configuration](#configuration-environment-variables)
- [How it works](#how-it-works)
- [The generated dashboard](#the-generated-dashboard)
- [Architecture & rebuild from scratch](#architecture--rebuild-from-scratch)
- [Security & guardrails](#security--guardrails)
- [Protecting your API key on GitHub](#protecting-your-api-key-on-github)
- [Troubleshooting](#troubleshooting)
- [Notes & limitations](#notes--limitations)
- [Customizing the dashboard look](#customizing-the-dashboard-look)

---

## Prerequisites

- **Node.js 18 or newer** and **npm** (comes with Node). Verify with `node -v` and `npm -v`.
- An **Anthropic API key** — create one at <https://console.anthropic.com/>.
- Any modern **web browser** to view/present the dashboard.
- Internet access (to reach the Claude API) and ~150 MB free disk for `node_modules`.

## Inputs

- **One contract file per analysis.** Accepted formats: **PDF** and **DOCX**.
- **Maximum size:** 25 MB. **One file only** (drag-and-drop also accepts a single file).
- The document must contain **machine-readable text** — image-only/scanned PDFs must be OCR'd first; legacy binary `.doc` is not supported.
- No other input is required; all contract details are read from the file.

## Outputs

- A **self-contained HTML dashboard** (seven sections) that opens in any browser offline — downloaded automatically and saved under `output/`.
- A **history record** in `output/history.json`, re-openable/downloadable from the History page.
- A **PII-masked audit line** in `output/audit.log` (event, tokens, cost estimate, warnings).
- A **per-run log file** in `output/logs/` — one `run-<stamp>-<file>.log` is written on **every analyze click** (success, duplicate, or error) with the run's status, model, tokens, cost, page counts, injection/PHI flags, and warnings (PII-masked).
- A **deterministic cache** entry in `cache/` so re-runs of the same contract are identical.

---

## Business value

Contract review is slow and inconsistent — and in healthcare it gates real money and real risk. This tool makes the first pass fast, consistent, and auditable, so a human reviewer spends minutes validating instead of hours reading.

- **Time: hours → ~10–15 minutes per contract.** The agent extracts the clauses that matter; the reviewer validates rather than reads every page.
- **Consistency: 100% of contracts reviewed to one standard.** The same rules run on every contract, so a portfolio is comparable instead of varying reviewer-to-reviewer.
- **Cost: ~cents of AI per contract**, tracked per run in `output/audit.log` — negligible next to reviewer hours.
- **Risk avoided:** surfacing missed liability, SLA, service-credit, payment, and termination terms protects margin on deals often worth hundreds of thousands of dollars.

**Who it helps in healthcare**
- **Payers / health plans** — review provider, vendor, and services agreements faster during procurement and renewals.
- **Providers / hospitals** — triage supplier, IT, and outsourcing contracts before signing.
- **MedTech / Life Sciences & healthcare IT (SDLC)** — vet SOWs/MSAs for delivery, SLA, and change-control exposure.

**Illustrative impact:** a team reviewing ~200 contracts/year at ~3 hours each spends ~600 hours. With a ~10–15 minute human validation on an AI first pass, that drops to ~35–50 hours — roughly a **90% reduction in review effort**, with more consistent coverage. *(Planning figures, not a guarantee; actual savings depend on contract complexity and review depth.)*

---

## Built with Claude Code

This submission was **built with Claude Code**. The agent design, the analysis prompt (`analysis-prompt.txt`), and the full Node.js codebase were authored in Claude Code. At runtime the application calls the **Claude API** (via `@anthropic-ai/sdk`) to perform each contract analysis — so the agent is both *built with* Claude Code and *powered by* Claude.

---

## Features

- **Upload & analyze** contracts (PDF / DOCX, up to 25 MB) from a branded web page.
- **AI analysis** with Claude that extracts contract metadata, builds a risk ledger, classifies EM level, and writes an executive brief — grounded only in the uploaded document (missing values show "Not stated in uploaded contract"; it never fabricates figures).
- **Self-contained dashboard** — the output HTML has no external dependencies and opens in any browser, online or offline. On generation it downloads automatically and is saved to your history.
- **Analysis history** — every successful analysis is saved to `/output` with a unique file name and recorded in `/output/history.json`.
- **Content-based deduplication** — the same document uploaded again (even under a **different file name**) returns the exact **same previously generated report** instead of re-analyzing. No duplicate record, no extra API cost. A *different* document that reuses an existing file name is blocked with a rename prompt.
- **Deterministic analysis cache** — the model is only *mostly* repeatable at temperature 0, so the AI result for a given contract + prompt is cached in a `cache/` folder (separate from `output/`). Re-analyzing the same contract reuses the cached result, so the **number of risks and High risks never changes between runs — even after you delete `output/` and `audit.log`**. Changing the prompt automatically invalidates the cache and forces a fresh analysis.
- **Safety & quality guardrails** (`guardrails.js`) — input validation, prompt-injection / jailbreak screening, system-prompt protection, PII/secret masking in logs, output-schema validation, grounding/hallucination checks, rate limiting, and a PII-masked audit trail.
- **History page** (`analysis-history.html`) — a table of all past analyses with per-row **View** and **Download** actions, plus a **New Contract** button.
- **PDF page numbers** — PDF text is tagged with page markers so the risk table can reference real page numbers.
- **SLA benchmark vs standard** — every extracted SLA is compared **in code** (deterministically, not by the model) against an internal SLA/SOW/Project-Risk playbook covering availability & microservice/API uptime, incident **response and resolution by priority (P1–P4)**, API latency & error rate, ETL success & data accuracy, defect/regression/build quality, service-desk metrics (first response, FCR, abandonment, reopen), security (breach notification, critical/high vulnerability remediation, RTO/RPO), delivery variances (schedule/effort/EAC/change-failure/rework), milestone/acceptance timings and penalty caps. Each SLA is tagged **Meets / Below standard / Uncapped** in the ledger, with a "*N* SLAs below market standard" flag on the Executive Decision Brief. Standards are editable at the top of `buildHtml.js` (`SLA_PLAYBOOK` + `BENCHMARK_RULES`); anything without a parseable target is left for human review. This makes the tool *judge* the contract, not just extract it.

---

## Project structure

Keep all files in **one folder** (e.g. `contract-analyzer`):

```
contract-analyzer/
├── index.html               # Upload page (the app UI)
├── analysis-history.html    # History table (View / Download / New Contract)
│
├── server.js                # Express server: upload, dedup, rate limit, save, history API, audit log
├── guardrails.js            # Validation, injection detection, PII masking, output & grounding checks
├── extract.js               # PDF / DOCX text extraction (+ PDF page markers)
├── analyze.js               # Calls the Claude API; returns { data, meta } (auto-continues, retries, validates)
├── buildHtml.js             # Injects JSON + fixed legends; SLA benchmark engine (SLA_PLAYBOOK + BENCHMARK_RULES)
├── benchmark-reference.js   # Full SLA/SOW/Project-Risk playbook (A–W + safeguards) shown as Reference Standards
├── dashboard-template.html  # Finalized, fully data-driven dashboard design
├── analysis-prompt.txt      # The analysis prompt + JSON output schema
│
├── package.json
├── .env.example             # Copy to .env and add your key (this placeholder file is safe to commit)
├── .gitignore               # Ignores .env, node_modules, output/
├── README.md
│
├── output/                  # Created automatically at runtime
│   ├── history.json         # Analysis history records (incl. contentHash, logFile)
│   ├── audit.log            # PII-masked audit trail (events, tokens, cost, warnings)
│   ├── logs/                # One PII-masked log file per analyze click
│   │   └── run-<stamp>-<file>.log   # Per-run log (status, tokens, cost, flags, warnings)
│   └── <generated>.html     # Saved dashboards
└── cache/                   # Deterministic analysis cache (recreated automatically)
    └── <hash>.json          # Cached AI result per unique contract+prompt
```

---

## Installation & setup

1. Install [Node.js](https://nodejs.org/) 18 or newer.
2. In the project folder, install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` from the template and add your Anthropic API key:
   ```bash
   cp .env.example .env      # Windows: copy .env.example .env
   ```
   Edit `.env` and set `ANTHROPIC_API_KEY`.

## Run

```bash
npm start
```

Open **http://localhost:3000**, choose a contract, and click **Upload Contract**. The generated dashboard downloads automatically and is saved to your history (open it anytime from **View Analysis History**).

---

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time only). |
| `npm start` | Start the server at http://localhost:3000. |
| `Ctrl + C` | Stop the server. |
| `PORT=3001 npm start` | Start on a different port (or set `PORT` in `.env`). |

There is no build/compile step — the app runs directly on Node. After editing any `.js` file, restart the server; `dashboard-template.html` and `analysis-prompt.txt` are read fresh on each request.

---

## Using the app

1. On the upload page, choose a file (or drag & drop a single file) and click **Upload Contract**. **Clear** removes the selected file.
2. If the **same document content** was already analyzed (even under a different name), you get that existing report back — nothing is re-analyzed.
3. Otherwise the dashboard is generated, saved to `/output`, downloaded, and recorded in your history.
4. Click **View Analysis History** to open `analysis-history.html`:
   - **View** opens that report in a new tab.
   - **Download** saves that report to your computer.
   - **New Contract** returns you to the upload page.

> Reports are static snapshots and dedup is by content, so re-uploading the same document returns the same report. Results are also **deterministic across runs**: even if you delete `output/` and `audit.log`, re-analyzing the same contract reuses the cached AI result (in `cache/`), so the risk counts do not change. To force a completely fresh analysis, delete the matching file in `cache/` (or set `DISABLE_CACHE=1`); changing the prompt invalidates the cache automatically.

---

## How it works

1. **Upload** — `index.html` posts the file to `POST /analyze` (rate-limited, one file only).
2. **Validate** — `guardrails.js` checks file type, size, and a safe file name.
3. **Extract** — `extract.js` pulls plain text (pdf-parse for PDF, mammoth for DOCX). For PDFs it inserts `[[PAGE n]]` markers so page numbers can be attributed.
4. **Content dedup** — the server fingerprints the extracted text (SHA-256). If that content is already in `/output/history.json` (any file name), it returns the existing report and stops — no re-analysis. A different document reusing an existing name returns HTTP 409.
5. **Analyze** — `analyze.js` first checks the **deterministic cache** (keyed by contract text + prompt in the `cache/` folder; an inconsistent cached result is discarded). On a miss it sends the hardened prompt + contract text (wrapped as untrusted data) to Claude at `temperature 0`, then caches the result. Long responses auto-continue; transient errors retry; the JSON is **schema-validated and EM↔pricing-consistency-checked with one corrective retry**; **page numbers are then re-derived deterministically** from the evidence quotes; grounding checks flag possible hallucinations.
6. **Build** — `buildHtml.js` recomputes risk counts from the rows, allocates directional value-at-risk (only when a numeric contract value exists), adds the fixed legends, and injects the JSON into `dashboard-template.html`.
7. **Save & record** — the HTML is written to `/output` with a unique name; a record `{clientName, fileName, outputFile, logFile, createdAt, contentHash}` is appended to `/output/history.json`; a PII-masked line (tokens, cost estimate, warnings) is appended to `/output/audit.log`; and a per-run log file is written to `/output/logs/` for that click.
8. **Return** — the saved file path is sent back so the browser downloads it.

---

## The generated dashboard

Eight pages, matching the finalized design:

1. **Executive Decision Brief** — five KPI cards (Overall Risk, Management Decision, Contract Value at Risk, # High Risks, Total Risks); a snapshot strip (Type · Status · Term · Pricing · EM); a Management-ready Decision card (Proceed if / Renegotiate now bullets); a Concise Management Summary; a **donut chart** of risk distribution (High/Medium/Low counts with value-at-risk per bucket); a **Key SLA Commitments** table (SLA metric · target · measurement · remedy/penalty · risk — colour-coded); and top decision blockers.
2. **Contract Overview** — contract identity, dates & status, and commercial/category/renewal terms.
3. **Top Risks** — high-risk explanations with color-coded Evidence and Recommended action.
4. **SLA Risk Assessment** — the full extracted clause/risk ledger table with filters, including a **vs Standard** benchmark verdict on every SLA row.
5. **Commercial Impact** — financial interpretation (with the contract value shown large), commercial baseline, revenue-protection controls, leakage scenarios, and the exposure model.
6. **Recommendations & Rewrites** — safer clause rewrites.
7. **Legends & Assumptions** — Management Decision legend, "How Management-ready Decision is derived", "How Concise Management Summary is generated", Risk, Incident Priority, Type, Status, Pricing, EM Level, SLA/Clause-Type, **Key SLA Commitments Remedy/Penalty**, Confidence, and **Benchmark Verdict** legends, plus dynamic assumptions.
8. **Benchmark vs Standard** — a "how to use" guide (explaining exactly what is and isn't auto-scored), a benchmark scorecard (SLAs benchmarked / meets / below / uncapped), a **This contract vs standard** table with clear verdicts (**Meets standard / Below standard / Uncapped penalty / No target stated**), and the full **Reference standards** playbook (Supplier & AI/Token safeguards + sections A–W + ARR/funding + matrices) rendered as **searchable, collapsible** sections. All numeric verdicts are computed deterministically in code; presence/quality/consistency items are shown for human review.

Key rules the analysis follows: **EM level** is classified dynamically (Staff Aug / Quality+ / Delivery+ / Fixed Price / Output+ / Outcome+) and never defaulted to EM 4; no contract value, penalty, or cap is invented; and unavailable referenced agreements (e.g. an MSA) are flagged for manual validation.

---

## Architecture & rebuild from scratch

Node.js + Express with plain HTML/CSS/JS on the front end. Each file has one job, so it can be read — and rebuilt — piece by piece.

### Modules at a glance

| File | Responsibility |
|---|---|
| `index.html` | Upload UI: single-file picker / drag-drop, submit, duplicate popup, download, link to history. |
| `analysis-history.html` | History table (Client / File / View / Download) + New Contract. |
| `server.js` | Coordinator: rate-limit → validate → extract → content dedup → analyze → build → save → history + audit. Serves the pages and `output/`; exposes `GET /api/history`. |
| `extract.js` | Text extraction: `pdf-parse` (PDF, with `[[PAGE n]]` markers + page count) and `mammoth` (DOCX). |
| `analyze.js` | Deterministic cache → Claude call (temp 0) → auto-continue → retry → JSON extract → schema-validate (+1 corrective retry) → grounding checks. Returns `{ data, meta }`. |
| `guardrails.js` | Input validation, injection/jailbreak detection, system-hardening text, PII masking, output validation, grounding checks, cost estimate. |
| `buildHtml.js` | Fixed legends + deterministic fixes (status, pricing, EM name, counts, null money) + inject JSON into the template at the `__DASHBOARD_DATA__` token. |
| `dashboard-template.html` | The fixed visual design; renders entirely from the injected `data`. |
| `analysis-prompt.txt` | The AI instruction set + JSON output schema (plus a run-time security-hardening block). |

### Build order (from an empty folder)

1. `npm init -y`, then install the dependencies (see `package.json`).
2. Create `.env.example` and `.gitignore`; copy `.env.example` → `.env` and add your key.
3. Write `analysis-prompt.txt` (grounding rules, extraction, EM classification, risk/priority, exec brief, commercial impact, and the output JSON schema).
4. Write `extract.js` → `guardrails.js` → `analyze.js` → `buildHtml.js` → `server.js`.
5. Write `index.html` and `analysis-history.html`.
6. Use the provided `dashboard-template.html` as the view (keep the `__DASHBOARD_DATA__` token and the field names).
7. `npm start` and verify (see [Troubleshooting](#troubleshooting)).

### The data contract (must match across prompt, builder, template)

The model returns one JSON object; the template renders exactly these fields.

- **`metadata`** — fileName, contractTitle, contractType (short code), client, supplier, effectiveDate, startDate, endDate, term, status, category, subCategory, renewalTerms, pricingModel, pricingFull, contractValue, contractValueNumeric | null, monthlyFeeNumeric | null, governingAgreement, emLevel, emShort, billingCadence, serviceCreditCaps, terminationTerms, securityTerms, slaTerms, scopeChangeTerms, chargeableEvents, exitObligations, executionEvidence.
- **`rows[]`** — rowId, section, pageNo, slaType, priority (P1–P4), service, deliverable, metric, target, measurement, clause, risk (High/Medium/Low), valueAtRisk, customerDependency, exclusions, remedy, cap, owner, negotiationStatus, recommendedAction, evidence, reason, confidence.
- **Top level** — counts, overall, boardDecision, bucketValues | null, boardSummary[], decisionList{proceedIf, renegotiate}, financialNotes[], revenueControls[], commercialBaseline[], leakageScenarios[], penaltyExposure{}, recos[], assumptions[].

The **app** (not the model) adds the fixed legends and the computed fields `metadata.emDisplay`, `metadata.totalPagesUploaded`, `metadata.pagesScannedByAI`, `sourceNote`, and `footer`.

**Golden rules:** keep field names identical across the prompt, `buildHtml.js`, and the template; keep the `__DASHBOARD_DATA__` token; and keep facts that must be exact (risk counts, contract status, monetary exposure) computed in code.

---

## Configuration (environment variables)

Set these in `.env` (or as host environment variables when deploying):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-5-20250929` | Model used for analysis |
| `PORT` | No | `3000` | Web server port |
| `MAX_TOKENS` | No | `16000` | Output tokens per model request (responses auto-continue if longer) |
| `RATE_MAX` | No | `20` | Max `/analyze` requests per IP per window |
| `RATE_WINDOW_MS` | No | `60000` | Rate-limit window in milliseconds |
| `PRICE_PER_MTOK_IN` | No | `3` | USD per 1M input tokens (for the logged cost estimate only) |
| `PRICE_PER_MTOK_OUT` | No | `15` | USD per 1M output tokens (for the logged cost estimate only) |
| `DISABLE_CACHE` | No | `0` | Set to `1` to disable the deterministic analysis cache (forces a fresh model call each time) |

---

## Security & guardrails

All guardrail logic lives in `guardrails.js` and is applied by `server.js` and `analyze.js`:

- **Access control (server)** — the server does **not** serve the whole folder. Only `index.html`, `analysis-history.html`, and generated dashboards at `/output/<name>.html` are reachable over HTTP. The prompt, source files, `cache/`, `output/audit.log`, `output/logs/`, and `output/history.json` are **not** served (history is exposed only via the read-only `/api/history`); `x-powered-by` is disabled; the `/output` route validates the file name and blocks path traversal and non-HTML files.
- **Input validation** — allowed file types, 25 MB size cap, safe file names (blocks path-traversal / control characters), and empty/scanned-document detection. The uploaded file name is also sanitized before being placed in the prompt.
- **Output value validation** — beyond schema, `overall` must be High/Medium/Low, `boardDecision` must be one of the four allowed values, dates are sanity-checked (end not before start; status left "not determinable" if reversed), and negative contract values are flagged.
- **Prompt-injection & jailbreak screening** — the extracted text is scanned for override attempts ("ignore previous instructions", "system prompt", "act as", "developer mode", jailbreak/DAN, fake role tags) and flagged in the audit log.
- **System-prompt protection & grounding** — the contract is passed as **untrusted data** inside `<<<CONTRACT>>>` markers; the hardened system prompt forbids following embedded instructions, revealing the prompt, or fabricating values.
- **PII / secret masking** — emails, phone numbers, PAN, Aadhaar, **US SSN**, **medical record numbers (MRN)**, API keys, AWS keys and passwords are redacted from all logs and the audit trail.
- **Patient-data (PHI) safety** — the tool analyzes contracts, not patient records. Uploaded text is screened for patient identifiers (MRN, DOB, SSN, ICD codes, claim/beneficiary IDs, NPI); any hit is flagged in the audit log and noted in the dashboard's Limitations, so no real PHI slips in unnoticed. Use only synthetic/approved data.
- **Output & grounding checks** — the model's JSON is schema-validated (with one corrective retry); counts are recomputed, fabricated money is nulled, confidence ranges and missing-evidence rows are flagged.
- **EM ↔ pricing consistency (enforced)** — pricing model and EM level must agree (e.g., **T&M can never be EM4**). A contradiction first triggers a corrective retry so the model reconciles both; then, as a hard safeguard, `buildHtml.js` enforces consistency **deterministically** at render time. The **EM classification is trusted** and pricing is corrected to match it (EM 4 – Fixed Price → Fixed Price; EM 4 – Output+ → Output-based; EM 4 – Outcome+ → Outcome-based; EM 1/2/3 → T&M when pricing wrongly claims a fixed/output/outcome model), with the change noted in the pricing field. The dashboard can therefore never display an impossible EM/pricing pair.
- **Deterministic page numbers** — each row's page is re-derived **in code** by locating its verbatim evidence quote within the page-marked source text, so page references can't be misreported by the model. A clause whose evidence can't be located shows **"Not available"** rather than a wrong page. Location never appears inside clause/evidence text — only in the Section and Page columns.
- **Rate limiting** — per-IP sliding window on `/analyze` (returns HTTP 429 when exceeded).
- **Determinism** — `temperature 0` plus content-based dedup means identical content always yields the identical stored report.
- **Audit trail** — `/output/audit.log` records each event (analysis, reuse, name conflict, rate-limit, injection flag, errors) with tokens, cost estimate and warnings — all PII-masked. In addition, a **per-run log file** is written to `/output/logs/` on every analyze click (also PII-masked).

---

## Protecting your API key on GitHub

Your Anthropic key lives **only** in `.env`, which is git-ignored — so it never gets pushed. Commit `.env.example` (placeholder only) instead, and each person clones the repo and creates their own `.env`.

Before your first push, confirm the key is not tracked:

```bash
git status --ignored        # .env should appear under "Ignored files"
git ls-files | grep env     # should show ONLY .env.example, never .env
```

If those look right, push normally.

### If you already committed `.env` (or the key) at any point

Removing it in a new commit is **not enough** — the key stays in git history. You must:

1. **Rotate the key immediately** at https://console.anthropic.com/ → revoke the exposed key and create a new one. Treat any pushed key as compromised.
2. Put the new key in your local `.env` only.
3. Remove the file from history and from GitHub:
   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   git commit -m "Stop tracking .env"
   ```
   To scrub it from **all past commits**, use git-filter-repo (recommended):
   ```bash
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   git push --force --all
   ```
4. Enable **GitHub Secret Scanning / Push Protection** (repo → Settings → Code security) so GitHub blocks accidental key pushes in future.

### Deploying (no `.env` file on the server)

Set the key as an environment variable in your host's dashboard instead of a file — e.g. Render/Railway/Heroku "Environment Variables", GitHub Actions **Secrets**, or a container secret. The app reads `process.env.ANTHROPIC_API_KEY` either way, so no code change is needed.

---

## First-time push to GitHub

```bash
git init
git add .
git status                  # verify .env is NOT listed
git commit -m "Initial commit: Contract Analyzer"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## Troubleshooting

- **`ANTHROPIC_API_KEY is not set`** — create `.env` with your key and restart.
- **`EADDRINUSE :3000`** — another instance is already running; stop it, or set a different `PORT` in `.env` (e.g. `PORT=3001`).
- **"No readable text… run OCR"** — the PDF is scanned/image-only; OCR it or upload a PDF/DOCX with selectable text.
- **"unbalanced / invalid JSON" from the model** — usually a truncated response; the app auto-continues and retries, but you can raise `MAX_TOKENS`.
- **Risk counts differ between runs** — they should not: the `cache/` folder makes analysis deterministic. To force a fresh run, delete the matching `cache/*.json` (or set `DISABLE_CACHE=1`). Clearing only `output/` / `audit.log` will not change results — that is intended.
- **Same contract won't re-analyze / "already analyzed" popup** — that's content dedup; open the existing report from History, or remove its entry from `output/history.json` (and the matching `cache/` file) to regenerate.
- **A colour / legend / layout change isn't visible** — restart the server after editing any `.js` (loaded at startup); existing dashboards are static snapshots, so regenerate (new/renamed contract, or clear the `cache/` + `output/` entry) to see changes.
- **Pop-up blocked / no download** — allow pop-ups for `localhost`; the file is also saved in `output/` and listed on the History page.

---

## Notes & limitations

- **Scanned PDFs** with no text layer can't be read — run OCR first, or upload a PDF/DOCX with selectable text.
- **Legacy `.doc`** (binary Word) is not supported; save as `.docx` or `.pdf`.
- **PDF page numbers** are accurate for normal digital PDFs but can drift on heavily multi-column or table-based layouts; DOCX has no fixed pages, so those rows show "Not available".
- Uploaded files are written to a temp directory and deleted immediately after processing; only the generated dashboards are kept, in `/output`.

## Customizing the dashboard look

`dashboard-template.html` is the finalized design. All contract-specific content is rendered from the injected `data` object, so you can restyle the template freely without touching the analysis logic. Keep the `__DASHBOARD_DATA__` token and the element IDs intact.
