"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTweaks } from "./TweaksContext";

const NAV: { group: string; items: { name: string; href: string; count?: string }[] }[] = [
  {
    group: "Overview",
    items: [
      { name: "Dashboard", href: "/" },
      { name: "ICAA", href: "/icaa" },
      { name: "ISA", href: "/isa" },
      { name: "Conversion", href: "/conversion" },
    ],
  },
  {
    group: "Operations",
    items: [
      { name: "Aging & SLA", href: "/aging" },
      { name: "People", href: "/people" },
      { name: "Risk", href: "/risk" },
    ],
  },
  {
    group: "Data",
    items: [
      { name: "Import", href: "/import" },
    ],
  },
];

const SUN = (
  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
    <circle cx={8} cy={8} r={3} />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
  </svg>
);

const MOON = (
  <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />
  </svg>
);

export function Sidebar() {
  const path = usePathname();
  const { theme, setTheme } = useTweaks();

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-mark">S</div>
        <div className="brand-name">SBD <em>Metrics</em></div>
      </Link>
      {NAV.map((g) => (
        <div className="nav-group" key={g.group}>
          <div className="nav-label">{g.group}</div>
          {g.items.map((it) => {
            const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
            return (
              <Link key={it.name} href={it.href} className={`nav-item${active ? " active" : ""}`}>
                <span>{it.name}</span>
                {it.count && <span className="nav-count">{it.count}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="theme-toggle" role="group" aria-label="Theme">
        <button
          className={theme === "light" ? "on" : ""}
          onClick={() => setTheme("light")}
          aria-pressed={theme === "light"}
          aria-label="Light mode"
        >
          {SUN} Light
        </button>
        <button
          className={theme === "dark" ? "on" : ""}
          onClick={() => setTheme("dark")}
          aria-pressed={theme === "dark"}
          aria-label="Dark mode"
        >
          {MOON} Dark
        </button>
      </div>
    </aside>
  );
}
