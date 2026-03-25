"use client";

import { useEffect, useMemo, useState } from "react";

type QueuePlatform = "instagram" | "pinterest" | "facebook";
type QueueStatus = "queued" | "posted" | "failed";
type QueueAssetType = "image" | "video";
type QueueContentType = "recipe" | "guide";

type QueueItem = {
  id: string;
  slug: string;
  title: string;
  platform: QueuePlatform;
  caption: string;
  url: string;
  board?: string;
  scheduledFor: string;
  status: QueueStatus;
  createdAt: string;
  postedAt?: string;
  error?: string;
  contentType?: QueueContentType;
  assetType?: QueueAssetType;
  imageUrl?: string;
  videoUrl?: string;
};

type SlugOption = {
  slug: string;
  title?: string;
  label: string;
  type?: "recipe" | "guide";
};

type PinterestBoard = {
  id: string;
  name: string;
};

function withCacheBust(url?: string) {
  if (!url) return "";
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${Date.now()}`;
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

function truncate(text: string, max = 140) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function statusClasses(status: QueueStatus) {
  if (status === "posted") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "failed") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
}

function platformClasses(platform: QueuePlatform) {
  if (platform === "instagram") {
    return "border-pink-500/40 bg-pink-500/10 text-pink-300";
  }

  if (platform === "pinterest") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return "border-blue-500/40 bg-blue-500/10 text-blue-300";
}

function assetClasses(assetType?: QueueAssetType) {
  if (assetType === "video") {
    return "border-purple-500/40 bg-purple-500/10 text-purple-300";
  }

  return "border-sky-500/40 bg-sky-500/10 text-sky-300";
}

function normalizeSlugOption(item: SlugOption): SlugOption {
  return {
    ...item,
    label: item.label || item.title || item.slug,
    type: item.type || "recipe",
  };
}

export default function SocialQueuePage() {
  const [queueSlug, setQueueSlug] = useState("");
  const [queuePlatform, setQueuePlatform] =
    useState<QueuePlatform>("instagram");
  const [queueAssetType, setQueueAssetType] =
    useState<QueueAssetType>("image");
  const [scheduledFor, setScheduledFor] = useState("");
  const [board, setBoard] = useState("");

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [availableSlugs, setAvailableSlugs] = useState<SlugOption[]>([]);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);

  const [queueLoading, setQueueLoading] = useState(false);
  const [slugsLoading, setSlugsLoading] = useState(false);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [autoQueueLoading, setAutoQueueLoading] = useState(false);
  const [itemActionLoadingId, setItemActionLoadingId] = useState<string | null>(
    null
  );

  const [log, setLog] = useState("Waiting...");
  const [debugResponse, setDebugResponse] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const selectedSlugItem = useMemo(
    () => availableSlugs.find((item) => item.slug === queueSlug) ?? null,
    [availableSlugs, queueSlug]
  );

  const queuedItems = useMemo(
    () => queueItems.filter((item) => item.status === "queued"),
    [queueItems]
  );

  const failedItems = useMemo(
    () => queueItems.filter((item) => item.status === "failed"),
    [queueItems]
  );

  const postedItems = useMemo(
    () => queueItems.filter((item) => item.status === "posted"),
    [queueItems]
  );

  async function loadQueue() {
    try {
      const res = await fetch("/api/admin/social/queue", {
        cache: "no-store",
      });
      const data = await res.json();
      setQueueItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setQueueItems([]);
    }
  }

  async function loadSlugs() {
    try {
      setSlugsLoading(true);

      const res = await fetch("/api/admin/social/slugs", {
        cache: "no-store",
      });

      const data = await res.json();

      setAvailableSlugs(
        Array.isArray(data.slugs)
          ? data.slugs.map(normalizeSlugOption)
          : []
      );
    } catch {
      setAvailableSlugs([]);
    } finally {
      setSlugsLoading(false);
    }
  }

  async function loadBoards() {
    try {
      setBoardsLoading(true);

      const res = await fetch("/api/pinterest/boards", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.ok) {
        setBoards(Array.isArray(data.items) ? data.items : []);
      } else {
        setBoards([]);
      }
    } catch {
      setBoards([]);
    } finally {
      setBoardsLoading(false);
    }
  }

  async function refresh() {
    await Promise.all([loadQueue(), loadSlugs(), loadBoards()]);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!scheduledFor) {
      const next = new Date();
      next.setMinutes(next.getMinutes() + 10);
      next.setSeconds(0, 0);
      setScheduledFor(formatDateTimeLocal(next));
    }
  }, [scheduledFor]);

  function setQuickSchedule(fn: () => Date) {
    setScheduledFor(formatDateTimeLocal(fn()));
  }

  function queueSummaryText(data: any) {
    return [
      data?.message || "Queued",
      data?.item?.assetType ? `Asset: ${data.item.assetType}` : "",
      data?.item?.imageUrl ? `Image: ${data.item.imageUrl}` : "",
      data?.item?.videoUrl ? `Video: ${data.item.videoUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function queuePost() {
    if (!queueSlug) {
      setLog("Select content first");
      return;
    }

    if (!scheduledFor) {
      setLog("Select schedule time");
      return;
    }

    if (queuePlatform === "pinterest" && !board) {
      setLog("Select board");
      return;
    }

    setQueueLoading(true);
    setDebugResponse("");

    try {
      const res = await fetch("/api/admin/social/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: queueSlug,
          platform: queuePlatform,
          scheduledFor,
          board: queuePlatform === "pinterest" ? board : null,
          assetType: queueAssetType,
        }),
      });

      const data = await res.json();
      setDebugResponse(JSON.stringify(data, null, 2));

      if (!res.ok) {
        setLog(data.error || "Failed");
        setShowDebug(true);
        return;
      }

      setLog(queueSummaryText(data));
      await loadQueue();
    } catch (err: any) {
      setLog(err?.message || "Failed");
      setDebugResponse(
        JSON.stringify(
          {
            error: err?.message || "Unknown client error while queueing",
          },
          null,
          2
        )
      );
      setShowDebug(true);
    } finally {
      setQueueLoading(false);
    }
  }

  async function runQueue() {
    setQueueLoading(true);
    setDebugResponse("");

    try {
      const res = await fetch("/api/admin/social/queue/run-now", {
        method: "POST",
      });

      const data = await res.json();
      setDebugResponse(JSON.stringify(data, null, 2));

      if (!res.ok) {
        setLog(data.error || "Failed");
        setShowDebug(true);
        await loadQueue();
        return;
      }

      const failed = data?.failed ?? 0;
      const attempted = data?.attempted ?? 0;
      const count = data?.count ?? 0;

      setLog(`Processed ${attempted}\nPosted: ${count}\nFailed: ${failed}`);

      if (failed > 0) {
        setShowDebug(true);
      }

      await loadQueue();
    } catch (err: any) {
      setLog(err?.message || "Failed");
      setDebugResponse(
        JSON.stringify(
          {
            error: err?.message || "Unknown client error while running queue",
          },
          null,
          2
        )
      );
      setShowDebug(true);
    } finally {
      setQueueLoading(false);
    }
  }

  async function clearQueue() {
    if (!confirm("Clear queue?")) return;

    setQueueLoading(true);
    setDebugResponse("");

    try {
      const res = await fetch("/api/admin/social/queue", {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      setDebugResponse(JSON.stringify(data, null, 2));

      setLog("Queue cleared");
      await loadQueue();
    } catch {
      setLog("Failed");
      setDebugResponse(
        JSON.stringify(
          {
            error: "Unknown client error while clearing queue",
          },
          null,
          2
        )
      );
      setShowDebug(true);
    } finally {
      setQueueLoading(false);
    }
  }

  async function build30() {
    if (!board) {
      setLog("Select board");
      return;
    }

    setQueueLoading(true);
    setDebugResponse("");

    try {
      const res = await fetch("/api/admin/social/auto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days: 30,
          platform: "pinterest",
          board,
        }),
      });

      const data = await res.json();
      setDebugResponse(JSON.stringify(data, null, 2));
      setLog(`Created ${data.count || 0}`);
      await loadQueue();
    } catch {
      setLog("Failed");
      setDebugResponse(
        JSON.stringify(
          {
            error: "Unknown client error while building 30-day queue",
          },
          null,
          2
        )
      );
      setShowDebug(true);
    } finally {
      setQueueLoading(false);
    }
  }

  async function queueNext7Days() {
    if (!board) {
      setLog("Select board first");
      return;
    }

    setAutoQueueLoading(true);
    setDebugResponse("");

    try {
      const res = await fetch("/api/admin/social/queue/auto-week", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinterestBoardId: board,
          startDate: scheduledFor ? scheduledFor.slice(0, 10) : undefined,
          videoPlatform: "instagram",
          dryRun: false,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setDebugResponse(JSON.stringify(data, null, 2));

      if (!res.ok || !data?.ok) {
        setLog(data?.error || "Failed to queue 7-day plan");
        setShowDebug(true);
        return;
      }

      setLog(`Queued ${data.count || 0} items for the next 7 days`);
      await loadQueue();
    } catch (err: any) {
      setLog(err?.message || "Failed to queue 7-day plan");
      setDebugResponse(
        JSON.stringify(
          {
            error:
              err?.message || "Unknown client error while queueing weekly plan",
          },
          null,
          2
        )
      );
      setShowDebug(true);
    } finally {
      setAutoQueueLoading(false);
    }
  }

  async function itemAction(
    id: string,
    action: "post-now" | "retry" | "delete"
  ) {
    setItemActionLoadingId(id);
    setDebugResponse("");

    try {
      if (action === "delete") {
        const res = await fetch("/api/admin/social/queue", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action: "delete",
          }),
        });

        const data = await res.json().catch(() => ({}));
        setDebugResponse(JSON.stringify(data, null, 2));

        if (!res.ok) {
          setLog(data?.error || "Failed to remove queue item");
          setShowDebug(true);
          await loadQueue();
          return;
        }

        setLog("Queue item removed");
        await loadQueue();
        return;
      }

      if (action === "retry") {
        const res = await fetch("/api/admin/social/queue", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            action: "retry",
          }),
        });

        const data = await res.json().catch(() => ({}));
        setDebugResponse(JSON.stringify(data, null, 2));

        if (!res.ok) {
          setLog(data?.error || "Failed to retry queue item");
          setShowDebug(true);
          await loadQueue();
          return;
        }

        setLog("Failed item moved back to queued");
        await loadQueue();
        return;
      }

      if (action === "post-now") {
        const runRes = await fetch("/api/admin/social/queue/run-now", {
          method: "POST",
        });

        const runData = await runRes.json().catch(() => ({}));
        setDebugResponse(JSON.stringify(runData, null, 2));

        if (!runRes.ok) {
          setLog(runData?.error || "Failed to run queue after post now");
          setShowDebug(true);
          await loadQueue();
          return;
        }

        const failed = runData?.failed ?? 0;
        const attempted = runData?.attempted ?? 0;
        const count = runData?.count ?? 0;

        setLog(`Processed ${attempted}\nPosted: ${count}\nFailed: ${failed}`);

        if (failed > 0) {
          setShowDebug(true);
        }

        await loadQueue();
        return;
      }
    } catch (err: any) {
      setLog(err?.message || "Action failed");
      setDebugResponse(
        JSON.stringify(
          {
            error:
              err?.message || "Unknown client error while updating queue item",
          },
          null,
          2
        )
      );
      setShowDebug(true);
      await loadQueue();
    } finally {
      setItemActionLoadingId(null);
    }
  }

  function boardName(id?: string) {
    if (!id) return "";
    return boards.find((b) => b.id === id)?.name || id;
  }

  function renderAssetPreview(item: QueueItem) {
    if (item.assetType === "video") {
      return (
        <div className="space-y-2">
          {item.imageUrl ? (
            <a
              href={withCacheBust(item.imageUrl)}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-[var(--border)] bg-black/20"
            >
              <img
                src={withCacheBust(item.imageUrl)}
                alt={item.title || item.slug}
                className="h-32 w-full object-cover"
              />
            </a>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-6 text-center text-xs text-[var(--text-soft)]">
              No thumbnail
            </div>
          )}

          {item.videoUrl ? (
            <a
              href={withCacheBust(item.videoUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--brand-gold)]"
            >
              Open video
            </a>
          ) : null}
        </div>
      );
    }

    if (item.imageUrl) {
      return (
        <a
          href={withCacheBust(item.imageUrl)}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-[var(--border)] bg-black/20"
        >
          <img
            src={withCacheBust(item.imageUrl)}
            alt={item.title || item.slug}
            className="h-32 w-full object-cover"
          />
        </a>
      );
    }

    return (
      <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-6 text-center text-xs text-[var(--text-soft)]">
        No asset preview
      </div>
    );
  }

  function renderItemCard(item: QueueItem) {
    const busy = itemActionLoadingId === item.id;

    return (
      <div
        key={item.id}
        className="rounded-2xl border border-[var(--border)] bg-black/20 p-4"
      >
        <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
          <div>{renderAssetPreview(item)}</div>

          <div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${platformClasses(
                  item.platform
                )}`}
              >
                {item.platform}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClasses(
                  item.status
                )}`}
              >
                {item.status}
              </span>

              {item.contentType ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  {item.contentType}
                </span>
              ) : null}

              {item.assetType ? (
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${assetClasses(
                    item.assetType
                  )}`}
                >
                  {item.assetType}
                </span>
              ) : null}
            </div>

            <div className="mt-3 text-lg font-bold text-[var(--brand-gold)]">
              {item.title || item.slug}
            </div>

            <div className="mt-1 text-xs text-[var(--text-soft)]">
              {item.slug}
            </div>

            <div className="mt-3 grid gap-2 text-xs text-white/80 md:grid-cols-2">
              <div>
                <span className="font-semibold text-white">Scheduled:</span>{" "}
                {new Date(item.scheduledFor).toLocaleString()}
              </div>

              <div>
                <span className="font-semibold text-white">Created:</span>{" "}
                {new Date(item.createdAt).toLocaleString()}
              </div>

              {item.board ? (
                <div>
                  <span className="font-semibold text-white">Board:</span>{" "}
                  {boardName(item.board)}
                </div>
              ) : null}

              {item.postedAt ? (
                <div>
                  <span className="font-semibold text-white">Posted:</span>{" "}
                  {new Date(item.postedAt).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/80">
              <div className="mb-1 font-semibold text-white">Caption preview</div>
              {truncate(item.caption, 220)}
            </div>

            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-xs text-sky-300"
              >
                {item.url}
              </a>
            ) : null}

            {item.imageUrl ? (
              <a
                href={withCacheBust(item.imageUrl)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all text-xs text-sky-300"
              >
                Image: {withCacheBust(item.imageUrl)}
              </a>
            ) : null}

            {item.videoUrl ? (
              <a
                href={withCacheBust(item.videoUrl)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-xs text-sky-300"
              >
                Video: {withCacheBust(item.videoUrl)}
              </a>
            ) : null}

            {item.error ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {item.error}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {(item.status === "queued" || item.status === "failed") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => itemAction(item.id, "post-now")}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--brand-gold)] disabled:opacity-50"
                >
                  {busy ? "Working..." : "Post now"}
                </button>
              )}

              {item.status === "failed" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => itemAction(item.id, "retry")}
                  className="rounded-lg border border-yellow-500/40 px-3 py-2 text-xs font-semibold text-yellow-300 disabled:opacity-50"
                >
                  {busy ? "Working..." : "Retry failed"}
                </button>
              )}

              {item.status !== "posted" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => itemAction(item.id, "delete")}
                  className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50"
                >
                  {busy ? "Working..." : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nextHour = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  };

  const inTenMins = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10, 0, 0);
    return d;
  };

  const tomorrowNine = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const tomorrowSix = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d;
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
          Admin
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-[var(--brand-gold)]">
            Social Queue
          </h1>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2 text-sm text-white">
              Queued:{" "}
              <span className="font-bold text-[var(--brand-gold)]">
                {queuedItems.length}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2 text-sm text-white">
              Failed:{" "}
              <span className="font-bold text-red-300">{failedItems.length}</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2 text-sm text-white">
              Posted:{" "}
              <span className="font-bold text-emerald-300">
                {postedItems.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-8">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-xl font-bold text-[var(--brand-gold)]">
              Schedule Post
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-bold text-[var(--brand-gold)]">
                  Content
                </label>

                <select
                  value={queueSlug}
                  onChange={(e) => setQueueSlug(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"
                >
                  <option value="">{slugsLoading ? "Loading" : "Select"}</option>

                  {availableSlugs.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-[var(--brand-gold)]">
                  Platform
                </label>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["instagram", "pinterest", "facebook"] as const).map(
                    (platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => {
                          setQueuePlatform(platform);
                          if (platform === "pinterest") {
                            setQueueAssetType("image");
                          }
                        }}
                        className={`rounded-xl px-4 py-3 text-sm font-bold capitalize ${
                          queuePlatform === platform
                            ? "bg-[var(--brand-gold)] text-black"
                            : "border border-[var(--border)] bg-black/30 text-white"
                        }`}
                      >
                        {platform}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-[var(--brand-gold)]">
                  Asset Type
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["image", "video"] as const).map((asset) => {
                    const disabled =
                      queuePlatform === "pinterest" && asset === "video";

                    return (
                      <button
                        key={asset}
                        type="button"
                        disabled={disabled}
                        onClick={() => setQueueAssetType(asset)}
                        className={`rounded-xl px-4 py-3 text-sm font-bold capitalize ${
                          queueAssetType === asset
                            ? "bg-[var(--brand-gold)] text-black"
                            : "border border-[var(--border)] bg-black/30 text-white"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {asset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {queuePlatform === "pinterest" ? (
                <div>
                  <label className="text-sm font-bold text-[var(--brand-gold)]">
                    Pinterest Board
                  </label>

                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"
                  >
                    <option value="">
                      {boardsLoading ? "Loading" : "Select board"}
                    </option>

                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="text-sm font-bold text-[var(--brand-gold)]">
                  Schedule
                </label>

                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(inTenMins)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    +10 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(nextHour)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Next hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(tomorrowNine)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Tomorrow 9am
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(tomorrowSix)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Tomorrow 6pm
                  </button>
                </div>
              </div>

              {selectedSlugItem ? (
                <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4 text-sm">
                  <div className="font-bold text-[var(--brand-gold)]">Selected</div>
                  <div className="mt-2 text-white">{selectedSlugItem.label}</div>
                  <div className="mt-1 text-xs text-[var(--text-soft)]">
                    Platform: {queuePlatform}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-soft)]">
                    Asset: {queueAssetType}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => queuePost()}
                  disabled={queueLoading}
                  className="rounded-xl bg-[var(--brand-red)] px-6 py-3 font-bold text-white disabled:opacity-50"
                >
                  Queue post
                </button>

                <button
                  onClick={() => runQueue()}
                  disabled={queueLoading}
                  className="rounded-xl border border-[var(--border)] px-6 py-3 font-bold text-[var(--brand-gold)] disabled:opacity-50"
                >
                  Run queue
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-xl font-bold text-[var(--brand-gold)]">
              Quick Actions
            </h2>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => queueNext7Days()}
                disabled={queueLoading || autoQueueLoading || !board}
                className="rounded-xl bg-[var(--brand-gold)] px-6 py-3 font-bold text-black disabled:opacity-50"
              >
                {autoQueueLoading ? "Queueing 7 days..." : "Queue next 7 days"}
              </button>

              <button
                onClick={() => build30()}
                disabled={queueLoading || !board}
                className="rounded-xl bg-[var(--brand-gold)] px-6 py-3 font-bold text-black disabled:opacity-50"
              >
                Build 30 days Pinterest
              </button>

              <button
                onClick={() => clearQueue()}
                disabled={queueLoading}
                className="rounded-xl border border-red-500 px-6 py-3 font-bold text-red-400 disabled:opacity-50"
              >
                Clear queue
              </button>

              <button
                type="button"
                onClick={() => setShowDebug((v) => !v)}
                className="rounded-xl border border-[var(--border)] px-6 py-3 font-bold text-white"
              >
                {showDebug ? "Hide debug" : "Show debug"}
              </button>
            </div>

            <pre className="mt-5 min-h-[160px] rounded-xl bg-black/30 p-5 text-xs whitespace-pre-wrap">
              {log}
            </pre>
          </div>

          {showDebug ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
              <h2 className="text-xl font-bold text-[var(--brand-gold)]">
                Raw API Debug
              </h2>

              <pre className="mt-4 min-h-[240px] overflow-auto rounded-xl bg-black/30 p-5 text-xs whitespace-pre-wrap text-left">
                {debugResponse || "No response captured yet."}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--brand-gold)]">
                Queued
              </h2>
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-yellow-300">
                {queuedItems.length}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {queuedItems.length ? (
                queuedItems.map((item) => renderItemCard(item))
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-10 text-center text-sm text-[var(--text-soft)]">
                  No queued items.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--brand-gold)]">
                Failed
              </h2>
              <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-red-300">
                {failedItems.length}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {failedItems.length ? (
                failedItems.map((item) => renderItemCard(item))
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-10 text-center text-sm text-[var(--text-soft)]">
                  No failed items.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--brand-gold)]">
                Posted Recently
              </h2>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                {postedItems.length}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {postedItems.length ? (
                postedItems.map((item) => renderItemCard(item))
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-10 text-center text-sm text-[var(--text-soft)]">
                  No posted items yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}