"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type ChartStyle = "line" | "area" | "bar";

interface TweaksValue {
  theme: Theme;
  chartStyle: ChartStyle;
  setTheme: (t: Theme) => void;
  setChartStyle: (c: ChartStyle) => void;
  toggleTheme: () => void;
}

const Ctx = createContext<TweaksValue | null>(null);

const KEY = "sbd-tweaks";

export function TweaksProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [chartStyle, setChartStyleState] = useState<ChartStyle>("area");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) as Partial<TweaksValue>;
        if (v.theme === "light" || v.theme === "dark") setThemeState(v.theme);
        if (v.chartStyle === "line" || v.chartStyle === "area" || v.chartStyle === "bar") setChartStyleState(v.chartStyle);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme, chartStyle }));
    } catch {}
  }, [theme, chartStyle]);

  return (
    <Ctx.Provider
      value={{
        theme,
        chartStyle,
        setTheme: setThemeState,
        setChartStyle: setChartStyleState,
        toggleTheme: () => setThemeState((t) => (t === "light" ? "dark" : "light")),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTweaks(): TweaksValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTweaks must be used inside TweaksProvider");
  return v;
}
