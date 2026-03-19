"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SlugOption = {
  slug: string;
  type?: string;
  title: string;
  label: string;
};

export default function AdminSocialVideoPage() {
  const [videoSlug, setVideoSlug] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [slugsLoading, setSlugsLoading] = useState(false);
  const [availableSlugs, setAvailableSlugs] = useState<SlugOption[]>([]);
  const [log, setLog] = useState("Waiting...");

  async function loadSlugs() {
    try {
      setSlugsLoading(true);

      const res = await fetch("/api/admin/social/slugs", {
        cache: "no-store",
      });

      const data = await res.json();
      setAvailableSlugs(data.slugs || []);
    } catch {
      setAvailableSlugs([]);
    } finally {
      setSlugsLoading(false);
    }
  }

  useEffect(() => {
    void loadSlugs();
  }, []);

  async function runVideo(mode: "single" | "latest" | "all") {
    if (mode === "single" && !videoSlug.trim()) {
      setLog("Video generation failed\n\nSelect a slug first");
      return;
    }

    setVideoLoading(true);

    try {
      const res = await fetch("/api/admin/social/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          slug: mode === "single" ? videoSlug.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLog(`Video generation failed\n\n${data.error || "Unknown error"}`);
        return;
      }

      setLog(`Video generation complete

Mode: ${mode}
Count: ${data.count ?? 0}
${data.slug ? `Slug: ${data.slug}\n` : ""}${data.video ? `Video: ${data.video}\n` : ""}${data.message || ""}`);

      if (mode === "single") {
        setVideoSlug("");
      }
    } catch (err: any) {
      setLog(`Video generation failed\n\n${err?.message || "Unknown error"}`);
    } finally {
      setVideoLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-gold)]/70">
              Admin
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-wide text-[var(--brand-gold)]">
              Social Video Generator
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
              Generate short-form recipe videos for a selected slug, the latest
              content item, or your full library.
            </p>
          </div>

          <Link
            href="/admin/social"
            className="rounded-xl border border-[var(--border)] bg-black/20 px-5 py-3 text-sm font-bold text-[var(--brand-gold)]"
          >
            Back to Social Hub
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Video generator
        </h2>

        <p className="mt-3 max-w-2xl text-sm text-[var(--text-soft)]">
          Use selected video for one recipe, latest video for your newest item,
          or all videos to batch-generate your full set.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--brand-gold)]">
              Video slug
            </label>

            <select
              value={videoSlug}
              onChange={(e) => setVideoSlug(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"
            >
              <option value="">
                {slugsLoading ? "Loading content..." : "Select content"}
              </option>

              {availableSlugs.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => void loadSlugs()}
              disabled={slugsLoading || videoLoading}
              className="rounded-xl border border-[var(--border)] bg-black/20 px-6 py-3 text-sm font-bold text-[var(--brand-gold)] disabled:opacity-50"
            >
              {slugsLoading ? "Refreshing..." : "Refresh content list"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => void runVideo("single")}
            disabled={videoLoading}
            className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {videoLoading ? "Working..." : "Generate selected video"}
          </button>

          <button
            onClick={() => void runVideo("latest")}
            disabled={videoLoading}
            className="rounded-xl border border-[var(--border)] bg-black/20 px-6 py-3 text-sm font-bold text-[var(--brand-gold)] disabled:opacity-50"
          >
            Generate latest video
          </button>

          <button
            onClick={() => void runVideo("all")}
            disabled={videoLoading}
            className="rounded-xl bg-[var(--brand-gold)] px-6 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            Generate all videos
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Log
        </h2>

        <pre className="mt-5 min-h-[240px] whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-black/30 p-5 text-xs leading-6 text-[var(--text-soft)]">
          {log}
        </pre>
      </section>
    </main>
  );
}