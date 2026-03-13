// src/app/admin/import/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type ImportResult =
  | {
      ok: true;
      slug: string;
      fileName: string;
      relPath: string;
      absPath?: string;
      mdxBefore?: string;
      mdxAfter?: string;
      log?: string;
    }
  | {
      ok: false;
      error: string;
      log?: string;
      mdxBefore?: string;
      mdxAfter?: string;
    };

type HeroUploadResult =
  | { ok: true; slug: string; imagePublicPath: string; recipeRelPath: string }
  | { ok: false; error: string };

type PipelineResult =
  | {
      ok: true;
      log?: string;
      mode?: string;
      slug?: string;
      importUrl?: string;
    }
  | {
      ok: false;
      error: string;
      log?: string;
    };

export default function AdminImportPage() {
  const [url, setUrl] = useState("");
  const [rewrite, setRewrite] = useState(true);
  const [adminToken, setAdminToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [log, setLog] = useState<string>("Waiting…");
  const [result, setResult] = useState<ImportResult | null>(null);

  // HERO UPLOAD
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroMsg, setHeroMsg] = useState<string | null>(null);

  // PIPELINE
  const [pipelineMode, setPipelineMode] = useState<
    "latest" | "slug" | "all" | "import-url"
  >("latest");
  const [pipelineSlug, setPipelineSlug] = useState("");
  const [pipelineUrl, setPipelineUrl] = useState("");

  const [skipRewrite, setSkipRewrite] = useState(false);
  const [skipQuantities, setSkipQuantities] = useState(false);
  const [skipStructure, setSkipStructure] = useState(false);
  const [skipImages, setSkipImages] = useState(false);
  const [skipPrompts, setSkipPrompts] = useState(false);

  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string>("Waiting…");

  const canSubmit = useMemo(() => {
    return url.trim().length > 0 && adminToken.trim().length > 0 && !loading;
  }, [url, adminToken, loading]);

  const canRunPipeline = useMemo(() => {
    if (!adminToken.trim() || pipelineBusy) return false;
    if (pipelineMode === "slug" && !pipelineSlug.trim()) return false;
    if (pipelineMode === "import-url" && !pipelineUrl.trim()) return false;
    return true;
  }, [adminToken, pipelineBusy, pipelineMode, pipelineSlug, pipelineUrl]);

  useEffect(() => {
    const saved = localStorage.getItem("vm_admin_token");
    if (saved) setAdminToken(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("vm_admin_token", adminToken);
  }, [adminToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const u = url.trim();
    const t = adminToken.trim();

    setLoading(true);
    setStatus("idle");
    setErrorMsg(null);
    setResult(null);
    setHeroMsg(null);
    setLog(`Running import...\nURL: ${u}\nRewrite: ${rewrite ? "Yes" : "No"}\n`);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": t,
        },
        body: JSON.stringify({ url: u, rewrite }),
      });

      const data = (await res.json().catch(() => null)) as ImportResult | null;

      if (!res.ok) {
        const msg = (data as any)?.error || `Request failed (${res.status})`;
        setStatus("error");
        setErrorMsg(msg);
        setResult(data);
        setLog((data as any)?.log ?? `Error: ${msg}`);
        return;
      }

      if (!data) {
        setStatus("error");
        setErrorMsg("No JSON response from server.");
        setLog("No JSON response from server.");
        return;
      }

      if (data.ok) {
        setStatus("ok");
        setResult(data);
        setLog(data.log ?? "✅ Done.");
      } else {
        setStatus("error");
        setResult(data);
        setErrorMsg(data.error || "Import failed.");
        setLog(data.log ?? `Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message ?? "Network error");
      setLog(String(err?.stack ?? err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  async function uploadHero() {
    const t = adminToken.trim();
    const slug = (result as any)?.ok ? (result as any).slug : null;

    if (!t) return setHeroMsg("Missing admin token.");
    if (!slug) return setHeroMsg("Import a recipe first (need the slug).");
    if (!heroFile) return setHeroMsg("Choose an image file first.");

    setHeroBusy(true);
    setHeroMsg(null);

    try {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("file", heroFile);

      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: {
          "x-admin-token": t,
        },
        body: fd,
      });

      const data = (await res.json().catch(() => null)) as HeroUploadResult | null;

      if (!res.ok) {
        const msg = (data as any)?.error || `Upload failed (${res.status})`;
        setHeroMsg(msg);
        return;
      }

      if (!data || !(data as any).ok) {
        setHeroMsg((data as any)?.error ?? "Upload failed.");
        return;
      }

      setHeroMsg(`✅ Saved hero image: ${(data as any).imagePublicPath}`);
    } catch (e: any) {
      setHeroMsg(e?.message ?? "Upload failed.");
    } finally {
      setHeroBusy(false);
    }
  }

  async function runPipeline(e: React.FormEvent) {
    e.preventDefault();

    const t = adminToken.trim();

    setPipelineBusy(true);
    setPipelineError(null);
    setPipelineLog("Running pipeline...");

    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": t,
        },
        body: JSON.stringify({
          mode: pipelineMode,
          slug: pipelineSlug.trim(),
          importUrl: pipelineUrl.trim(),
          skipRewrite,
          skipQuantities,
          skipStructure,
          skipImages,
          skipPrompts,
        }),
      });

      const data = (await res.json().catch(() => null)) as PipelineResult | null;

      if (!res.ok || !data?.ok) {
        setPipelineError(data?.error || `Pipeline failed (${res.status})`);
        setPipelineLog(data?.log || "No log returned.");
        return;
      }

      setPipelineLog(data.log || "✅ Pipeline complete.");
    } catch (err: any) {
      setPipelineError(err?.message || "Pipeline request failed");
      setPipelineLog(String(err?.stack ?? err?.message ?? err));
    } finally {
      setPipelineBusy(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const importedSlug = (result as any)?.ok ? (result as any).slug : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-extrabold text-[var(--brand-gold)]">
        Admin • Import Recipe
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--text-soft)]">
        Paste a recipe URL, import it into <code>content/recipes</code>, and optionally run an AI rewrite.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm space-y-6"
      >
        <div>
          <label className="block text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
            Admin token
          </label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Paste ADMIN_TOKEN here (matches .env.local)"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40"
          />
          <p className="mt-2 text-xs text-[var(--text-soft)]/80">
            Must match <code>ADMIN_TOKEN</code> in <code>.env.local</code>. (Saved in your browser.)
          </p>
        </div>

        <div>
          <label className="block text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
            Recipe URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
          <input
            type="checkbox"
            checked={rewrite}
            onChange={(e) => setRewrite(e.target.checked)}
            className="h-5 w-5 accent-[var(--brand-red)]"
          />
          Run AI rewrite after import (OpenAI)
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-red)] px-7 py-3 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import Recipe"}
          </button>

          {status === "ok" && (
            <div className="text-sm font-bold text-green-400">✅ Imported</div>
          )}
          {status === "error" && (
            <div className="text-sm font-bold text-red-400">❌ {errorMsg ?? "Error"}</div>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
            Log
          </div>
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-black/40 p-4 text-xs text-white/80">
            {log}
          </pre>
        </div>

        {result && (result as any).ok && (
          <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-5 space-y-5">
            <div>
              <div className="text-sm font-extrabold text-[var(--brand-gold)]">Saved</div>
              <div className="mt-2 text-sm text-[var(--text-soft)]">
                <div>
                  <span className="text-white/60">File:</span> {(result as any).relPath}
                </div>
                <div className="mt-1">
                  <span className="text-white/60">Slug:</span> {(result as any).slug}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => copy((result as any).relPath)}
                  className="rounded-xl border border-[var(--border)] bg-black/30 px-4 py-2 text-sm font-bold text-[var(--brand-gold)] hover:bg-black/40"
                >
                  Copy path
                </button>
                <button
                  type="button"
                  onClick={() => copy((result as any).slug)}
                  className="rounded-xl border border-[var(--border)] bg-black/30 px-4 py-2 text-sm font-bold text-[var(--brand-gold)] hover:bg-black/40"
                >
                  Copy slug
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-5">
              <div className="text-sm font-extrabold text-[var(--brand-gold)]">
                Hero image (manual)
              </div>
              <p className="mt-2 text-xs text-[var(--text-soft)]/80">
                Generate your image in Recraft, download it, then upload here.
                This will save it to <code>public/recipes</code> and inject{" "}
                <code>image: "/recipes/{importedSlug}.png"</code> into the MDX frontmatter.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-white/80"
                />
                <button
                  type="button"
                  onClick={uploadHero}
                  disabled={!adminToken.trim() || !importedSlug || !heroFile || heroBusy}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-black/30 px-5 py-2.5 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/40 disabled:opacity-50"
                >
                  {heroBusy ? "Uploading…" : "Upload hero image"}
                </button>
              </div>

              {heroMsg ? (
                <div className="mt-3 text-sm text-[var(--text-soft)]">{heroMsg}</div>
              ) : null}
            </div>
          </div>
        )}
      </form>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">
          Recipe Pipeline
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--text-soft)]">
          Run your full recipe pipeline from one place: AI rewrite, ingredient quantities, structure cleanup, image fixing, and Midjourney prompt generation.
        </p>

        <form onSubmit={runPipeline} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
              Pipeline mode
            </label>
            <select
              value={pipelineMode}
              onChange={(e) =>
                setPipelineMode(
                  e.target.value as "latest" | "slug" | "all" | "import-url"
                )
              }
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white"
            >
              <option value="latest">Latest recipe</option>
              <option value="slug">Single recipe by slug</option>
              <option value="all">All recipes</option>
              <option value="import-url">Import URL and process</option>
            </select>
          </div>

          {pipelineMode === "slug" && (
            <div>
              <label className="block text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
                Recipe slug
              </label>
              <input
                value={pipelineSlug}
                onChange={(e) => setPipelineSlug(e.target.value)}
                placeholder="bombay-aloo"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40"
              />
            </div>
          )}

          {pipelineMode === "import-url" && (
            <div>
              <label className="block text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
                Import URL
              </label>
              <input
                value={pipelineUrl}
                onChange={(e) => setPipelineUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
              <input
                type="checkbox"
                checked={skipRewrite}
                onChange={(e) => setSkipRewrite(e.target.checked)}
                className="h-5 w-5 accent-[var(--brand-red)]"
              />
              Skip AI rewrite
            </label>

            <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
              <input
                type="checkbox"
                checked={skipQuantities}
                onChange={(e) => setSkipQuantities(e.target.checked)}
                className="h-5 w-5 accent-[var(--brand-red)]"
              />
              Skip ingredient quantities
            </label>

            <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
              <input
                type="checkbox"
                checked={skipStructure}
                onChange={(e) => setSkipStructure(e.target.checked)}
                className="h-5 w-5 accent-[var(--brand-red)]"
              />
              Skip structure cleanup
            </label>

            <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
              <input
                type="checkbox"
                checked={skipImages}
                onChange={(e) => setSkipImages(e.target.checked)}
                className="h-5 w-5 accent-[var(--brand-red)]"
              />
              Skip image fixing
            </label>

            <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
              <input
                type="checkbox"
                checked={skipPrompts}
                onChange={(e) => setSkipPrompts(e.target.checked)}
                className="h-5 w-5 accent-[var(--brand-red)]"
              />
              Skip Midjourney prompts
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              disabled={!canRunPipeline}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-red)] px-7 py-3 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
            >
              {pipelineBusy ? "Running pipeline…" : "Run Pipeline"}
            </button>

            {pipelineError && (
              <div className="text-sm font-bold text-red-400">❌ {pipelineError}</div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
              Pipeline log
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-black/40 p-4 text-xs text-white/80">
              {pipelineLog}
            </pre>
          </div>
        </form>
      </section>
    </main>
  );
}