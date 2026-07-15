# Compliance & Safety Note

This note states how the Contract Analyzer handles data safety, responsible-AI safeguards, human-in-the-loop review, and known risks with their mitigations. It is written to satisfy the submission's **Compliance** criterion ("no real PHI; risks and controls stated").

## 1. Data handling — no real PHI/PII

- The submission uses **synthetic / sample contracts only** (see `Submission/sample-data/`). No real Protected Health Information or personal data is included.
- Uploaded files are written to a **temporary folder and deleted immediately after processing**; only the generated dashboard is retained (in `output/`).
- **Logs and the audit trail are PII-masked** — emails, phone numbers, PAN, Aadhaar, **US SSN**, **medical record numbers (MRN)**, API keys, cloud keys and passwords are redacted before anything is written (`guardrails.js` → `maskPII` / `forLog`, used by `server.js`). This applies to the rolling `output/audit.log` **and** the per-run log files written to `output/logs/` on every analyze click.
- **PHI screening (above and beyond).** The tool analyzes contracts, not patient records. Every uploaded document is screened for patient identifiers — MRN, date of birth, SSN, ICD diagnosis codes, health-insurance claim/beneficiary IDs, and NPI (`guardrails.js` → `detectPHI`). Any hit is flagged in the audit log (`phi_flagged`), surfaced as a run warning, and called out in the dashboard's Limitations legend — so no real PHI can slip in unnoticed.
- The **API key** lives only in a local `.env` file, which is git-ignored and excluded from the ZIP; a placeholder `.env.example` is shipped instead.

## 2. Responsible-AI safeguards

- **Grounding / no fabrication:** the model must use only the uploaded contract; missing values render as "Not stated in uploaded contract" (or null). It never invents parties, dates, money, penalties, or clauses.
- **Evidence for every risk:** each risk row quotes the supporting clause; a confidence score accompanies each finding.
- **Prompt-injection & jailbreak defense:** the contract is passed as **untrusted data** inside `<<<CONTRACT>>>` markers; the hardened system prompt forbids obeying embedded instructions; suspicious phrases are flagged to the audit log (`guardrails.js` → `SYSTEM_HARDENING`, `detectInjection`).
- **System-prompt protection:** the model is instructed never to reveal or alter its instructions and to output only the required JSON.
- **Deterministic re-computation:** facts that must be exact (risk counts, contract status, monetary exposure) are computed in code, not trusted from the model (`buildHtml.js`).
- **Deterministic SLA benchmarking:** the "vs Standard" verdicts (Meets / Below / Uncapped / No target) are parsed and compared **in code** against a fixed house playbook (`buildHtml.js` + `benchmark-reference.js`); the model never produces a verdict, so a benchmark result can never be hallucinated. Presence/quality items are shown as reference for human review, not auto-graded.
- **Output validation:** the model's JSON is schema-checked with one corrective retry before use (`analyze.js`, `guardrails.js` → `validateOutput`).
- **Input controls:** file type, size, and safe-name validation; empty/scanned files rejected (`guardrails.js` → `validateUpload`, `validateContractText`).
- **Rate limiting** on the analyze endpoint to prevent abuse and runaway cost (`server.js`).

## 3. Human-in-the-loop checkpoints

- The dashboard is explicitly positioned as a **decision-support aid, not legal advice** (Limitations legend + solution doc).
- **Confidence scores** and a **"Not stated"** discipline surface uncertainty so a human reviewer knows where to look.
- The **"Management-ready Decision"** (Proceed if / Renegotiate now) is designed for a human approver to action, not to auto-execute anything.
- **Referenced-but-unuploaded documents** (MSA, annexures) are flagged for **manual validation** rather than assumed.
- No downstream action (signing, payment, system change) is automated — the agent only analyzes and reports.

## 4. Known risks & mitigations

| Risk | Mitigation |
|------|------------|
| AI misreads or misses a clause | Evidence + confidence per row; human review; "first-pass aid" framing |
| Model returns different results across runs | temperature 0 + deterministic cache (same contract → same result) |
| Fabricated monetary figures | Money nulled when not stated; value-at-risk labelled directional |
| Malicious "instructions" hidden in a contract | Untrusted-data framing + injection screening + system-prompt protection |
| Sensitive data in logs | PII masking on all logs and the audit trail |
| Scanned/image PDF yields no text | Detected and rejected with guidance to run OCR |
| Referenced external agreement not provided | Flagged for manual validation; not assumed |
| Secret leakage to source control | `.env` git-ignored; `.env.example` placeholder; guidance in README |

## 5. Domain fit

Optimized for English-language services / IT / healthcare (Payers, Providers, MedTech, Life Sciences) contracts and SDLC engagements. Other languages, jurisdictions, or contract types may reduce accuracy and should be human-reviewed.
