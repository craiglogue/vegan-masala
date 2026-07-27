"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QueuePlatform = "instagram" | "pinterest" | "facebook";
type QueueStatus = "queued" | "posted" | "failed";

type QueueItem = {
  id: string;
  slug: string;
  title: string;
  platform: QueuePlatform;
  caption: string;
  url: string;
  board?: string | null;
  scheduledFor: string;
  status: QueueStatus;
  createdAt: string;
  attemptedAt?: string;
  completedAt?: string;
  postedAt?: string;
  error?: string;
  errorCategory?: "authentication" | "media" | "validation" | "platform_api" | "unknown";
  retryable?: boolean;
  platformResponseId?: string | null;
};

type MetaHealthResponse = {
  instagramConfigured: boolean;
  facebookConfigured?: boolean;
  missing?: string[];
  warnings?: string[];
  error?: string;
};

type PinterestBoard = {
  id: string;
  name: string;
};

type PinterestBoardsResponse = {
  ok: boolean;
  count?: number;
  items?: PinterestBoard[];
  error?: string;
};

type FailureCategory =
  | "authentication"
  | "media URL"
  | "validation"
  | "platform API"
  | "unknown";

const CATEGORY_ORDER: FailureCategory[] = [
  "authentication",
  "media URL",
  "validation",
  "platform API",
  "unknown",
];

function formatDateTime(value?: string) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const delta = date.getTime() - Date.now();
  const abs = Math.abs(delta);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  const suffix = delta >= 0 ? "from now" : "ago";

  if (minutes < 60) {
    return `${Math.max(1, minutes)} min ${suffix}`;
  }

  if (hours < 24) {
    return `${Math.max(1, hours)} hr ${suffix}`;
  }

  return `${Math.max(1, days)} day ${suffix}`;
}

function truncate(text: string, max = 160) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function activityTimestamp(item: QueueItem) {
  return item.completedAt || item.postedAt || item.attemptedAt || item.createdAt;
}

function successTimestamp(item: QueueItem) {
  return item.postedAt || item.completedAt || item.attemptedAt || item.createdAt;
}

function displayFailureCategory(item: QueueItem) {
  switch (item.errorCategory) {
    case "authentication":
      return "authentication";
    case "media":
      return "media URL";
    case "validation":
      return "validation";
    case "platform_api":
      return "platform API";
    case "unknown":
      return "unknown";
    default:
      return failureCategory(item.error);
  }
}

function retryableLabel(item: QueueItem) {
  if (typeof item.retryable === "boolean") {
    return item.retryable ? "Retryable" : "Not retryable";
  }

  const category = displayFailureCategory(item);
  return category === "platform API" || category === "unknown"
    ? "Likely retryable"
    : "Not retryable";
}

function statusChip(status: string) {
  if (status === "ok" || status === "connected" || status === "configured") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (status === "error" || status === "failed" || status === "not configured") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-white/80";
}

function platformChip(platform: QueuePlatform) {
  if (platform === "instagram") {
    return "border-pink-500/30 bg-pink-500/10 text-pink-300";
  }

  if (platform === "pinterest") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-blue-500/30 bg-blue-500/10 text-blue-300";
}

function failureCategory(error?: string): FailureCategory {
  const text = String(error || "").toLowerCase();

  if (!text) {
    return "unknown";
  }

  if (
    text.includes("auth") ||
    text.includes("oauth") ||
    text.includes("token") ||
    text.includes("login") ||
    text.includes("expired") ||
    text.includes("not connected") ||
    text.includes("session has expired")
  ) {
    return "authentication";
  }

  if (
    text.includes("image url") ||
    text.includes("video url") ||
    text.includes("media") ||
    text.includes("publicly reachable") ||
    text.includes("public url") ||
    text.includes("download") ||
    text.includes("fetch") ||
    text.includes("file not found") ||
    text.includes("image not found") ||
    text.includes("video not found")
  ) {
    return "media URL";
  }

  if (
    text.includes("required") ||
    text.includes("missing") ||
    text.includes("invalid") ||
    text.includes("unsupported") ||
    text.includes("preflight") ||
    text.includes("board required") ||
    text.includes("slug not found") ||
    text.includes("only supports")
  ) {
    return "validation";
  }

  if (
    text.includes("api") ||
    text.includes("container") ||
    text.includes("graph.facebook.com") ||
    text.includes("pinterest pin creation failed") ||
    text.includes("publish failed") ||
    text.includes("timeout") ||
    text.includes("rate limit") ||
    text.includes("service unavailable")
  ) {
    return "platform API";
  }

  return "unknown";
}

function latestByStatus(items: QueueItem[], platform: QueuePlatform, status: QueueStatus) {
  return items
    .filter((item) => item.platform === platform && item.status === status)
    .sort((a, b) => {
      const aTime = new Date(successTimestamp(a)).getTime();
      const bTime = new Date(successTimestamp(b)).getTime();
      return bTime - aTime;
    })[0];
}

function latestFailure(items: QueueItem[], platform: QueuePlatform) {
  return items
    .filter((item) => item.platform === platform && item.status === "failed")
    .sort((a, b) => {
      const aTime = new Date(activityTimestamp(a)).getTime();
      const bTime = new Date(activityTimestamp(b)).getTime();
      return bTime - aTime;
    });
}

export default function SocialHealthDashboardPage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [metaHealth, setMetaHealth] = useState<MetaHealthResponse | null>(null);
  const [pinterestHealth, setPinterestHealth] = useState<PinterestBoardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function loadDashboard() {
    setRefreshing(true);
    setError(null);

    try {
      const [queueRes, metaRes, pinterestRes] = await Promise.all([
        fetch("/api/admin/social/queue", { cache: "no-store" }),
        fetch("/api/admin/social/meta-health", { cache: "no-store" }),
        fetch("/api/pinterest/boards", { cache: "no-store" }),
      ]);

      const [queueData, metaData, pinterestData] = await Promise.all([
        queueRes.json().catch(() => null),
        metaRes.json().catch(() => null),
        pinterestRes.json().catch(() => null),
      ]);

      setQueueItems(Array.isArray(queueData?.items) ? queueData.items : []);

      setMetaHealth({
        instagramConfigured: Boolean(metaData?.instagramConfigured),
        facebookConfigured: Boolean(metaData?.facebookConfigured),
        missing: Array.isArray(metaData?.missing) ? metaData.missing : [],
        warnings: Array.isArray(metaData?.warnings) ? metaData.warnings : [],
        error: metaData?.error,
      });

      setPinterestHealth({
        ok: Boolean(pinterestData?.ok),
        error: pinterestData?.error,
        count: typeof pinterestData?.count === "number" ? pinterestData.count : undefined,
        items: Array.isArray(pinterestData?.items) ? pinterestData.items : [],
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load social health data");
      setQueueItems([]);
      setMetaHealth(null);
      setPinterestHealth(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date().toISOString());
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const queuedItems = useMemo(
    () => queueItems.filter((item) => item.status === "queued"),
    [queueItems]
  );

  const postedItems = useMemo(
    () => queueItems.filter((item) => item.status === "posted"),
    [queueItems]
  );

  const failedItems = useMemo(
    () => queueItems.filter((item) => item.status === "failed"),
    [queueItems]
  );

  const nextScheduledPost = useMemo(
    () =>
      [...queuedItems].sort(
        (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      )[0] || null,
    [queuedItems]
  );

  const recentActivity = useMemo(
    () =>
      [...queueItems]
        .filter((item) => item.status === "posted" || item.status === "failed")
        .sort(
          (a, b) =>
            new Date(activityTimestamp(b)).getTime() -
            new Date(activityTimestamp(a)).getTime()
        )
        .slice(0, 20),
    [queueItems]
  );

  const instagramLastSuccess = useMemo(
    () => latestByStatus(queueItems, "instagram", "posted"),
    [queueItems]
  );

  const pinterestLastSuccess = useMemo(
    () => latestByStatus(queueItems, "pinterest", "posted"),
    [queueItems]
  );

  const instagramFailures = useMemo(
    () => latestFailure(queueItems, "instagram").slice(0, 3),
    [queueItems]
  );

  const pinterestFailures = useMemo(
    () => latestFailure(queueItems, "pinterest").slice(0, 3),
    [queueItems]
  );

  const failureBuckets = useMemo(() => {
    const buckets = new Map<FailureCategory, QueueItem[]>();

    for (const item of failedItems) {
      const category = displayFailureCategory(item);
      const list = buckets.get(category) || [];
      list.push(item);
      buckets.set(category, list);
    }

    return CATEGORY_ORDER.map((category) => {
      const items = (buckets.get(category) || []).sort(
        (a, b) => new Date(activityTimestamp(b)).getTime() - new Date(activityTimestamp(a)).getTime()
      );

      return {
        category,
        count: items.length,
        items,
      };
    });
  }, [failedItems]);

  const pinterestBoards = Array.isArray(pinterestHealth?.items) ? pinterestHealth.items : [];
  const pinterestAuthStatus = pinterestHealth?.ok ? "Connected" : "Not connected";
  const pinterestBoardStatus =
    pinterestHealth?.ok && pinterestBoards.length > 0
      ? `${pinterestBoards.length} boards connected`
      : pinterestHealth?.ok
        ? "Connected, but no boards returned"
        : "Unavailable";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
          Admin
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--brand-gold)]">
              Social Health Dashboard
            </h1>

            <p className="mt-3 max-w-3xl text-sm text-[var(--text-soft)]">
              Monitor queue health, publishing readiness and recent activity from one read-only view.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right text-xs text-[var(--text-soft)]">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2 text-sm font-bold text-[var(--brand-gold)]"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <div>
              {loading
                ? "Loading current state..."
                : `Last updated ${formatRelativeTime(lastUpdated || undefined) || "just now"}`}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Queued items</div>
          <div className="mt-3 text-4xl font-extrabold text-[var(--brand-gold)]">{queuedItems.length}</div>
          <div className="mt-2 text-sm text-[var(--text-soft)]">Ready to publish when the queue runner runs.</div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Posted items</div>
          <div className="mt-3 text-4xl font-extrabold text-emerald-300">{postedItems.length}</div>
          <div className="mt-2 text-sm text-[var(--text-soft)]">Successful publishing attempts retained in the queue file.</div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Failed items</div>
          <div className="mt-3 text-4xl font-extrabold text-red-300">{failedItems.length}</div>
          <div className="mt-2 text-sm text-[var(--text-soft)]">Failures are grouped below for fast triage.</div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Next scheduled post</div>
          {nextScheduledPost ? (
            <>
              <div className="mt-3 text-lg font-extrabold text-white">{nextScheduledPost.title || nextScheduledPost.slug}</div>
              <div className="mt-1 text-sm text-[var(--text-soft)]">{formatDateTime(nextScheduledPost.scheduledFor)}</div>
              <div className="mt-2 text-xs text-[var(--text-soft)]">{nextScheduledPost.platform} • {formatRelativeTime(nextScheduledPost.scheduledFor)}</div>
            </>
          ) : (
            <div className="mt-3 text-sm text-[var(--text-soft)]">Nothing is currently scheduled.</div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Platform health</div>
          <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">Instagram</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Configured</div>
              <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusChip(metaHealth?.instagramConfigured ? "configured" : "not configured")}`}>
                {metaHealth?.instagramConfigured ? "Configured" : "Not configured"}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Last successful post</div>
              <div className="mt-2 text-sm font-bold text-white">
                {instagramLastSuccess ? instagramLastSuccess.title || instagramLastSuccess.slug : "No successful Instagram post yet"}
              </div>
              {instagramLastSuccess ? (
                <div className="mt-1 text-xs text-[var(--text-soft)]">
                  {formatDateTime(successTimestamp(instagramLastSuccess))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Recent failures</div>
            <div className="mt-3 space-y-3">
              {instagramFailures.length > 0 ? (
                instagramFailures.map((item) => (
                  <div key={item.id} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${platformChip(item.platform)}`}>{item.platform}</span>
                      <span className="text-xs text-red-200/80">{formatDateTime(activityTimestamp(item))}</span>
                    </div>
                    <div className="mt-2 font-semibold text-white">{item.title || item.slug}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-red-100/80">
                      <span>{displayFailureCategory(item)}</span>
                      <span>{retryableLabel(item)}</span>
                    </div>
                    <div className="mt-1 text-xs text-red-100/90">{truncate(item.error || "Failure recorded")}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[var(--text-soft)]">No recent Instagram failures.</div>
              )}
            </div>
          </div>

          {metaHealth?.warnings?.length ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="text-xs uppercase tracking-[0.14em] text-amber-200/70">Warnings</div>
              <div className="mt-2 space-y-1">
                {metaHealth.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Platform health</div>
          <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">Pinterest</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Authentication status</div>
              <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusChip(pinterestHealth?.ok ? "connected" : "failed")}`}>
                {pinterestAuthStatus}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Board connection status</div>
              <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusChip(pinterestHealth?.ok && pinterestBoards.length > 0 ? "connected" : pinterestHealth?.ok ? "warning" : "failed")}`}>
                {pinterestBoardStatus}
              </div>
              {pinterestBoards.length > 0 ? (
                <div className="mt-2 text-xs text-[var(--text-soft)]">
                  {pinterestBoards[0].name}
                  {pinterestBoards.length > 1 ? ` and ${pinterestBoards.length - 1} more` : ""}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Last successful pin</div>
            <div className="mt-2 text-sm font-bold text-white">
              {pinterestLastSuccess ? pinterestLastSuccess.title || pinterestLastSuccess.slug : "No successful Pinterest pin yet"}
            </div>
            {pinterestLastSuccess ? (
              <div className="mt-1 text-xs text-[var(--text-soft)]">
                {formatDateTime(successTimestamp(pinterestLastSuccess))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Recent failures</div>
            <div className="mt-3 space-y-3">
              {pinterestFailures.length > 0 ? (
                pinterestFailures.map((item) => (
                  <div key={item.id} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${platformChip(item.platform)}`}>{item.platform}</span>
                      <span className="text-xs text-red-200/80">{formatDateTime(activityTimestamp(item))}</span>
                    </div>
                    <div className="mt-2 font-semibold text-white">{item.title || item.slug}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-red-100/80">
                      <span>{displayFailureCategory(item)}</span>
                      <span>{retryableLabel(item)}</span>
                    </div>
                    <div className="mt-1 text-xs text-red-100/90">{truncate(item.error || "Failure recorded")}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[var(--text-soft)]">No recent Pinterest failures.</div>
              )}
            </div>
          </div>

          {pinterestHealth?.error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {pinterestHealth.error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Failure analysis</div>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">Grouped by root cause</h2>
          </div>
          <div className="text-sm text-[var(--text-soft)]">
            Based on the current queue file and recent publish errors.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {failureBuckets.map((bucket) => (
            <div key={bucket.category} className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">{bucket.category}</div>
              <div className="mt-2 text-3xl font-extrabold text-white">{bucket.count}</div>
              <div className="mt-3 space-y-2">
                {bucket.items.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-[var(--text-soft)]">
                    <div className="font-semibold text-white">{item.title || item.slug}</div>
                    <div className="mt-1">{truncate(item.error || "Failure recorded", 90)}</div>
                  </div>
                ))}
                {bucket.count === 0 ? <div className="text-sm text-[var(--text-soft)]">No failures in this bucket.</div> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">Recent activity</div>
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">Last 20 publishing attempts</h2>

        <div className="mt-6 space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((item) => {
              const status = item.status === "posted" ? "posted" : "failed";
              return (
                <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${platformChip(item.platform)}`}>{item.platform}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusChip(status)}`}>{status}</span>
                    <span className="text-xs text-[var(--text-soft)]">{formatDateTime(activityTimestamp(item))}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-baseline gap-2">
                    <div className="text-base font-bold text-white">{item.title || item.slug}</div>
                    <div className="text-xs text-[var(--text-soft)]">{item.slug}</div>
                  </div>

                  {item.platformResponseId ? (
                    <div className="mt-1 text-xs text-[var(--text-soft)]">
                      Response ID: {item.platformResponseId}
                    </div>
                  ) : null}

                  {!item.error && typeof item.retryable === "boolean" ? (
                    <div className="mt-1 text-xs text-[var(--text-soft)]">
                      {item.retryable ? "Retryable" : "Not retryable"}
                    </div>
                  ) : null}

                  {item.error ? (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                      {truncate(item.error, 260)}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-black/20 p-4 text-sm text-[var(--text-soft)]">
              No publishing attempts recorded yet.
            </div>
          )}
        </div>
      </section>

      <div className="mt-8">
        <Link
          href="/admin/social"
          className="inline-flex rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold text-[var(--brand-gold)]"
        >
          Back to social hub
        </Link>
      </div>
    </main>
  );
}