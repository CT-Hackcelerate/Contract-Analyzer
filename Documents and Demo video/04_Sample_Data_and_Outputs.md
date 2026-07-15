# Sample Data Pack & Output Artifacts

## Sample data pack (synthetic — no real PHI/PII)

Place the sample contracts used for the demo in `Submission/sample-data/`. These are **synthetic / sample** documents created for the event; they contain no real personal or protected health information.

Suggested set (copy your sample PDFs here):
- `Northstar-Health-Plans.pdf` (healthcare payer services contract — primary demo)
- `XYZ-Pvt-Ltd.pdf`
- `PQR-Inc.pdf`
- `SOW-1.pdf`
- `SOW-3a.pdf`

> These files are inputs only. If any sample ever contained real data, replace it with a synthetic equivalent before submitting.

## Output artifacts (proof the run completed)

Place the following in `Submission/output-artifacts/` after a clean run:
- The **generated dashboard(s)** — copy from `output/` (e.g. `northstar-…-analysis-….html`). These are self-contained and open in any browser.
- **Screenshots** of each dashboard page (see the checklist in `03_Demo_Script.md`).
- A copy of **`output/audit.log`** (already PII-masked) showing the run, token usage, cost estimate, and any warnings.
- Optionally, `output/history.json` showing the saved analysis record.

## How to produce these
1. From a clean environment: `npm install` → set `.env` → `npm start`.
2. Analyze `Northstar-Health-Plans.pdf`; let it download the dashboard.
3. Copy the generated HTML from `output/` into `Submission/output-artifacts/`.
4. Take the screenshots listed in the demo script.
5. Copy `output/audit.log` into `Submission/output-artifacts/`.

This satisfies the "Output artifacts" and "Demo evidence" requirements (clear, correct, polished output with logs that prove execution).
