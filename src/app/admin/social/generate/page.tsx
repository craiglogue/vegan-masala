"use client";

import { useEffect, useMemo, useState } from "react";

type Platform = "instagram" | "pinterest";

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

type GenerateResponse = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  slug?: string;
  image?: string;
  storage?: "blob" | "local";
  path?: string;
  generated?: Array<{
    slug: string;
    image: string;
    storage: "blob" | "local";
    path: string;
  }>;
  result?: {
    slug?: string;
    image?: string;
    storage?: "blob" | "local";
    path?: string;
    generated?: Array<{
      slug: string;
      image: string;
      storage: "blob" | "local";
      path: string;
    }>;
  };
  count?: number;
};

type NormalizedSlug = {
  slug: string;
  label: string;
  type: "recipe" | "guide";
};

type GeneratedImageItem = {
  slug: string;
  label: string;
  type: "recipe" | "guide";
  image: string;
  storage: "blob" | "local";
  path: string;
  cacheKey: number;
  platform: Platform;
};

async function safeJson(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      success: false,
      error: text || "Invalid server response",
    };
  }
}

function cleanLabel(label: string) {
  return label.replace(/\s*\((recipe|guide)\)\s*$/i, "").trim();
}

function normalizeSlugItem(item: SlugItem): NormalizedSlug | null {
  if (typeof item === "string") {
    const slug = item.trim();
    if (!slug) return null;

    return {
      slug,
      label: cleanLabel(slug),
      type: "recipe",
    };
  }

  if (!item || typeof item !== "object") return null;

  const slug = typeof item.slug === "string" ? item.slug.trim() : "";
  if (!slug) return null;

  const rawType =
    typeof item.type === "string" ? item.type.trim().toLowerCase() : "";
  const type: "recipe" | "guide" = rawType === "guide" ? "guide" : "recipe";

  const baseLabel =
    typeof item.label === "string" && item.label.trim()
      ? item.label.trim()
      : typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : slug;

  return {
    slug,
    label: cleanLabel(baseLabel),
    type,
  };
}

function withCacheBust(url: string, cacheKey: number) {
  if (!url) return "";
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${cacheKey}`;
}

export default function AdminSocialGeneratePage() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [slugs, setSlugs] = useState<NormalizedSlug[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [filter, setFilter] = useState<"all" | "recipe" | "guide">("all");
  const [loadingSlugs, setLoadingSlugs] = useState(true);
  const [generatingOne, setGeneratingOne] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [status, setStatus] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>(
    []
  );
  const [activeImageUrl, setActiveImageUrl] = useState("");
  const [activeImageLabel, setActiveImageLabel] = useState("");
  const [activeStorage, setActiveStorage] = useState<"blob" | "local" | "">("");
  const [activePath, setActivePath] = useState("");
  const [activeCacheKey, setActiveCacheKey] = useState(0);
  const [activePlatform, setActivePlatform] = useState<Platform>("instagram");

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
          throw new Error(data?.error || "Failed to load content");
        }

        const nextSlugs = (Array.isArray(data?.slugs) ? data.slugs : [])
          .map(normalizeSlugItem)
          .filter((item): item is NormalizedSlug => item !== null)
          .sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "recipe" ? -1 : 1;
            }
            return a.label.localeCompare(b.label);
          });

        setSlugs(nextSlugs);

        if (nextSlugs.length > 0) {
          setSelectedSlug(nextSlugs[0].slug);
        }
      } catch (err: any) {
        if (!mounted) return;
        setStatus(err?.message || "Failed to load content");
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

  const recipeSlugs = useMemo(
    () => filteredSlugs.filter((item) => item.type === "recipe"),
    [filteredSlugs]
  );

  const guideSlugs = useMemo(
    () => filteredSlugs.filter((item) => item.type === "guide"),
    [filteredSlugs]
  );

  useEffect(() => {
    if (!filteredSlugs.some((item) => item.slug === selectedSlug)) {
      setSelectedSlug(filteredSlugs[0]?.slug || "");
    }
  }, [filteredSlugs, selectedSlug]);

  const selectedItem =
    filteredSlugs.find((item) => item.slug === selectedSlug) ?? null;

  function setActiveFromItem(item: GeneratedImageItem) {
    setActiveImageUrl(item.image);
    setActiveImageLabel(item.label);
    setActiveStorage(item.storage);
    setActivePath(item.path);
    setActiveCacheKey(item.cacheKey);
    setActivePlatform(item.platform);
  }

  function addGeneratedImage(item: Omit<GeneratedImageItem, "cacheKey">) {
    const nextItem: GeneratedImageItem = {
      ...item,
      cacheKey: Date.now(),
    };

    setGeneratedImages((prev) => {
      const withoutExisting = prev.filter(
        (entry) => !(entry.slug === nextItem.slug && entry.platform === nextItem.platform)
      );
      return [nextItem, ...withoutExisting];
    });

    setActiveFromItem(nextItem);
  }

  async function generateOne(slug: string, currentPlatform: Platform) {
    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: currentPlatform,
        mode: "single",
        slug,
      }),
    });

    const data = (await safeJson(res)) as GenerateResponse;
    return { res, data };
  }

  async function generateAll(currentPlatform: Platform) {
    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: currentPlatform,
        mode: "all",
      }),
    });

    const data = (await safeJson(res)) as GenerateResponse;
    return { res, data };
  }

  async function handleGenerateOne() {
    if (!selectedItem) {
      setStatus("Please select an item first");
      return;
    }

    try {
      setGeneratingOne(true);
      setStatus(
        `Generating ${platform === "instagram" ? "Instagram card" : "Pinterest pin"} for ${selectedItem.slug}...`
      );

      const { res, data } = await generateOne(selectedItem.slug, platform);

      if (!res.ok || (!data?.success && !data?.ok)) {
        throw new Error(
          data?.error ||
            data?.message ||
            `${platform} generation failed`
        );
      }

      const image = data.image || data.result?.image || "";
      const storage = data.storage || data.result?.storage;
      const assetPath = data.path || data.result?.path || "";

      if (image && storage && assetPath) {
        addGeneratedImage({
          slug: selectedItem.slug,
          label: selectedItem.label,
          type: selectedItem.type,
          image,
          storage,
          path: assetPath,
          platform,
        });
      }

      setStatus(
        data?.message ||
          `${platform === "instagram" ? "Instagram card" : "Pinterest pin"} generated for ${selectedItem.slug}`
      );
    } catch (err: any) {
      setStatus(err?.message || `${platform} generation failed`);
    } finally {
      setGeneratingOne(false);
    }
  }

  async function handleGenerateAll() {
    try {
      setGeneratingAll(true);
      setStatus(
        `Generating all ${platform === "instagram" ? "Instagram cards" : "Pinterest pins"}...`
      );

      const { res, data } = await generateAll(platform);

      if (!res.ok || (!data?.success && !data?.ok)) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Bulk ${platform} generation failed`
        );
      }

      const generated = Array.isArray(data.generated)
        ? data.generated
        : Array.isArray(data.result?.generated)
          ? data.result.generated
          : [];

      const now = Date.now();

      const mapped = generated.map((item, index) => {
        const match = slugs.find((s) => s.slug === item.slug);

        return {
          slug: item.slug,
          label: match?.label || item.slug,
          type: match?.type || "recipe",
          image: item.image,
          storage: item.storage,
          path: item.path,
          cacheKey: now + index,
          platform,
        } satisfies GeneratedImageItem;
      });

      setGeneratedImages(mapped);

      if (mapped.length > 0) {
        setActiveFromItem(mapped[0]);
      }

      setStatus(
        data?.message ||
          `Generated ${
            typeof data.count === "number" ? data.count : generated.length
          } ${platform === "instagram" ? "Instagram cards" : "Pinterest pins"}`
      );
    } catch (err: any) {
      setStatus(err?.message || `Bulk ${platform} generation failed`);
    } finally {
      setGeneratingAll(false);
    }
  }

  const activeImageSrc = activeImageUrl
    ? withCacheBust(activeImageUrl, activeCacheKey || Date.now())
    : "";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white">
      <div className="mb-8">
        <p className="mb-2 text-sm uppercase tracking-[0.25em] text-yellow-300">
          Admin Social
        </p>
        <h1 className="text-3xl font-bold text-yellow-100">Social Generator</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-300">
          Generate Instagram cards and Pinterest pins, then preview the returned
          asset URL, storage location, and final image immediately.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
          <h2 className="mb-4 text-lg font-semibold text-yellow-200">Controls</h2>

          <label className="mb-2 block text-sm font-medium text-yellow-200">
            Platform
          </label>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {(["instagram", "pinterest"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPlatform(value)}
                disabled={loadingSlugs || generatingOne || generatingAll}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition capitalize ${
                  platform === value
                    ? "bg-yellow-600 text-black"
                    : "border border-yellow-700/40 bg-neutral-900 text-yellow-100"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {value}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-sm font-medium text-yellow-200">
            Content type
          </label>

          <div className="mb-5 flex gap-2">
            {(["all", "recipe", "guide"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                disabled={loadingSlugs || generatingOne || generatingAll}
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
            htmlFor="social-slug"
            className="mb-2 block text-sm font-medium text-yellow-200"
          >
            Select item
          </label>

          <select
            id="social-slug"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            disabled={
              loadingSlugs || generatingOne || generatingAll || filteredSlugs.length === 0
            }
            className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
          >
            {loadingSlugs ? (
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

          <div className="mt-5 rounded-xl border border-yellow-700/20 bg-neutral-950/70 p-4 text-sm">
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
              <span className="text-neutral-400">Platform</span>
              <span className="font-semibold capitalize text-white">{platform}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={handleGenerateOne}
              disabled={loadingSlugs || generatingOne || generatingAll || !selectedSlug}
              className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingOne
                ? "Generating..."
                : platform === "instagram"
                  ? "Generate selected Instagram card"
                  : "Generate selected Pinterest pin"}
            </button>

            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={loadingSlugs || generatingOne || generatingAll || slugs.length === 0}
              className="rounded-xl border border-yellow-700/40 bg-yellow-600 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingAll
                ? "Generating all..."
                : platform === "instagram"
                  ? `Generate all Instagram cards (${slugs.length})`
                  : `Generate all Pinterest pins (${slugs.length})`}
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
              <h2 className="text-xl font-semibold text-yellow-200">
                Latest generated asset
              </h2>
              {activeImageUrl ? (
                <a
                  href={activeImageSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-semibold text-black"
                >
                  Open full image
                </a>
              ) : null}
            </div>

            {activeImageUrl ? (
              <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <a
                  href={activeImageSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-2xl border border-yellow-700/30 bg-black transition hover:border-yellow-500/60"
                >
                  <div className={`${activePlatform === "pinterest" ? "aspect-[2/3]" : "aspect-square"} bg-black`}>
                    <img
                      src={activeImageSrc}
                      alt={activeImageLabel}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </a>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">
                      Item
                    </p>
                    <p className="mt-1 text-lg font-semibold text-yellow-100">
                      {activeImageLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">
                      Platform
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-white">
                      {activePlatform}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">
                      Storage
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {activeStorage || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">
                      Path
                    </p>
                    <p className="mt-1 break-all text-sm text-neutral-200">
                      {activePath || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">
                      Image URL
                    </p>
                    <a
                      href={activeImageSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-sm text-sky-300 hover:text-sky-200"
                    >
                      {activeImageSrc}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-700/20 bg-black px-4 py-10 text-center text-sm text-neutral-400">
                No generated asset yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
            <h2 className="mb-4 text-xl font-semibold text-yellow-200">
              Generated assets
            </h2>

            {generatedImages.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {generatedImages.map((item) => {
                  const previewSrc = withCacheBust(item.image, item.cacheKey);

                  return (
                    <button
                      key={`${item.platform}-${item.slug}-${item.cacheKey}`}
                      type="button"
                      onClick={() => setActiveFromItem(item)}
                      className="overflow-hidden rounded-2xl border border-yellow-700/30 bg-neutral-950 text-left transition hover:border-yellow-500/60"
                    >
                      <div className={`${item.platform === "pinterest" ? "aspect-[2/3]" : "aspect-square"} bg-black`}>
                        <img
                          src={previewSrc}
                          alt={item.label}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-yellow-100">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
                          {item.platform} • {item.storage}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-yellow-700/20 bg-black px-4 py-10 text-center text-sm text-neutral-400">
                Generated assets will appear here.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}