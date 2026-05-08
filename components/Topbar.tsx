import type { ReactNode } from "react";

const ICON = {
  search: (
    <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx={7} cy={7} r={4.5} />
      <path d="m13 13-2.5-2.5" />
    </svg>
  ),
  download: (
    <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path d="M8 3v8m0 0 3-3m-3 3-3-3M3 13h10" />
    </svg>
  ),
};

export function Topbar({ section, children }: { section: string; children?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Workspace</span>
        <span className="crumbs-sep">/</span>
        <strong>{section}</strong>
      </div>
      <div className="topbar-tools">
        <div className="search">
          {ICON.search}
          <input placeholder="Search assessments, applications, reviewers…" />
          <span className="kbd">⌘K</span>
        </div>
        <button className="btn btn-sm">{ICON.download}Export</button>
        {children}
      </div>
    </div>
  );
}
