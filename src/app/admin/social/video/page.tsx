"use client";

import { useEffect, useState } from "react";

type SlugResponse = {
  slugs?: string[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  slug?: string;
  result?: {
    success?: boolean;
    video?: string;
  };
};

export default function AdminSocialVideoPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSlugs() {
      try {
        const res = await fetch("/api/admin/social/slugs", {
          cache: "no-store",
        });

        const data: SlugResponse = await res.json();

        if (cancelled) return;

        const nextSlugs = Array.isArray(data?.slugs) ? data.slugs : [];
        setSlugs(nextSlugs);

        if (nextSlugs.length && !selectedSlug) {
          setSelectedSlug(nextSlugs[0]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus(err?.message || "Failed to load slugs");
        }
      }
    }

    loadSlugs();

    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  async function handleGenerate() {
    if (!selectedSlug.trim()) {
      setStatus("Please select a slug first");
      return;
    }

    setLoading(true);
    setStatus("Generating video...");

    try {
      const res = await fetch("/api/admin/social/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: selectedSlug,
        }),
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Video generation failed");
      }

      setStatus(`Video generated successfully for ${data.slug}`);
    } catch (err: any) {
      setStatus(err?.message || "Video generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-white">
      <h1 className="mb-6 text-3xl font-bold">Video Generator</h1>

      <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
        <label className="mb-2 block text-sm font-medium text-yellow-200">
          Select slug
        </label>

        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none"
        >
          {!slugs.length ? (
            <option value="">No slugs found</option>
          ) : null}

          {slugs.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !selectedSlug}
          className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate video"}
        </button>

        {status ? (
          <p className="mt-4 text-sm text-yellow-100">{status}</p>
        ) : null}
      </div>
    </main>
  );
}