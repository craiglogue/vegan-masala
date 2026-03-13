"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminPipelinePage() {
  const [adminToken, setAdminToken] = useState("");
  const [mode, setMode] = useState<"latest" | "slug" | "all" | "import-url">("latest");
  const [slug, setSlug] = useState("");
  const [importUrl, setImportUrl] = useState("");

  const [skipRewrite, setSkipRewrite] = useState(false);
  const [skipQuantities, setSkipQuantities] = useState(false);
  const [skipStructure, setSkipStructure] = useState(false);
  const [skipImages, setSkipImages] = useState(false);
  const [skipPrompts, setSkipPrompts] = useState(false);

  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("Waiting…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vm_admin_token");
    if (saved) setAdminToken(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("vm_admin_token", adminToken);
  }, [adminToken]);

  const canRun = useMemo(() => {
    if (!adminToken.trim()) return false;
    if (mode === "slug" && !slug.trim()) return false;
    if (mode === "import-url" && !importUrl.trim()) return false;
    return !loading;
  }, [adminToken, mode, slug, importUrl, loading]);

  async function runPipeline(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLog("Running pipeline...");

    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken.trim(),
        },
        body: JSON.stringify({
          mode,
          slug,
          importUrl,
          skipRewrite,
          skipQuantities,
          skipStructure,
          skipImages,
          skipPrompts,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Pipeline failed");
        setLog(data?.log || "No log returned.");
        return;
      }

      setLog(data.log || "Done.");
    } catch (err: any) {
      setError(err?.message || "Request failed");
      setLog(String(err?.stack || err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-extrabold text-[var(--brand-gold)]">
        Admin • Recipe Pipeline
      </h1>

      <p className="mt-3 text-[var(--text-soft)]">
        Run import, rewrite, quantities, structure, image fixing, and Midjourney prompt generation from one place.
      </p>

      <form
        onSubmit={runPipeline}
        className="mt-8 space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm"
      >
        <div>
          <label className="block text-sm font-extrabold text-[var(--brand-gold)]">
            Admin token
          </label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-[var(--brand-gold)]">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white"
          >
            <option value="latest">Latest recipe</option>
            <option value="slug">Single recipe by slug</option>
            <option value="all">All recipes</option>
            <option value="import-url">Import URL and process</option>
          </select>
        </div>

        {mode === "slug" && (
          <div>
            <label className="block text-sm font-extrabold text-[var(--brand-gold)]">
              Slug
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="bombay-aloo"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white"
            />
          </div>
        )}

        {mode === "import-url" && (
          <div>
            <label className="block text-sm font-extrabold text-[var(--brand-gold)]">
              Import URL
            </label>
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com/recipe"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm text-white"
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
            <input type="checkbox" checked={skipRewrite} onChange={(e) => setSkipRewrite(e.target.checked)} />
            Skip AI rewrite
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
            <input type="checkbox" checked={skipQuantities} onChange={(e) => setSkipQuantities(e.target.checked)} />
            Skip quantities
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
            <input type="checkbox" checked={skipStructure} onChange={(e) => setSkipStructure(e.target.checked)} />
            Skip structure
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
            <input type="checkbox" checked={skipImages} onChange={(e) => setSkipImages(e.target.checked)} />
            Skip images
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-soft)]">
            <input type="checkbox" checked={skipPrompts} onChange={(e) => setSkipPrompts(e.target.checked)} />
            Skip MJ prompts
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            disabled={!canRun}
            className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {loading ? "Running..." : "Run pipeline"}
          </button>

          {error && <span className="text-sm font-bold text-red-400">{error}</span>}
        </div>

        <div>
          <div className="mb-2 text-sm font-extrabold text-[var(--brand-gold)]">Log</div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-black/40 p-4 text-xs text-white/80">
            {log}
          </pre>
        </div>
      </form>
    </main>
  );
}