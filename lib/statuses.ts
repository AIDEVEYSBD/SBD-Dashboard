// Real ICAA/ISA status taxonomies (from user) — the (Overdue) twin is encoded
// directly in the status string, not a separate flag.
//
// We provide helpers for: terminal vs in-flight, base vs overdue, and pill variant.

import type { AssessmentKind, PillVariant } from "./types";

export const ICAA_STATUSES = [
  "Completed",
  "ICAA Archived",
  "Information Requested (from Requestor)",
  "Information Requested (from Requestor (Overdue))",
  "In-progress with requestor",
  "In-progress with requestor (Overdue)",
  "Not started by requestor",
  "Not started by requestor (Overdue)",
  "Pending Business Owner Approval",
  "Pending Business Owner Approval (Overdue)",
  "Ready to Submit by requestor",
  "Ready to Submit by requestor (Overdue)",
  "Rejected by Security",
  "Security Validation In-Progress",
  "Security Validation In-Progress (Overdue)",
  "Withdrawn by requestor",
] as const;

export const ISA_STATUSES = [
  "Completed",
  "Information Requested from Requestor",
  "Not started by requestor",
  "Not started by requestor (Overdue)",
  "Pending Cyber Manager Approval",
  "Pending Cyber Manager Approval (Overdue)",
  "Pending Service Owner Approval",
  "Pending Service Owner Approval (Overdue)",
  "Pending with requestor",
  "Pending with requestor (Overdue)",
  "Ready to Submit by requestor",
  "Ready to Submit by requestor (Overdue)",
  "Rejected",
  "Security Validation In-Progress",
  "Security Validation In-Progress (Overdue)",
  "Withdrawn",
] as const;

export type IcaaStatus = (typeof ICAA_STATUSES)[number];
export type IsaStatus = (typeof ISA_STATUSES)[number];

const TERMINAL_ICAA = new Set<string>([
  "Completed",
  "ICAA Archived",
  "Rejected by Security",
  "Withdrawn by requestor",
]);
const TERMINAL_ISA = new Set<string>([
  "Completed",
  "Rejected",
  "Withdrawn",
]);

export function statusesFor(kind: AssessmentKind): readonly string[] {
  return kind === "ICAA" ? ICAA_STATUSES : ISA_STATUSES;
}

export function isTerminal(kind: AssessmentKind, status: string): boolean {
  return (kind === "ICAA" ? TERMINAL_ICAA : TERMINAL_ISA).has(status);
}

export function isOverdue(status: string): boolean {
  return status.includes("(Overdue)");
}

// Strip "(Overdue)" suffix to roll up overdue twins into base statuses.
export function baseStatus(status: string): string {
  // Two patterns: " (Overdue)" or "(Overdue)" inside an existing parenthesized clause.
  // Examples:
  //   "Information Requested (from Requestor (Overdue))" -> "Information Requested (from Requestor)"
  //   "In-progress with requestor (Overdue)"             -> "In-progress with requestor"
  return status
    .replace(/ \(Overdue\)$/, "")
    .replace(/ \(Overdue\)\)$/, ")");
}

// "Bucket" — the high-level lifecycle phase a status maps into.
// Used for funnel/pipeline charts where we want fewer than 16 segments.
export type LifecycleBucket =
  | "Not started"
  | "With requester"
  | "Pending owner approval"
  | "In security review"
  | "Completed"
  | "Rejected"
  | "Withdrawn"
  | "Archived";

export function lifecycleBucket(status: string): LifecycleBucket {
  const base = baseStatus(status);
  if (base === "Completed") return "Completed";
  if (base === "ICAA Archived") return "Archived";
  if (base === "Rejected by Security" || base === "Rejected") return "Rejected";
  if (base === "Withdrawn by requestor" || base === "Withdrawn") return "Withdrawn";
  if (base.startsWith("Not started")) return "Not started";
  if (base.startsWith("Pending Business Owner") || base.startsWith("Pending Service Owner") || base.startsWith("Pending Cyber Manager")) {
    return "Pending owner approval";
  }
  if (base.startsWith("Security Validation")) return "In security review";
  return "With requester";
}

const BUCKET_PILL: Record<LifecycleBucket, PillVariant> = {
  "Not started": "neutral",
  "With requester": "info",
  "Pending owner approval": "warn",
  "In security review": "info",
  "Completed": "ok",
  "Rejected": "bad",
  "Withdrawn": "neutral",
  "Archived": "neutral",
};

export const BUCKET_COLOR: Record<LifecycleBucket, string> = {
  "Not started": "var(--neutral)",
  "With requester": "var(--info)",
  "Pending owner approval": "var(--warn)",
  "In security review": "var(--accent)",
  "Completed": "var(--ok)",
  "Rejected": "var(--bad)",
  "Withdrawn": "var(--ink-4)",
  "Archived": "var(--ink-5)",
};

// Map raw status to a pill variant. Overdue always wins over the underlying bucket.
export function pillVariantFor(status: string): PillVariant {
  if (isOverdue(status)) return "bad";
  return BUCKET_PILL[lifecycleBucket(status)];
}

// Short label suitable for a pill — drops the "(Overdue)" parenthetical (we encode that
// via the pill variant). Tightens long status names for chart legends.
export function shortStatus(status: string): string {
  const base = baseStatus(status);
  return base
    .replace("Information Requested (from Requestor)", "Info requested")
    .replace("In-progress with requestor", "In progress")
    .replace("Not started by requestor", "Not started")
    .replace("Pending Business Owner Approval", "Pending business owner")
    .replace("Pending Service Owner Approval", "Pending service owner")
    .replace("Pending Cyber Manager Approval", "Pending cyber manager")
    .replace("Pending with requestor", "Pending requestor")
    .replace("Ready to Submit by requestor", "Ready to submit")
    .replace("Security Validation In-Progress", "Security review")
    .replace("Rejected by Security", "Rejected")
    .replace("Withdrawn by requestor", "Withdrawn")
    .replace("ICAA Archived", "Archived");
}
