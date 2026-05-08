import type { ReactNode } from "react";
import type { PillVariant } from "@/lib/types";

export function Pill({ variant, children }: { variant: PillVariant; children: ReactNode }) {
  return (
    <span className={`pill pill-${variant}`}>
      <span className="dot" />
      {children}
    </span>
  );
}
