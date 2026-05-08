"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const RISKS = ["Any", "Low", "Medium", "High", "Critical"] as const;
type View = "any" | "in-flight" | "overdue";
const VIEWS: { key: View; label: string }[] = [
  { key: "in-flight", label: "In flight" },
  { key: "overdue", label: "Overdue" },
  { key: "any", label: "All" },
];

export function KindFilters({ currentView = "in-flight", currentRisk = "Any", currentSearch = "" }: { currentView?: View; currentRisk?: string; currentSearch?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (next: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(params);
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      sp.delete("page");
      const qs = sp.toString();
      router.push(qs ? `${path}?${qs}` : path);
    },
    [params, path, router],
  );

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className="eyebrow" style={{ marginRight: 4 }}>Filter</span>
      {VIEWS.map((v) => (
        <button
          key={v.key}
          className={`chip${currentView === v.key ? " chip-active" : ""}`}
          onClick={() => update({ view: v.key === "in-flight" ? undefined : v.key })}
        >
          {v.label}
        </button>
      ))}
      <span style={{ width: 8 }} />
      {RISKS.map((r) => (
        <button
          key={r}
          className={`chip${currentRisk === r ? " chip-active" : ""}`}
          onClick={() => update({ risk: r === "Any" ? undefined : r })}
        >
          {r === "Any" ? "Risk: any" : r}
        </button>
      ))}
      <span style={{ flex: 1 }} />
      <div className="search" style={{ minWidth: 240 }}>
        <input
          defaultValue={currentSearch}
          placeholder="ID or application…"
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value || undefined });
          }}
        />
      </div>
    </div>
  );
}
