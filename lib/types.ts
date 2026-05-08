// Domain types — modeled on the real ICAA/ISA column lists provided by the user.
// Inline notes flag fields where we made interpretation calls; revisit when DB hooks up.

export type AssessmentKind = "ICAA" | "ISA";

// SLA targets — user-confirmed
export const SLA_HOURS: Record<AssessmentKind, number> = {
  ICAA: 24,
  ISA: 120,
};

export type RiskCategorization = "Low" | "Medium" | "High" | "Critical";
export type InformationClassification =
  | "Public"
  | "Internal"
  | "Confidential"
  | "Highly Confidential"
  | "Restricted";
export type ServiceCriticality = "Low" | "Medium" | "High" | "Mission Critical";
export type ServiceSupportType = "Internal" | "Vendor" | "Hybrid";
export type HostingType = "On-prem" | "Private Cloud" | "Public Cloud" | "SaaS" | "Hybrid";
export type Geography =
  | "Americas"
  | "EMEA"
  | "APAC"
  | "LATAM"
  | "Global";

// People are encoded as short codes (initials) — analyst team is small (~12 reviewers).
export interface Person {
  code: string;
  name: string;
  role: string;
}

// Common operational time fields shared by ICAA and ISA. Stored as hours (decimal).
export interface SbdTimings {
  hoursForSbdToReview: number;            // SLA target = SLA_HOURS[kind]
  hoursForRequesterToSubmit: number;
  hoursWithRequesterInfoRequested: number;
  hoursWithBusinessOrServiceOwner: number;
  hoursToFullyComplete: number;
  daysOverdue: number;                    // 0 if not overdue
  daysUnassigned: number;                 // gap from Date Sent → Date Reviewer Assigned
}

export interface BaseAssessment extends SbdTimings {
  kind: AssessmentKind;
  id: string;                             // ICAA-NNNNN / ISA-NNNNN
  formName: string;
  applicationName: string;
  reviewer: string | null;                // Person code (one analyst per assessment, sometimes null)
  requesters: string[];                   // 1+ requesters
  serviceOwner: string;
  businessOwner: string;
  serviceVp: string;
  serviceDirector: string;
  serviceVpOrg: string;
  serviceDirectorOrg: string;
  status: string;                         // raw status string (with "(Overdue)" suffix when applicable)
  dateSent: Date;
  dateDue: Date;
  dateReviewerAssigned: Date | null;
  cyberApprovalDate: Date | null;         // analyst-approved
  dateFinalized: Date | null;             // formal close — defines "done" for SLA
  dateWithdrawn: Date | null;
  rejectedInLastSixMonths: boolean;
  monthRejected: string | null;           // "2026-03" or null
  inherentRiskCategorization: RiskCategorization;
  informationClassification: InformationClassification;
  serviceCriticality: ServiceCriticality;
  serviceSupportType: ServiceSupportType;
  manualAsset: boolean;
  sysId: string;
}

export interface IcaaAssessment extends BaseAssessment {
  kind: "ICAA";
  inherentRisk: number;                   // numeric score 0–100
  inherentRiskRating: "Low" | "Medium" | "High" | "Critical"; // textual rating
  geography: Geography;
  hostingTypeNew: HostingType;
  goLiveDate: Date | null;
  newPrioritySystem: boolean;
  potentialKfas: boolean;                 // "Potential KFAS" flag
  isaStatus: string | null;               // back-pointer once converted
  isaIdLink: string | null;               // ISA ID once converted
  q1Response: "Yes" | "No";
  q5Response: "Yes" | "No";
  q14Response: "Yes" | "No";
  q14_1Response: string | null;
  q16Response: "Yes" | "No";
  q16_1Response: string | null;
  q17AbsRelated: "Yes" | "No";            // Q17 (ABs)
  q17_1: string | null;
  q17_2: string | null;
  q17_3: string | null;
  q18AiInvolved: "Yes" | "No";            // Q18 — the AI flag
  q18_1AiDetail: string | null;
  originalRequestorName: string;
}

export interface IsaAssessment extends BaseAssessment {
  kind: "ISA";
  isaId: string;                          // distinct from .id (which is the form/record id)
  parentIcaaId: string | null;            // null only when ISA is standalone (rare)
  residualRisk: RiskCategorization;
  unileverBaselineCompliance: number;     // % target risk score
  isaLevel: "L1" | "L2" | "L3";
  hostingType: HostingType;
  initialDesignScore: number;             // 0–100
  currentDesignScore: number;             // 0–100, ≥ initial
  nextAssessmentDate: Date | null;
  prioritySystem: boolean;
  isa55Mfa: "Yes" | "No" | "N/A";
  dateCompleted: Date | null;             // ISA-only — distinct from finalized
}

export type Assessment = IcaaAssessment | IsaAssessment;

// ----------------------------------------------------------------------------
// Aggregation / KPI shapes — what the query layer returns.

export interface KpiTile {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  dir?: "up" | "down" | "flat";
  note?: string;
  spark: number[];
  color?: string;
}

export interface MonthlyPoint {
  month: string;          // "2026-03"
  label: string;          // "Mar"
  value: number;
}

export interface BreakdownSegment {
  label: string;
  value: number;
  color: string;
}

export interface AgeBucket {
  label: string;
  count: number;
}

export interface WatchlistItem {
  id: string;
  application: string;
  reviewer: string | null;        // reviewer code, e.g. "MR"
  reviewerName: string | null;    // full name where known, e.g. "Mira Reyes"; null if unassigned
  status: string;
  pillVariant: PillVariant;
  meta: string;                   // free-form right-side text (e.g. "+3d overdue")
  href?: string;
}

export type PillVariant = "ok" | "warn" | "bad" | "info" | "neutral";

export interface ReviewerLoad {
  code: string;
  name: string;
  role: string;
  active: number;
  closed30d: number;
  avgSbdHours: number;
  slaPct: number;
  load: number;           // % of nominal capacity
}

export interface OrgRow {
  org: string;
  total: number;
  inFlight: number;
  overdue: number;
}

export interface FunnelStep {
  label: string;
  value: number;
}
