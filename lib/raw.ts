// Raw record types matching the source-system column names exactly.
// Typos are preserved verbatim ("Reuqesters", "Hors/Days", "Geograpy", "Feild",
// "Finalised" vs "Finalized") so this layer mirrors what the live export looks
// like. The map functions in lib/data.ts translate these into the typed domain
// shape used by the query layer.
//
// Conventions:
//   - Dates are ISO-8601 strings, or null when not yet set.
//   - Hours/Days fields are stored as decimal HOURS regardless of magnitude.
//   - Multi-value fields ("Reviewer(s)", "Requester(s)") are semicolon-joined.
//   - Yes/No fields are the literal strings "Yes" or "No".
//   - Boolean flags ("Manual Asset", etc.) are real booleans.

export interface RawIcaa {
  "Form Name": string;
  "ID": string;
  "Inherent Risk": number;
  "Inherent Risk Rating": "Low" | "Medium" | "High" | "Critical";
  "Application/IT Service Name": string;
  "Reviewer(s)": string;            // analyst code (e.g. "MR") or "" if unassigned
  "Requester(s)": string;           // semicolon-joined names
  "Assessment Status": string;
  "Date Sent": string;              // ISO
  "Service Owner": string;
  "Date Due": string;               // ISO
  "Business Owner": string;
  "Overdue By": number;             // days, 0 if not overdue
  "Inherent Risk Categorization": "Low" | "Medium" | "High" | "Critical";
  "Questionaire Completed": boolean;
  "Date Finalized": string | null;
  "Manual Asset": boolean;
  "Service VP Org": string;
  "Service Director Org": string;
  "Service Director": string;
  "Service VP": string;
  "Hours/Days for SBD to Review": number;
  "Hours/Days for Reuqesters to Submit": number;
  "Hours/Days with Requester (Information Requested)": number;
  "Hors/Days with Business Owner": number;
  "Hours/Days to Fully Complete ICAA/Days": number;
  "Days Overdue": number;
  "Rejected in Last Six Months": boolean;
  "Month Rejected": string | null;  // "YYYY-MM"
  "Days Unassigned (No Reviewer)": number;
  "Geograpy (ICAA)": "Americas" | "EMEA" | "APAC" | "LATAM" | "Global";
  "Cyber Approval Date": string | null;
  "Potential KFAS": boolean;
  "Information Classification":
    | "Public" | "Internal" | "Confidential" | "Highly Confidential" | "Restricted";
  "Service Criticality": "Low" | "Medium" | "High" | "Mission Critical";
  "Service Support Type": "Internal" | "Vendor" | "Hybrid";
  "Original Requestor Name": string;
  "Go Live Date": string | null;
  "New Priority System": boolean;
  "Hosting Type New": "On-prem" | "Private Cloud" | "Public Cloud" | "SaaS" | "Hybrid";
  "Date Withdrawn": string | null;
  "ISA Status Text Feild": string | null;
  "ISA Status": string | null;
  "Date Reviewer Assigned": string | null;
  "SYS ID": string;
  "Q1 Response": "Yes" | "No";
  "Q14 Response": "Yes" | "No";
  "Q14.1 Response": string | null;
  "Q 5 Response": "Yes" | "No";
  "Q 16 Response": "Yes" | "No";
  "Q 16.1 Response": string | null;
  "Is this service related to ABs (Q17)": "Yes" | "No";
  "ABs (Q17.1)": string | null;
  "ABs (Q17.2)": string | null;
  "ABs (Q17.3)": string | null;
  "ABs (Q18)": "Yes" | "No";       // AI involvement flag
  "ABs(18.1)": string | null;       // AI detail (note: no space before paren)
}

export interface RawIsa {
  "Form Name": string;
  "ID": string;
  "Application/IT Service Name": string;
  "Reviewer(s)": string;
  "Information Classification":
    | "Public" | "Internal" | "Confidential" | "Highly Confidential" | "Restricted";
  "Residual Risk": "Low" | "Medium" | "High" | "Critical";
  "Inherent Risk Categorization": "Low" | "Medium" | "High" | "Critical";
  "Unilever Baseline Compliance (Target Risk)": number;  // 0-100 %
  "Manual Asset": boolean;
  "ISA Level": "L1" | "L2" | "L3";
  "Service VP Org": string;
  "Service Director Org": string;
  "Date Completed": string | null;
  "Date Finalised": string | null;        // British spelling, per spec
  "Hours/Days for Requestor to Submit": number;
  "Hours/Days for SBD to Review": number;
  "Hours/Days with Requestor (Information Requested)": number;
  "Hours/Days with Service Owner": number;
  "Hours/Days to Fully Complete ISA": number;
  "Days Overdue": number;
  "Rejected in Last Six Months": boolean;
  "Month Rejected": string | null;
  "Days Unassigned (No Reviewer)": number;
  "Cyber Approval Date": string | null;
  "Service Support Type": "Internal" | "Vendor" | "Hybrid";
  "Service Criticality": "Low" | "Medium" | "High" | "Mission Critical";
  "Date Reviewer Assigned": string | null;
  "Date Withdrawn": string | null;
  "ISA ID": string;
  "Assessment Status": string;
  "Date Sent": string;
  "Date Due": string;
  "Service Owner": string;
  "Business Owner": string;
  "Service VP": string;
  "Service Director": string;
  "Hosting Type": "On-prem" | "Private Cloud" | "Public Cloud" | "SaaS" | "Hybrid";
  "Current Design Score": number;
  "Initial Design Score": number;
  "Requestor(s)": string;
  "Next Assessment Date": string | null;
  "Overdue By": number;
  "Priority System?": boolean;
  "SYS ID": string;
  "ISA 55 MFA": "Yes" | "No" | "N/A";
  "Parent ICAA ID"?: string;             // extension: link back to source ICAA
}

export interface RawDataset {
  icaa: RawIcaa[];
  isa: RawIsa[];
}
