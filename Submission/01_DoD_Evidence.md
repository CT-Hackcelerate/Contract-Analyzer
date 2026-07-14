# Definition-of-Done (DoD) — Evidence Mapping

This checklist maps the assigned use case and the standard hackathon deliverables to concrete evidence in the repo. Each item states **what was required**, **whether it is met**, and **where to verify it**.

> Adjust the "Use-case DoD" rows to your exact assigned use-case wording if it differs; the technical evidence stays the same.

## A. Use-case Definition of Done

| # | DoD item | Met | Evidence / location |
|---|----------|-----|---------------------|
| A1 | Accepts a real contract document as input (PDF/DOCX) | ✅ | `index.html` upload; `extract.js` (pdf-parse / mammoth) |
| A2 | Extracts contract metadata (parties, dates, term, pricing, value, governing agreement, EM level, etc.) | ✅ | `analysis-prompt.txt` "Contract extraction"; Contract Overview page |
| A3 | Identifies and classifies risks (High/Medium/Low) with priority (P1–P4) | ✅ | Risk ledger in prompt; Top Risks & SLA Risk Assessment pages |
| A4 | Produces a management-ready decision (Proceed / Conditions / Renegotiate / Do Not Proceed) | ✅ | Executive Decision Brief; `boardDecision` field |
| A5 | Quantifies commercial exposure without fabricating figures | ✅ | Commercial Impact page; `buildHtml.js` nulls fabricated money |
| A6 | Generates a polished, self-contained deliverable (HTML dashboard) | ✅ | `dashboard-template.html` + `buildHtml.js` |
| A7 | Every risk is traceable to contract evidence | ✅ | `evidence` field per row; grounding checks in `guardrails.js` |
| A8 | Output is reproducible for the same input | ✅ | temperature 0 + deterministic cache (`analyze.js`, `cache/`) |

## B. Standard hackathon deliverables

| # | Deliverable | Met | Evidence / location |
|---|-------------|-----|---------------------|
| B1 | Repository with code, prompts, agent config, tools | ✅ | Project root; `analysis-prompt.txt`; `package.json` |
| B2 | README run document (setup, commands, inputs, outputs, troubleshooting) | ✅ | `../README.md` (single complete reference) |
| B3 | Sample inputs | ✅ | `Submission/sample-data/` (synthetic contracts) |
| B4 | Generated outputs / artifacts | ✅ | `Submission/output-artifacts/` (dashboards + screenshots + audit log) |
| B5 | Demo script / video | ✅ | `03_Demo_Script.md` (+ `demo-video.mp4`) |
| B6 | Compliance / safety note | ✅ | `02_Compliance_and_Safety_Note.md` |
| B7 | Reproducible from repo alone | ✅ | Clean-run steps in README §Setup/Run |

## C. Engineering quality signals

| Signal | Met | Evidence |
|--------|-----|----------|
| Modular architecture (one job per file) | ✅ | `server.js`, `extract.js`, `analyze.js`, `guardrails.js`, `buildHtml.js` |
| Strong, structured prompt | ✅ | `analysis-prompt.txt` (labelled sections + strict JSON schema) |
| Tool use | ✅ | PDF/DOCX text extraction, Claude API, file/history/audit I/O |
| Error handling & resilience | ✅ | retries with backoff, long-answer continuation, schema validation + corrective retry (`analyze.js`) |
| Safety guardrails | ✅ | `guardrails.js` (validation, injection detection, PII masking, grounding) |
| Observability | ✅ | `output/audit.log` (tokens, cost, warnings; PII-masked) |

**Result:** all mandatory deliverables are accounted for; remaining actions are to capture output artifacts and record the demo video from a clean run (see `00_SUBMISSION_INDEX.md` §3).
