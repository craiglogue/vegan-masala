import fs from "node:fs";
import path from "node:path";

export type QueuePlatform = "instagram" | "pinterest" | "facebook";
export type QueueStatus = "queued" | "posted" | "failed";
export type QueueAssetType = "image" | "video";
export type QueueContentType = "recipe" | "guide";

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
  postedAt?: string;
  error?: string;
  contentType?: QueueContentType;
  assetType?: QueueAssetType;
  imageUrl?: string;
  videoUrl?: string;
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

export function allQueueItems() {
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

export function dueQueueItems() {
  const now = Date.now();

  return readQueueFile().filter((item) => {
    if (item.status !== "queued") return false;
    return new Date(item.scheduledFor).getTime() <= now;
  });
}

export function findQueueItemById(id: string) {
  return readQueueFile().find((item) => item.id === id) || null;
}

export function markQueueItemPosted(id: string) {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "posted" as const,
          postedAt: new Date().toISOString(),
          error: undefined,
        }
      : item
  );

  writeQueueFile(next);
}

export function markQueueItemFailed(id: string, error: string) {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "failed" as const,
          error,
        }
      : item
  );

  writeQueueFile(next);
}

export function retryQueueItem(id: string) {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "queued" as const,
          error: undefined,
        }
      : item
  );

  writeQueueFile(next);
}

export function rescheduleQueueItemNow(id: string) {
  const items = readQueueFile();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "queued" as const,
          scheduledFor: new Date().toISOString(),
          error: undefined,
        }
      : item
  );

  writeQueueFile(next);
}

export function deleteQueueItem(id: string) {
  const items = readQueueFile();
  const next = items.filter((item) => item.id !== id);
  writeQueueFile(next);
}