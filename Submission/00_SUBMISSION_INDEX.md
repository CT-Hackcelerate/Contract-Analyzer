# Contract Analyzer — Hackathon Submission Pack

**Use case:** AI agent that reviews a customer/healthcare services contract and produces a management-ready risk & commercial dashboard — grounded, safe, and reproducible.
**Submission model:** one repo + demo + evidence.
**Built with Claude Code:** the agent design, the analysis prompt, and the entire codebase were developed using Claude Code; at runtime the app calls the Claude API to analyze each contract.

**Business value (healthcare):** cuts contract review from hours to **~10–15 minutes** per contract; **100%** of contracts reviewed to one consistent standard; **~cents** of AI cost per contract (tracked in the audit log); surfaces missed liability/SLA/payment/termination terms on deals worth hundreds of thousands. Serves payers, providers, MedTech/Life Sciences, and healthcare-IT (SDLC) teams.

This folder contains the judge-facing **evidence and documents**. The **repo** is the whole project folder that contains this `Submission/` folder.

---

## 1. Required components → where to find them

| # | Required component | Where it is | Status |
|---|--------------------|-------------|--------|
| 1 | **Repository / ZIP** (source code, prompts, agent config, tools/scripts, sample inputs, generated outputs) | The entire project folder (`Contract Analyzer Dashboard/`). Prompt: `analysis-prompt.txt`. Code: `server.js`, `analyze.js`, `extract.js`, `guardrails.js`, `buildHtml.js`, `dashboard-template.html`, `index.html`, `analysis-history.html`. Config: `package.json`, `.env.example`. | Ready — see §4 to build the ZIP |
| 2 | **README run document** (setup, prerequisites, commands, inputs, outputs, limitations, troubleshooting, and rebuild-from-scratch) | `../README.md` — the single, complete reference document. | Ready |
| 3 | **Definition-of-Done (DoD) evidence** (checklist mapped to the use case) | `01_DoD_Evidence.md` | Ready |
| 4 | **Demo script / video** (walkthrough, runflow, key decisions, final artifact) | `03_Demo_Script.md` (script + shot list). Record the video and drop it here as `demo-video.mp4`. | Script ready; record video |
| 5 | **Output artifacts** (final deliverable + screenshots/logs proving the run) | `04_Sample_Data_and_Outputs.md`. Put the generated dashboard(s) + screenshots + a copy of `output/audit.log` in `Submission/output-artifacts/`. | Capture after a clean run |
| 6 | **Sample data pack** (synthetic; no real PHI/PII) | `04_Sample_Data_and_Outputs.md`. Put the sample contracts in `Submission/sample-data/`. | Add sample PDFs |
| 7 | **Compliance / safety note** (responsible-AI, human-in-the-loop, PHI checks, risks/mitigations) | `02_Compliance_and_Safety_Note.md` | Ready |
| — | **Solution document & pitch deck** (supporting) | `../SOLUTION_DOCUMENTATION.doc`, `../Contract-Analyzer-Pitch.html` | Ready |

---

## 2. How this submission maps to the judging criteria

| Judge criterion | How we meet it | Evidence |
|-----------------|----------------|----------|
| **Functional completeness** | Full pipeline: upload → extract → analyze → validate → dashboard → history/audit. | `01_DoD_Evidence.md`, live demo |
| **Agent design quality** | Modular files, a strong structured prompt, tool use (PDF/DOCX extraction, Claude API), error handling, retries, schema validation. | `../README.md` (Architecture & rebuild), code |
| **Business value** | Cuts contract review from hours to ~10–15 minutes for healthcare Payers/Providers and services/SDLC engagements; ~90% less review effort; consistent, comparable reviews. | `../README.md` (Business value), `../SOLUTION_DOCUMENTATION.doc` §1–3 |
| **Innovation** | Non-obvious agentic use: grounded extraction + deterministic re-computation + injection-hardened, self-verifying output — not a bare prompt. | §7 & §10 of the solution doc |
| **Demo & output quality** | Polished, self-contained 7-section dashboard; crisp demo script. | `03_Demo_Script.md`, output artifacts |
| **Reproducibility** | Runs from the repo + README + sample data; deterministic cache guarantees the same result across runs. | `../README.md` |
| **Safety & compliance** | No real PHI; input validation, prompt-injection defense, PII masking, human-in-the-loop, stated limitations. | `02_Compliance_and_Safety_Note.md` |

---

## 3. Final pre-submit checklist (do this before zipping)

- [ ] **Clean-environment run:** in a fresh clone, `npm install`, add key to `.env`, `npm start`, analyze one sample contract, confirm the dashboard is produced.
- [ ] **Verify the artifact:** open the generated dashboard; confirm values are correct and "Not stated" appears where data is missing.
- [ ] **Remove confidential data:** ensure `.env` is **not** included; delete any real client files; keep only synthetic samples. Confirm `output/` / `cache/` contain nothing sensitive (or exclude them from the ZIP).
- [ ] **Confirm README steps** work exactly as written.
- [ ] **Capture evidence:** screenshots of each dashboard page + a copy of `output/audit.log` → `Submission/output-artifacts/`.
- [ ] **Record the demo** per `03_Demo_Script.md` → `Submission/demo-video.mp4`.
- [ ] **DoD-to-evidence mapping** present (`01_DoD_Evidence.md`).

---

## 4. How to build the final Repo / ZIP

Include the whole project folder **except** secrets and regenerable data:

**Include:** all source files, `analysis-prompt.txt`, `package.json`, `.env.example`, `README.md` (the complete reference), `SOLUTION_DOCUMENTATION.doc`, `Contract-Analyzer-Pitch.html`, and this `Submission/` folder (with sample data + output artifacts).

**Exclude:** `.env` (your real key), `node_modules/`, and — unless you want to ship examples — `output/` and `cache/` (both are regenerated automatically). The provided `.gitignore` already excludes these.

Windows: select the files → right-click → *Send to → Compressed (zipped) folder*. Name it `Contract-Analyzer-Submission.zip`.
