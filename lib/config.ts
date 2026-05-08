// Per-install config — stored alongside the dataset in data/config.json.
// First-boot onboarding writes the analyst's name here; the greeting reads it
// to personalize the dashboard.
//
// data/ is gitignored, so each developer / installer gets their own config.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const CONFIG_PATH = resolve(process.cwd(), "data", "config.json");

export interface AppConfig {
  name?: string;
  role?: string;
  createdAt?: string;
}

export function readConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    const text = readFileSync(CONFIG_PATH, "utf8").trim();
    if (text.length === 0) return {};
    return JSON.parse(text) as AppConfig;
  } catch {
    return {};
  }
}

export function writeConfig(next: AppConfig): AppConfig {
  const current = readConfig();
  const merged: AppConfig = {
    ...current,
    ...next,
    createdAt: current.createdAt ?? new Date().toISOString(),
  };
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n");
  return merged;
}
