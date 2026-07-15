# Contract Analyzer — Architecture & Flow

## Architecture

Component view. **`server.js`** (Express) calls the three processing modules **in-process** and is the only component that reads/writes the `output/` store and the deterministic `cache/`. The stage modules stay stateless; `guardrails.js` is a pure helper used across the request.

```mermaid
flowchart TB
  subgraph BROWSER["Browser"]
    UI["index.html<br/>Upload + live progress UI"]
    HIST["analysis-history.html<br/>Past analyses"]
  end

  subgraph SERVER["server.js — Express orchestrator"]
    direction TB
    ROUTES["routes + SSE-free progress<br/>rate limit · dedup · audit"]
    subgraph PIPE["Processing modules — in-process"]
      direction LR
      EXTRACT["extract.js<br/>PDF/DOCX → text + [[PAGE n]]"]
      ANALYZE["analyze.js<br/>Claude call · cache · retries · validation"]
      BUILD["buildHtml.js<br/>normalize · SLA benchmark · assemble"]
    end
    GUARD["guardrails.js<br/>validation · injection/PHI · masking · output checks"]
  end

  CLAUDE(["Claude API<br/>Anthropic — temperature 0"])
  PROMPT[/"analysis-prompt.txt"/]
  TEMPLATE[/"dashboard-template.html"/]
  REF[/"benchmark-reference.js<br/>playbook A–W + safeguards"/]
  OUT[("output/<br/>dashboards · history.json · audit.log")]
  CACHE[("cache/<br/>sha256(text+prompt).json")]

  UI -- "POST /analyze (contract)" --> ROUTES
  HIST -- "GET /api/history" --> ROUTES
  ROUTES -- "GET /output/*.html" --> UI

  ROUTES --> EXTRACT --> ANALYZE --> BUILD
  ANALYZE -- "grounded prompt" --> CLAUDE
  ANALYZE -. reads .-> PROMPT
  ANALYZE <-. "reuse / store" .-> CACHE
  BUILD -. reads .-> TEMPLATE
  BUILD -. reads .-> REF
  ROUTES -- "read / write" --> OUT

  GUARD -.-> ROUTES
  GUARD -.-> EXTRACT
  GUARD -.-> ANALYZE
  GUARD -.-> BUILD
```

Modules stay stateless: **`server.js`** owns all I/O (uploads are deleted right after processing; only the generated dashboard is kept). `analysis-prompt.txt`, `dashboard-template.html` and `benchmark-reference.js` are read-only inputs. The Claude API is the only external dependency.

---

## Sequence — upload to dashboard

The end-to-end run, including the guardrails applied at each step, the content de-duplication, the deterministic cache, and the in-code SLA benchmark.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser (index.html)
    participant S as server.js
    participant X as extract.js
    participant G as guardrails.js
    participant A as analyze.js
    participant C as Claude API
    participant H as buildHtml.js
    participant D as Storage (output/ + cache/)

    U->>B: Choose one PDF/DOCX, click Analyze
    B->>S: POST /analyze (file)
    S->>G: validateUpload (type · size · safe name) + rate limit
    S->>X: extractText(file)
    X-->>S: text + totalPages (PDF pages tagged [[PAGE n]])
    S->>D: contentHash → check history for duplicate
    alt Same content or file name already analyzed
        S-->>B: 409 — open the existing report from History
    else New contract
        S->>A: analyzeContract(text, fileName)
        A->>G: validateContractText · detectInjection · detectPHI
        A->>D: cache lookup — sha256(text + prompt)
        alt Cache hit (consistent)
            D-->>A: cached JSON (no model call)
        else Cache miss
            A->>C: messages.create (temperature 0, hardened prompt, contract as untrusted data)
            C-->>A: JSON (auto-continue if truncated)
            A->>G: validateOutput + consistencyChecks (one corrective retry)
            A->>D: write cache
        end
        A->>G: reconcilePages (evidence quote → page number)
        A-->>S: { data, meta } (tokens · cost · warnings · PHI flags)
        Note over H: normalize — recompute counts · EM↔pricing ·<br/>SLA benchmark vs playbook · fixed legends
        S->>H: buildHtml(data)
        H-->>S: self-contained dashboard HTML
        S->>D: write dashboard + append history.json + audit.log (PII-masked)
        S-->>B: { outputFile } → download & open dashboard
    end

    U->>B: View Analysis History
    B->>S: GET /api/history
    S-->>B: list of past analyses (client · file · view · download)
```

**Stages as needed:** extraction and analysis always run; the **Claude call is skipped entirely on a cache hit** (same contract → same result). The SLA **benchmark** and all deterministic re-computation happen in `buildHtml.js`, so the numbers a manager reads are never trusted blindly from the model. Duplicate uploads never spend tokens — they are routed to the existing report.
