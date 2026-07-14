'use strict';

/**
 * Merges the model's dashboard data with the fixed legends, applies safe
 * defaults, and injects the JSON into the dashboard template.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'dashboard-template.html');
const TOKEN = '__DASHBOARD_DATA__';

// ---- Fixed legends (identical wording for every contract, per the prompt) ----

const BOARD_DECISION_LEGEND = [
  { decision: 'Proceed', meaning: 'The contract can move forward as drafted because the remaining risks are low-impact, clearly controlled, and unlikely to materially change price, delivery, legal exposure, security obligations, or termination rights.', typicalUse: 'Use when risks are mostly Low and normal governance is sufficient.' },
  { decision: 'Proceed with Conditions', meaning: 'The contract can move forward only if specific conditions are completed first, such as confirming missing documents, assigning owners, agreeing operating controls, documenting approvals, or accepting defined residual risks.', typicalUse: 'Use when the model is manageable but specific documents, owners, or controls must be confirmed first.' },
  { decision: 'Renegotiate', meaning: 'The contract should not be accepted as-is because one or more terms could materially affect cost, revenue, service credits, legal remedies, security obligations, termination rights, step-in rights, payment recovery, or delivery feasibility.', typicalUse: 'Use when one or more material terms create unacceptable commercial, legal, or security exposure.' },
  { decision: 'Do Not Proceed', meaning: 'The contract should not move forward because the risk is unacceptable, cannot be mitigated with reasonable wording or controls, lacks required authority, or creates exposure that leadership should not accept.', typicalUse: 'Use when required authority, governing agreement, or key protections cannot be confirmed.' }
];

const RISK_LEGEND = [
  { level: 'High', definition: 'High risk means the clause or missing information can materially affect revenue, cost, termination rights, service-credit exposure, security/legal remedies, operational continuity, or management-level acceptance. These items should not be treated as routine delivery issues. They normally require negotiation, written clarification, MSA validation, a clear owner, and leadership acceptance before execution or service commencement.', managementAction: 'Escalate immediately. Negotiate safer wording, confirm referenced MSA terms, define exclusions/caps/cure periods, document dependency pauses, and obtain Legal / Finance / Delivery / Security approval where relevant.' },
  { level: 'Medium', definition: 'Medium risk means the obligation is manageable, but the contract does not fully define process, ownership, timing, evidence, approval flow, baseline assumptions, or dependency handling. If these items are not clarified, they can become disputes, delivery delays, margin leakage, or SLA/credit issues during execution.', managementAction: 'Assign an owner and track through governance. Clarify process details, create evidence templates, define approval timelines, monitor monthly, and escalate if the risk begins affecting cost, delivery, acceptance, or service levels.' },
  { level: 'Low', definition: 'Low risk means the item is clear, administrative, protective, or low-impact based on the uploaded contract text. It still needs normal contract hygiene, record retention, and governance tracking, but it does not usually require negotiation unless facts change or related MSA terms introduce additional exposure.', managementAction: 'Accept with normal monitoring. Retain evidence, keep records complete, and revisit only if scope, volume, ownership, or referenced agreement terms change.' }
];

const PRIORITY_LEGEND = [
  { priority: 'P1', impact: 'Critical issue with potential management-level, legal, commercial, security, termination, service-credit, or operational impact. If unresolved, it can directly affect whether the contract should be signed, started, or continued as-is.', responseTarget: 'Assign executive-level owner and action plan before execution or before relying on the clause operationally.', resolutionTarget: 'Close through negotiated wording, MSA validation, formal risk acceptance, or documented mitigation before contract execution / service commencement wherever possible.', riskNote: 'Use P1 when a clause can create immediate credit exposure, termination/step-in rights, uncapped or non-waivable remedies, unclear MSA dependency, or major delivery/payment risk.' },
  { priority: 'P2', impact: 'Material operational or commercial issue that can affect delivery performance, monthly billing, cost recovery, SLA evidence, transition support, or governance if not actively managed.', responseTarget: 'Assign Legal, Finance, Delivery, PMO, Support, Security, Account, or Service Manager owner in the next governance cycle.', resolutionTarget: 'Resolve before the affected service, invoice cycle, SLA period, change event, or termination/transition activity occurs; otherwise track with a dated mitigation plan.', riskNote: 'Use P2 where risk is significant but controllable through process, approvals, evidence, dependency logs, volume tracking, or change-control discipline.' },
  { priority: 'P3', impact: 'Governance, reporting, documentation, process, or monitoring item. It may not block execution by itself, but weak controls can reduce the ability to prove exclusions, claim costs, dispute credits, or manage scope.', responseTarget: 'Track through routine weekly/monthly governance and assign an operational owner.', resolutionTarget: 'Convert into a repeatable operating procedure, template, checklist, reporting pack, or evidence-retention practice within normal implementation timelines.', riskNote: 'Use P3 for items mainly about contract administration, meeting cadence, reporting completeness, or operational traceability.' },
  { priority: 'P4', impact: 'Low-impact administrative or records item such as execution evidence, signature record, table confirmation, or other contract hygiene requirement. It usually does not change service delivery economics unless evidence is missing.', responseTarget: 'Confirm during contract records review or normal onboarding.', resolutionTarget: 'Retain final evidence in the contract repository and confirm missing signatures or records before relying on the contract as legally complete.', riskNote: 'Use P4 for recordkeeping and low-impact items. Raise to Medium if signature evidence, authority, or essential contract records are incomplete.' }
];

const SLA_LEGEND = [
  { type: 'Referenced Agreement', meaning: 'External or master agreement referenced by the uploaded contract. If the referenced agreement is not uploaded, legal, payment, liability, confidentiality, remedy and termination terms require manual validation.' },
  { type: 'SLA / Service Level', meaning: 'Performance obligation with target, measurement source, exclusions, dependency handling and possible service-credit consequences.' },
  { type: 'Service Credit / Penalty', meaning: 'Financial or invoice remedy tied to qualifying KPI, SLA, reporting, acceptance, security or provider-controlled misses.' },
  { type: 'Termination / Step-in', meaning: 'Rights related to cure, termination, chronic failure, scope reallocation, transition or replacement supplier support.' },
  { type: 'Cost Impact / Chargeable Event', meaning: 'Scope, volume, acceleration, after-hours, travel, tool, cloud or resource event that may affect pricing or billing.' },
  { type: 'Security / Compliance', meaning: 'Data-handling, confidentiality, privacy, suspension, breach, remediation, credit and legal remedy obligations.' },
  { type: 'Governance / Evidence', meaning: 'Reporting, approval, dependency log, dispute record, signature or operating-control requirement.' }
];

const CONFIDENCE_LEGEND = [
  { range: '90-100%', meaning: 'Explicit supporting text is present in the uploaded contract and page reference is reliable.' },
  { range: '75-89%', meaning: 'Conclusion is clearly supported but requires minor interpretation, table alignment check or MSA validation.' },
  { range: '50-74%', meaning: 'Evidence is partial, ambiguous, or dependent on a referenced agreement or operational evidence not uploaded.' },
  { range: 'Below 50%', meaning: 'Manual validation is required before relying on the item for decision-making.' }
];

const TYPE_LEGEND = [
  { type: 'SOW', meaning: 'Statement of Work — defines the scope, deliverables, timeline and fees for a specific engagement, usually under a master agreement.' },
  { type: 'MSA', meaning: 'Master Services Agreement — overarching legal/commercial terms (liability, payment, confidentiality, termination) governing all work between the parties.' },
  { type: 'GSA', meaning: 'General / Global Services Agreement — umbrella services agreement similar in role to an MSA.' },
  { type: 'Order Form', meaning: 'Ordering document that activates specific services or pricing under a master agreement.' },
  { type: 'Amendment', meaning: 'A change to the terms of an existing contract or agreement.' },
  { type: 'PO', meaning: 'Purchase Order — the buyer’s commercial instrument authorizing spend.' },
  { type: 'Contract', meaning: 'General agreement used when a more specific document type is not identified in the uploaded file.' }
];

const STATUS_LEGEND = [
  { status: 'Upcoming', meaning: 'The start date is in the future; the engagement has not yet begun.' },
  { status: 'Active', meaning: 'The current date falls between the contract start and end dates.' },
  { status: 'On Hold', meaning: 'The contract explicitly indicates the engagement is suspended, paused, or on hold.' },
  { status: 'Expired', meaning: 'The contract end date is in the past.' },
  { status: 'Not determinable', meaning: 'Start/end dates are missing or unclear in the uploaded contract.' }
];

const PRICING_LEGEND = [
  { model: 'T&M (Time & Materials)', meaning: 'Billed on resource time and agreed rates; no fixed-price commitment.' },
  { model: 'Fixed Price', meaning: 'A fixed price for a defined scope; the provider owns budget and scope/change management.' },
  { model: 'Output-based', meaning: 'Priced on committed outputs, deliverables, or volume/velocity.' },
  { model: 'Outcome-based', meaning: 'Priced on business or transaction outcomes; may include gain-sharing.' },
  { model: 'Monthly baseline', meaning: 'A recurring monthly fee that forms the billing baseline.' },
  { model: 'Not stated', meaning: 'No pricing model is stated in the uploaded contract.' }
];

const EM_LEGEND = [
  { level: 'EM 1 – Staff Aug', meaning: 'Resource / Time & Materials staffing; client controls priorities, schedules and acceptance; no SLA, service-credit, milestone, output or outcome commitment.' },
  { level: 'EM 2A – Quality+', meaning: 'Provider has deliverable-quality responsibility but does not own budget, scope or schedule; client interviews are NOT conducted by the client.' },
  { level: 'EM 2B – Quality+', meaning: 'As EM 2A, but candidate interviews ARE conducted by the client.' },
  { level: 'EM 3 – Delivery+', meaning: 'Provider owns delivery scheduling and milestone tracking; SLAs/KPIs may exist without penalties; not a fixed-price model.' },
  { level: 'EM 4 – Fixed Price', meaning: 'Fixed-price/bid-based; provider owns budget, scope/change management and controlled delivery.' },
  { level: 'EM 4 – Output+', meaning: 'Output-metric or committed-output based, with SLA/KPI penalties; provider owns budget and scope/change management.' },
  { level: 'EM 4 – Outcome+', meaning: 'Outcome-based; pricing/obligations depend on business or transaction outcomes, possibly with gain-sharing.' }
];

const DECISION_METHOD_LEGEND = [
  { aspect: 'What this is', detail: 'A single management call on the contract: Proceed, Proceed with Conditions, Renegotiate, or Do Not Proceed.' },
  { aspect: 'How the call is made', detail: 'The tool looks at every risk it found and weighs how many are High vs Medium vs Low and how serious they are. Lots of serious (High / P1) risks push the call toward "Renegotiate" or "Do Not Proceed"; mostly Low risks lean toward "Proceed".' },
  { aspect: 'The "Proceed if" list', detail: 'Things you should confirm or fix BEFORE signing — e.g. obtain a referenced agreement that was not uploaded, or close a specific high risk.' },
  { aspect: 'The "Renegotiate now" list', detail: 'The specific clauses worth pushing back on before signing — e.g. unfavourable payment, liability, security, termination or SLA terms.' },
  { aspect: 'Where it comes from', detail: 'Only from clauses found in the uploaded contract. Nothing is assumed or invented, and the wording is not copied from any past contract.' }
];

const SUMMARY_METHOD_LEGEND = [
  { aspect: 'What this is', detail: 'A short, plain-language recap (up to 5 points) of the contract’s biggest risks and actions, written for busy decision-makers.' },
  { aspect: 'How it is built', detail: 'The tool reads the risks and the key commercial, legal, SLA and termination terms it extracted, then writes the five most important takeaways as a bold header plus a one-line explanation.' },
  { aspect: 'What it usually covers', detail: 'The main term to renegotiate, any referenced agreement that must be checked, SLA / service-credit evidence, commercial or termination exposure, and whether the contract is properly signed.' },
  { aspect: 'Where it comes from', detail: 'Only from the uploaded contract. If a point is not supported by the document, it is left out rather than guessed.' }
];

const SLA_REMEDY_LEGEND = [
  { state: 'Penalty / Credit', meaning: 'A financial service credit, penalty, liquidated damages, or cap applies to this SLA — direct exposure to manage and negotiate.' },
  { state: 'No penalty', meaning: 'The contract explicitly states that no penalty or service credit applies to this SLA.' },
  { state: 'Not stated', meaning: 'No remedy, penalty, or service credit is specified in the uploaded contract for this SLA.' }
];

const LIMITATIONS_LEGEND = [
  { area: 'AI extraction', detail: 'Values are read by an AI language model. It can occasionally misread, miss, or misclassify a clause, especially in long, scanned, or poorly formatted documents. Treat the output as a first-pass review aid, not legal advice — always verify against the source contract.' },
  { area: 'Uploaded document only', detail: 'Analysis is limited strictly to the single uploaded file. Any referenced but not-uploaded document (MSA, GSA, annexures, schedules, policies) is NOT analyzed and must be reviewed manually.' },
  { area: 'Scanned / image PDFs', detail: 'Only machine-readable text is analyzed. Image-only or scanned PDFs without a text layer cannot be read (run OCR first). Legacy binary .doc files are not supported.' },
  { area: 'Page numbers', detail: 'Page references are reliable for standard digital PDFs but can drift on multi-column or heavily tabular layouts. DOCX files are not paginated, so page numbers show as "Not available".' },
  { area: 'Contract value & exposure', detail: 'Monetary "value at risk" and bucket allocations are directional estimates for prioritization, not contractual figures, penalties, or guaranteed amounts. Where no value is stated it is shown as "Not stated" rather than invented.' },
  { area: 'EM level & pricing', detail: 'EM level and pricing model are inferred from the contract wording using fixed rules; borderline cases may need human confirmation.' },
  { area: 'Language & scope', detail: 'Optimized for English-language services/IT contracts. Other languages, jurisdictions, or contract types may reduce accuracy.' },
  { area: 'Patient data (PHI)', detail: 'This tool analyzes CONTRACTS, not patient records — it does not need or expect PHI. If patient identifiers (MRN, DOB, SSN, ICD codes, claim IDs) are detected they are flagged, and all logs are masked. Use only synthetic or approved data; never upload real patient health records.' },
  { area: 'SLA benchmark (vs Standard)', detail: 'The "vs Standard" verdict compares each extracted SLA to a fixed internal SLA/SOW/Project-Risk playbook covering availability, incident response & resolution by priority, API latency & error rate, defect/regression quality, service-desk metrics, security (breach notice, vulnerability remediation, RTO/RPO), delivery variances and penalty caps. It is computed deterministically in code (never by the AI), is directional guidance for negotiation — not legal or market advice — and only scores SLAs whose target could be parsed; anything vague is left for human review.' },
  { area: 'Not a substitute for review', detail: 'This dashboard supports human decision-making. Final legal, commercial, and risk decisions must be made by qualified reviewers.' }
];

const BENCHMARK_LEGEND = [
  { verdict: 'Meets standard', state: 'meets', meaning: 'The SLA target stated in the contract meets or beats the house benchmark (pass).' },
  { verdict: 'Below standard', state: 'below', meaning: 'The stated target is worse than the benchmark — a negotiation target (fail).' },
  { verdict: 'Uncapped penalty', state: 'uncapped', meaning: 'A service credit / penalty applies but no cap is stated — a negotiation target (fail).' },
  { verdict: 'No target stated', state: 'na', meaning: 'The SLA clause was found but no measurable value was given, so the benchmark cannot score it — verify manually.' }
];

// ---- SLA benchmark playbook (deterministic "vs Standard" comparison) --------
// Numeric standards sourced from the internal SLA, SOW & Project Risk Playbook
// (sections A–W). Only THRESHOLD-type checks are automated here: each extracted
// SLA target is parsed and compared IN CODE (never by the model), so the verdict
// is deterministic and cannot be hallucinated. Rows whose target cannot be
// parsed are left for human review ("No parseable target"). Edit values here to
// change the house standard.
const SLA_PLAYBOOK = {
  // Priority-aware INITIAL RESPONSE (minutes; business hrs/days approximated).
  responseMin:   { P1: 30,  P2: 120, P3: 480,  P4: 1440 },   // B
  // Priority-aware RESTORATION / RESOLUTION (minutes).
  resolutionMin: { P1: 240, P2: 480, P3: 4320, P4: 7200 },   // C
  penaltyCapRequired: true       // a stated penalty/credit should have a cap (G)
};

// Flat "metric -> threshold" rules. unit 'pct' compares a percentage; unit 'dur'
// compares a parsed duration in SECONDS. dir 'min' => value must be >= standard
// (higher is better); dir 'max' => value must be <= standard (lower is better).
// First matching rule wins, so more specific patterns are listed first.
const BENCHMARK_RULES = [
  // Availability & quality rates — higher is better
  { re: /(micro-?service|api)\b[^%]*(avail|uptime)|(avail|uptime)[^%]*(api|micro-?service)/, unit: 'pct', dir: 'min', value: 99.95 }, // A
  { re: /avail|uptime/,                              unit: 'pct', dir: 'min', value: 99.9 },  // A
  { re: /data[- ]?load accuracy|load accuracy|data accuracy/, unit: 'pct', dir: 'min', value: 99.9 }, // D
  { re: /etl.*success|daily.*success|success rate/,  unit: 'pct', dir: 'min', value: 99 },    // D
  { re: /regression.*pass|pass rate/,                unit: 'pct', dir: 'min', value: 95 },    // E
  { re: /build success/,                             unit: 'pct', dir: 'min', value: 95 },    // E
  { re: /first[- ](contact|call).*resolut|\bfcr\b/,  unit: 'pct', dir: 'min', value: 70 },    // F
  { re: /on[- ]time.*(milestone|deliver)|milestone.*completion/, unit: 'pct', dir: 'min', value: 95 }, // K
  { re: /deployment success/,                        unit: 'pct', dir: 'min', value: 95 },    // I
  // Failure rates & variances — lower is better (change-failure before generic)
  { re: /change failure/,                            unit: 'pct', dir: 'max', value: 15 },    // I
  { re: /failed[- ]call|failed[- ]request|error[- ]rate/, unit: 'pct', dir: 'max', value: 1 }, // D
  { re: /escaped[- ]?defect|defect leakage|leakage/, unit: 'pct', dir: 'max', value: 5 },     // E
  { re: /reopen/,                                    unit: 'pct', dir: 'max', value: 5 },     // E/F
  { re: /abandon/,                                   unit: 'pct', dir: 'max', value: 5 },     // F
  { re: /schedule variance/,                         unit: 'pct', dir: 'max', value: 10 },    // I
  { re: /effort variance/,                           unit: 'pct', dir: 'max', value: 10 },    // I
  { re: /(eac|estimate[- ]at[- ]completion|forecast[- ]at[- ]completion|completion) variance/, unit: 'pct', dir: 'max', value: 10 }, // I/R
  { re: /rework/,                                    unit: 'pct', dir: 'max', value: 10 },    // I
  { re: /margin erosion/,                            unit: 'pct', dir: 'max', value: 5 },     // U
  // Durations — lower is better (value in SECONDS)
  { re: /latency/,                                   unit: 'dur', dir: 'max', value: 0.5 },       // D  500 ms
  { re: /(page|transaction)[^.]*(response|load)|(response|load)[^.]*(page|transaction)/, unit: 'dur', dir: 'max', value: 3 }, // D
  { re: /breach|incident notif|security[^.]*notif|notif[^.]*(breach|incident|security)/, unit: 'dur', dir: 'max', value: 172800 }, // H  48h
  { re: /critical[^.]*vulnerab|vulnerab[^.]*critical/, unit: 'dur', dir: 'max', value: 1296000 }, // H  15d
  { re: /high[^.]*vulnerab|vulnerab[^.]*high/,       unit: 'dur', dir: 'max', value: 2592000 },   // H  30d
  { re: /critical[^.]*defect|defect[^.]*(correct|fix)/, unit: 'dur', dir: 'max', value: 86400 },  // E  critical defect 24h
  { re: /high[^.]*defect/,                           unit: 'dur', dir: 'max', value: 259200 },    // E  high defect 3bd
  { re: /\brto\b|recovery time objective/,           unit: 'dur', dir: 'max', value: 14400 },     // H  4h
  { re: /\brpo\b|recovery point objective/,          unit: 'dur', dir: 'max', value: 3600 },      // H  1h
  { re: /\brca\b|root cause/,                        unit: 'dur', dir: 'max', value: 432000 },    // C  5bd
  { re: /provision|\bvpn\b/,                         unit: 'dur', dir: 'max', value: 432000 },    // L  5bd
  { re: /replacement/,                               unit: 'dur', dir: 'max', value: 864000 },    // M  10bd
  { re: /acceptance review/,                         unit: 'dur', dir: 'max', value: 432000 },    // K  5bd
  { re: /milestone delay/,                           unit: 'dur', dir: 'max', value: 432000 },    // K  5bd
  { re: /(cr|change)[- ]?(turnaround|request)|turnaround/, unit: 'dur', dir: 'max', value: 864000 }, // N  10bd
  // Durations — higher is better
  { re: /maintenance notice/,                        unit: 'dur', dir: 'min', value: 432000 },    // A  >=5bd
  { re: /extension lead/,                            unit: 'dur', dir: 'min', value: 2592000 }    // Q  >=30d
];

function parsePct(s) {
  const m = String(s || '').match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

/** Parse a duration ("500 ms", "30 min", "4 hours", "5 business days") to SECONDS. */
function parseDurationSec(s) {
  const str = String(s || '').toLowerCase();
  const m = str.match(/(\d+(?:\.\d+)?)\s*(ms|millisec\w*|sec\w*|s\b|minute\w*|min\w*|m\b|hour\w*|hr\w*|h\b|business\s+day\w*|bd\b|day\w*|d\b|week\w*|w\b)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2];
  if (/^ms|^millisec/.test(u)) return n / 1000;
  if (/^sec|^s\b/.test(u)) return n;
  if (/^minute|^min|^m\b/.test(u)) return n * 60;
  if (/^hour|^hr|^h\b/.test(u)) return n * 3600;
  if (/business\s+day|^bd|^day|^d\b/.test(u)) return n * 86400;
  if (/^week|^w\b/.test(u)) return n * 604800;
  return null;
}

/** Human-readable minutes ("30 min", "4 h", "3 days"). */
function fmtMin(m) {
  if (m < 60) return m + ' min';
  if (m < 1440) return (m / 60) + ' h';
  return (m / 1440) + ((m / 1440) === 1 ? ' day' : ' days');
}

/** Human-readable seconds standard for a rule ("≤ 500 ms", "≥ 5 days"). */
function fmtStd(rule) {
  const op = rule.dir === 'min' ? '≥' : '≤';
  if (rule.unit === 'pct') return op + rule.value + '%';
  const v = rule.value;
  let t;
  if (v < 1) t = Math.round(v * 1000) + ' ms';
  else if (v < 60) t = v + ' s';
  else if (v < 3600) t = (v / 60) + ' min';
  else if (v < 86400) t = (v / 3600) + ' h';
  else t = (v / 86400) + ((v / 86400) === 1 ? ' day' : ' days');
  return op + ' ' + t;
}

// Full playbook reference (sections A–W + safeguards) for the "Benchmark vs
// Standard" page. Kept in its own module because of its size. Display-only —
// the pass/fail verdicts are driven by the numeric rules above.
const BENCHMARK_REFERENCE = require('./benchmark-reference');

/**
 * Compare every SLA row against the playbook and tag it with a verdict.
 * Adds r.vsStandardState ('meets'|'below'|'uncapped'|'na'|''), r.vsStandard
 * (short label for the badge) and r.benchStandard (the applicable standard text).
 * Rows with no applicable standard get '' (excluded). Mutates rows in place;
 * returns { evaluated, meets, below, uncapped, na }.
 */
function benchmarkSlaRows(rows) {
  const c = { evaluated: 0, meets: 0, below: 0, uncapped: 0, na: 0 };
  (rows || []).forEach((r) => {
    if (!r || typeof r !== 'object') return;
    const metric = String(r.metric || '').toLowerCase();
    const clause = String(r.clause || '').toLowerCase();
    const slaType = String(r.slaType || '').toLowerCase();
    const svc = String(r.service || '').toLowerCase();
    const hay = slaType + ' ' + metric + ' ' + clause + ' ' + svc;
    const field = metric + ' ' + clause;
    const isSla = /sla|service level|service credit|penalt|uptime|availab|response|resolut|restor|latency|defect|ticket|\brca\b|\brto\b|\brpo\b|vulnerab|breach|variance|milestone|deploy|throughput|accuracy|abandon|rework/.test(hay);
    if (!isSla) { r.vsStandard = ''; r.vsStandardState = ''; r.benchStandard = ''; return; }

    let state = '';      // '' = no applicable standard matched
    let std = '';        // the applicable standard text (shown on the page)
    const isP1 = r.priority === 'P1' || /\bp1\b|priority 1|critical|sev(?:erity)?\s*1/.test(hay);
    const prio = (r.priority && SLA_PLAYBOOK.responseMin[r.priority]) ? r.priority : (isP1 ? 'P1' : 'P2');
    const cmpDur = (sec, secStd) => sec == null ? 'na' : (sec <= secStd + 1e-6 ? 'meets' : 'below');

    if (/response|acknowled/.test(field) && !/resolut|restor|page|transaction|latency/.test(field)) {
      const m = SLA_PLAYBOOK.responseMin[prio];
      std = '≤ ' + fmtMin(m) + ' (' + prio + ')';
      state = cmpDur(parseDurationSec(r.target), m * 60);
    } else if (/resolut|restor/.test(field)) {
      const m = SLA_PLAYBOOK.resolutionMin[prio];
      std = '≤ ' + fmtMin(m) + ' (' + prio + ')';
      state = cmpDur(parseDurationSec(r.target), m * 60);
    } else {
      for (const rule of BENCHMARK_RULES) {
        if (!rule.re.test(field)) continue;
        std = fmtStd(rule);
        if (rule.unit === 'pct') {
          const p = parsePct(r.target);
          state = p == null ? 'na' : ((rule.dir === 'min' ? (p + 1e-9 >= rule.value) : (p <= rule.value + 1e-9)) ? 'meets' : 'below');
        } else {
          const sec = parseDurationSec(r.target);
          state = sec == null ? 'na' : ((rule.dir === 'min' ? (sec + 1e-6 >= rule.value) : (sec <= rule.value + 1e-6)) ? 'meets' : 'below');
        }
        break;
      }
    }

    // Penalty-cap check: a stated remedy/credit with no cap is flagged (only when
    // the target itself is acceptable/unmeasured, so one clear verdict per row).
    if (state === 'meets' || state === 'na' || state === '') {
      const remedy = String(r.remedy || '').toLowerCase();
      const cap = String(r.cap || '').toLowerCase();
      const hasPenalty = /credit|penalt|liquidated|damage/.test(remedy) && !/no penalt|no credit|not stated|none|n\/a/.test(remedy);
      const noCap = !cap || /not stated|none|no cap|uncapp|n\/a/.test(cap);
      if (SLA_PLAYBOOK.penaltyCapRequired && hasPenalty && noCap) { state = 'uncapped'; std = 'Penalty must be capped'; }
    }

    if (!state) { r.vsStandard = ''; r.vsStandardState = ''; r.benchStandard = ''; return; }
    const label = state === 'meets' ? 'Meets standard' : state === 'below' ? 'Below standard'
      : state === 'uncapped' ? 'Uncapped penalty' : 'No target stated';
    r.vsStandardState = state;
    r.vsStandard = label;
    r.benchStandard = std;
    c.evaluated++;
    c[state]++;
  });
  return c;
}

function escapeText(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parse common contract date formats to a UTC midnight Date, or null. */
function parseDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  // 28-Apr-2025 | 28 Apr 2025 | 28 April 2025
  let m = str.match(/(\d{1,2})[ \-]([A-Za-z]{3,})[ \-,]*(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon !== undefined) return new Date(Date.UTC(+m[3], mon, +m[1]));
  }
  // April 28, 2025 | Apr 28 2025
  m = str.match(/([A-Za-z]{3,})[ \-]+(\d{1,2})[ \-,]+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon !== undefined) return new Date(Date.UTC(+m[3], mon, +m[2]));
  }
  // 2025-04-28 | 2025/04/28
  m = str.match(/(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const t = Date.parse(str);
  return isNaN(t) ? null : new Date(t);
}

/**
 * Compute contract status from start/end dates and today. Returns null if the
 * dates can't be parsed (so the model's own value is kept). "On Hold" is a
 * business state the model must set explicitly, so it is never overridden here.
 */
function deriveStatus(startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start && !end) return null;
  // Guard against reversed/invalid ranges (bad extraction): don't force a
  // misleading Active/Expired — leave status for manual determination.
  if (start && end && end.getTime() < start.getTime()) return null;
  const n = new Date();
  const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  if (start && today < start.getTime()) return 'Upcoming';
  if (end && today > end.getTime()) return 'Expired';
  if ((!start || today >= start.getTime()) && (!end || today <= end.getTime())) return 'Active';
  return null;
}

/** Snap a pricing label to one of the Pricing Legend values. */
function snapPricing(pm) {
  const s = String(pm || '').toLowerCase();
  if (!s || /not stated|^n\/?a$|unknown/.test(s)) return 'Not stated';
  if (/t\s*&\s*m|time\s*(and|&)?\s*material/.test(s)) return 'T&M';
  // Note: "milestone" is NOT treated as fixed-price here — milestone billing can
  // exist under T&M/EM3 too. True fixed-price is handled by the EM4 rule above.
  if (/fixed[\s-]*price|firm[\s-]*fixed|lump[\s-]*sum/.test(s)) return 'Fixed Price';
  if (/outcome/.test(s)) return 'Outcome-based';
  if (/output|deliverable[\s-]*based|velocity/.test(s)) return 'Output-based';
  if (/monthly|retainer|recurring/.test(s)) return 'Monthly baseline';
  return pm; // already a legend label or an unrecognized (kept) value
}

/** Resolve the full EM Level legend name (e.g. "EM 4 – Fixed Price"). */
function canonicalEm(emLevel, emShort) {
  const norm = (x) => String(x || '')
    .replace(/em\s*/i, 'em ').replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
  const levels = EM_LEGEND.map((x) => x.level);
  const head = String(emLevel || '').split(/[;.]/)[0];
  const nh = norm(head);
  for (const lev of levels) if (norm(lev) === nh) return lev;
  const low = String(emLevel || '').toLowerCase();
  if (/staff\s*aug/.test(low)) return 'EM 1 – Staff Aug';
  if (/fixed[\s-]*price/.test(low)) return 'EM 4 – Fixed Price';
  if (/output/.test(low)) return 'EM 4 – Output+';
  if (/outcome/.test(low)) return 'EM 4 – Outcome+';
  if (/delivery\+|delivery plus|milestone tracking/.test(low)) return 'EM 3 – Delivery+';
  if (/2b/.test(low)) return 'EM 2B – Quality+';
  if (/2a|quality/.test(low)) return 'EM 2A – Quality+';
  const map = { 'em 1': 'EM 1 – Staff Aug', 'em 2a': 'EM 2A – Quality+', 'em 2b': 'EM 2B – Quality+', 'em 3': 'EM 3 – Delivery+', 'em 4': 'EM 4 – Fixed Price' };
  return map[norm(emShort)] || (emShort || 'Not stated');
}

/**
 * Normalize the model output: fix counts, ensure legends, derive note/footer.
 */
function normalize(data) {
  const d = data || {};
  d.metadata = d.metadata || {};
  d.rows = Array.isArray(d.rows) ? d.rows : [];

  // Deterministic contract status from the dates (the model's status is
  // unreliable). Keep an explicit "On Hold" and keep the model value if the
  // dates cannot be parsed.
  if (String(d.metadata.status || '').trim().toLowerCase() !== 'on hold') {
    const st = deriveStatus(d.metadata.startDate, d.metadata.endDate);
    if (st) d.metadata.status = st;
  }

  // Pricing label consistency: a fixed-price EM4 contract paid across
  // milestones is still "Fixed Price" (milestones are a payment schedule, not
  // a pricing model). Only override a vague/milestone label, never a clear one.
  const em = String(d.metadata.emLevel || '');
  const emShort = String(d.metadata.emShort || '');
  const pm = String(d.metadata.pricingModel || '');
  if (/EM\s*4/i.test(emShort) && /fixed\s*price/i.test(em) && /milestone|not stated|^\s*$/i.test(pm)) {
    d.metadata.pricingModel = 'Fixed Price';
  }
  // Snap pricing to a Pricing Legend label.
  d.metadata.pricingModel = snapPricing(d.metadata.pricingModel);

  // Enforce EM <-> pricing consistency deterministically so the dashboard can
  // NEVER show an impossible combination (e.g. T&M + EM4). The EM classification
  // (delivery model) is TRUSTED; pricing is corrected to match it. The
  // reconciliation is noted in pricingFull for transparency.
  {
    const emLo = (String(d.metadata.emLevel || '') + ' ' + String(d.metadata.emShort || '')).toLowerCase();
    const pmNow = String(d.metadata.pricingModel || '');
    const pmLo = pmNow.toLowerCase();
    let target = null;
    if (/em\s*4/.test(emLo) && /fixed\s*price/.test(emLo)) target = 'Fixed Price';
    else if (/output\+|output plus|output-based/.test(emLo)) target = 'Output-based';
    else if (/outcome\+|outcome plus|outcome-based/.test(emLo)) target = 'Outcome-based';
    else if (/em\s*1|staff\s*aug|em\s*2|quality\+|em\s*3|delivery\+/.test(emLo)) {
      // EM1/EM2/EM3 are not fixed-price/output/outcome commercial models; if the
      // pricing claims one of those, correct it to T&M (their usual model).
      if (/fixed\s*price|output|outcome/.test(pmLo)) target = 'T&M';
    }
    if (target && target.toLowerCase() !== pmLo) {
      d.metadata.pricingModel = target;
      const note = ` (pricing reconciled to match the ${d.metadata.emShort || 'EM'} delivery model)`;
      const base = String(d.metadata.pricingFull || pmNow || '').trim();
      d.metadata.pricingFull = base && !/reconciled to match/.test(base) ? base + note : target + note;
    }
  }

  // Resolve the full EM name shown in the executive strip from the EM legend.
  d.metadata.emDisplay = canonicalEm(d.metadata.emLevel, d.metadata.emShort);

  // Recompute counts from the actual rows so the chart/KPIs always match.
  const counts = { High: 0, Medium: 0, Low: 0 };
  d.rows.forEach((r) => {
    if (r && counts[r.risk] !== undefined) counts[r.risk]++;
  });
  d.counts = counts;

  // SLA benchmark: judge each SLA against the fixed playbook (deterministic).
  const slaBench = benchmarkSlaRows(d.rows);
  d.slaBenchmarked = slaBench.evaluated;
  d.slaMeets = slaBench.meets;
  d.slaBelow = slaBench.below;
  d.slaUncapped = slaBench.uncapped;
  d.slaNoTarget = slaBench.na;
  d.slaBelowStandard = slaBench.below + slaBench.uncapped; // "needs attention" (exec flag)
  d.benchmarkReference = BENCHMARK_REFERENCE;

  // Numeric contract value drives bucket allocation.
  const cv = Number(d.metadata.contractValueNumeric);
  const hasValue = d.metadata.contractValueNumeric !== null &&
    d.metadata.contractValueNumeric !== undefined &&
    d.metadata.contractValueNumeric !== '' &&
    !isNaN(cv);

  if (hasValue) {
    if (!d.bucketValues || typeof d.bucketValues !== 'object') {
      d.bucketValues = {
        High: Math.round(cv * 0.5),
        Medium: Math.round(cv * 0.4),
        Low: Math.round(cv * 0.1)
      };
    }
  } else {
    d.bucketValues = null;
  }

  // Fixed legends always come from the app.
  d.boardDecisionLegend = BOARD_DECISION_LEGEND;
  d.riskLegend = RISK_LEGEND;
  d.priorityLegend = PRIORITY_LEGEND;
  d.slaLegend = SLA_LEGEND;
  d.confidenceLegend = CONFIDENCE_LEGEND;
  d.typeLegend = TYPE_LEGEND;
  d.statusLegend = STATUS_LEGEND;
  d.pricingLegend = PRICING_LEGEND;
  d.emLegend = EM_LEGEND;
  d.decisionMethodLegend = DECISION_METHOD_LEGEND;
  d.summaryMethodLegend = SUMMARY_METHOD_LEGEND;
  d.slaRemedyLegend = SLA_REMEDY_LEGEND;
  d.benchmarkLegend = BENCHMARK_LEGEND;
  d.limitationsLegend = LIMITATIONS_LEGEND;

  // Safe defaults for optional collections.
  d.overall = d.overall || 'Not stated';
  d.boardDecision = d.boardDecision || 'Not stated';
  d.boardSummary = Array.isArray(d.boardSummary) ? d.boardSummary : [];
  d.kpiSubs = d.kpiSubs || {};
  d.decisionList = d.decisionList || {};
  d.financialNotes = Array.isArray(d.financialNotes) ? d.financialNotes : [];
  d.revenueControls = Array.isArray(d.revenueControls) ? d.revenueControls : [];
  d.commercialBaseline = Array.isArray(d.commercialBaseline) ? d.commercialBaseline : [];
  d.leakageScenarios = Array.isArray(d.leakageScenarios) ? d.leakageScenarios : [];
  d.penaltyExposure = d.penaltyExposure || {};
  d.recos = Array.isArray(d.recos) ? d.recos : [];
  d.assumptions = Array.isArray(d.assumptions) ? d.assumptions : [];

  // Sidebar note: shown ONLY when the contract cites an external / referenced
  // document or link we could not validate; otherwise left empty (box hidden).
  const refText = [
    d.metadata.governingAgreement, d.metadata.slaTerms, d.metadata.securityTerms,
    d.metadata.terminationTerms, d.metadata.billingCadence, d.metadata.scopeChangeTerms
  ].map((v) => String(v || '')).join(' ');
  const hasExternalRef = /master service|\bmsa\b|\bgsa\b|governing agreement|referenced agreement|not uploaded|manual validation|annexure|\bschedule\b|\bexhibit\b|addendum|https?:\/\//i.test(refText);
  d.sourceNote = hasExternalRef
    ? '<b>Note:</b> External references cited in the contract have not been validated and must be reviewed manually.'
    : '';
  d.footer = 'CitiusTech Confidential';

  return d;
}

/**
 * Serialize data for safe embedding inside a <script type="application/json"> block.
 * Escapes '<' so no "</script>" or "<!--" sequence can break out of the tag.
 * (U+2028/U+2029 are valid inside JSON.parse, so no extra handling is needed.)
 */
function toEmbeddedJson(data) {
  return JSON.stringify(data).replace(/</g, '\\u003C');
}

/**
 * @param {object} data  model output (already parsed)
 * @returns {string} complete, self-contained HTML dashboard
 */
function buildHtml(data) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const normalized = normalize(data);
  const json = toEmbeddedJson(normalized);
  if (!template.includes(TOKEN)) {
    throw new Error('Template is missing the ' + TOKEN + ' injection token.');
  }
  return template.replace(TOKEN, () => json);
}

module.exports = { buildHtml, normalize };
