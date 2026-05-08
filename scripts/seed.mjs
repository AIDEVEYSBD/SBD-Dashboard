#!/usr/bin/env node
// Seed data/assessments.json with ~100 random assessment records.
// Column names match the source-system spec exactly (typos preserved).
// Run via: npm run seed

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "data");
const OUT_FILE = resolve(OUT_DIR, "assessments.json");

// Anchor "now" — kept in sync with lib/clock.ts so trends line up.
const NOW = new Date("2026-05-07T12:00:00Z");
const HORIZON_DAYS = 540; // 18 months back

// ---------------------------------------------------------------- RNG (mulberry32)

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(42);
const intBetween = (lo, hi) => Math.floor(rng() * (hi - lo + 1)) + lo;
const floatBetween = (lo, hi) => rng() * (hi - lo) + lo;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pickWeighted = (items) => {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
};
const chance = (p) => rng() < p;

// ---------------------------------------------------------------- Reference data

const PEOPLE = ["MR", "KC", "JT", "AP", "DS", "LH", "RV", "BO", "TN", "EM", "PG", "QF"];

const REQUESTERS = [
  "Alex Hartwell", "Mei Tanaka", "Raj Pemberton", "Sara Klein", "Diego Rosa",
  "Yuki Mori", "Hannah Brooks", "Omar Said", "Ines Carrera", "Wei Liu",
  "Cara Donnelly", "Ben Sayer", "Rashida Olu", "Magnus Lie", "Sofia Vargas",
  "Tom Whitaker", "Layla Maza", "Keisha Banks", "Felipe Otero", "Anya Volkov",
];

const APP_PREFIX = ["Atlas","Beacon","Cascade","Drift","Ember","Foundry","Glade","Halo","Iris","Jade","Kestrel","Lumen","Mosaic","Nimbus","Onyx","Pinion","Quartz","Reef","Spire","Tundra","Verge","Whisk","Yonder","Zephyr"];
const APP_SUFFIX = ["Hub","Portal","Cloud","Flow","Studio","Suite","Grid","Stack","Engine","Ledger","Mesh","Vault","Pulse","Edge","Lite","Pro","OS","Index","Console","Stream"];

const VPS = ["S. Ahuja","M. Eriksson","R. Pillai","D. Boateng","K. Tan","L. Marchetti","C. Whitfield","J. Vasquez"];
const DIRECTORS = ["P. Yamada","T. Goldberg","N. Aldana","F. Russo","H. Park","B. Cisneros","S. Larsen","G. Mwangi"];
const VP_ORGS = ["Digital Manufacturing","Ice Cream","Beauty & Wellbeing","Personal Care","Home Care","Nutrition","Foods","Corporate Functions"];
const DIR_ORGS = ["IT Infrastructure","ERP Platforms","Data & Analytics","Customer Operations","Supply Chain Tech","Marketing Tech","R&D Systems","Finance Systems"];

const HOSTING = ["On-prem","Private Cloud","Public Cloud","SaaS","Hybrid"];
const GEOGRAPHIES = ["Americas","EMEA","APAC","LATAM","Global"];
const SUPPORT_TYPES = ["Internal","Vendor","Hybrid"];

const ICAA_STATUSES_FRESH = [
  { value: "Not started by requestor", w: 28 },
  { value: "In-progress with requestor", w: 22 },
  { value: "Ready to Submit by requestor", w: 12 },
  { value: "Information Requested (from Requestor)", w: 10 },
  { value: "Pending Business Owner Approval", w: 10 },
  { value: "Security Validation In-Progress", w: 14 },
  { value: "Withdrawn by requestor", w: 2 },
  { value: "Completed", w: 2 },
];
const ICAA_STATUSES_MID = [
  { value: "Completed", w: 18 },
  { value: "Security Validation In-Progress", w: 16 },
  { value: "Security Validation In-Progress (Overdue)", w: 8 },
  { value: "In-progress with requestor", w: 12 },
  { value: "In-progress with requestor (Overdue)", w: 6 },
  { value: "Information Requested (from Requestor)", w: 8 },
  { value: "Information Requested (from Requestor (Overdue))", w: 4 },
  { value: "Pending Business Owner Approval", w: 8 },
  { value: "Pending Business Owner Approval (Overdue)", w: 4 },
  { value: "Ready to Submit by requestor", w: 6 },
  { value: "Ready to Submit by requestor (Overdue)", w: 2 },
  { value: "Withdrawn by requestor", w: 2 },
  { value: "Rejected by Security", w: 2 },
];
const ICAA_STATUSES_OLD = [
  { value: "Completed", w: 60 },
  { value: "ICAA Archived", w: 12 },
  { value: "Withdrawn by requestor", w: 6 },
  { value: "Rejected by Security", w: 4 },
  { value: "Security Validation In-Progress (Overdue)", w: 6 },
  { value: "In-progress with requestor (Overdue)", w: 4 },
  { value: "Pending Business Owner Approval (Overdue)", w: 4 },
  { value: "Information Requested (from Requestor (Overdue))", w: 4 },
];
const ISA_STATUSES_FRESH = [
  { value: "Not started by requestor", w: 30 },
  { value: "Pending with requestor", w: 18 },
  { value: "Ready to Submit by requestor", w: 12 },
  { value: "Security Validation In-Progress", w: 18 },
  { value: "Pending Service Owner Approval", w: 8 },
  { value: "Pending Cyber Manager Approval", w: 8 },
  { value: "Information Requested from Requestor", w: 6 },
];
const ISA_STATUSES_MID = [
  { value: "Completed", w: 14 },
  { value: "Security Validation In-Progress", w: 20 },
  { value: "Security Validation In-Progress (Overdue)", w: 10 },
  { value: "Pending with requestor", w: 12 },
  { value: "Pending with requestor (Overdue)", w: 6 },
  { value: "Information Requested from Requestor", w: 8 },
  { value: "Pending Cyber Manager Approval", w: 8 },
  { value: "Pending Cyber Manager Approval (Overdue)", w: 4 },
  { value: "Pending Service Owner Approval", w: 8 },
  { value: "Pending Service Owner Approval (Overdue)", w: 3 },
  { value: "Ready to Submit by requestor", w: 5 },
  { value: "Ready to Submit by requestor (Overdue)", w: 2 },
];
const ISA_STATUSES_OLD = [
  { value: "Completed", w: 55 },
  { value: "Withdrawn", w: 8 },
  { value: "Rejected", w: 4 },
  { value: "Security Validation In-Progress (Overdue)", w: 10 },
  { value: "Pending Cyber Manager Approval (Overdue)", w: 6 },
  { value: "Pending with requestor (Overdue)", w: 8 },
  { value: "Pending Service Owner Approval (Overdue)", w: 5 },
  { value: "Information Requested from Requestor", w: 4 },
];

const ICAA_TERMINAL = new Set(["Completed","ICAA Archived","Rejected by Security","Withdrawn by requestor"]);
const ISA_TERMINAL = new Set(["Completed","Rejected","Withdrawn"]);

// ---------------------------------------------------------------- Helpers

const DAY = 86_400_000;
const addHours = (d, h) => new Date(d.getTime() + h * 3_600_000);
const addDays = (d, days) => new Date(d.getTime() + days * DAY);
const daysBetween = (a, b) => (b.getTime() - a.getTime()) / DAY;
const ymKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,"0")}`;
const iso = (d) => (d ? d.toISOString() : null);
const isOverdue = (status) => status.includes("(Overdue)");
const baseStatus = (status) => status.replace(/ \(Overdue\)$/, "").replace(/ \(Overdue\)\)$/, ")");

const appName = () => `${pick(APP_PREFIX)} ${pick(APP_SUFFIX)}`;

function pickIcaaStatus(ageDays) {
  if (ageDays > 90) return pickWeighted(ICAA_STATUSES_OLD);
  if (ageDays > 14) return pickWeighted(ICAA_STATUSES_MID);
  return pickWeighted(ICAA_STATUSES_FRESH);
}
function pickIsaStatus(ageDays) {
  if (ageDays > 180) return pickWeighted(ISA_STATUSES_OLD);
  if (ageDays > 30) return pickWeighted(ISA_STATUSES_MID);
  return pickWeighted(ISA_STATUSES_FRESH);
}

function commonTimings(kind, dateSent, status) {
  const slaTarget = kind === "ICAA" ? 24 : 120;
  const terminal = kind === "ICAA" ? ICAA_TERMINAL.has(status) : ISA_TERMINAL.has(status);
  const overdue = isOverdue(status);

  let hoursForSbdToReview;
  if (terminal && status === "Completed") {
    hoursForSbdToReview = chance(0.75) ? floatBetween(1, slaTarget * 0.95) : floatBetween(slaTarget, slaTarget * 3);
  } else if (terminal) {
    hoursForSbdToReview = floatBetween(1, slaTarget * 1.5);
  } else if (overdue) {
    hoursForSbdToReview = floatBetween(slaTarget, slaTarget * 4);
  } else {
    hoursForSbdToReview = floatBetween(0.5, slaTarget * 0.9);
  }

  const hoursForRequesterToSubmit = floatBetween(4, 240);
  const hoursWithRequesterInfoRequested = floatBetween(0, 96);
  const hoursWithBusinessOrServiceOwner = floatBetween(0, 120);
  const hoursToFullyComplete =
    hoursForSbdToReview + hoursWithRequesterInfoRequested + hoursWithBusinessOrServiceOwner + floatBetween(4, 48);
  const daysOverdue = overdue ? intBetween(1, 60) : 0;

  return {
    hoursForSbdToReview: round2(hoursForSbdToReview),
    hoursForRequesterToSubmit: round2(hoursForRequesterToSubmit),
    hoursWithRequesterInfoRequested: round2(hoursWithRequesterInfoRequested),
    hoursWithBusinessOrServiceOwner: round2(hoursWithBusinessOrServiceOwner),
    hoursToFullyComplete: round2(hoursToFullyComplete),
    daysOverdue,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

function monthsBack(ym) {
  const [y, m] = ym.split("-").map(Number);
  return (NOW.getUTCFullYear() - y) * 12 + (NOW.getUTCMonth() + 1 - m);
}

function pickRequesterList() {
  const n = chance(0.85) ? 1 : 2;
  const out = new Set();
  while (out.size < n) out.add(pick(REQUESTERS));
  return [...out].join("; ");
}

function reviewerCode(status) {
  const reviewerKnown = !status.startsWith("Not started") && chance(0.95);
  return reviewerKnown ? pick(PEOPLE) : "";
}

function dateReviewerAssigned(reviewer, dateSent) {
  if (!reviewer) return null;
  return addHours(dateSent, intBetween(1, 36));
}

// ---------------------------------------------------------------- ICAA generator

function genIcaa(i) {
  const dayOffset = Math.round(Math.pow(rng(), 1.4) * HORIZON_DAYS);
  const dateSent = addDays(NOW, -dayOffset);
  const ageDays = daysBetween(dateSent, NOW);
  const status = pickIcaaStatus(ageDays);
  const t = commonTimings("ICAA", dateSent, status);
  const reviewer = reviewerCode(status);
  const dra = dateReviewerAssigned(reviewer, dateSent);
  const completed = baseStatus(status) === "Completed";
  const cyberApprovalDate = completed
    ? addHours(dateSent, t.hoursForSbdToReview + t.hoursWithRequesterInfoRequested + t.hoursWithBusinessOrServiceOwner + floatBetween(1, 24))
    : null;
  const dateFinalized = completed && cyberApprovalDate
    ? addHours(cyberApprovalDate, intBetween(1, 120))
    : null;
  const dateWithdrawn = baseStatus(status).startsWith("Withdrawn")
    ? addDays(dateSent, intBetween(1, 30))
    : null;
  const rejected = baseStatus(status).startsWith("Rejected") || (chance(0.05) && (ICAA_TERMINAL.has(status)));
  const monthRejected = rejected ? ymKey(dateFinalized ?? addDays(dateSent, intBetween(1, 90))) : null;
  const aiInvolved = chance(0.18);
  const requesters = pickRequesterList();
  const originalRequester = requesters.split("; ")[0];
  const inherentRisk = intBetween(5, 95);
  const inherentRiskRating = pickWeighted([
    { value: "Low", w: 30 }, { value: "Medium", w: 38 }, { value: "High", w: 22 }, { value: "Critical", w: 10 },
  ]);
  const dueOffsetDays = 7;
  const dateDue = addDays(dateSent, dueOffsetDays);

  /** @type {import("../lib/raw").RawIcaa} */
  const rec = {
    "Form Name": "ICAA Form v3",
    "ID": `ICAA-${String(80000 + i).padStart(6, "0")}`,
    "Inherent Risk": inherentRisk,
    "Inherent Risk Rating": inherentRiskRating,
    "Application/IT Service Name": appName(),
    "Reviewer(s)": reviewer,
    "Requester(s)": requesters,
    "Assessment Status": status,
    "Date Sent": iso(dateSent),
    "Service Owner": pick(REQUESTERS),
    "Date Due": iso(dateDue),
    "Business Owner": pick(REQUESTERS),
    "Overdue By": t.daysOverdue,
    "Inherent Risk Categorization": pickWeighted([
      { value: "Low", w: 25 }, { value: "Medium", w: 40 }, { value: "High", w: 25 }, { value: "Critical", w: 10 },
    ]),
    "Questionaire Completed": completed || chance(0.6),
    "Date Finalized": iso(dateFinalized),
    "Manual Asset": chance(0.18),
    "Service VP Org": pick(VP_ORGS),
    "Service Director Org": pick(DIR_ORGS),
    "Service Director": pick(DIRECTORS),
    "Service VP": pick(VPS),
    "Hours/Days for SBD to Review": t.hoursForSbdToReview,
    "Hours/Days for Reuqesters to Submit": t.hoursForRequesterToSubmit,
    "Hours/Days with Requester (Information Requested)": t.hoursWithRequesterInfoRequested,
    "Hors/Days with Business Owner": t.hoursWithBusinessOrServiceOwner,
    "Hours/Days to Fully Complete ICAA/Days": t.hoursToFullyComplete,
    "Days Overdue": t.daysOverdue,
    "Rejected in Last Six Months": !!(rejected && monthRejected && monthsBack(monthRejected) <= 6),
    "Month Rejected": monthRejected,
    "Days Unassigned (No Reviewer)": dra ? Math.max(0, Math.round(daysBetween(dateSent, dra))) : Math.round(daysBetween(dateSent, NOW)),
    "Geograpy (ICAA)": pickWeighted([
      { value: "Americas", w: 30 }, { value: "EMEA", w: 35 }, { value: "APAC", w: 18 },
      { value: "LATAM", w: 10 }, { value: "Global", w: 7 },
    ]),
    "Cyber Approval Date": iso(cyberApprovalDate),
    "Potential KFAS": chance(0.12),
    "Information Classification": pickWeighted([
      { value: "Public", w: 8 }, { value: "Internal", w: 35 }, { value: "Confidential", w: 30 },
      { value: "Highly Confidential", w: 18 }, { value: "Restricted", w: 9 },
    ]),
    "Service Criticality": pickWeighted([
      { value: "Low", w: 20 }, { value: "Medium", w: 40 }, { value: "High", w: 28 }, { value: "Mission Critical", w: 12 },
    ]),
    "Service Support Type": pick(SUPPORT_TYPES),
    "Original Requestor Name": originalRequester ?? pick(REQUESTERS),
    "Go Live Date": chance(0.6) ? iso(addDays(dateSent, intBetween(14, 200))) : null,
    "New Priority System": chance(0.22),
    "Hosting Type New": pick(HOSTING),
    "Date Withdrawn": iso(dateWithdrawn),
    "ISA Status Text Feild": null,    // wired post-gen
    "ISA Status": null,                // wired post-gen
    "Date Reviewer Assigned": iso(dra),
    "SYS ID": `SYS-${intBetween(100000, 999999)}`,
    "Q1 Response": chance(0.7) ? "Yes" : "No",
    "Q14 Response": chance(0.4) ? "Yes" : "No",
    "Q14.1 Response": null,
    "Q 5 Response": chance(0.5) ? "Yes" : "No",
    "Q 16 Response": chance(0.5) ? "Yes" : "No",
    "Q 16.1 Response": null,
    "Is this service related to ABs (Q17)": chance(0.25) ? "Yes" : "No",
    "ABs (Q17.1)": null,
    "ABs (Q17.2)": null,
    "ABs (Q17.3)": null,
    "ABs (Q18)": aiInvolved ? "Yes" : "No",
    "ABs(18.1)": aiInvolved ? "Generative AI in customer interaction flow" : null,
  };
  return rec;
}

// ---------------------------------------------------------------- ISA generator

function genIsa(i, parent) {
  const baseSent = parent && parent["Date Finalized"]
    ? new Date(parent["Date Finalized"])
    : parent
      ? new Date(parent["Date Sent"])
      : addDays(NOW, -intBetween(30, HORIZON_DAYS));
  const dateSent = addDays(baseSent, intBetween(1, 30));
  if (dateSent > NOW) return null;
  const ageDays = daysBetween(dateSent, NOW);
  const status = pickIsaStatus(ageDays);
  const t = commonTimings("ISA", dateSent, status);
  const reviewer = reviewerCode(status);
  const dra = dateReviewerAssigned(reviewer, dateSent);
  const completed = baseStatus(status) === "Completed";
  const cyberApprovalDate = completed
    ? addHours(dateSent, t.hoursForSbdToReview + t.hoursWithRequesterInfoRequested + t.hoursWithBusinessOrServiceOwner + floatBetween(1, 24))
    : null;
  const dateFinalised = completed && cyberApprovalDate
    ? addHours(cyberApprovalDate, intBetween(1, 120))
    : null;
  const dateWithdrawn = baseStatus(status).startsWith("Withdrawn")
    ? addDays(dateSent, intBetween(1, 30))
    : null;
  const rejected = baseStatus(status).startsWith("Rejected") || (chance(0.04) && ISA_TERMINAL.has(status));
  const monthRejected = rejected ? ymKey(dateFinalised ?? addDays(dateSent, intBetween(1, 90))) : null;
  const initialDesignScore = intBetween(30, 75);
  const currentDesignScore = Math.min(100, initialDesignScore + intBetween(0, 35));
  const requestors = pickRequesterList();
  const id = `ISA-${String(50000 + i).padStart(6, "0")}`;
  const dateDue = addDays(dateSent, 30);

  /** @type {import("../lib/raw").RawIsa} */
  const rec = {
    "Form Name": "ISA Form v2",
    "ID": id,
    "Application/IT Service Name": parent ? parent["Application/IT Service Name"] : appName(),
    "Reviewer(s)": reviewer,
    "Information Classification": pickWeighted([
      { value: "Public", w: 5 }, { value: "Internal", w: 25 }, { value: "Confidential", w: 35 },
      { value: "Highly Confidential", w: 25 }, { value: "Restricted", w: 10 },
    ]),
    "Residual Risk": pickWeighted([
      { value: "Low", w: 35 }, { value: "Medium", w: 38 }, { value: "High", w: 18 }, { value: "Critical", w: 9 },
    ]),
    "Inherent Risk Categorization": parent ? parent["Inherent Risk Categorization"] : pickWeighted([
      { value: "Medium", w: 30 }, { value: "High", w: 50 }, { value: "Critical", w: 20 },
    ]),
    "Unilever Baseline Compliance (Target Risk)": intBetween(50, 100),
    "Manual Asset": chance(0.18),
    "ISA Level": pickWeighted([
      { value: "L1", w: 45 }, { value: "L2", w: 40 }, { value: "L3", w: 15 },
    ]),
    "Service VP Org": parent ? parent["Service VP Org"] : pick(VP_ORGS),
    "Service Director Org": parent ? parent["Service Director Org"] : pick(DIR_ORGS),
    "Date Completed": iso(dateFinalised),
    "Date Finalised": iso(dateFinalised),
    "Hours/Days for Requestor to Submit": t.hoursForRequesterToSubmit,
    "Hours/Days for SBD to Review": t.hoursForSbdToReview,
    "Hours/Days with Requestor (Information Requested)": t.hoursWithRequesterInfoRequested,
    "Hours/Days with Service Owner": t.hoursWithBusinessOrServiceOwner,
    "Hours/Days to Fully Complete ISA": t.hoursToFullyComplete,
    "Days Overdue": t.daysOverdue,
    "Rejected in Last Six Months": !!(rejected && monthRejected && monthsBack(monthRejected) <= 6),
    "Month Rejected": monthRejected,
    "Days Unassigned (No Reviewer)": dra ? Math.max(0, Math.round(daysBetween(dateSent, dra))) : Math.round(daysBetween(dateSent, NOW)),
    "Cyber Approval Date": iso(cyberApprovalDate),
    "Service Support Type": pick(SUPPORT_TYPES),
    "Service Criticality": pickWeighted([
      { value: "Low", w: 15 }, { value: "Medium", w: 35 }, { value: "High", w: 35 }, { value: "Mission Critical", w: 15 },
    ]),
    "Date Reviewer Assigned": iso(dra),
    "Date Withdrawn": iso(dateWithdrawn),
    "ISA ID": id,
    "Assessment Status": status,
    "Date Sent": iso(dateSent),
    "Date Due": iso(dateDue),
    "Service Owner": pick(REQUESTERS),
    "Business Owner": pick(REQUESTERS),
    "Service VP": pick(VPS),
    "Service Director": pick(DIRECTORS),
    "Hosting Type": pick(HOSTING),
    "Current Design Score": currentDesignScore,
    "Initial Design Score": initialDesignScore,
    "Requestor(s)": requestors,
    "Next Assessment Date": chance(0.7) ? iso(addDays(dateFinalised ?? NOW, intBetween(30, 540))) : null,
    "Overdue By": t.daysOverdue,
    "Priority System?": chance(0.25),
    "SYS ID": `SYS-${intBetween(100000, 999999)}`,
    "ISA 55 MFA": pickWeighted([
      { value: "Yes", w: 65 }, { value: "No", w: 25 }, { value: "N/A", w: 10 },
    ]),
    ...(parent ? { "Parent ICAA ID": parent["ID"] } : {}),
  };
  return rec;
}

// ---------------------------------------------------------------- Main

const ICAA_COUNT = 70;
const ISA_TARGET = 30;

const icaa = [];
for (let i = 0; i < ICAA_COUNT; i++) icaa.push(genIcaa(i));

// ISAs convert from ICAAs that aren't withdrawn/rejected and aren't Low risk.
const convertibleIcaa = icaa.filter((a) =>
  !a["Assessment Status"].startsWith("Withdrawn") &&
  !a["Assessment Status"].startsWith("Rejected") &&
  a["Inherent Risk Categorization"] !== "Low",
);

const isa = [];
let parentCursor = 0;
let attempts = 0;
while (isa.length < ISA_TARGET && attempts < ISA_TARGET * 4) {
  attempts++;
  const parent = convertibleIcaa[parentCursor++ % convertibleIcaa.length] ?? null;
  const rec = genIsa(isa.length, parent);
  if (rec) isa.push(rec);
}

// Wire ICAA -> ISA back-pointers ("ISA Status" + "ISA Status Text Feild")
const isaByParent = new Map();
for (const x of isa) {
  if (x["Parent ICAA ID"]) isaByParent.set(x["Parent ICAA ID"], x);
}
for (const a of icaa) {
  const child = isaByParent.get(a["ID"]);
  if (child) {
    a["ISA Status"] = child["Assessment Status"];
    a["ISA Status Text Feild"] = `${child["ISA ID"]} — ${child["Assessment Status"]}`;
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify({ icaa, isa }, null, 2) + "\n");

console.log(`✔ Wrote ${OUT_FILE}`);
console.log(`  ICAA records: ${icaa.length}`);
console.log(`  ISA records:  ${isa.length}`);
console.log(`  Linked (ICAA→ISA): ${isaByParent.size}`);
