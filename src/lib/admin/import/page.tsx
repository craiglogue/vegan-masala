// src/app/admin/import/page.tsx
"use client";

import { useMemo, useState } from "react";

type RecipeMeta = {
  filePath: string;
  fileName: string;
  slug: string;
  title: string;
  description?: string;
};

export default function AdminImportPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"idle" | "importing" | "rewriting">("idle");
  const [meta, setMeta] = useState<RecipeMeta | null>(null);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Local only; on Vercel we block unless you explicitly enable ADMIN_TOKEN.
  const adminToken = useMemo(() => "", []);

  async function doImport() {
    setError("");
    setLog("");
    setMeta(null);
    setBusy("importing");

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Import failed");
        setLog(data?.details || "");
        return;
      }

      setMeta(data.meta);
      setLog(data.log || "");
    } catch (e: any) {
      setError(e?.message || "Import failed");
    } finally {
      setBusy("idle");
    }
  }

  async function doRewriteLatest() {
    setError("");
    setLog("");
    setBusy("rewriting");

    try {
      const res = await fetch("/api/admin/rewrite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({ mode: "latest" }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Rewrite failed");
        setLog(data?.details || "");
        return;
      }

      setMeta(data.meta);
      setLog(data.log || "");
    } catch (e: any) {
      setError(e?.message || "Rewrite failed");
    } finally {
      setBusy("idle");
    }
  }

  async function doRewriteThis() {
    if (!meta?.filePath) return;
    setError("");
    setLog("");
    setBusy("rewriting");

    try {
      const res = await fetch("/api/admin/rewrite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({ mode: "file", filePath: meta.filePath }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Rewrite failed");
        setLog(data?.details || "");
        return;
      }

      setMeta(data.meta);
      setLog(data.log || "");
    } catch (e: any) {
      setError(e?.message || "Rewrite failed");
    } finally {
      setBusy("idle");
    }
  }

  const disabled = busy !== "idle";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-extrabold text-[var(--brand-gold)]">
        Admin • Import a recipe
      </h1>
      <p className="mt-2 text-[var(--text-soft)]">
        Paste a recipe URL → import MDX → (optionally) AI rewrite into Vegan Masala style.
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <label className="block text-sm font-bold text-[var(--brand-gold)]">
          Recipe URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/recipe"
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/25 px-4 py-3 text-sm"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={doImport}
            disabled={disabled || !url.trim()}
            className="rounded-xl bg-[var(--brand-red)] px-5 py-3 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy === "importing" ? "Importing…" : "Import recipe"}
          </button>

          <button
            onClick={doRewriteLatest}
            disabled={disabled}
            className="rounded-xl border border-[var(--border)] bg-black/15 px-5 py-3 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/25 disabled:opacity-40"
          >
            {busy === "rewriting" ? "Rewriting…" : "Rewrite latest"}
          </button>

          {meta?.filePath ? (
            <button
              onClick={doRewriteThis}
              disabled={disabled}
              className="rounded-xl border border-[var(--border)] bg-black/15 px-5 py-3 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/25 disabled:opacity-40"
            >
              Rewrite this file
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="font-bold">Error</div>
            <div className="mt-1 whitespace-pre-wrap">{error}</div>
          </div>
        ) : null}

        {meta ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/10 p-4">
            <div className="text-sm text-[var(--text-soft)]">Created/Updated</div>
            <div className="mt-1 text-lg font-extrabold text-[var(--brand-gold)]">
              {meta.title}
            </div>
            <div className="mt-2 text-sm text-[var(--text-soft)]">
              <span className="font-bold">Slug:</span> {meta.slug}
              <br />
              <span className="font-bold">File:</span> {meta.fileName}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`/recipes/${meta.slug}`}
                className="inline-flex rounded-xl bg-[var(--brand-red)] px-5 py-3 text-sm font-extrabold text-white hover:opacity-90"
              >
                Open recipe page
              </a>

              <a
                href="/recipes"
                className="inline-flex rounded-xl border border-[var(--border)] bg-black/15 px-5 py-3 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/25"
              >
                Back to recipes
              </a>
            </div>
          </div>
        ) : null}

        {log ? (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-bold text-[var(--brand-gold)]">
              Show log
            </summary>
            <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-[var(--border)] bg-black/40 p-4 text-xs text-[var(--text-soft)] whitespace-pre-wrap">
              {log}
            </pre>
          </details>
        ) : null}
      </div>

      <div className="mt-8 text-xs text-[var(--text-soft)]/80">
        Tip: this page is for local use. The API routes are blocked on Vercel by default.
      </div>
    </main>
  );
}