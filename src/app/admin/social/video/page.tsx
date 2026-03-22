"use client";

import { useEffect, useMemo, useState } from "react";

type SlugItem =
  | string
  | {
      slug?: string;
      type?: string;
      title?: string;
      label?: string;
    };

type SlugResponse = {
  slugs?: SlugItem[];
};

type VideoApiResponse = {
  ok?: boolean;
  error?: string;
  slug?: string;
  video?: string;
  logs?: string[];
  rawResult?: unknown;
};

type NormalizedSlug = {
  slug: string;
  label: string;
  type: "recipe" | "guide";
};

type GeneratedVideoItem = {
  slug: string;
  type: "recipe" | "guide";
  label: string;
  video: string;
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

function normalizeSlugItem(item: SlugItem): NormalizedSlug | null {
  if (typeof item === "string") {
    const slug = item.trim();
    if (!slug) return null;

    return {
      slug,
      label: slug,
      type: "recipe",
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const slug = typeof item.slug === "string" ? item.slug.trim() : "";
  if (!slug) return null;

  const rawType = typeof item.type === "string" ? item.type.trim().toLowerCase() : "";
  const type: "recipe" | "guide" = rawType === "guide" ? "guide" : "recipe";

  const baseLabel =
    typeof item.label === "string" && item.label.trim()
      ? item.label.trim()
      : typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : slug;

  return {
    slug,
    label: `${baseLabel} (${type})`,
    type,
  };
}

export default function AdminSocialVideoPage() {
  const [slugs, setSlugs] = useState<NormalizedSlug[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingSlugs, setLoadingSlugs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "recipe" | "guide">("all");
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoItem[]>([]);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoLabel, setActiveVideoLabel] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSlugs() {
      try {
        const res = await fetch("/api/admin/social/slugs", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await safeJson(res)) as SlugResponse & { error?: string };

        if (!mounted) return;

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load slugs");
        }

        const nextSlugs = (Array.isArray(data?.slugs) ? data.slugs : [])
          .map(normalizeSlugItem)
          .filter((item): item is NormalizedSlug => item !== null)
          .sort((a, b) => a.label.localeCompare(b.label));

        setSlugs(nextSlugs);

        if (nextSlugs.length > 0) {
          setSelectedSlug(nextSlugs[0].slug);
        }
      } catch (err: any) {
        if (!mounted) return;
        setStatus(err?.message || "Failed to load slugs");
      } finally {
        if (mounted) setLoadingSlugs(false);
      }
    }

    loadSlugs();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSlugs = useMemo(() => {
    if (filter === "all") return slugs;
    return slugs.filter((item) => item.type === filter);
  }, [slugs, filter]);

  useEffect(() => {
    if (!filteredSlugs.some((item) => item.slug === selectedSlug)) {
      setSelectedSlug(filteredSlugs[0]?.slug || "");
    }
  }, [filteredSlugs, selectedSlug]);

  const selectedItem = filteredSlugs.find((item) => item.slug === selectedSlug) ?? null;

  function addGeneratedVideo(item: GeneratedVideoItem) {
    setGeneratedVideos((prev) => {
      const withoutExisting = prev.filter((entry) => entry.slug !== item.slug);
      return [item, ...withoutExisting];
    });

    setActiveVideoUrl(item.video);
    setActiveVideoLabel(item.label);
  }

  async function generateOne(slug: string) {
    const res = await fetch("/api/admin/social/video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug }),
    });

    const data = (await safeJson(res)) as VideoApiResponse;

    return { res, data };
  }

  async function handleGenerate() {
    if (!selectedSlug.trim() || !selectedItem) {
      setStatus("Please select a slug first");
      return;
    }

    try {
      setGenerating(true);
      setStatus("Generating video...");
      setLogs([]);

      const { res, data } = await generateOne(selectedSlug);

      setLogs(Array.isArray(data?.logs) ? data.logs : []);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Video generation failed");
      }

      if (typeof data.video === "string" && data.video) {
        addGeneratedVideo({
          slug: selectedItem.slug,
          type: selectedItem.type,
          label: selectedItem.label,
          video: data.video,
        });
      }

      setStatus(`Video generated successfully for ${data.slug}`);
    } catch (err: any) {
      setStatus(err?.message || "Video generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateAll() {
    if (!filteredSlugs.length) {
      setStatus("No slugs available to generate");
      return;
    }

    try {
      setGeneratingAll(true);
      setGenerating(true);
      setLogs([]);
      setStatus(`Generating ${filteredSlugs.length} videos...`);

      const combinedLogs: string[] = [];
      let completed = 0;

      for (const item of filteredSlugs) {
        combinedLogs.push("");
        combinedLogs.push("========================================");
        combinedLogs.push(`Generating: ${item.slug} (${item.type})`);
        combinedLogs.push("========================================");

        setLogs([...combinedLogs]);

        const { res, data } = await generateOne(item.slug);

        if (Array.isArray(data?.logs)) {
          combinedLogs.push(...data.logs);
        }

        if (!res.ok || !data?.ok) {
          combinedLogs.push(`FAILED: ${item.slug}`);
          setLogs([...combinedLogs]);
          throw new Error(data?.error || `Failed on ${item.slug}`);
        }

        if (typeof data.video === "string" && data.video) {
          addGeneratedVideo({
            slug: item.slug,
            type: item.type,
            label: item.label,
            video: data.video,
          });
        }

        completed += 1;
        combinedLogs.push(`DONE: ${item.slug}`);
        combinedLogs.push(`Progress: ${completed}/${filteredSlugs.length}`);
        setLogs([...combinedLogs]);
      }

      setStatus(`Successfully generated ${completed} videos`);
    } catch (err: any) {
      setStatus(err?.message || "Bulk video generation failed");
    } finally {
      setGenerating(false);
      setGeneratingAll(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white">
      <div className="mb-8">
        <p className="mb-2 text-sm uppercase tracking-[0.25em] text-yellow-300">
          Admin Social
        </p>
        <h1 className="text-3xl font-bold text-yellow-100">Video Generator</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-300">
          Generate branded short videos for recipes and guides. Use the filter to narrow
          the list, generate one item, or bulk-generate everything currently shown.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
          <h2 className="mb-4 text-lg font-semibold text-yellow-200">Controls</h2>

          <label className="mb-2 block text-sm font-medium text-yellow-200">
            Content type
          </label>
          <div className="mb-5 flex gap-2">
            {(["all", "recipe", "guide"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                disabled={loadingSlugs || generating}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? "bg-yellow-600 text-black"
                    : "border border-yellow-700/40 bg-neutral-900 text-yellow-100"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {value === "all" ? "All" : value === "recipe" ? "Recipes" : "Guides"}
              </button>
            ))}
          </div>

          <label
            htmlFor="video-slug"
            className="mb-2 block text-sm font-medium text-yellow-200"
          >
            Select item
          </label>

          <select
            id="video-slug"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            disabled={loadingSlugs || generating || filteredSlugs.length === 0}
            className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
          >
            {loadingSlugs ? (
              <option value="">Loading content...</option>
            ) : filteredSlugs.length === 0 ? (
              <option value="">No matching items found</option>
            ) : (
              filteredSlugs.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))
            )}
          </select>

          <div className="mt-4 rounded-xl border border-yellow-700/20 bg-neutral-950/70 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-neutral-400">Visible items</span>
              <span className="font-semibold text-white">{filteredSlugs.length}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Selected type</span>
              <span className="font-semibold capitalize text-white">
                {selectedItem?.type || "—"}
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Selected slug</span>
              <span className="truncate font-semibold text-white">
                {selectedItem?.slug || "—"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loadingSlugs || generating || !selectedSlug}
              className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating && !generatingAll ? "Generating video..." : "Generate selected video"}
            </button>

            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={loadingSlugs || generating || filteredSlugs.length === 0}
              className="rounded-xl border border-yellow-700/40 bg-yellow-600 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingAll
                ? `Generating ${filteredSlugs.length} videos...`
                : `Generate all shown (${filteredSlugs.length})`}
            </button>
          </div>

          {status ? (
            <div className="mt-5 rounded-xl border border-yellow-700/30 bg-black/60 p-4 text-sm text-yellow-100">
              {status}
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-yellow-200">Latest preview</h2>
              {activeVideoUrl ? (
                <a
                  href={activeVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-black"
                >
                  Open full video
                </a>
              ) : null}
            </div>

            {activeVideoUrl ? (
              <a
                href={activeVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="block max-w-[220px] overflow-hidden rounded-2xl border border-yellow-700/30 bg-black transition hover:border-yellow-500/60"
              >
                <div className="aspect-[9/16] bg-black">
                  <video
                    key={activeVideoUrl}
                    preload="metadata"
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                    src={activeVideoUrl}
                  />
                </div>

                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-yellow-100">
                    {activeVideoLabel}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    Click to open full size
                  </p>
                </div>
              </a>
            ) : (
              <div className="rounded-xl border border-yellow-700/20 bg-black px-4 py-10 text-center text-sm text-neutral-400">
                No generated video yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
            <h2 className="mb-4 text-xl font-semibold text-yellow-200">Generated videos</h2>

            {generatedVideos.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {generatedVideos.map((item) => (
                  <a
                    key={item.slug}
                    href={item.video}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setActiveVideoUrl(item.video);
                      setActiveVideoLabel(item.label);
                    }}
                    className="group overflow-hidden rounded-2xl border border-yellow-700/30 bg-neutral-950 transition hover:border-yellow-500/60"
                  >
                    <div className="aspect-[9/16] bg-black">
                      <video
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        src={item.video}
                      />
                    </div>

                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-yellow-100 group-hover:text-yellow-200">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                        Click to preview
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-700/20 bg-black px-4 py-10 text-center text-sm text-neutral-400">
                Generated videos will appear here as clickable thumbnails.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
            <h2 className="mb-3 text-xl font-semibold text-yellow-200">Script log</h2>
            <pre className="min-h-[260px] whitespace-pre-wrap rounded-xl bg-black px-4 py-4 text-sm text-green-400">
              {logs.length ? logs.join("\n") : "No log output yet."}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}