import type { Person } from "./types";

// Static analyst roster. Reviewer codes referenced from Reviewer(s) on each
// assessment record map back to one of these entries.
export const PEOPLE: Person[] = [
  { code: "MR", name: "Mira Reyes", role: "Lead" },
  { code: "KC", name: "Kenji Chen", role: "Senior" },
  { code: "JT", name: "Jordan Tate", role: "Senior" },
  { code: "AP", name: "Aanya Pillai", role: "Analyst" },
  { code: "DS", name: "Dre Solomon", role: "Analyst" },
  { code: "LH", name: "Lina Haddad", role: "Senior" },
  { code: "RV", name: "Rafael Vega", role: "Analyst" },
  { code: "BO", name: "Bea Ojo", role: "Analyst" },
  { code: "TN", name: "Theo Nakamura", role: "Senior" },
  { code: "EM", name: "Eva Mendel", role: "Analyst" },
  { code: "PG", name: "Priya Ghosh", role: "Lead" },
  { code: "QF", name: "Quinn Forbes", role: "Analyst" },
];
