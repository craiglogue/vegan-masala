"use client";

import { useEffect, useMemo, useState } from "react";

type Platform = "instagram" | "pinterest" | "facebook";
type QueuePlatform = "instagram" | "pinterest" | "facebook";
type ContentGroup = "recipe" | "guide" | "store";
type SocialKind = "recipe" | "ebook";

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
  publishImage?: string;
  storage?: "blob" | "local";
  path?: string;
  generated?: Array<{
    slug: string;
    image: string;
    publishImage?: string;
    storage: "blob" | "local";
    path: string;
  }>;
  instagram?: {
    slug?: string;
    image?: string;
    publishImage?: string;
    storage?: "blob" | "local";
    path?: string;
  };
  pinterest?: {
    slug?: string;
    image?: string;
    storage?: "blob" | "local";
    path?: string;
  };
  facebook?: {
    slug?: string;
    image?: string;
    publishImage?: string;
    storage?: "blob" | "local";
    path?: string;
  };
  result?: {
    slug?: string;
    image?: string;
    publishImage?: string;
    storage?: "blob" | "local";
    path?: string;
    generated?: Array<{
      slug: string;
      image: string;
      publishImage?: string;
      storage: "blob" | "local";
      path: string;
    }>;
  };
  count?: number;
  instagramCaption?: string;
  instagramCaptionVariants?: string[];
  facebookCaption?: string;
  facebookCaptionVariants?: string[];
  pinterestCaption?: string;
  pinterestCaptionVariants?: string[];
};

type QueueRunResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  count?: number;
  attempted?: number;
  failed?: number;
  results?: Array<{
    id: string;
    slug: string;
    platform: string;
    assetType?: string;
    status: "posted" | "failed";
    error?: string;
  }>;
};

type NormalizedSlug = {
  slug: string;
  label: string;
  type: "recipe" | "guide";
};

type StoreItem = {
  slug: string;
  label: string;
  type: "store";
  kind: SocialKind;
};

type ContentItem = NormalizedSlug | StoreItem;

type GeneratedImageItem = {
  slug: string;
  label: string;
  type: "recipe" | "guide" | "store";
  image: string;
  publishImage: string;
  storage: "blob" | "local";
  path: string;
  cacheKey: number;
  platform: Platform;
  caption?: string;
  captionVariants?: string[];
};

type PinterestBoard = {
  id: string;
  name: string;
};

const STORE_ITEMS: StoreItem[] = [
  {
    slug: "vegan-indian-sweets-mini-ebook",
    label: "Vegan Indian Sweets Mini Ebook",
    type: "store",
    kind: "ebook",
  },
];

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

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function buildContentUrl(type: "recipe" | "guide" | "store", slug: string) {
  const base = "https://www.vegan-masala.com";

  if (type === "store") return `${base}/store`;
  if (type === "guide") return `${base}/guides/${slug}`;
  return `${base}/recipes/${slug}`;
}

export default function AdminSocialGeneratePage() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [slugs, setSlugs] = useState<NormalizedSlug[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ContentGroup>("recipe");
  const [selectedRecipeSlug, setSelectedRecipeSlug] = useState("");
  const [selectedGuideSlug, setSelectedGuideSlug] = useState("");
  const [selectedStoreSlug, setSelectedStoreSlug] = useState(
    STORE_ITEMS[0]?.slug || ""
  );

  const [loadingSlugs, setLoadingSlugs] = useState(true);
  const [generatingOne, setGeneratingOne] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  const [status, setStatus] = useState("");
  const [queueStatus, setQueueStatus] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>(
    []
  );

  const [activeImageUrl, setActiveImageUrl] = useState("");
  const [activePublishImageUrl, setActivePublishImageUrl] = useState("");
  const [activeImageLabel, setActiveImageLabel] = useState("");
  const [activeStorage, setActiveStorage] = useState<"blob" | "local" | "">(
    ""
  );
  const [activePath, setActivePath] = useState("");
  const [activeCacheKey, setActiveCacheKey] = useState(0);
  const [activePlatform, setActivePlatform] = useState<Platform>("instagram");
  const [activeCaption, setActiveCaption] = useState("");
  const [captionVariants, setCaptionVariants] = useState<string[]>([]);
  const [selectedCaptionVariant, setSelectedCaptionVariant] = useState(0);
  const [activeType, setActiveType] = useState<
    "recipe" | "guide" | "store" | ""
  >("");
  const [activeSlug, setActiveSlug] = useState("");

  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [queueBoard, setQueueBoard] = useState("");
  const [queueScheduledFor, setQueueScheduledFor] = useState("");
  const [queueLoading, setQueueLoading] = useState(false);
  const [runQueueLoading, setRunQueueLoading] = useState(false);
  const [queueDebug, setQueueDebug] = useState("");

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

        const firstRecipe = nextSlugs.find((item) => item.type === "recipe");
        const firstGuide = nextSlugs.find((item) => item.type === "guide");

        if (firstRecipe) setSelectedRecipeSlug(firstRecipe.slug);
        if (firstGuide) setSelectedGuideSlug(firstGuide.slug);
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

  useEffect(() => {
    let mounted = true;

    async function loadBoards() {
      try {
        setBoardsLoading(true);

        const res = await fetch("/api/pinterest/boards", {
          cache: "no-store",
        });

        const data = await safeJson(res);

        if (!mounted) return;

        if (res.ok && data?.ok) {
          setBoards(Array.isArray(data.items) ? data.items : []);
        } else {
          setBoards([]);
        }
      } catch {
        if (!mounted) return;
        setBoards([]);
      } finally {
        if (mounted) setBoardsLoading(false);
      }
    }

    loadBoards();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!queueScheduledFor) {
      const next = new Date();
      next.setMinutes(next.getMinutes() + 10);
      next.setSeconds(0, 0);
      setQueueScheduledFor(formatDateTimeLocal(next));
    }
  }, [queueScheduledFor]);

  const recipeSlugs = useMemo(
    () => slugs.filter((item) => item.type === "recipe"),
    [slugs]
  );

  const guideSlugs = useMemo(
    () => slugs.filter((item) => item.type === "guide"),
    [slugs]
  );

  const storeSlugs = STORE_ITEMS;

  useEffect(() => {
    if (
      recipeSlugs.length > 0 &&
      !recipeSlugs.some((item) => item.slug === selectedRecipeSlug)
    ) {
      setSelectedRecipeSlug(recipeSlugs[0].slug);
    }
  }, [recipeSlugs, selectedRecipeSlug]);

  useEffect(() => {
    if (
      guideSlugs.length > 0 &&
      !guideSlugs.some((item) => item.slug === selectedGuideSlug)
    ) {
      setSelectedGuideSlug(guideSlugs[0].slug);
    }
  }, [guideSlugs, selectedGuideSlug]);

  useEffect(() => {
    if (
      storeSlugs.length > 0 &&
      !storeSlugs.some((item) => item.slug === selectedStoreSlug)
    ) {
      setSelectedStoreSlug(storeSlugs[0].slug);
    }
  }, [storeSlugs, selectedStoreSlug]);

  const selectedItem: ContentItem | null = useMemo(() => {
    if (selectedGroup === "recipe") {
      return recipeSlugs.find((item) => item.slug === selectedRecipeSlug) ?? null;
    }

    if (selectedGroup === "guide") {
      return guideSlugs.find((item) => item.slug === selectedGuideSlug) ?? null;
    }

    return storeSlugs.find((item) => item.slug === selectedStoreSlug) ?? null;
  }, [
    selectedGroup,
    recipeSlugs,
    guideSlugs,
    storeSlugs,
    selectedRecipeSlug,
    selectedGuideSlug,
    selectedStoreSlug,
  ]);

  function setActiveFromItem(item: GeneratedImageItem) {
    setActiveImageUrl(item.image);
    setActivePublishImageUrl(item.publishImage || item.image);
    setActiveImageLabel(item.label);
    setActiveStorage(item.storage);
    setActivePath(item.path);
    setActiveCacheKey(item.cacheKey);
    setActivePlatform(item.platform);
    setActiveCaption(item.caption || "");
    setActiveType(item.type);
    setActiveSlug(item.slug);

    const variants =
      Array.isArray(item.captionVariants) && item.captionVariants.length > 0
        ? item.captionVariants
        : item.caption
          ? [item.caption]
          : [];

    setCaptionVariants(variants);
    setSelectedCaptionVariant(0);
  }

  function updateActiveCaption(nextCaption: string) {
    setActiveCaption(nextCaption);

    setGeneratedImages((prev) =>
      prev.map((item) =>
        item.slug === activeSlug && item.platform === activePlatform
          ? { ...item, caption: nextCaption }
          : item
      )
    );
  }

  function addGeneratedImage(item: Omit<GeneratedImageItem, "cacheKey">) {
    const nextItem: GeneratedImageItem = {
      ...item,
      cacheKey: Date.now(),
    };

    setGeneratedImages((prev) => {
      const withoutExisting = prev.filter(
        (entry) =>
          !(entry.slug === nextItem.slug && entry.platform === nextItem.platform)
      );
      return [nextItem, ...withoutExisting];
    });

    setActiveFromItem(nextItem);
  }

  function getCaptionForResponse(
    data: GenerateResponse,
    currentPlatform: Platform
  ) {
    if (currentPlatform === "instagram") {
      return data.instagramCaption || data.facebookCaption || "";
    }

    if (currentPlatform === "facebook") {
      return data.facebookCaption || data.instagramCaption || "";
    }

    if (currentPlatform === "pinterest") {
      return data.pinterestCaption || "";
    }

    return "";
  }

  async function generateOne(item: ContentItem, currentPlatform: Platform) {
    const body =
      item.type === "store"
        ? {
            platform: currentPlatform,
            mode: "single",
            kind: item.kind,
          }
        : {
            platform: currentPlatform,
            mode: "single",
            slug: item.slug,
          };

    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await safeJson(res)) as GenerateResponse;
    return { res, data };
  }

  async function generateAll(currentPlatform: Platform, group: ContentGroup) {
    let body: Record<string, unknown>;

    if (group === "store") {
      body = {
        platform: currentPlatform,
        mode: "single",
        kind: "ebook",
      };
    } else {
      body = {
        platform: currentPlatform,
        mode: "all",
      };
    }

    const res = await fetch("/api/admin/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
        `Generating ${
          platform === "instagram" ? "Instagram card" : "Pinterest pin"
        } for ${selectedItem.label}...`
      );

      const { res, data } = await generateOne(selectedItem, platform);

      if (!res.ok || (!data?.success && !data?.ok)) {
        throw new Error(
          data?.error || data?.message || `${platform} generation failed`
        );
      }

      const image = data.image || data.result?.image || "";
      const publishImage =
        data.publishImage || data.result?.publishImage || image || "";
      const storage = data.storage || data.result?.storage;
      const assetPath = data.path || data.result?.path || "";
      const caption = getCaptionForResponse(data, platform);
      const variants =
        platform === "instagram" && Array.isArray(data.instagramCaptionVariants)
          ? data.instagramCaptionVariants.filter(Boolean)
          : platform === "facebook" && Array.isArray(data.facebookCaptionVariants)
            ? data.facebookCaptionVariants.filter(Boolean)
            : platform === "pinterest" && Array.isArray(data.pinterestCaptionVariants)
              ? data.pinterestCaptionVariants.filter(Boolean)
              : caption
                ? [caption]
                : [];

      setCaptionVariants(variants);
      setSelectedCaptionVariant(0);

      const initialCaption = variants[0] || caption || "";

      if (image && storage && assetPath) {
        addGeneratedImage({
          slug: selectedItem.slug,
          label: selectedItem.label,
          type: selectedItem.type,
          image,
          publishImage,
          storage,
          path: assetPath,
          platform,
          caption: initialCaption,
          captionVariants: variants,
        });
      }

      setStatus(
        data?.message ||
          `${
            platform === "instagram" ? "Instagram card" : "Pinterest pin"
          } generated for ${selectedItem.label}`
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

      const groupLabel =
        selectedGroup === "recipe"
          ? "recipes"
          : selectedGroup === "guide"
            ? "guides"
            : "store content";

      setStatus(
        `Generating ${
          selectedGroup === "store" ? "selected" : "all"
        } ${
          platform === "instagram" ? "Instagram cards" : "Pinterest pins"
        } for ${groupLabel}...`
      );

      const { res, data } = await generateAll(platform, selectedGroup);

      if (!res.ok || (!data?.success && !data?.ok)) {
        throw new Error(
          data?.error || data?.message || `Bulk ${platform} generation failed`
        );
      }

      if (selectedGroup === "store") {
        if (!selectedItem || selectedItem.type !== "store") {
          setStatus("No store item selected");
          return;
        }

        const image = data.image || "";
        const publishImage = data.publishImage || image || "";
        const storage = data.storage;
        const assetPath = data.path || "";
        const caption = getCaptionForResponse(data, platform);
      const variants =
        platform === "instagram" && Array.isArray(data.instagramCaptionVariants)
          ? data.instagramCaptionVariants.filter(Boolean)
          : platform === "facebook" && Array.isArray(data.facebookCaptionVariants)
            ? data.facebookCaptionVariants.filter(Boolean)
            : platform === "pinterest" && Array.isArray(data.pinterestCaptionVariants)
              ? data.pinterestCaptionVariants.filter(Boolean)
              : caption
                ? [caption]
                : [];

      setCaptionVariants(variants);
      setSelectedCaptionVariant(0);

      const initialCaption = variants[0] || caption || "";

        if (image && storage && assetPath) {
          const mappedItem: GeneratedImageItem = {
            slug: selectedItem.slug,
            label: selectedItem.label,
            type: "store",
            image,
            publishImage,
            storage,
            path: assetPath,
            cacheKey: Date.now(),
            platform,
            caption,
            captionVariants: caption ? [caption] : [],
          };

          setGeneratedImages([mappedItem]);
          setActiveFromItem(mappedItem);
          setStatus(
            data?.message || `${platform} promo generated for ${selectedItem.label}`
          );
          return;
        }

        setStatus(
          "Generation completed, but no previewable store asset was returned."
        );
        return;
      }

      const bulkData = data as any;

      const generated = Array.isArray(bulkData?.generated)
        ? bulkData.generated
        : Array.isArray(bulkData?.results)
          ? bulkData.results
          : Array.isArray(bulkData?.items)
            ? bulkData.items
            : Array.isArray(bulkData?.result?.generated)
              ? bulkData.result.generated
              : Array.isArray(bulkData?.result?.results)
                ? bulkData.result.results
                : Array.isArray(bulkData?.result?.items)
                  ? bulkData.result.items
                  : [];

      const allowedTypes =
        selectedGroup === "recipe" ? new Set(["recipe"]) : new Set(["guide"]);

      const sourceItems = slugs.filter((item) => allowedTypes.has(item.type));
      const now = Date.now();

      const mapped = generated
        .map((item: any, index: number) => {
          const slug =
            item?.slug || item?.result?.slug || item?.data?.slug || "";

          const image =
            item?.image || item?.result?.image || item?.data?.image || "";

          const publishImage =
            item?.publishImage ||
            item?.result?.publishImage ||
            item?.data?.publishImage ||
            image;

          const storage =
            item?.storage ||
            item?.result?.storage ||
            item?.data?.storage ||
            "blob";

          const assetPath =
            item?.path || item?.result?.path || item?.data?.path || "";

          if (!slug || !image) return null;

          const match = sourceItems.find((s) => s.slug === slug);

          if (!match) return null;

          return {
            slug,
            label: match.label,
            type: match.type,
            image,
            publishImage,
            storage,
            path: assetPath,
            cacheKey: now + index,
            platform,
          } satisfies GeneratedImageItem;
        })
        .filter(Boolean) as GeneratedImageItem[];

      setGeneratedImages(mapped);

      if (mapped.length === 0) {
        setStatus(
          "Generation completed, but no previewable image items were returned."
        );
        return;
      }

      setActiveFromItem(mapped[0]);

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

  async function handleQueueCurrentAsset() {
    if (!activeImageUrl || !activeSlug || !activeType) {
      setQueueStatus("Generate an asset first");
      return;
    }

    if (!queueScheduledFor) {
      setQueueStatus("Select a schedule time");
      return;
    }

    if (activePlatform === "pinterest" && !queueBoard) {
      setQueueStatus("Select a Pinterest board");
      return;
    }

    try {
      setQueueLoading(true);
      setQueueStatus("Queueing current generated asset...");
      setQueueDebug("");

      const body = {
        slug: activeSlug,
        title: activeImageLabel,
        platform: activePlatform as QueuePlatform,
        scheduledFor: new Date(queueScheduledFor).toISOString(),
        board: activePlatform === "pinterest" ? queueBoard : null,
        assetType: "image",
        contentType: activeType,
        kind: activeType === "store" ? "ebook" : "standard",
        caption: activeCaption,
        url: buildContentUrl(activeType, activeSlug),
        imageUrl: activeImageUrl,
        publishImageUrl: activePublishImageUrl || activeImageUrl,
      };

      const res = await fetch("/api/admin/social/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await safeJson(res);
      setQueueDebug(JSON.stringify(data, null, 2));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Failed to queue post");
      }

      setQueueStatus("Queued the exact generated asset successfully");
    } catch (err: any) {
      setQueueStatus(err?.message || "Failed to queue post");
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleRunQueueNow() {
    try {
      setRunQueueLoading(true);
      setQueueStatus("Running queue...");
      setQueueDebug("");

      const res = await fetch("/api/admin/social/queue/run-now", {
        method: "POST",
      });

      const data = (await safeJson(res)) as QueueRunResponse;
      setQueueDebug(JSON.stringify(data, null, 2));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Failed to run queue");
      }

      setQueueStatus(
        `Processed ${data.attempted ?? 0} • Posted ${data.count ?? 0} • Failed ${
          data.failed ?? 0
        }`
      );
    } catch (err: any) {
      setQueueStatus(err?.message || "Failed to run queue");
    } finally {
      setRunQueueLoading(false);
    }
  }

  const activeImageSrc = activeImageUrl
    ? withCacheBust(activeImageUrl, activeCacheKey || Date.now())
    : "";

  const selectedSlugValue =
    selectedGroup === "recipe"
      ? selectedRecipeSlug
      : selectedGroup === "guide"
        ? selectedGuideSlug
        : selectedStoreSlug;

  const visibleCount =
    selectedGroup === "recipe"
      ? recipeSlugs.length
      : selectedGroup === "guide"
        ? guideSlugs.length
        : storeSlugs.length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white">
      <div className="mb-8">
        <p className="mb-2 text-sm uppercase tracking-[0.25em] text-yellow-300">
          Admin Social
        </p>
        <h1 className="text-3xl font-bold text-yellow-100">Social Generator</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-300">
          Generate once, preview once, then queue the exact approved asset from this
          page.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">
          <h2 className="mb-4 text-lg font-semibold text-yellow-200">Controls</h2>

          <label className="mb-2 block text-sm font-medium text-yellow-200">
            Platform
          </label>

          <div className="mb-5 grid grid-cols-3 gap-2">
            {(["instagram", "pinterest", "facebook"] as const).map((value) => (
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
            Content group
          </label>

          <div className="mb-5 grid grid-cols-3 gap-2">
            {(["recipe", "guide", "store"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedGroup(value)}
                disabled={loadingSlugs || generatingOne || generatingAll}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedGroup === value
                    ? "bg-yellow-600 text-black"
                    : "border border-yellow-700/40 bg-neutral-900 text-yellow-100"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {value === "recipe"
                  ? "Recipes"
                  : value === "guide"
                    ? "Guides"
                    : "Store"}
              </button>
            ))}
          </div>

          <label
            htmlFor="social-slug"
            className="mb-2 block text-sm font-medium text-yellow-200"
          >
            Select item
          </label>

          {selectedGroup === "recipe" ? (
            <select
              id="social-slug"
              value={selectedRecipeSlug}
              onChange={(e) => setSelectedRecipeSlug(e.target.value)}
              disabled={
                loadingSlugs ||
                generatingOne ||
                generatingAll ||
                recipeSlugs.length === 0
              }
              className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
            >
              {loadingSlugs ? (
                <option value="">Loading recipes...</option>
              ) : recipeSlugs.length === 0 ? (
                <option value="">No recipes found</option>
              ) : (
                recipeSlugs.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          ) : null}

          {selectedGroup === "guide" ? (
            <select
              id="social-slug"
              value={selectedGuideSlug}
              onChange={(e) => setSelectedGuideSlug(e.target.value)}
              disabled={
                loadingSlugs ||
                generatingOne ||
                generatingAll ||
                guideSlugs.length === 0
              }
              className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
            >
              {loadingSlugs ? (
                <option value="">Loading guides...</option>
              ) : guideSlugs.length === 0 ? (
                <option value="">No guides found</option>
              ) : (
                guideSlugs.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          ) : null}

          {selectedGroup === "store" ? (
            <select
              id="social-slug"
              value={selectedStoreSlug}
              onChange={(e) => setSelectedStoreSlug(e.target.value)}
              disabled={generatingOne || generatingAll || storeSlugs.length === 0}
              className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
            >
              {storeSlugs.length === 0 ? (
                <option value="">No store products found</option>
              ) : (
                storeSlugs.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          ) : null}

          <div className="mt-5 rounded-xl border border-yellow-700/20 bg-neutral-950/70 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-neutral-400">Visible items</span>
              <span className="font-semibold text-white">{visibleCount}</span>
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
              <span className="text-neutral-400">Store products</span>
              <span className="font-semibold text-white">{storeSlugs.length}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Selected group</span>
              <span className="font-semibold capitalize text-white">{selectedGroup}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Selected slug</span>
              <span className="truncate font-semibold text-white">
                {selectedSlugValue || "—"}
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-neutral-400">Generate platform</span>
              <span className="font-semibold capitalize text-white">{platform}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={handleGenerateOne}
              disabled={loadingSlugs || generatingOne || generatingAll || !selectedItem}
              className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingOne
                ? "Generating..."
                : platform === "instagram"
                  ? `Generate selected Instagram ${selectedGroup === "store" ? "promo" : "card"}`
                  : platform === "facebook"
                    ? `Generate selected Facebook ${selectedGroup === "store" ? "promo" : "post"}`
                    : `Generate selected Pinterest ${selectedGroup === "store" ? "promo" : "pin"}`}
            </button>

            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={
                loadingSlugs ||
                generatingOne ||
                generatingAll ||
                visibleCount === 0
              }
              className="rounded-xl border border-yellow-700/40 bg-yellow-600 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingAll
                ? "Generating all..."
                : selectedGroup === "store"
                  ? platform === "instagram"
                    ? "Generate store Instagram promo"
                    : platform === "facebook"
                      ? "Generate store Facebook promo"
                      : "Generate store Pinterest promo"
                  : platform === "instagram"
                    ? `Generate all Instagram ${
                        selectedGroup === "recipe" ? "recipe cards" : "guide cards"
                      } (${visibleCount})`
                    : platform === "facebook"
                      ? `Generate all Facebook ${
                          selectedGroup === "recipe" ? "recipe posts" : "guide posts"
                        } (${visibleCount})`
                      : `Generate all Pinterest ${
                          selectedGroup === "recipe" ? "recipe pins" : "guide pins"
                        } (${visibleCount})`}
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
                  <div
                    className={`${
                      activePlatform === "pinterest" ? "aspect-[2/3]" : "aspect-square"
                    } bg-black`}
                  >
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

                  <div className="grid gap-4 sm:grid-cols-2">
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
                        Group
                      </p>
                      <p className="mt-1 text-sm font-semibold capitalize text-white">
                        {activeType || "—"}
                      </p>
                    </div>
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

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">
                        Caption
                      </p>
                      <span className="text-xs text-neutral-500">
                        Edit before queueing
                      </span>
                    </div>

                    {captionVariants.length > 1 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {captionVariants.map((variant, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setSelectedCaptionVariant(index);
                              updateActiveCaption(variant);
                            }}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              selectedCaptionVariant === index
                                ? "bg-yellow-600 text-black"
                                : "border border-yellow-700/30 bg-neutral-900 text-yellow-100"
                            }`}
                          >
                            {activePlatform === "instagram"
                              ? index === 0
                                ? "Warm"
                                : index === 1
                                  ? "Practical"
                                  : "Punchy"
                              : activePlatform === "pinterest"
                                ? index === 0
                                  ? "Search-friendly"
                                  : "Inviting"
                                : index === 0
                                  ? "Warm"
                                  : "Practical"}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <textarea
                      value={activeCaption}
                      onChange={(e) => updateActiveCaption(e.target.value)}
                      placeholder="Generated caption will appear here..."
                      rows={10}
                      className="mt-2 w-full rounded-xl border border-yellow-700/20 bg-neutral-950/70 p-4 text-sm text-neutral-200 outline-none"
                    />
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
              Queue this exact asset
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-yellow-200">
                  Queue platform
                </label>
                <div className="rounded-xl border border-yellow-700/20 bg-neutral-950/70 px-4 py-3 text-white capitalize">
                  {activePlatform || "Generate first"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-yellow-200">
                  Schedule
                </label>
                <input
                  type="datetime-local"
                  value={queueScheduledFor}
                  onChange={(e) => setQueueScheduledFor(e.target.value)}
                  className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            {activePlatform === "pinterest" ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-yellow-200">
                  Pinterest board
                </label>
                <select
                  value={queueBoard}
                  onChange={(e) => setQueueBoard(e.target.value)}
                  disabled={boardsLoading}
                  className="w-full rounded-xl border border-yellow-700/40 bg-neutral-900 px-4 py-3 text-white outline-none disabled:opacity-50"
                >
                  <option value="">
                    {boardsLoading ? "Loading boards..." : "Select board"}
                  </option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleQueueCurrentAsset}
                disabled={queueLoading || !activeImageUrl}
                className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {queueLoading ? "Queueing..." : "Queue current generated asset"}
              </button>

              <button
                type="button"
                onClick={handleRunQueueNow}
                disabled={runQueueLoading}
                className="rounded-xl border border-yellow-700/40 bg-yellow-600 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {runQueueLoading ? "Running queue..." : "Run queue now"}
              </button>
            </div>

            {queueStatus ? (
              <div className="mt-4 rounded-xl border border-yellow-700/30 bg-black/60 p-4 text-sm text-yellow-100">
                {queueStatus}
              </div>
            ) : null}

            {queueDebug ? (
              <pre className="mt-4 overflow-auto rounded-xl border border-yellow-700/20 bg-neutral-950/70 p-4 text-xs whitespace-pre-wrap text-neutral-200">
                {queueDebug}
              </pre>
            ) : null}
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
                      <div
                        className={`${
                          item.platform === "pinterest"
                            ? "aspect-[2/3]"
                            : "aspect-square"
                        } bg-black`}
                      >
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
                          {item.type} • {item.platform} • {item.storage}
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
