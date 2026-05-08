"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function Pagination({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const path = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const linkFor = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--s-3) var(--s-5)", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-3)" }}>
      <span className="mono">{total === 0 ? "0 results" : `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Link className={`btn btn-sm${page <= 1 ? " btn-ghost" : ""}`} href={linkFor(Math.max(1, page - 1))} aria-disabled={page <= 1}>
          ← Prev
        </Link>
        <span className="mono" style={{ minWidth: 60, textAlign: "center" }}>{page} / {pages}</span>
        <Link className={`btn btn-sm${page >= pages ? " btn-ghost" : ""}`} href={linkFor(Math.min(pages, page + 1))} aria-disabled={page >= pages}>
          Next →
        </Link>
      </div>
    </div>
  );
}
