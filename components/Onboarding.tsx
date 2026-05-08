"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function Onboarding() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  // Probe config on first mount; show modal only if no name has been saved yet.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg: { name?: string }) => {
        if (cancelled) return;
        if (!cfg.name) setOpen(true);
        setChecked(true);
      })
      .catch(() => setChecked(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-focus the input once the modal mounts.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (!checked || !open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role: role.trim() || undefined }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <form className="onboarding-card" onSubmit={submit}>
        <span className="eyebrow">Welcome</span>
        <h2 id="onb-title" className="onboarding-title">
          Let's set you <em>up</em>
        </h2>
        <p className="onboarding-sub">
          Tell SBD Metrics your name. It'll personalize the greeting and live in
          your local <span className="mono">data/config.json</span> — nothing leaves this machine.
        </p>

        <label className="onboarding-field">
          <span className="onboarding-field-label">Your name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mira Reyes"
            autoComplete="name"
            required
          />
        </label>

        <label className="onboarding-field">
          <span className="onboarding-field-label">Role <span style={{ color: "var(--ink-4)", fontWeight: 400 }}>(optional)</span></span>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. GRC Analyst, Lead"
          />
        </label>

        <div className="onboarding-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Get started"}
          </button>
        </div>
      </form>
    </div>
  );
}
