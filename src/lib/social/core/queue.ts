import fs from "node:fs";
import path from "node:path";

export type QueuePlatform = "instagram" | "pinterest" | "facebook";
export type QueueStatus = "queued" | "posted" | "failed";
export type QueueAssetType = "image" | "video";
export type QueueContentType = "recipe" | "guide" | "store";
export type QueueContentKind = "standard" | "ebook";
export type QueueErrorCategory =
  | "authentication"
  | "media"
  | "validation"
  | "platform_api"
  | "unknown";

export type QueueItem = {
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
  errorCategory?: QueueErrorCategory;
  retryable?: boolean;
  platformResponseId?: string | null;
  contentType?: QueueContentType;
  kind?: QueueContentKind;
  assetType?: QueueAssetType;
  imageUrl?: string;
  publishImageUrl?: string;
  videoUrl?: string;
};

export type QueueAttemptMetadata = {
  attemptedAt?: string;
  completedAt?: string;
  platformResponseId?: string | null;
  errorCategory?: QueueErrorCategory;
  retryable?: boolean;
};

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const QUEUE_DIR = path.join(ROOT, "generated");
const QUEUE_FILE = path.join(QUEUE_DIR, "social-queue.json");

function ensureDir() {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

function readQueueFile(): QueueItem[] {
  try {
    ensureDir();

    if (!fs.existsSync(QUEUE_FILE)) {
      return [];
    }

    const raw = fs.readFileSync(QUEUE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueueFile(items: QueueItem[]) {
  ensureDir();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(items, null, 2), "utf8");
}

function resetAttemptMetadata(item: QueueItem): QueueItem {
  return {
    ...item,
    attemptedAt: undefined,
    completedAt: undefined,
    postedAt: undefined,
    error: undefined,
    errorCategory: undefined,
    retryable: undefined,
    platformResponseId: undefined,
  };
}

function applyAttemptMetadata(
  item: QueueItem,
  metadata: QueueAttemptMetadata,
  nextStatus: QueueStatus,
  error?: string
): QueueItem {
  return {
    ...item,
    status: nextStatus,
    attemptedAt: metadata.attemptedAt || item.attemptedAt,
    completedAt: metadata.completedAt || new Date().toISOString(),
    postedAt: nextStatus === "posted" ? metadata.completedAt || new Date().toISOString() : undefined,
    error,
    errorCategory: metadata.errorCategory,
    retryable: metadata.retryable,
    platformResponseId: metadata.platformResponseId ?? undefined,
  };
}

export function classifyQueueFailure(error: unknown): {
  errorCategory: QueueErrorCategory;
  retryable: boolean;
} {
  const message = String(error || "").toLowerCase();

  if (
    message.includes("auth") ||
    message.includes("oauth") ||
    message.includes("token") ||
    message.includes("login") ||
    message.includes("expired") ||
    message.includes("not connected") ||
    message.includes("session has expired")
  ) {
    return { errorCategory: "authentication", retryable: false };
  }

  if (
    message.includes("image url") ||
    message.includes("video url") ||
    message.includes("media") ||
    message.includes("public url") ||
    message.includes("publicly reachable") ||
    message.includes("download") ||
    message.includes("fetch") ||
    message.includes("file not found") ||
    message.includes("image not found") ||
    message.includes("video not found")
  ) {
    const retryable =
      message.includes("timeout") ||
      message.includes("fetch") ||
      message.includes("download") ||
      message.includes("network") ||
      message.includes("temporary");

    return { errorCategory: "media", retryable };
  }

  if (
    message.includes("required") ||
    message.includes("missing") ||
    message.includes("invalid") ||
    message.includes("unsupported") ||
    message.includes("preflight") ||
    message.includes("board required") ||
    message.includes("slug not found") ||
    message.includes("only supports")
  ) {
    return { errorCategory: "validation", retryable: false };
  }

  if (
    message.includes("api") ||
    message.includes("container") ||
    message.includes("graph.facebook.com") ||
    message.includes("pinterest pin creation failed") ||
    message.includes("publish failed") ||
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("service unavailable")
  ) {
    return { errorCategory: "platform_api", retryable: true };
  }

  return { errorCategory: "unknown", retryable: true };
}

export function allQueueItems(): QueueItem[] {
  return readQueueFile().sort((a, b) => {
    const aTime = new Date(a.scheduledFor).getTime();
    const bTime = new Date(b.scheduledFor).getTime();
    return aTime - bTime;
  });
}

export function addQueueItem(
  item: Omit<QueueItem, "id" | "createdAt" | "status">
): QueueItem {
  const items = readQueueFile();

  const next: QueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: "queued",
  };

  items.push(next);
  writeQueueFile(items);

  return next;
}

export function dueQueueItems(): QueueItem[] {
  const now = Date.now();

  return readQueueFile().filter((item) => {
    if (item.status !== "queued") return false;
    return new Date(item.scheduledFor).getTime() <= now;
  });
}

export function findQueueItemById(id: string): QueueItem | null {
  return readQueueFile().find((item) => item.id === id) || null;
}

export function markQueueItemPosted(id: string): void {
  markQueueItemPostedWithMetadata(id, {});
}

export function markQueueItemPostedWithMetadata(
  id: string,
  metadata: QueueAttemptMetadata = {}
): void {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "posted" as const,
          attemptedAt: metadata.attemptedAt || item.attemptedAt,
          completedAt: metadata.completedAt || new Date().toISOString(),
          postedAt: metadata.completedAt || new Date().toISOString(),
          error: undefined,
          errorCategory: undefined,
          retryable: undefined,
          platformResponseId: metadata.platformResponseId ?? undefined,
        }
      : item
  );

  writeQueueFile(next);
}

export function markQueueItemFailed(id: string, error: string): void {
  markQueueItemFailedWithMetadata(id, error, {});
}

export function markQueueItemFailedWithMetadata(
  id: string,
  error: string,
  metadata: QueueAttemptMetadata = {}
): void {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "failed" as const,
          attemptedAt: metadata.attemptedAt || item.attemptedAt,
          completedAt: metadata.completedAt || new Date().toISOString(),
          postedAt: undefined,
          error,
          errorCategory: metadata.errorCategory,
          retryable: metadata.retryable,
          platformResponseId: metadata.platformResponseId ?? undefined,
        }
      : item
  );

  writeQueueFile(next);
}

export function retryQueueItem(id: string): void {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...resetAttemptMetadata(item),
          status: "queued" as const,
        }
      : item
  );

  writeQueueFile(next);
}

export function rescheduleQueueItemNow(id: string): void {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...resetAttemptMetadata(item),
          status: "queued" as const,
          scheduledFor: new Date().toISOString(),
        }
      : item
  );

  writeQueueFile(next);
}

export function deleteQueueItem(id: string): void {
  const items = readQueueFile();
  const next = items.filter((item) => item.id !== id);
  writeQueueFile(next);
}