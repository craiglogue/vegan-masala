import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const FILE = path.join(ROOT, "generated", "queue.json");

export type QueuePlatform = "instagram" | "pinterest" | "facebook";
export type QueueStatus = "queued" | "posted" | "failed";

export type QueueItem = {
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
};

function ensureFile() {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify([], null, 2), "utf8");
  }
}

export function readQueue(): QueueItem[] {
  ensureFile();

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as QueueItem[];
  } catch {
    return [];
  }
}

export function writeQueue(items: QueueItem[]) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), "utf8");
}

export function addQueueItem(input: {
  slug: string;
  title: string;
  platform: QueuePlatform;
  caption: string;
  url: string;
  board?: string | null;
  scheduledFor: string;
}): QueueItem {
  const items = readQueue();

  const item: QueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug: input.slug,
    title: input.title,
    platform: input.platform,
    caption: input.caption,
    url: input.url,
    board: input.board || undefined,
    scheduledFor: input.scheduledFor,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  items.unshift(item);
  writeQueue(items);

  return item;
}

export function markQueueItemPosted(id: string) {
  const items = readQueue().map((item) =>
    item.id === id
      ? {
          ...item,
          status: "posted" as const,
          postedAt: new Date().toISOString(),
          error: undefined,
        }
      : item
  );

  writeQueue(items);
}

export function markQueueItemFailed(id: string, error: string) {
  const items = readQueue().map((item) =>
    item.id === id
      ? {
          ...item,
          status: "failed" as const,
          error,
        }
      : item
  );

  writeQueue(items);
}

export function dueQueueItems(now = new Date()): QueueItem[] {
  return readQueue().filter(
    (item) =>
      item.status === "queued" &&
      new Date(item.scheduledFor).getTime() <= now.getTime()
  );
}