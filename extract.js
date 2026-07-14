'use strict';

/**
 * Text extraction for uploaded contracts.
 * Supports: .pdf (pdf-parse) and .docx (mammoth) only.
 * Returns the contract text plus the source page count (PDF only).
 */

const fs = require('fs');
const path = require('path');

async function extractPdf(filePath) {
  // pdf-parse is required lazily so the app still boots if the dep is missing.
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);

  // Insert a "[[PAGE n]]" marker before each page's text so the analysis model
  // can assign an accurate page number to every extracted clause/risk row.
  let pageNum = 0;
  const renderPage = (pageData) => {
    pageNum += 1;
    const current = pageNum;
    const opts = { normalizeWhitespace: false, disableCombineTextItems: false };
    return pageData.getTextContent(opts).then((tc) => {
      let lastY;
      let text = '';
      for (const item of tc.items) {
        if (lastY === item.transform[5] || lastY === undefined) text += item.str;
        else text += '\n' + item.str;
        lastY = item.transform[5];
      }
      return `\n\n[[PAGE ${current}]]\n${text}`;
    });
  };

  const result = await pdfParse(buffer, { pagerender: renderPage });
  return { text: result.text || '', totalPages: result.numpages || pageNum || null };
}

async function extractDocx(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return { text: result.value || '', totalPages: null };
}

/**
 * @param {string} filePath  absolute path to the uploaded file
 * @param {string} originalName  original filename (used to detect extension)
 * @returns {Promise<{text:string, totalPages:number|null}>}
 *          extracted text plus the source page count (PDF only; null otherwise).
 */
async function extractText(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  let extracted;

  switch (ext) {
    case '.pdf':
      extracted = await extractPdf(filePath);
      break;
    case '.docx':
      extracted = await extractDocx(filePath);
      break;
    case '.doc':
      throw new Error(
        'Legacy .doc files are not supported. Please save the contract as .docx or .pdf and upload again.'
      );
    default:
      throw new Error(
        `Unsupported file type "${ext}". Upload a PDF or DOCX contract.`
      );
  }

  // Normalize excessive whitespace while keeping paragraph breaks.
  const text = String(extracted.text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text || text.length < 30) {
    throw new Error(
      'No readable text could be extracted. If this is a scanned PDF, run OCR first, or upload a PDF/DOCX that contains selectable text.'
    );
  }

  return { text, totalPages: extracted.totalPages };
}

module.exports = { extractText };
