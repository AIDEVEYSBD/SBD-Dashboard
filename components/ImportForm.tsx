"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ImportResult, KindStats, SheetReport } from "@/lib/import";

const UPLOAD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
    <path d="M12 16V4m0 0-4 4m4-4 4 4" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

const FILE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
    <path d="M14 3v5a1 1 0 0 0 1 1h5" />
    <path d="M5 3h9l6 6v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
  </svg>
);

function UploadZone({
  label,
  description,
  file,
  onChange,
}: {
  label: string;
  description: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <label
      className={`upload-zone${file ? " has-file" : ""}`}
      onClick={(e) => {
        // Forward label clicks to the hidden input.
        e.preventDefault();
        inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <div className="upload-zone-icon">{file ? FILE_ICON : UPLOAD_ICON}</div>
      <div className="upload-zone-meta">
        <div className="upload-zone-label">{label}</div>
        <div className="upload-zone-sub">
          {file ? file.name : description}
        </div>
        {file && (
          <button
            type="button"
            className="upload-zone-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Remove
          </button>
        )}
      </div>
    </label>
  );
}

function StatCell({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "bad" | "muted" }) {
  return (
    <div className="import-stat">
      <span className="eyebrow">{label}</span>
      <span className={`import-stat-value tone-${tone ?? "default"} tnum`}>{value.toLocaleString()}</span>
    </div>
  );
}

function KindResult({ title, stats, total }: { title: string; stats: KindStats; total: number }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-sub">Total now: <span className="mono">{total.toLocaleString()}</span></p>
        </div>
      </div>
      <div className="card-body">
        <div className="grid-4">
          <StatCell label="Added" value={stats.added} tone="ok" />
          <StatCell label="Updated" value={stats.updated} tone="muted" />
          <StatCell label="Skipped (existed)" value={stats.skippedExisting} tone="muted" />
          <StatCell label="Skipped (invalid)" value={stats.skippedInvalid} tone={stats.skippedInvalid > 0 ? "bad" : "muted"} />
        </div>
      </div>
    </section>
  );
}

function SheetTable({ sheets }: { sheets: SheetReport[] }) {
  if (sheets.length === 0) return null;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>File</th>
          <th>Sheet</th>
          <th>Kind</th>
          <th style={{ textAlign: "right" }}>Parsed</th>
          <th style={{ textAlign: "right" }}>Skipped</th>
          <th style={{ textAlign: "right" }}>Fuzzy matches</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {sheets.map((s, i) => (
          <tr key={i}>
            <td className="num">{s.file}</td>
            <td>{s.sheet}</td>
            <td>{s.kind ?? <span className="muted">—</span>}</td>
            <td className="num" style={{ textAlign: "right" }}>{s.rowsParsed.toLocaleString()}</td>
            <td className="num" style={{ textAlign: "right", color: s.rowsSkipped > 0 ? "var(--bad)" : "var(--ink-3)" }}>{s.rowsSkipped.toLocaleString()}</td>
            <td className="num" style={{ textAlign: "right", color: s.fuzzyMatches.length > 0 ? "var(--warn)" : "var(--ink-3)" }}>{s.fuzzyMatches.length}</td>
            <td className="muted" style={{ fontSize: 12 }}>
              {s.missingRequired.length > 0 && (
                <span style={{ color: "var(--bad)" }}>missing: {s.missingRequired.slice(0, 3).join(", ")}{s.missingRequired.length > 3 ? "…" : ""}</span>
              )}
              {s.missingRequired.length > 0 && s.unrecognized.length > 0 && " · "}
              {s.unrecognized.length > 0 && (
                <span>{s.unrecognized.length} unrecognized column{s.unrecognized.length === 1 ? "" : "s"}</span>
              )}
              {s.missingRequired.length === 0 && s.unrecognized.length === 0 && s.fuzzyMatches.length === 0 && "clean"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ImportForm() {
  const router = useRouter();
  const [icaaFile, setIcaaFile] = useState<File | null>(null);
  const [isaFile, setIsaFile] = useState<File | null>(null);
  const [skipExisting, setSkipExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit() {
    if (!icaaFile && !isaFile) {
      setError("Choose at least one file.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    if (icaaFile) fd.append("icaa", icaaFile);
    if (isaFile) fd.append("isa", isaFile);
    fd.append("skipExisting", String(skipExisting));

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Import failed (${res.status})`);
      }
      setResult(data as ImportResult);
      // Refresh server components so the rest of the dashboard reflects the new data.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Upload Excel exports</h3>
            <p className="card-sub">
              Drop the latest ICAA and/or ISA workbook. Column matching is case-insensitive
              and tolerates minor typos (Geography↔Geograpy, Finalised↔Finalized, etc.). Existing IDs are
              overwritten by default.
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="grid-2" style={{ marginBottom: "var(--s-5)" }}>
            <UploadZone
              label="ICAA workbook"
              description="Drop the ICAA export — .xlsx"
              file={icaaFile}
              onChange={setIcaaFile}
            />
            <UploadZone
              label="ISA workbook"
              description="Drop the ISA export — .xlsx"
              file={isaFile}
              onChange={setIsaFile}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s-4)", flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              Skip rows whose ID already exists (don't overwrite)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(icaaFile || isaFile) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setIcaaFile(null); setIsaFile(null); setError(null); setResult(null); }}
                  disabled={busy}
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={busy || (!icaaFile && !isaFile)}
              >
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: "var(--s-4)", padding: "var(--s-3) var(--s-4)", border: "1px solid var(--bad)", borderRadius: "var(--r-sm)", background: "var(--bad-bg)", color: "var(--bad)", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>
      </section>

      {result && (
        <>
          <div className="grid-2">
            <KindResult title="ICAA" stats={result.icaa} total={result.totals.icaa} />
            <KindResult title="ISA" stats={result.isa} total={result.totals.isa} />
          </div>

          <section className="card card-tight">
            <div className="card-header">
              <div>
                <h3 className="card-title">Sheet-by-sheet report</h3>
                <p className="card-sub">Per-sheet detail: how many rows came in, what got skipped, and any column-name fuzziness.</p>
              </div>
            </div>
            <SheetTable sheets={result.sheets} />
          </section>

          {result.warnings.length > 0 && (
            <section className="card">
              <div className="card-header">
                <h3 className="card-title">Warnings</h3>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--ink-2)" }}>
                {result.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </section>
          )}

          {result.sheets.some((s) => s.fuzzyMatches.length > 0) && (
            <section className="card card-tight">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Fuzzy column matches</h3>
                  <p className="card-sub">Headers that didn't match exactly but were close enough — accepted with edit distance ≤ 2.</p>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Sheet</th>
                    <th>Excel header</th>
                    <th>Matched to</th>
                    <th style={{ textAlign: "right" }}>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sheets.flatMap((s) =>
                    s.fuzzyMatches.map((m, j) => (
                      <tr key={`${s.sheet}-${j}`}>
                        <td className="muted">{s.sheet}</td>
                        <td className="num">{m.header}</td>
                        <td>{m.canonical}</td>
                        <td className="num" style={{ textAlign: "right" }}>{m.distance}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </>
  );
}
