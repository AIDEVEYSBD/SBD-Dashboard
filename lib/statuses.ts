// Real ICAA/ISA status taxonomies (from user) — the (Overdue) twin is encoded
// directly in the status string, not a separate flag.
//
// Lifecycle buckets (used by metrics throughout the dashboard):
//
//   Completed-like  — counts as DONE for SLA / conversion / throughput.
//                     Includes the post-cyber-approval pending stages because
//                     by the time an assessment reaches "Pending X Approval"
//                     the reviewer has already approved it.
//                     ICAA: Completed, ICAA Archived, Pending Business Owner Approval (+ Overdue)
//                     ISA:  Completed, Pending Cyber Manager Approval (+ Overdue),
//                            Pending Service Owner Approval (+ Overdue)
//
//   Withdrawn       — excluded from headline metrics (no billing). Shown
//                     separately on each page.
//                     ICAA: Withdrawn by requestor
//                     ISA:  Withdrawn
//
//   Rejected        — counted as terminal. Visible in volume / breakdowns.
//                     ICAA: Rejected by Security
//                     ISA:  Rejected
//
//   In-progress     — everything else. The "in flight" count.

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

// ---------- Bucket sets (literal status strings, with overdue twins) ----------

const ICAA_COMPLETED_LIKE = new Set<string>([
  "Completed",
  "ICAA Archived",
  "Pending Business Owner Approval",
  "Pending Business Owner Approval (Overdue)",
]);
const ISA_COMPLETED_LIKE = new Set<string>([
  "Completed",
  "Pending Cyber Manager Approval",
  "Pending Cyber Manager Approval (Overdue)",
  "Pending Service Owner Approval",
  "Pending Service Owner Approval (Overdue)",
]);

const WITHDRAWN = new Set<string>([
  "Withdrawn by requestor",  // ICAA
  "Withdrawn",               // ISA
]);

const REJECTED = new Set<string>([
  "Rejected by Security",    // ICAA
  "Rejected",                // ISA
]);

// ---------- Predicates ----------

export function statusesFor(kind: AssessmentKind): readonly string[] {
  return kind === "ICAA" ? ICAA_STATUSES : ISA_STATUSES;
}

export function isCompletedLike(kind: AssessmentKind, status: string): boolean {
  return (kind === "ICAA" ? ICAA_COMPLETED_LIKE : ISA_COMPLETED_LIKE).has(status);
}

export function isWithdrawn(status: string): boolean {
  return WITHDRAWN.has(status);
}

export function isRejected(status: string): boolean {
  return REJECTED.has(status);
}

// In-progress = "in flight". Anything not completed-like, not withdrawn, not rejected.
export function isInProgress(kind: AssessmentKind, status: string): boolean {
  return !isCompletedLike(kind, status) && !isWithdrawn(status) && !isRejected(status);
}

// Backwards-compat alias used by older call sites — terminal = anything that's
// not in-progress (completed-like, withdrawn, or rejected).
export function isTerminal(kind: AssessmentKind, status: string): boolean {
  return !isInProgress(kind, status);
}

export function isOverdue(status: string): boolean {
  return status.includes("(Overdue)");
}

// Strip "(Overdue)" suffix to roll up overdue twins into base statuses.
export function baseStatus(status: string): string {
  return status
    .replace(/ \(Overdue\)$/, "")
    .replace(/ \(Overdue\)\)$/, ")");
}

// ---------- Lifecycle bucket — for the high-level breakdown chart ----------

export type LifecycleBucket =
  | "Not started"
  | "With requester"
  | "In security review"
  | "Pending owner approval"
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
  if (
    base.startsWith("Pending Business Owner") ||
    base.startsWith("Pending Service Owner") ||
    base.startsWith("Pending Cyber Manager")
  ) {
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

export function pillVariantFor(status: string): PillVariant {
  if (isOverdue(status)) return "bad";
  return BUCKET_PILL[lifecycleBucket(status)];
}

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
