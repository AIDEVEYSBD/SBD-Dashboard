// Data layer — reads data/assessments.json at runtime and maps the raw column
// structure onto the typed domain shape consumed by the query layer.
//
// Runtime reading (rather than `import data from "@/data/..."`) means imports
// via the UI take effect on the very next render. We cache by file mtime so
// repeated calls within a render are cheap.

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { PEOPLE } from "./people";
import type { RawDataset, RawIcaa, RawIsa } from "./raw";
import type {
  IcaaAssessment,
  IsaAssessment,
  Person,
} from "./types";

export interface Dataset {
  icaa: IcaaAssessment[];
  isa: IsaAssessment[];
  people: Person[];
}

export const JSON_PATH = resolve(process.cwd(), "data", "assessments.json");

const parseDate = (s: string | null | undefined): Date | null =>
  s ? new Date(s) : null;

function splitMulti(value: string): string[] {
  if (!value) return [];
  return value.split(/[;,]\s*/).map((s) => s.trim()).filter(Boolean);
}

// Pull an ISA ID out of the "ISA Status Text Feild" string. The source-system
// format is roughly "ISA-NNNNNN — <status>", but we tolerate optional dashes
// and case variations.
function extractIsaId(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = String(text).match(/ISA[-\s]?(\d+)/i);
  return m ? `ISA-${m[1]}` : null;
}

function mapIcaa(r: RawIcaa): IcaaAssessment {
  return {
    kind: "ICAA",
    id: r["ID"],
    formName: r["Form Name"],
    applicationName: r["Application/IT Service Name"],
    reviewer: r["Reviewer(s)"] || null,
    requesters: splitMulti(r["Requester(s)"]),
    serviceOwner: r["Service Owner"],
    businessOwner: r["Business Owner"],
    serviceVp: r["Service VP"],
    serviceDirector: r["Service Director"],
    serviceVpOrg: r["Service VP Org"],
    serviceDirectorOrg: r["Service Director Org"],
    status: r["Assessment Status"],
    dateSent: new Date(r["Date Sent"]),
    dateDue: new Date(r["Date Due"]),
    dateReviewerAssigned: parseDate(r["Date Reviewer Assigned"]),
    cyberApprovalDate: parseDate(r["Cyber Approval Date"]),
    dateFinalized: parseDate(r["Date Finalized"]),
    dateWithdrawn: parseDate(r["Date Withdrawn"]),
    rejectedInLastSixMonths: r["Rejected in Last Six Months"],
    monthRejected: r["Month Rejected"],
    inherentRiskCategorization: r["Inherent Risk Categorization"],
    informationClassification: r["Information Classification"],
    serviceCriticality: r["Service Criticality"],
    serviceSupportType: r["Service Support Type"],
    manualAsset: r["Manual Asset"],
    sysId: r["SYS ID"],

    hoursForSbdToReview: r["Hours/Days for SBD to Review"],
    hoursForRequesterToSubmit: r["Hours/Days for Reuqesters to Submit"],
    hoursWithRequesterInfoRequested: r["Hours/Days with Requester (Information Requested)"],
    hoursWithBusinessOrServiceOwner: r["Hors/Days with Business Owner"],
    hoursToFullyComplete: r["Hours/Days to Fully Complete ICAA/Days"],
    daysOverdue: r["Days Overdue"],
    daysUnassigned: r["Days Unassigned (No Reviewer)"],

    inherentRisk: r["Inherent Risk"],
    inherentRiskRating: r["Inherent Risk Rating"],
    geography: r["Geograpy (ICAA)"],
    hostingTypeNew: r["Hosting Type New"],
    goLiveDate: parseDate(r["Go Live Date"]),
    newPrioritySystem: r["New Priority System"],
    potentialKfas: r["Potential KFAS"],
    isaStatus: r["ISA Status"],
    // Try to pull the ISA ID from the source system's text field first.
    // The post-mapping pass below also wires this from Parent ICAA ID
    // when the seed-style linkage is present.
    isaIdLink: extractIsaId(r["ISA Status Text Feild"]),
    q1Response: r["Q1 Response"],
    q5Response: r["Q 5 Response"],
    q14Response: r["Q14 Response"],
    q14_1Response: r["Q14.1 Response"],
    q16Response: r["Q 16 Response"],
    q16_1Response: r["Q 16.1 Response"],
    q17AbsRelated: r["Is this service related to ABs (Q17)"],
    q17_1: r["ABs (Q17.1)"],
    q17_2: r["ABs (Q17.2)"],
    q17_3: r["ABs (Q17.3)"],
    q18AiInvolved: r["ABs (Q18)"],
    q18_1AiDetail: r["ABs(18.1)"],
    originalRequestorName: r["Original Requestor Name"],
  };
}

function mapIsa(r: RawIsa): IsaAssessment {
  const dateFinalised = parseDate(r["Date Finalised"]);
  return {
    kind: "ISA",
    id: r["ID"],
    isaId: r["ISA ID"],
    formName: r["Form Name"],
    applicationName: r["Application/IT Service Name"],
    reviewer: r["Reviewer(s)"] || null,
    requesters: splitMulti(r["Requestor(s)"]),
    serviceOwner: r["Service Owner"],
    businessOwner: r["Business Owner"],
    serviceVp: r["Service VP"],
    serviceDirector: r["Service Director"],
    serviceVpOrg: r["Service VP Org"],
    serviceDirectorOrg: r["Service Director Org"],
    status: r["Assessment Status"],
    dateSent: new Date(r["Date Sent"]),
    dateDue: new Date(r["Date Due"]),
    dateReviewerAssigned: parseDate(r["Date Reviewer Assigned"]),
    cyberApprovalDate: parseDate(r["Cyber Approval Date"]),
    dateFinalized: dateFinalised,
    dateWithdrawn: parseDate(r["Date Withdrawn"]),
    rejectedInLastSixMonths: r["Rejected in Last Six Months"],
    monthRejected: r["Month Rejected"],
    inherentRiskCategorization: r["Inherent Risk Categorization"],
    informationClassification: r["Information Classification"],
    serviceCriticality: r["Service Criticality"],
    serviceSupportType: r["Service Support Type"],
    manualAsset: r["Manual Asset"],
    sysId: r["SYS ID"],

    hoursForSbdToReview: r["Hours/Days for SBD to Review"],
    hoursForRequesterToSubmit: r["Hours/Days for Requestor to Submit"],
    hoursWithRequesterInfoRequested: r["Hours/Days with Requestor (Information Requested)"],
    hoursWithBusinessOrServiceOwner: r["Hours/Days with Service Owner"],
    hoursToFullyComplete: r["Hours/Days to Fully Complete ISA"],
    daysOverdue: r["Days Overdue"],
    daysUnassigned: r["Days Unassigned (No Reviewer)"],

    parentIcaaId: r["Parent ICAA ID"] ?? null,
    residualRisk: r["Residual Risk"],
    unileverBaselineCompliance: r["Unilever Baseline Compliance (Target Risk)"],
    isaLevel: r["ISA Level"],
    hostingType: r["Hosting Type"],
    initialDesignScore: r["Initial Design Score"],
    currentDesignScore: r["Current Design Score"],
    nextAssessmentDate: parseDate(r["Next Assessment Date"]),
    prioritySystem: r["Priority System?"],
    isa55Mfa: r["ISA 55 MFA"],
    dateCompleted: parseDate(r["Date Completed"]),
  };
}

let cached: { dataset: Dataset; mtime: number } | null = null;

export function getDataset(): Dataset {
  let mtime = 0;
  try {
    mtime = statSync(JSON_PATH).mtimeMs;
  } catch {
    // File doesn't exist yet — return an empty dataset.
    if (!cached) {
      cached = { dataset: { icaa: [], isa: [], people: PEOPLE }, mtime: 0 };
    }
    return cached.dataset;
  }

  if (cached && cached.mtime === mtime) return cached.dataset;

  // Tolerate empty / malformed JSON (e.g. file just created by `touch`, or a
  // partial write mid-import). Treat as "no data yet" and continue.
  let raw: RawDataset = { icaa: [], isa: [] };
  try {
    const text = readFileSync(JSON_PATH, "utf8").trim();
    if (text.length > 0) raw = JSON.parse(text) as RawDataset;
  } catch {
    raw = { icaa: [], isa: [] };
  }
  const icaa = (raw.icaa ?? []).map(mapIcaa);
  const isa = (raw.isa ?? []).map(mapIsa);

  // Reinforce isaIdLink from the synthetic Parent ICAA ID linkage if present
  // (used by seed data; real Excel exports rely on the text-field extraction
  // above).
  const isaByParent = new Map<string, IsaAssessment>();
  for (const x of isa) {
    if (x.parentIcaaId) isaByParent.set(x.parentIcaaId, x);
  }
  for (const a of icaa) {
    if (!a.isaIdLink) {
      const child = isaByParent.get(a.id);
      if (child) a.isaIdLink = child.isaId;
    }
  }

  cached = { dataset: { icaa, isa, people: PEOPLE }, mtime };
  return cached.dataset;
}

// Read the raw JSON shape directly — used by the import route to merge with
// existing records before writing back. Tolerates missing / empty / malformed
// JSON by returning an empty dataset so the very-first import can proceed
// against a fresh file.
export function readRawDataset(): RawDataset {
  try {
    const text = readFileSync(JSON_PATH, "utf8").trim();
    if (text.length === 0) return { icaa: [], isa: [] };
    return JSON.parse(text) as RawDataset;
  } catch {
    return { icaa: [], isa: [] };
  }
}
