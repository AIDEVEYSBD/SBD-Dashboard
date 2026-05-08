#!/usr/bin/env node
/**
 * Excel → JSON import pipeline.
 *
 * Reads one or more .xlsx files, auto-detects whether each sheet is an ICAA
 * or ISA export based on column headers, parses rows into raw records, then
 * merges into data/assessments.json with dedup by ID.
 *
 * Usage:
 *   npm run import -- path/to/file1.xlsx path/to/file2.xlsx
 *   npm run import -- --dry path/to/file.xlsx        # preview, don't write
 *   npm run import -- --skip-existing path/to/file.xlsx  # skip rows whose ID exists
 *
 * Default merge behavior: if an incoming row's ID already exists, it OVERWRITES
 * the existing record (assumes the import is fresher). Use --skip-existing to
 * keep existing records and only append truly new IDs.
 *
 * Column matching is case-sensitive and exact. Source-system typos are
 * required ("Reuqesters", "Hors/Days", "Geograpy", "Feild" etc.) — see
 * lib/raw.ts for the canonical column list.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "data");
const OUT_FILE = resolve(OUT_DIR, "assessments.json");

// ----------------------------------------------------------------- Args

const args = process.argv.slice(2);
const flags = {
  dry: args.includes("--dry"),
  skipExisting: args.includes("--skip-existing"),
};
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("Usage: npm run import -- <file.xlsx> [more.xlsx ...] [--dry] [--skip-existing]");
  process.exit(1);
}

// ----------------------------------------------------------------- Schemas

// Distinguishing columns — presence of these identifies the kind.
const ICAA_MARKERS = ["Geograpy (ICAA)", "ABs (Q18)", "ABs(18.1)"];
const ISA_MARKERS = ["ISA ID", "Initial Design Score", "Current Design Score", "Unilever Baseline Compliance (Target Risk)"];

// Default values when an optional column is missing or blank.
const DEFAULTS = {
  number: 0,
  boolean: false,
  yesno: "No",
  string: "",
  nullableString: null,
  nullableDate: null,
  nullableNumber: null,
};

// Field schema — declares for each column its expected type and default.
// "type" determines how cell values are coerced.
const ICAA_SCHEMA = {
  "Form Name": ["string", "ICAA Form v3"],
  "ID": ["string", null], // required
  "Inherent Risk": ["number", 0],
  "Inherent Risk Rating": ["string", "Medium"],
  "Application/IT Service Name": ["string", null], // required
  "Reviewer(s)": ["string", ""],
  "Requester(s)": ["string", ""],
  "Assessment Status": ["string", null], // required
  "Date Sent": ["isoDate", null], // required
  "Service Owner": ["string", ""],
  "Date Due": ["isoDate", null],
  "Business Owner": ["string", ""],
  "Overdue By": ["number", 0],
  "Inherent Risk Categorization": ["string", "Medium"],
  "Questionaire Completed": ["boolean", false],
  "Date Finalized": ["nullableIsoDate", null],
  "Manual Asset": ["boolean", false],
  "Service VP Org": ["string", ""],
  "Service Director Org": ["string", ""],
  "Service Director": ["string", ""],
  "Service VP": ["string", ""],
  "Hours/Days for SBD to Review": ["number", 0],
  "Hours/Days for Reuqesters to Submit": ["number", 0],
  "Hours/Days with Requester (Information Requested)": ["number", 0],
  "Hors/Days with Business Owner": ["number", 0],
  "Hours/Days to Fully Complete ICAA/Days": ["number", 0],
  "Days Overdue": ["number", 0],
  "Rejected in Last Six Months": ["boolean", false],
  "Month Rejected": ["nullableString", null],
  "Days Unassigned (No Reviewer)": ["number", 0],
  "Geograpy (ICAA)": ["string", "Global"],
  "Cyber Approval Date": ["nullableIsoDate", null],
  "Potential KFAS": ["boolean", false],
  "Information Classification": ["string", "Internal"],
  "Service Criticality": ["string", "Medium"],
  "Service Support Type": ["string", "Internal"],
  "Original Requestor Name": ["string", ""],
  "Go Live Date": ["nullableIsoDate", null],
  "New Priority System": ["boolean", false],
  "Hosting Type New": ["string", "SaaS"],
  "Date Withdrawn": ["nullableIsoDate", null],
  "ISA Status Text Feild": ["nullableString", null],
  "ISA Status": ["nullableString", null],
  "Date Reviewer Assigned": ["nullableIsoDate", null],
  "SYS ID": ["string", ""],
  "Q1 Response": ["yesno", "No"],
  "Q14 Response": ["yesno", "No"],
  "Q14.1 Response": ["nullableString", null],
  "Q 5 Response": ["yesno", "No"],
  "Q 16 Response": ["yesno", "No"],
  "Q 16.1 Response": ["nullableString", null],
  "Is this service related to ABs (Q17)": ["yesno", "No"],
  "ABs (Q17.1)": ["nullableString", null],
  "ABs (Q17.2)": ["nullableString", null],
  "ABs (Q17.3)": ["nullableString", null],
  "ABs (Q18)": ["yesno", "No"],
  "ABs(18.1)": ["nullableString", null],
};

const ISA_SCHEMA = {
  "Form Name": ["string", "ISA Form v2"],
  "ID": ["string", null], // required
  "Application/IT Service Name": ["string", null], // required
  "Reviewer(s)": ["string", ""],
  "Information Classification": ["string", "Internal"],
  "Residual Risk": ["string", "Medium"],
  "Inherent Risk Categorization": ["string", "Medium"],
  "Unilever Baseline Compliance (Target Risk)": ["number", 0],
  "Manual Asset": ["boolean", false],
  "ISA Level": ["string", "L2"],
  "Service VP Org": ["string", ""],
  "Service Director Org": ["string", ""],
  "Date Completed": ["nullableIsoDate", null],
  "Date Finalised": ["nullableIsoDate", null],
  "Hours/Days for Requestor to Submit": ["number", 0],
  "Hours/Days for SBD to Review": ["number", 0],
  "Hours/Days with Requestor (Information Requested)": ["number", 0],
  "Hours/Days with Service Owner": ["number", 0],
  "Hours/Days to Fully Complete ISA": ["number", 0],
  "Days Overdue": ["number", 0],
  "Rejected in Last Six Months": ["boolean", false],
  "Month Rejected": ["nullableString", null],
  "Days Unassigned (No Reviewer)": ["number", 0],
  "Cyber Approval Date": ["nullableIsoDate", null],
  "Service Support Type": ["string", "Internal"],
  "Service Criticality": ["string", "Medium"],
  "Date Reviewer Assigned": ["nullableIsoDate", null],
  "Date Withdrawn": ["nullableIsoDate", null],
  "ISA ID": ["string", ""],
  "Assessment Status": ["string", null], // required
  "Date Sent": ["isoDate", null], // required
  "Date Due": ["isoDate", null],
  "Service Owner": ["string", ""],
  "Business Owner": ["string", ""],
  "Service VP": ["string", ""],
  "Service Director": ["string", ""],
  "Hosting Type": ["string", "SaaS"],
  "Current Design Score": ["number", 0],
  "Initial Design Score": ["number", 0],
  "Requestor(s)": ["string", ""],
  "Next Assessment Date": ["nullableIsoDate", null],
  "Overdue By": ["number", 0],
  "Priority System?": ["boolean", false],
  "SYS ID": ["string", ""],
  "ISA 55 MFA": ["string", "N/A"],
  "Parent ICAA ID": ["nullableString", null],
};

// ----------------------------------------------------------------- Coercion

function coerce(type, raw) {
  // Normalize input — exceljs can return strings, numbers, Dates, formulas, rich text.
  let v = raw;
  if (v && typeof v === "object" && "richText" in v) {
    v = v.richText.map((r) => r.text).join("");
  } else if (v && typeof v === "object" && "text" in v) {
    v = v.text;
  } else if (v && typeof v === "object" && "result" in v) {
    v = v.result;
  } else if (v && typeof v === "object" && "hyperlink" in v) {
    v = v.text ?? v.hyperlink;
  }

  const isBlank = v === null || v === undefined || v === "";

  switch (type) {
    case "string":
      return isBlank ? "" : String(v).trim();
    case "nullableString":
      return isBlank ? null : String(v).trim();
    case "number":
      if (isBlank) return 0;
      if (typeof v === "number") return v;
      return Number(String(v).replace(/[, ]/g, "")) || 0;
    case "nullableNumber":
      if (isBlank) return null;
      if (typeof v === "number") return v;
      return Number(String(v).replace(/[, ]/g, "")) || null;
    case "boolean":
      if (isBlank) return false;
      if (typeof v === "boolean") return v;
      const s = String(v).trim().toLowerCase();
      return s === "true" || s === "yes" || s === "y" || s === "1";
    case "yesno":
      if (isBlank) return "No";
      if (v === true) return "Yes";
      if (v === false) return "No";
      const t = String(v).trim().toLowerCase();
      return t === "yes" || t === "y" || t === "true" || t === "1" ? "Yes" : "No";
    case "isoDate":
    case "nullableIsoDate":
      if (isBlank) return type === "isoDate" ? null : null;
      if (v instanceof Date) return v.toISOString();
      // Excel may serialize date numbers — exceljs usually parses these to Date.
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        return type === "isoDate" ? null : null;
      }
      return d.toISOString();
    default:
      return raw;
  }
}

// ----------------------------------------------------------------- Reader

async function readSheet(sheet) {
  // Header row = first row containing recognizable columns.
  let headerRowIdx = 1;
  let headers = [];
  for (let r = 1; r <= Math.min(sheet.rowCount, 5); r++) {
    const row = sheet.getRow(r);
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.value));
    const stringCells = cells.filter((c) => typeof c === "string").length;
    if (stringCells >= 3) {
      headerRowIdx = r;
      headers = cells.map((c) => (typeof c === "string" ? c.trim() : c == null ? "" : String(c)));
      break;
    }
  }

  if (headers.length === 0) {
    return { kind: null, rows: [] };
  }

  const headerSet = new Set(headers);
  const icaaScore = ICAA_MARKERS.filter((m) => headerSet.has(m)).length;
  const isaScore = ISA_MARKERS.filter((m) => headerSet.has(m)).length;
  const kind = icaaScore > isaScore ? "ICAA" : isaScore > icaaScore ? "ISA" : null;

  if (!kind) return { kind: null, rows: [], headers };

  const schema = kind === "ICAA" ? ICAA_SCHEMA : ISA_SCHEMA;

  // Map column name → 0-based header index
  const colIdx = new Map();
  headers.forEach((h, i) => colIdx.set(h, i));

  const missingColumns = Object.keys(schema).filter(
    (col) => !colIdx.has(col) && schema[col][1] === null,
  );

  const rows = [];
  const skipped = [];
  const totalRows = sheet.rowCount;
  for (let r = headerRowIdx + 1; r <= totalRows; r++) {
    const row = sheet.getRow(r);
    const rec = {};
    let hasData = false;

    for (const [col, [type, defaultValue]] of Object.entries(schema)) {
      const idx = colIdx.get(col);
      let raw = idx !== undefined ? row.getCell(idx + 1).value : null;
      if (raw !== null && raw !== undefined && raw !== "") hasData = true;

      const coerced = coerce(type, raw);
      // If column missing entirely and there's no required marker (defaultValue !== null),
      // use the schema default.
      if (idx === undefined) {
        rec[col] = defaultValue ?? coerced;
      } else {
        rec[col] = coerced;
      }
    }

    if (!hasData) continue;

    // Required-field validation
    const id = rec["ID"];
    const status = rec["Assessment Status"];
    const dateSent = rec["Date Sent"];
    const appName = rec["Application/IT Service Name"];

    if (!id || !status || !dateSent || !appName) {
      skipped.push({ row: r, reason: "missing required field", id: id || "(no ID)" });
      continue;
    }

    rows.push(rec);
  }

  return { kind, rows, skipped, missingColumns };
}

async function readWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const out = { icaa: [], isa: [], skipped: [], warnings: [] };

  for (const sheet of wb.worksheets) {
    const { kind, rows, skipped = [], missingColumns = [] } = await readSheet(sheet);
    if (!kind) {
      out.warnings.push(`Sheet "${sheet.name}" in ${filePath}: could not detect kind (no ICAA/ISA marker columns)`);
      continue;
    }
    if (missingColumns.length > 0) {
      out.warnings.push(`Sheet "${sheet.name}": missing required columns: ${missingColumns.join(", ")}`);
    }
    if (kind === "ICAA") out.icaa.push(...rows);
    else out.isa.push(...rows);
    if (skipped.length > 0) out.skipped.push({ sheet: sheet.name, file: filePath, rows: skipped });
    console.log(`  ${filePath} :: "${sheet.name}" → ${kind}, ${rows.length} rows${skipped.length ? `, ${skipped.length} skipped` : ""}`);
  }
  return out;
}

// ----------------------------------------------------------------- Merge

function mergeRecords(existing, incoming, idField) {
  const byId = new Map();
  for (const rec of existing) byId.set(rec[idField], rec);

  let added = 0;
  let updated = 0;
  let skippedExisting = 0;

  for (const rec of incoming) {
    const id = rec[idField];
    if (byId.has(id)) {
      if (flags.skipExisting) {
        skippedExisting++;
      } else {
        byId.set(id, rec);
        updated++;
      }
    } else {
      byId.set(id, rec);
      added++;
    }
  }

  return { records: [...byId.values()], added, updated, skippedExisting };
}

// ----------------------------------------------------------------- Main

async function main() {
  console.log(`Reading ${files.length} file${files.length === 1 ? "" : "s"}...`);
  const incoming = { icaa: [], isa: [], warnings: [], skipped: [] };
  for (const f of files) {
    if (!existsSync(f)) {
      console.error(`! Not found: ${f}`);
      process.exit(2);
    }
    const r = await readWorkbook(f);
    incoming.icaa.push(...r.icaa);
    incoming.isa.push(...r.isa);
    incoming.warnings.push(...r.warnings);
    incoming.skipped.push(...r.skipped);
  }

  const existing = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, "utf8"))
    : { icaa: [], isa: [] };

  const icaaResult = mergeRecords(existing.icaa ?? [], incoming.icaa, "ID");
  const isaResult = mergeRecords(existing.isa ?? [], incoming.isa, "ID");

  console.log("");
  console.log("Merge summary:");
  console.log(`  ICAA: +${icaaResult.added} new, ${icaaResult.updated} updated${icaaResult.skippedExisting ? `, ${icaaResult.skippedExisting} skipped (already existed)` : ""}`);
  console.log(`  ISA:  +${isaResult.added} new, ${isaResult.updated} updated${isaResult.skippedExisting ? `, ${isaResult.skippedExisting} skipped (already existed)` : ""}`);

  if (incoming.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const w of incoming.warnings) console.log(`  ! ${w}`);
  }

  const totalSkippedRows = incoming.skipped.reduce((s, x) => s + x.rows.length, 0);
  if (totalSkippedRows > 0) {
    console.log("");
    console.log(`Skipped ${totalSkippedRows} row(s) (missing required field). Run with verbose env to inspect.`);
  }

  if (flags.dry) {
    console.log("");
    console.log("--dry: no changes written.");
    console.log(`Would write ${icaaResult.records.length} ICAA + ${isaResult.records.length} ISA records.`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ icaa: icaaResult.records, isa: isaResult.records }, null, 2) + "\n");

  console.log("");
  console.log(`✔ Wrote ${OUT_FILE}`);
  console.log(`  Total: ${icaaResult.records.length} ICAA, ${isaResult.records.length} ISA`);
}

main().catch((e) => {
  console.error("");
  console.error("Import failed:", e.message);
  console.error(e.stack);
  process.exit(1);
});
