# Demo Script & Shot List (target: 3–4 minutes)

A tight narrative that shows the use case, the run flow, the key decisions, and the final artifact. Record at 1080p; keep the browser at ~100% zoom.

## Before you record
- Fresh environment: `npm install` done, `.env` has a valid key, `npm start` running.
- Have one **synthetic** contract ready (e.g. `sample-data/Northstar-Health-Plans.pdf`).
- Clear `output/` and `cache/` so the first run is genuinely fresh (optional).

## Scene 1 — The problem (20s)
> "Reviewing a healthcare services contract by hand takes hours, and results vary reviewer to reviewer. Our agent turns a contract into a management-ready risk review in about 10–15 minutes — without inventing anything."

## Scene 2 — Upload & run (40s)
- Show `http://localhost:3000`. Point out: single file, PDF/DOCX, 25 MB limit.
- Drag in the sample contract → click **Upload Contract**.
- While the spinner runs, say what's happening: *"It extracts the text, sends it to Claude under a strict, grounded prompt, validates the result, and builds the dashboard."*

## Scene 3 — The artifact, page by page (90s)
- **Executive Decision Brief:** read the five KPIs, the snapshot strip (Type/Status/Term/Pricing/EM), the Management-ready Decision, and the donut chart. *"Status and counts are computed in code, so they're always correct."*
- **Top Risks:** show a High risk with its **evidence** quote and recommended action. *"Every risk is traceable to the actual clause."*
- **SLA Risk Assessment:** show the full table + a filter, and point out the **vs Standard** column on each SLA.
- **Commercial Impact:** show the value-at-risk framing. *"If a value isn't stated, we say so — we never fabricate money."*
- **Legends & Assumptions:** scroll to **Limitations** — *"we're explicit that this is a decision-support aid, not legal advice."*
- **Benchmark vs Standard:** show the scorecard and the *This contract vs standard* verdicts (Meets / Below / Uncapped / No target), then the searchable, collapsible **Reference Standards** — *"the tool judges each SLA in code against a house playbook, and ships the full playbook plus supplier and AI/token safeguards as reference. This is the 'judges, not just extracts' differentiator."*

## Scene 4 — Trust & reproducibility (40s)
- Re-upload the **same** file (or a renamed copy) → show the "already analyzed / same result" behavior. *"Same contract, same result — temperature 0 plus a deterministic cache."*
- Show `output/audit.log` briefly: tokens, cost, warnings, **PII-masked**.
- Mention injection defense: *"the contract is treated as untrusted data; hidden instructions can't hijack the agent."*

## Scene 5 — Close (20s)
> "Fast, consistent, safe, and reproducible — from contract to decision in about 10–15 minutes. Thank you."

## Screenshot checklist (also save these as evidence)
Save PNGs to `Submission/output-artifacts/`:
- [ ] Upload page
- [ ] Executive Decision Brief (full)
- [ ] Top Risks (a High risk with evidence)
- [ ] SLA Risk Assessment table
- [ ] Commercial Impact
- [ ] Legends & Assumptions (Limitations + Benchmark Verdict legend visible)
- [ ] Benchmark vs Standard (scorecard + verdicts + reference)
- [ ] Analysis History page
- [ ] A snippet of `output/audit.log`

Save the recording as `Submission/demo-video.mp4`.
