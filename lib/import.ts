// Excel import logic — shared between the /api/import route and any future
// CLI/script consumers.
//
// Column matching is case-insensitive and typo-tolerant:
//   - canonical name + an alias list per column
//   - normalize() strips punctuation/whitespace and lowercases
//   - exact normalized match wins
//   - if no exact, Levenshtein distance ≤ 2 against any candidate matches
// Source-system typos are tolerated automatically (Geograpy↔Geography,
// Finalised↔Finalized, Reuqesters↔Requesters, Hors↔Hours, Feild↔Field,
// Questionaire↔Questionnaire, etc.) without configuration.

import ExcelJS from "exceljs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { JSON_PATH, readRawDataset } from "./data";
import type { RawDataset, RawIcaa, RawIsa } from "./raw";

// ---------------------------------------------------------------- Schema

type FieldType =
  | "string"
  | "nullableString"
  | "number"
  | "nullableNumber"
  | "boolean"
  | "yesno"
  | "isoDate"
  | "nullableIsoDate";

interface FieldSpec {
  type: FieldType;
  default: unknown;
  required?: boolean;
  aliases?: string[];
}

type Schema = Record<string, FieldSpec>;

const ICAA_SCHEMA: Schema = {
  "Form Name": { type: "string", default: "ICAA Form v3" },
  "ID": { type: "string", default: "", required: true, aliases: ["icaa id"] },
  "Inherent Risk": { type: "number", default: 0 },
  "Inherent Risk Rating": { type: "string", default: "Medium" },
  "Application/IT Service Name": { type: "string", default: "", required: true, aliases: ["application name", "it service name", "application it service name", "service name"] },
  "Reviewer(s)": { type: "string", default: "", aliases: ["reviewer", "reviewers"] },
  "Requester(s)": { type: "string", default: "", aliases: ["requester", "requesters", "requestor", "requestors", "requestor(s)"] },
  "Assessment Status": { type: "string", default: "", required: true, aliases: ["status"] },
  "Date Sent": { type: "isoDate", default: null, required: true, aliases: ["sent date", "date sent"] },
  "Service Owner": { type: "string", default: "" },
  "Date Due": { type: "isoDate", default: null, aliases: ["due date"] },
  "Business Owner": { type: "string", default: "" },
  "Overdue By": { type: "number", default: 0 },
  "Inherent Risk Categorization": { type: "string", default: "Medium", aliases: ["inherent risk categorisation", "inherent risk category", "risk category"] },
  "Questionaire Completed": { type: "boolean", default: false, aliases: ["questionnaire completed"] },
  "Date Finalized": { type: "nullableIsoDate", default: null, aliases: ["date finalised", "finalised date", "finalized date"] },
  "Manual Asset": { type: "boolean", default: false },
  "Service VP Org": { type: "string", default: "", aliases: ["service vp organization", "service vp organisation"] },
  "Service Director Org": { type: "string", default: "", aliases: ["service director organization", "service director organisation"] },
  "Service Director": { type: "string", default: "" },
  "Service VP": { type: "string", default: "" },
  "Hours/Days for SBD to Review": { type: "number", default: 0, aliases: ["hours for sbd to review", "sbd review hours"] },
  "Hours/Days for Reuqesters to Submit": { type: "number", default: 0, aliases: ["hours/days for requesters to submit", "hours for requesters to submit", "requester submit hours", "requestor submit hours"] },
  "Hours/Days with Requester (Information Requested)": { type: "number", default: 0, aliases: ["hours with requester info requested", "hours with requestor information requested", "hours with requester (information requested)"] },
  "Hors/Days with Business Owner": { type: "number", default: 0, aliases: ["hours/days with business owner", "hours with business owner", "business owner hours"] },
  "Hours/Days to Fully Complete ICAA/Days": { type: "number", default: 0, aliases: ["hours/days to fully complete icaa", "hours to fully complete icaa", "complete icaa hours", "icaa total hours"] },
  "Days Overdue": { type: "number", default: 0 },
  "Rejected in Last Six Months": { type: "boolean", default: false, aliases: ["rejected last 6 months", "rejected in last 6 months"] },
  "Month Rejected": { type: "nullableString", default: null },
  "Days Unassigned (No Reviewer)": { type: "number", default: 0, aliases: ["days unassigned"] },
  "Geograpy (ICAA)": { type: "string", default: "Global", aliases: ["geography (icaa)", "geography icaa", "icaa geography"] },
  "Cyber Approval Date": { type: "nullableIsoDate", default: null },
  "Potential KFAS": { type: "boolean", default: false },
  "Information Classification": { type: "string", default: "Internal", aliases: ["info classification"] },
  "Service Criticality": { type: "string", default: "Medium" },
  "Service Support Type": { type: "string", default: "Internal" },
  "Original Requestor Name": { type: "string", default: "", aliases: ["original requester name"] },
  "Go Live Date": { type: "nullableIsoDate", default: null },
  "New Priority System": { type: "boolean", default: false },
  "Hosting Type New": { type: "string", default: "SaaS", aliases: ["new hosting type"] },
  "Date Withdrawn": { type: "nullableIsoDate", default: null, aliases: ["withdrawn date"] },
  "ISA Status Text Feild": { type: "nullableString", default: null, aliases: ["isa status text field"] },
  "ISA Status": { type: "nullableString", default: null },
  "Date Reviewer Assigned": { type: "nullableIsoDate", default: null, aliases: ["reviewer assigned date"] },
  "SYS ID": { type: "string", default: "", aliases: ["sys id", "system id"] },
  "Q1 Response": { type: "yesno", default: "No", aliases: ["q1"] },
  "Q14 Response": { type: "yesno", default: "No", aliases: ["q14"] },
  "Q14.1 Response": { type: "nullableString", default: null, aliases: ["q14.1"] },
  "Q 5 Response": { type: "yesno", default: "No", aliases: ["q5 response", "q5"] },
  "Q 16 Response": { type: "yesno", default: "No", aliases: ["q16 response", "q16"] },
  "Q 16.1 Response": { type: "nullableString", default: null, aliases: ["q16.1 response", "q16.1"] },
  "Is this service related to ABs (Q17)": { type: "yesno", default: "No", aliases: ["q17 abs", "abs q17", "service related to abs", "is this service related to abs"] },
  "ABs (Q17.1)": { type: "nullableString", default: null, aliases: ["abs q17.1"] },
  "ABs (Q17.2)": { type: "nullableString", default: null, aliases: ["abs q17.2"] },
  "ABs (Q17.3)": { type: "nullableString", default: null, aliases: ["abs q17.3"] },
  "ABs (Q18)": { type: "yesno", default: "No", aliases: ["abs q18", "q18 response", "q18", "ai involvement"] },
  "ABs(18.1)": { type: "nullableString", default: null, aliases: ["abs 18.1", "abs (18.1)", "abs(q18.1)", "ai detail"] },
};

const ISA_SCHEMA: Schema = {
  "Form Name": { type: "string", default: "ISA Form v2" },
  "ID": { type: "string", default: "", required: true },
  "Application/IT Service Name": { type: "string", default: "", required: true, aliases: ["application name", "it service name", "service name"] },
  "Reviewer(s)": { type: "string", default: "", aliases: ["reviewer", "reviewers"] },
  "Information Classification": { type: "string", default: "Internal", aliases: ["info classification"] },
  "Residual Risk": { type: "string", default: "Medium" },
  "Inherent Risk Categorization": { type: "string", default: "Medium", aliases: ["inherent risk categorisation", "inherent risk category"] },
  "Unilever Baseline Compliance (Target Risk)": { type: "number", default: 0, aliases: ["baseline compliance", "unilever baseline compliance", "target risk"] },
  "Manual Asset": { type: "boolean", default: false },
  "ISA Level": { type: "string", default: "L2" },
  "Service VP Org": { type: "string", default: "" },
  "Service Director Org": { type: "string", default: "" },
  "Date Completed": { type: "nullableIsoDate", default: null, aliases: ["completed date"] },
  "Date Finalised": { type: "nullableIsoDate", default: null, aliases: ["date finalized", "finalized date", "finalised date"] },
  "Hours/Days for Requestor to Submit": { type: "number", default: 0, aliases: ["hours for requestor to submit", "hours for requester to submit", "requestor submit hours"] },
  "Hours/Days for SBD to Review": { type: "number", default: 0, aliases: ["hours for sbd to review", "sbd review hours"] },
  "Hours/Days with Requestor (Information Requested)": { type: "number", default: 0, aliases: ["hours with requestor info requested", "hours with requester information requested"] },
  "Hours/Days with Service Owner": { type: "number", default: 0, aliases: ["hours with service owner", "service owner hours"] },
  "Hours/Days to Fully Complete ISA": { type: "number", default: 0, aliases: ["hours to fully complete isa", "complete isa hours", "isa total hours"] },
  "Days Overdue": { type: "number", default: 0 },
  "Rejected in Last Six Months": { type: "boolean", default: false, aliases: ["rejected last 6 months"] },
  "Month Rejected": { type: "nullableString", default: null },
  "Days Unassigned (No Reviewer)": { type: "number", default: 0, aliases: ["days unassigned"] },
  "Cyber Approval Date": { type: "nullableIsoDate", default: null },
  "Service Support Type": { type: "string", default: "Internal" },
  "Service Criticality": { type: "string", default: "Medium" },
  "Date Reviewer Assigned": { type: "nullableIsoDate", default: null, aliases: ["reviewer assigned date"] },
  "Date Withdrawn": { type: "nullableIsoDate", default: null, aliases: ["withdrawn date"] },
  "ISA ID": { type: "string", default: "", aliases: ["isa id"] },
  "Assessment Status": { type: "string", default: "", required: true, aliases: ["status"] },
  "Date Sent": { type: "isoDate", default: null, required: true, aliases: ["sent date"] },
  "Date Due": { type: "isoDate", default: null, aliases: ["due date"] },
  "Service Owner": { type: "string", default: "" },
  "Business Owner": { type: "string", default: "" },
  "Service VP": { type: "string", default: "" },
  "Service Director": { type: "string", default: "" },
  "Hosting Type": { type: "string", default: "SaaS" },
  "Current Design Score": { type: "number", default: 0 },
  "Initial Design Score": { type: "number", default: 0 },
  "Requestor(s)": { type: "string", default: "", aliases: ["requestor", "requestors", "requester", "requesters", "requester(s)"] },
  "Next Assessment Date": { type: "nullableIsoDate", default: null },
  "Overdue By": { type: "number", default: 0 },
  "Priority System?": { type: "boolean", default: false, aliases: ["priority system"] },
  "SYS ID": { type: "string", default: "", aliases: ["sys id", "system id"] },
  "ISA 55 MFA": { type: "string", default: "N/A", aliases: ["isa 55 mfa", "mfa"] },
  "Parent ICAA ID": { type: "nullableString", default: null, aliases: ["parent icaa", "parent icaa id"] },
};

// Distinguishing columns — presence of these identifies the kind during auto-detection.
const ICAA_MARKERS = ["Geograpy (ICAA)", "ABs (Q18)", "ABs(18.1)", "Potential KFAS", "ISA Status Text Feild"];
const ISA_MARKERS = ["ISA ID", "Initial Design Score", "Current Design Score", "Unilever Baseline Compliance (Target Risk)", "ISA Level", "ISA 55 MFA", "Residual Risk"];

// ---------------------------------------------------------------- Normalize + match

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

// Levenshtein distance for typo tolerance (small strings, simple O(n*m)).
function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const prev: number[] = new Array(n + 1).fill(0).map((_, i) => i);
  const curr: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]!;
  }
  return prev[n]!;
}

interface Resolved {
  // canonical column name → 0-based index in the header row
  index: Map<string, number>;
  fuzzyMatches: { canonical: string; header: string; distance: number }[];
  unrecognized: string[];
}

function resolveHeaders(headers: string[], schema: Schema): Resolved {
  const normToCanon = new Map<string, string>();
  const allCandidates: { canonical: string; norm: string }[] = [];

  for (const [canon, spec] of Object.entries(schema)) {
    const all = [canon, ...(spec.aliases ?? [])];
    for (const a of all) {
      const n = normalize(a);
      if (!normToCanon.has(n)) normToCanon.set(n, canon);
      allCandidates.push({ canonical: canon, norm: n });
    }
  }

  const index = new Map<string, number>();
  const fuzzyMatches: { canonical: string; header: string; distance: number }[] = [];
  const unrecognized: string[] = [];

  headers.forEach((rawHeader, i) => {
    const h = (rawHeader ?? "").toString();
    if (!h.trim()) return;
    const n = normalize(h);
    const exact = normToCanon.get(n);
    if (exact) {
      if (!index.has(exact)) index.set(exact, i);
      return;
    }
    // Fuzzy fallback — pick the closest candidate within edit distance ≤ 2.
    let best: { canonical: string; distance: number } | null = null;
    for (const c of allCandidates) {
      const d = lev(n, c.norm);
      if (d <= 2 && (best === null || d < best.distance)) {
        best = { canonical: c.canonical, distance: d };
      }
    }
    if (best && !index.has(best.canonical)) {
      index.set(best.canonical, i);
      fuzzyMatches.push({ canonical: best.canonical, header: h, distance: best.distance });
    } else if (!best) {
      unrecognized.push(h);
    }
  });

  return { index, fuzzyMatches, unrecognized };
}

// ---------------------------------------------------------------- Coercion

function coerce(type: FieldType, raw: unknown): unknown {
  let v: unknown = raw;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("richText" in o && Array.isArray(o.richText)) {
      v = (o.richText as { text: string }[]).map((r) => r.text).join("");
    } else if ("text" in o) {
      v = o.text;
    } else if ("result" in o) {
      v = o.result;
    } else if ("hyperlink" in o) {
      v = o.text ?? o.hyperlink;
    }
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
    case "boolean": {
      if (isBlank) return false;
      if (typeof v === "boolean") return v;
      const s = String(v).trim().toLowerCase();
      return s === "true" || s === "yes" || s === "y" || s === "1";
    }
    case "yesno": {
      if (isBlank) return "No";
      if (v === true) return "Yes";
      if (v === false) return "No";
      const t = String(v).trim().toLowerCase();
      return t === "yes" || t === "y" || t === "true" || t === "1" ? "Yes" : "No";
    }
    case "isoDate":
    case "nullableIsoDate": {
      if (isBlank) return null;
      if (v instanceof Date) return v.toISOString();
      const d = new Date(v as string | number);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    }
    default:
      return raw;
  }
}

// ---------------------------------------------------------------- Sheet reading

function detectKind(headers: string[]): "ICAA" | "ISA" | null {
  const norm = new Set(headers.map((h) => normalize(h ?? "")));
  const icaaScore = ICAA_MARKERS.reduce((s, m) => s + (norm.has(normalize(m)) ? 1 : 0), 0);
  const isaScore = ISA_MARKERS.reduce((s, m) => s + (norm.has(normalize(m)) ? 1 : 0), 0);
  if (icaaScore === 0 && isaScore === 0) return null;
  if (icaaScore > isaScore) return "ICAA";
  if (isaScore > icaaScore) return "ISA";
  return null;
}

interface SheetResult {
  kind: "ICAA" | "ISA" | null;
  rows: Record<string, unknown>[];
  skipped: { row: number; reason: string; id: string }[];
  fuzzyMatches: { canonical: string; header: string; distance: number }[];
  unrecognized: string[];
  missingRequired: string[];
}

function readSheet(sheet: ExcelJS.Worksheet, kindHint?: "ICAA" | "ISA"): SheetResult {
  // Find the header row — first row with ≥ 3 string cells.
  let headerRowIdx = 1;
  let headers: string[] = [];
  for (let r = 1; r <= Math.min(sheet.rowCount, 5); r++) {
    const row = sheet.getRow(r);
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.value));
    const stringCells = cells.filter((c) => typeof c === "string").length;
    if (stringCells >= 3) {
      headerRowIdx = r;
      headers = cells.map((c) => (typeof c === "string" ? c.trim() : c == null ? "" : String(c)));
      break;
    }
  }

  if (headers.length === 0) {
    return { kind: null, rows: [], skipped: [], fuzzyMatches: [], unrecognized: [], missingRequired: [] };
  }

  const kind = kindHint ?? detectKind(headers);
  if (!kind) {
    return { kind: null, rows: [], skipped: [], fuzzyMatches: [], unrecognized: headers, missingRequired: [] };
  }
  const schema = kind === "ICAA" ? ICAA_SCHEMA : ISA_SCHEMA;
  const { index, fuzzyMatches, unrecognized } = resolveHeaders(headers, schema);

  const missingRequired: string[] = [];
  for (const [col, spec] of Object.entries(schema)) {
    if (spec.required && !index.has(col)) missingRequired.push(col);
  }

  const rows: Record<string, unknown>[] = [];
  const skipped: { row: number; reason: string; id: string }[] = [];

  const totalRows = sheet.rowCount;
  for (let r = headerRowIdx + 1; r <= totalRows; r++) {
    const row = sheet.getRow(r);
    const rec: Record<string, unknown> = {};
    let hasData = false;

    for (const [col, spec] of Object.entries(schema)) {
      const idx = index.get(col);
      if (idx === undefined) {
        rec[col] = spec.default;
        continue;
      }
      const raw = row.getCell(idx + 1).value;
      if (raw !== null && raw !== undefined && raw !== "") hasData = true;
      rec[col] = coerce(spec.type, raw);
    }

    if (!hasData) continue;

    let badRequired = false;
    for (const [col, spec] of Object.entries(schema)) {
      if (!spec.required) continue;
      const v = rec[col];
      if (v === null || v === undefined || v === "") {
        badRequired = true;
        break;
      }
    }
    if (badRequired) {
      skipped.push({ row: r, reason: "missing required field", id: String(rec["ID"] ?? "(no ID)") });
      continue;
    }

    rows.push(rec);
  }

  return { kind, rows, skipped, fuzzyMatches, unrecognized, missingRequired };
}

// ---------------------------------------------------------------- Top-level

export interface ImportInput {
  buffer: Buffer | Uint8Array;
  filename: string;
  kindHint?: "ICAA" | "ISA";
}

export interface ImportOptions {
  skipExisting?: boolean;
  dry?: boolean;
}

export interface KindStats {
  added: number;
  updated: number;
  skippedExisting: number;
  skippedInvalid: number;
}

export interface SheetReport {
  file: string;
  sheet: string;
  kind: "ICAA" | "ISA" | null;
  rowsParsed: number;
  rowsSkipped: number;
  fuzzyMatches: { canonical: string; header: string; distance: number }[];
  unrecognized: string[];
  missingRequired: string[];
}

export interface ImportResult {
  ok: boolean;
  icaa: KindStats;
  isa: KindStats;
  totals: { icaa: number; isa: number };
  sheets: SheetReport[];
  warnings: string[];
}

function emptyStats(): KindStats {
  return { added: 0, updated: 0, skippedExisting: 0, skippedInvalid: 0 };
}

function mergeRecords<T>(
  existing: T[],
  incoming: T[],
  idField: keyof T,
  skipExisting: boolean,
): { records: T[]; stats: KindStats } {
  const byId = new Map<string, T>();
  for (const rec of existing) byId.set(String(rec[idField]), rec);

  const stats = emptyStats();

  for (const rec of incoming) {
    const id = String(rec[idField]);
    if (byId.has(id)) {
      if (skipExisting) {
        stats.skippedExisting++;
      } else {
        byId.set(id, rec);
        stats.updated++;
      }
    } else {
      byId.set(id, rec);
      stats.added++;
    }
  }

  return { records: [...byId.values()], stats };
}

export async function runImport(
  inputs: ImportInput[],
  opts: ImportOptions = {},
): Promise<ImportResult> {
  const incoming: { icaa: RawIcaa[]; isa: RawIsa[] } = { icaa: [], isa: [] };
  const sheets: SheetReport[] = [];
  const warnings: string[] = [];
  let invalidIcaa = 0;
  let invalidIsa = 0;

  for (const input of inputs) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(input.buffer as ArrayBuffer);
    for (const sheet of wb.worksheets) {
      const result = readSheet(sheet, input.kindHint);
      const report: SheetReport = {
        file: input.filename,
        sheet: sheet.name,
        kind: result.kind,
        rowsParsed: result.rows.length,
        rowsSkipped: result.skipped.length,
        fuzzyMatches: result.fuzzyMatches,
        unrecognized: result.unrecognized,
        missingRequired: result.missingRequired,
      };
      sheets.push(report);

      if (!result.kind) {
        warnings.push(`"${sheet.name}" in ${input.filename}: could not detect ICAA vs ISA from headers — sheet skipped.`);
        continue;
      }
      if (result.missingRequired.length > 0) {
        warnings.push(`"${sheet.name}" missing required columns: ${result.missingRequired.join(", ")}`);
      }
      if (result.kind === "ICAA") {
        incoming.icaa.push(...(result.rows as unknown as RawIcaa[]));
        invalidIcaa += result.skipped.length;
      } else {
        incoming.isa.push(...(result.rows as unknown as RawIsa[]));
        invalidIsa += result.skipped.length;
      }
    }
  }

  const existing = readRawDataset();

  const icaaMerge = mergeRecords(
    existing.icaa ?? [],
    incoming.icaa,
    "ID" as keyof RawIcaa,
    !!opts.skipExisting,
  );
  const isaMerge = mergeRecords(
    existing.isa ?? [],
    incoming.isa,
    "ID" as keyof RawIsa,
    !!opts.skipExisting,
  );

  icaaMerge.stats.skippedInvalid = invalidIcaa;
  isaMerge.stats.skippedInvalid = invalidIsa;

  if (!opts.dry) {
    mkdirSync(dirname(JSON_PATH), { recursive: true });
    writeFileSync(
      JSON_PATH,
      JSON.stringify({ icaa: icaaMerge.records, isa: isaMerge.records }, null, 2) + "\n",
    );
  }

  return {
    ok: true,
    icaa: icaaMerge.stats,
    isa: isaMerge.stats,
    totals: { icaa: icaaMerge.records.length, isa: isaMerge.records.length },
    sheets,
    warnings,
  };
}
