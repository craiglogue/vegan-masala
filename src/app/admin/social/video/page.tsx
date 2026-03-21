"use client";

import { useEffect, useState } from "react";

type SlugResponse = {
  slugs?: string[];
};

type VideoApiResponse = {
  ok?: boolean;
  error?: string;
  slug?: string;
  result?: {
    success?: boolean;
    video?: string;
  };
};

async function safeJson(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      error: text || "Invalid server response",
    };
  }
}

export default function AdminSocialVideoPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [status, setStatus] = useState("");
  const [loadingSlugs, setLoadingSlugs] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSlugs() {
      try {
        setLoadingSlugs(true);
        setStatus("");

        const res = await fetch("/api/admin/social/slugs", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await safeJson(res)) as SlugResponse & {
          error?: string;
        };

        if (!mounted) return;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load slugs");
        }

        const nextSlugs = Array.isArray(data?.slugs) ? data.slugs : [];
        setSlugs(nextSlugs);

        if (nextSlugs.length > 0) {
          setSelectedSlug(nextSlugs[0]);
        } else {
          setSelectedSlug("");
          setStatus("No slugs found");
        }
      } catch (err: any) {
        if (!mounted) return;
        setStatus(err?.message || "Failed to load slugs");
        setSlugs([]);
        setSelectedSlug("");
      } finally {
        if (mounted) {
          setLoadingSlugs(false);
        }
      }
    }

    loadSlugs();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleGenerate() {
    if (!selectedSlug.trim()) {
      setStatus("Please select a slug first");
      return;
    }

    try {
      setGenerating(true);
      setStatus("Generating video...");

      const res = await fetch("/api/admin/social/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: selectedSlug,
        }),
      });

      const data = (await safeJson(res)) as VideoApiResponse;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Video generation failed");
      }

      setStatus(`Video generated successfully for ${data.slug}`);
    } catch (err: any) {
      setStatus(err?.message || "Video generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-white">
      <h1 className="mb-6 text-3xl font-bold">Video Generator</h1>

      <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
        <label
          htmlFor="video-slug"
          className="mb-2 block text-sm font-medium text-yellow-200"
        >
          Select slug
        </label>

        <select
          id="video-slug"
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          disabled={loadingSlugs || generating || slugs.length === 0}
          className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
        >
          {loadingSlugs ? (
            <option value="">Loading slugs...</option>
          ) : slugs.length === 0 ? (
            <option value="">No slugs found</option>
          ) : (
            slugs.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))
          )}
        </select>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loadingSlugs || generating || !selectedSlug}
          className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate video"}
        </button>

        {status ? (
          <p className="mt-4 text-sm text-yellow-100">{status}</p>
        ) : null}
      </div>
    </main>
  );
}