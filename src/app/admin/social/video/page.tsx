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
};

type LibraryResponse = {
  ok?: boolean;
  error?: string;
  items?: {
    slug: string;
    video: string;
  }[];
};

type DeleteVideoResponse = {
  ok?: boolean;
  error?: string;
  slug?: string;
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
      error: "Invalid response",
    };
  }
}

function cleanLabel(label: string) {
  return label.replace(/\s*\((recipe|guide)\)\s*$/i, "").trim();
}

function normalize(item: SlugItem): NormalizedSlug | null {
  if (typeof item === "string") {
    const slug = item.trim();
    if (!slug) return null;

    return {
      slug,
      label: cleanLabel(slug),
      type: "recipe",
    };
  }

  if (!item?.slug) return null;

  const type = item.type === "guide" ? "guide" : "recipe";
  const label = cleanLabel(item.title || item.label || item.slug);

  return {
    slug: item.slug,
    label,
    type,
  };
}

export default function AdminSocialVideoPage() {
  const [slugs, setSlugs] = useState<NormalizedSlug[]>([]);
  const [generated, setGenerated] = useState<GeneratedVideoItem[]>([]);
  const [selected, setSelected] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [activeVideo, setActiveVideo] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [filter, setFilter] = useState<"all" | "recipe" | "guide">("all");
  const [loading, setLoading] = useState(true);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/admin/social/slugs", {
          cache: "no-store",
        });

        const data = (await safeJson(res)) as SlugResponse;

        if (!res.ok) {
          throw new Error("Failed to load slugs");
        }

        const normalized = (data.slugs || [])
          .map(normalize)
          .filter(Boolean) as NormalizedSlug[];

        normalized.sort((a, b) => {
          if (a.type !== b.type) return a.type === "recipe" ? -1 : 1;
          return a.label.localeCompare(b.label);
        });

        if (!mounted) return;

        setSlugs(normalized);

        if (normalized[0]) {
          setSelected(normalized[0].slug);
        }
      } catch (err: any) {
        if (!mounted) return;
        setStatus(err?.message || "Failed to load slugs");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLibrary() {
      if (!slugs.length) {
        setLoadingLibrary(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/social/video/library", {
          cache: "no-store",
        });

        const data = (await safeJson(res)) as LibraryResponse;

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load video library");
        }

        const mapped = (data.items || []).map((v) => {
          const match = slugs.find((s) => s.slug === v.slug);

          return {
            slug: v.slug,
            video: v.video,
            label: match?.label || cleanLabel(v.slug),
            type: match?.type || "recipe",
          } satisfies GeneratedVideoItem;
        });

        mapped.sort((a, b) => a.label.localeCompare(b.label));

        if (!mounted) return;

        setGenerated(mapped);

        if (mapped[0] && !activeVideo) {
          setActiveVideo(mapped[0].video);
          setActiveLabel(mapped[0].label);
        }
      } catch (err: any) {
        if (!mounted) return;
        setStatus((prev) => prev || err?.message || "Failed to load video library");
      } finally {
        if (mounted) setLoadingLibrary(false);
      }
    }

    void loadLibrary();

    return () => {
      mounted = false;
    };
  }, [slugs, activeVideo]);

  const filteredSlugs = useMemo(() => {
    if (filter === "all") return slugs;
    return slugs.filter((s) => s.type === filter);
  }, [slugs, filter]);

  const recipeSlugs = useMemo(
    () => filteredSlugs.filter((s) => s.type === "recipe"),
    [filteredSlugs]
  );

  const guideSlugs = useMemo(
    () => filteredSlugs.filter((s) => s.type === "guide"),
    [filteredSlugs]
  );

  const library = useMemo(() => {
    if (filter === "all") return generated;
    return generated.filter((g) => g.type === filter);
  }, [generated, filter]);

  useEffect(() => {
    if (!filteredSlugs.some((item) => item.slug === selected)) {
      setSelected(filteredSlugs[0]?.slug || "");
    }
  }, [filteredSlugs, selected]);

  const selectedItem = filteredSlugs.find((s) => s.slug === selected) ?? null;

  function previewVideo(item: GeneratedVideoItem) {
    setActiveVideo(item.video);
    setActiveLabel(item.label);
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

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Video generation failed");
    }

    return data;
  }

  async function handleGenerate() {
    if (!selected || !selectedItem) {
      setStatus("Please select a video item first");
      return;
    }

    try {
      setGenerating(true);
      setStatus("Generating video...");
      setLogs([]);

      const data = await generateOne(selected);

      if (data.video) {
        const newVideo: GeneratedVideoItem = {
          slug: selectedItem.slug,
          type: selectedItem.type,
          label: selectedItem.label,
          video: data.video,
        };

        setGenerated((prev) => [
          newVideo,
          ...prev.filter((v) => v.slug !== selectedItem.slug),
        ]);

        previewVideo(newVideo);
      }

      setLogs(data.logs || []);
      setStatus(`Video generated successfully for ${data.slug}`);
    } catch (err: any) {
      setStatus(err?.message || "Video generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(item: GeneratedVideoItem) {
    if (!window.confirm(`Delete video for "${item.label}"?`)) return;

    try {
      setDeleting(item.slug);
      setStatus(`Deleting ${item.label}...`);

      const res = await fetch("/api/admin/social/video/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: item.slug }),
      });

      const data = (await safeJson(res)) as DeleteVideoResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Delete failed");
      }

      const remaining = generated.filter((v) => v.slug !== item.slug);
      setGenerated(remaining);

      if (activeVideo === item.video) {
        if (remaining[0]) {
          setActiveVideo(remaining[0].video);
          setActiveLabel(remaining[0].label);
        } else {
          setActiveVideo("");
          setActiveLabel("");
        }
      }

      setStatus(`Deleted video for ${item.label}`);
    } catch (err: any) {
      setStatus(err?.message || "Delete failed");
    } finally {
      setDeleting("");
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
          Generate branded short videos for recipes and guides. The library below
          stays populated after refresh and lets you preview or delete saved videos.
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
                disabled={loading || generating}
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
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading || generating || filteredSlugs.length === 0}
            className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
          >
            {loading ? (
              <option value="">Loading content...</option>
            ) : filteredSlugs.length === 0 ? (
              <option value="">No matching items found</option>
            ) : (
              <>
                {recipeSlugs.length > 0 ? (
                  <optgroup label="Recipes">
                    {recipeSlugs.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}

                {guideSlugs.length > 0 ? (
                  <optgroup label="Guides">
                    {guideSlugs.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </>
            )}
          </select>

          <div className="mt-4 rounded-xl border border-yellow-700/20 bg-neutral-950/70 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-neutral-400">Visible items</span>
              <span className="font-semibold text-white">{filteredSlugs.length}</span>
            </div>

            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Recipes</span>
              <span className="font-semibold text-white">{recipeSlugs.length}</span>
            </div>

            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Guides</span>
              <span className="font-semibold text-white">{guideSlugs.length}</span>
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

            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Library items</span>
              <span className="font-semibold text-white">
                {loadingLibrary ? "Loading..." : library.length}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || generating || !selected}
              className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Generating video..." : "Generate Video"}
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

              {activeVideo ? (
                <a
                  href={activeVideo}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-black"
                >
                  Open full video
                </a>
              ) : null}
            </div>

            {activeVideo ? (
              <div className="max-w-[260px] overflow-hidden rounded-2xl border border-yellow-700/30 bg-black">
                <div className="aspect-[9/16] bg-black">
                  <video
                    key={activeVideo}
                    src={activeVideo}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-yellow-100">
                    {activeLabel}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    Selected preview
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-700/20 bg-black px-4 py-10 text-center text-sm text-neutral-400">
                Select a video to preview.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
            <h2 className="mb-4 text-xl font-semibold text-yellow-200">Video library</h2>

            {library.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {library.map((v) => (
                  <div
                    key={v.slug}
                    className="group overflow-hidden rounded-2xl border border-yellow-700/30 bg-neutral-950"
                  >
                    <div
                      className="aspect-[9/16] cursor-pointer bg-black"
                      onClick={() => previewVideo(v)}
                    >
                      <video
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        src={v.video}
                      />
                    </div>

                    <div className="space-y-2 p-3">
                      <p className="truncate text-sm font-semibold text-yellow-100">
                        {v.label}
                      </p>

                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                        {v.type}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => previewVideo(v)}
                          className="flex-1 rounded bg-yellow-600 py-1 text-sm font-semibold text-black"
                        >
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(v)}
                          disabled={deleting === v.slug}
                          className="rounded bg-red-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {deleting === v.slug ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-700/20 bg-black px-4 py-10 text-center text-sm text-neutral-400">
                {loadingLibrary
                  ? "Loading video library..."
                  : "No generated videos found yet."}
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