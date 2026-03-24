import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

const ROOT = process.cwd();
const FILE = path.join(ROOT, "generated", "queue.json");
const QUEUE_KEY = "social_queue_v1";

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

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

function ensureFile() {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function readQueueFromFile(): QueueItem[] {
  ensureFile();

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as QueueItem[];
  } catch {
    return [];
  }
}

function writeQueueToFile(items: QueueItem[]) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function readQueue(): Promise<QueueItem[]> {
  const redis = getRedis();

  if (redis) {
    try {
      const items = await redis.get<QueueItem[]>(QUEUE_KEY);
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.warn("KV readQueue failed, falling back to file:", err);
    }
  }

  return readQueueFromFile();
}

export async function writeQueue(items: QueueItem[]) {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(QUEUE_KEY, items);
      return;
    } catch (err) {
      console.warn("KV writeQueue failed, falling back to file:", err);
    }
  }

  writeQueueToFile(items);
}

export async function addQueueItem(input: {
  slug: string;
  title: string;
  platform: QueuePlatform;
  caption: string;
  url: string;
  board?: string | null;
  scheduledFor: string;
  contentType?: QueueContentType;
  assetType?: QueueAssetType;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<QueueItem> {
  const items = await readQueue();

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
    contentType: input.contentType,
    assetType: input.assetType,
    imageUrl: input.imageUrl,
    videoUrl: input.videoUrl,
  };

  items.unshift(item);
  await writeQueue(items);

  return item;
}

export async function markQueueItemPosted(id: string) {
  const items = (await readQueue()).map((item) =>
    item.id === id
      ? {
          ...item,
          status: "posted" as const,
          postedAt: new Date().toISOString(),
          error: undefined,
        }
      : item
  );

  await writeQueue(items);
}

export async function markQueueItemFailed(id: string, error: string) {
  const items = (await readQueue()).map((item) =>
    item.id === id
      ? {
          ...item,
          status: "failed" as const,
          error,
        }
      : item
  );

  await writeQueue(items);
}

export async function dueQueueItems(now = new Date()): Promise<QueueItem[]> {
  const items = await readQueue();

  return items.filter(
    (item) =>
      item.status === "queued" &&
      new Date(item.scheduledFor).getTime() <= now.getTime()
  );
}