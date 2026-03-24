import { addQueueItem, type QueuePlatform } from "./queue";
import {
  allContent,
  slugFromFile,
  titleFromSlug,
  detectContentTypeBySlug,
} from "./content";

import {
  buildPinterestCaption,
  buildInstagramCaption,
} from "./captions";

import { contentUrl } from "./urls";

type AutoPlatform = "pinterest" | "instagram" | "all";

function buildScheduleDate(dayOffset: number, hour: number, minute: number) {
  const base = new Date();

  base.setDate(base.getDate() + dayOffset);
  base.setHours(hour, minute, 0, 0);

  return base.toISOString();
}

function captionForPlatform(
  platform: Exclude<QueuePlatform, "facebook">,
  slug: string,
  type: "recipe" | "guide"
) {
  if (platform === "pinterest") {
    return buildPinterestCaption(slug, type);
  }

  return buildInstagramCaption(slug, type);
}

async function queueOne(
  slug: string,
  platform: Exclude<QueuePlatform, "facebook">,
  scheduledFor: string,
  board?: string
) {
  const type = detectContentTypeBySlug(slug);
  if (!type) return false;

  const title = titleFromSlug(slug);
  const url = contentUrl(slug, type);

  await addQueueItem({
    slug,
    title,
    platform,
    caption: captionForPlatform(platform, slug, type),
    url,
    board: platform === "pinterest" ? board ?? null : null,
    scheduledFor,
    contentType: type,
  });

  return true;
}

export async function buildAutoQueue(
  days: number,
  platform: AutoPlatform,
  board?: string
) {
  const items = allContent();
  if (!items.length) return 0;

  let count = 0;
  let cursor = 0;

  for (let day = 0; day < days; day++) {
    const morningSlug = slugFromFile(items[cursor % items.length].file);
    cursor++;

    const eveningSlug = slugFromFile(items[cursor % items.length].file);
    cursor++;

    const morningTime = buildScheduleDate(day, 9, 15);
    const eveningTime = buildScheduleDate(day, 18, 15);

    if (platform === "pinterest" || platform === "all") {
      if (!board) {
        throw new Error("Pinterest board required for auto queue");
      }

      if (await queueOne(morningSlug, "pinterest", morningTime, board)) {
        count++;
      }

      if (await queueOne(eveningSlug, "pinterest", eveningTime, board)) {
        count++;
      }
    }

    if (platform === "instagram" || platform === "all") {
      if (await queueOne(morningSlug, "instagram", morningTime)) {
        count++;
      }

      if (await queueOne(eveningSlug, "instagram", eveningTime)) {
        count++;
      }
    }
  }

  return count;
}