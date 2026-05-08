// Fixed reference "now" for the dashboard. The runtime context anchors today
// to 2026-05-07; trends and aging are computed against this value so the
// seeded JSON renders consistently regardless of when the dashboard is run.
//
// When wiring to a live data source, swap this for `new Date()` or for the
// query's effective time.
export const NOW = new Date("2026-05-07T12:00:00Z");
