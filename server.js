'use strict';

/**
 * Contract Analyzer — Express server.
 *
 * Flow: upload -> duplicate check -> extract -> analyze (Claude) -> build HTML
 *       -> save to /output -> append history -> return saved path.
 *
 * Guardrails: rate limiting, upload validation, prompt-injection screening
 * (in analyze.js), PII-masked audit logging, and safe error handling.
 * History page (analysis-history.html) reads GET /api/history.
 */

require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { extractText } = require('./extract');
const { analyzeContract } = require('./analyze');
const { buildHtml } = require('./buildHtml');
const G = require('./guardrails');

const app = express();
app.disable('x-powered-by'); // don't advertise the framework/version
const PORT = process.env.PORT || 3000;

// ---- Output folder, history & audit storage --------------------------------

const OUTPUT_DIR = path.join(__dirname, 'output');
const HISTORY_PATH = path.join(OUTPUT_DIR, 'history.json');
const AUDIT_PATH = path.join(OUTPUT_DIR, 'audit.log');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function readHistory() {
  try {
    const arr = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

function writeHistory(arr) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(arr, null, 2), 'utf8');
}

function fileNameExists(history, name) {
  const target = String(name || '').trim().toLowerCase();
  return history.some((r) => String(r.fileName || '').trim().toLowerCase() === target);
}

/** Stable content fingerprint of the extracted contract text (whitespace-normalized). */
function contentHashOf(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** Find a prior analysis of the SAME content (regardless of file name). */
function findByContentHash(history, hash) {
  return history.find((r) => r.contentHash && r.contentHash === hash) || null;
}

/** Append a PII-masked audit record (JSON line). Never throws. */
function audit(event) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
    fs.appendFile(AUDIT_PATH, G.maskPII(line) + '\n', () => {});
  } catch (_) { /* logging must never break the request */ }
}

function two(n) { return String(n).padStart(2, '0'); }

function nowStamp() {
  const d = new Date();
  const Y = d.getFullYear(), M = two(d.getMonth() + 1), D = two(d.getDate());
  const h = two(d.getHours()), m = two(d.getMinutes()), s = two(d.getSeconds());
  return { file: `${Y}${M}${D}-${h}${m}${s}`, pretty: `${Y}-${M}-${D} ${h}:${m}:${s}` };
}

function safeSlug(name) {
  return String(name || 'contract')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'contract';
}

function uniqueOutputName(base) {
  let name = `${base}.html`;
  let i = 1;
  while (fs.existsSync(path.join(OUTPUT_DIR, name))) name = `${base}-${i++}.html`;
  return name;
}

// ---- Rate limiting (in-memory sliding window per IP) ------------------------

const RATE_MAX = Number(process.env.RATE_MAX) || 20;      // requests
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS) || 60000; // per minute
const hits = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    audit({ event: 'rate_limited', ip });
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
}

// Periodically clear stale IP buckets to avoid unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    const live = times.filter((t) => now - t < RATE_WINDOW_MS);
    if (live.length) hits.set(ip, live); else hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

// ---- Uploads ----------------------------------------------------------------

const upload = multer({
  dest: path.join(os.tmpdir(), 'contract-analyzer-uploads'),
  limits: { fileSize: G.LIMITS.maxFileBytes },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PDF and DOCX files are supported.'), ok);
  }
});

// ---- Controlled static serving --------------------------------------------
// Do NOT serve the whole project folder (that would expose the prompt, source,
// cache, audit.log and history.json over HTTP). Serve only the two app pages
// and the generated dashboards under /output (HTML only).

const PAGES = { '/': 'index.html', '/index.html': 'index.html', '/analysis-history.html': 'analysis-history.html' };
app.get(Object.keys(PAGES), (req, res) => res.sendFile(path.join(__dirname, PAGES[req.path])));

// Generated dashboards: /output/<name>.html only. Blocks history.json,
// audit.log, path traversal, and any non-HTML file.
app.get('/output/:name', (req, res, next) => {
  const name = req.params.name;
  if (!/^[A-Za-z0-9._-]+\.html$/.test(name) || name.includes('..')) {
    return res.status(404).end();
  }
  const fp = path.join(OUTPUT_DIR, name);
  if (!fp.startsWith(OUTPUT_DIR + path.sep)) return res.status(404).end();
  res.sendFile(fp, (err) => { if (err) next(); });
});

app.get('/api/history', (req, res) => res.json(readHistory()));

app.post('/analyze', rateLimit, upload.single('contract'), async (req, res) => {
  const filePath = req.file && req.file.path;
  const originalName = req.file && req.file.originalname;
  const cleanup = () => { if (filePath) fs.promises.unlink(filePath).catch(() => {}); };

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Guardrail: validate the upload (type, size, safe name).
    G.validateUpload({ originalName, size: req.file.size });

    // Extract text first (cheap, no API cost) so we can dedup by CONTENT.
    const { text, totalPages } = await extractText(filePath, originalName);
    const contentHash = contentHashOf(text);

    // Same document content already analyzed (even under a different file name)?
    // Do NOT re-analyze — point the user to the existing report by its name.
    const priorByContent = findByContentHash(readHistory(), contentHash);
    if (priorByContent) {
      cleanup();
      audit({ event: 'content_duplicate', fileName: originalName, matched: priorByContent.fileName });
      return res.status(409).json({
        duplicate: true,
        reason: 'content',
        existingFileName: priorByContent.fileName,
        error: `This document has already been analyzed and saved as "${priorByContent.fileName}". Please open that report from "View Analysis History".`
      });
    }

    // Different content but a report already exists with this exact file name.
    if (fileNameExists(readHistory(), originalName)) {
      cleanup();
      audit({ event: 'name_conflict', fileName: originalName });
      return res.status(409).json({
        duplicate: true,
        reason: 'name',
        existingFileName: originalName,
        error: `A report named "${originalName}" already exists in "View Analysis History". Please open it there, or rename your file if this is a different document.`
      });
    }

    // New content -> analyze -> build dashboard HTML.
    const { data, meta } = await analyzeContract(text, originalName);

    // Inject page counts (app-provided, never model-guessed).
    const paginated = totalPages != null;
    data.metadata = data.metadata || {};
    data.metadata.totalPagesUploaded = paginated ? String(totalPages) : 'Not applicable (document not paginated)';
    data.metadata.pagesScannedByAI = (meta.pagesScanned != null)
      ? String(meta.pagesScanned)
      : (paginated ? String(totalPages) : 'Not applicable (document not paginated)');

    const html = buildHtml(data);
    cleanup();

    if (meta.injectionDetected) {
      audit({ event: 'injection_flagged', fileName: originalName, hits: meta.injectionHits });
    }
    if (meta.phiDetected && meta.phiDetected.length) {
      audit({ event: 'phi_flagged', fileName: originalName, signals: meta.phiDetected });
    }
    if (meta.warnings && meta.warnings.length) {
      audit({ event: 'grounding_warnings', fileName: originalName, warnings: meta.warnings });
    }

    const clientName =
      (data.metadata && data.metadata.client && data.metadata.client !== 'Not stated in uploaded contract'
        ? data.metadata.client
        : '') || 'Not stated';

    // Re-check right before writing (race safety) — content first, then name.
    const history = readHistory();
    const raceByContent = findByContentHash(history, contentHash);
    if (raceByContent) {
      return res.status(409).json({
        duplicate: true,
        reason: 'content',
        existingFileName: raceByContent.fileName,
        error: `This document has already been analyzed and saved as "${raceByContent.fileName}". Please open that report from "View Analysis History".`
      });
    }
    if (fileNameExists(history, originalName)) {
      return res.status(409).json({
        duplicate: true,
        reason: 'name',
        existingFileName: originalName,
        error: `A report named "${originalName}" already exists in "View Analysis History". Please open it there, or rename your file if this is a different document.`
      });
    }

    const stamp = nowStamp();
    const base = `${safeSlug(clientName)}-${safeSlug(originalName)}-analysis-${stamp.file}`;
    const outFileName = uniqueOutputName(base);
    fs.writeFileSync(path.join(OUTPUT_DIR, outFileName), html, 'utf8');
    const outputFile = `output/${outFileName}`;

    history.push({ clientName, fileName: originalName, outputFile, createdAt: stamp.pretty, contentHash });
    writeHistory(history);

    audit({
      event: 'analysis_ok',
      fileName: originalName,
      outputFile,
      model: meta.model,
      fromCache: meta.fromCache,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      costEstimateUSD: meta.costEstimate,
      truncated: meta.truncated
    });
    console.log(
      `Analyzed ${G.forLog(originalName)} — ` +
      (meta.fromCache
        ? 'served from deterministic cache (no model call)'
        : `${meta.inputTokens}+${meta.outputTokens} tokens, ~$${meta.costEstimate}`) +
      `${meta.warnings.length ? `, ${meta.warnings.length} warning(s)` : ''}`
    );

    return res.json({
      ok: true,
      clientName,
      fileName: originalName,
      outputFile,
      downloadName: `contract-analyzer-${safeSlug(originalName)}.html`
    });
  } catch (err) {
    cleanup();
    const message = (err && err.message) ? err.message : 'Unexpected error.';
    audit({ event: 'analysis_error', fileName: originalName, error: message });
    console.error('Analysis failed:', G.forLog(message));
    return res.status(500).json({ error: message });
  }
});

// Multer / general error handler (file-too-large, wrong type, etc.).
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Upload error.' });
  next();
});

app.listen(PORT, () => {
  console.log(`\nContract Analyzer running at http://localhost:${PORT}`);
  console.log(`Output folder: ${OUTPUT_DIR}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. Add it to your .env file before analyzing.');
  }
});
