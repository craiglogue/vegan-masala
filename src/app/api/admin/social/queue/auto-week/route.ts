import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

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

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN ||
    ""
  );
}

function normalizeDateString(input?: string) {
  if (!input) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  return input.slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function makeSchedule(dateString: string, hhmm: string) {
  return `${dateString}T${hhmm}:00`;
}

function baseLabel(label?: string, slug?: string) {
  if (!label && !slug) return "";
  return (label || slug || "").replace(/\s*\((recipe|guide)\)\s*$/i, "").trim();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

async function listBlobSlugs(prefix: string, allowedExts: string[]) {
  const token = getBlobToken();
  if (!token) return [];

  const { blobs } = await list({
    token,
    prefix,
    limit: 1000,
  });

  const slugs = blobs
    .map((blob) => {
      const name = blob.pathname.replace(`${prefix}/`, "");
      const dot = name.lastIndexOf(".");
      if (dot === -1) return null;

      const ext = name.slice(dot + 1).toLowerCase();
      if (!allowedExts.includes(ext)) return null;

      return name.slice(0, dot);
    })
    .filter((value): value is string => Boolean(value));

  return unique(slugs);
}

function notAlreadyUsed(
  slug: string,
  platform: QueuePlatform,
  assetType: QueueAssetType,
  items: QueueItem[]
) {
  return !items.some(
    (item) =>
      item.slug === slug &&
      item.platform === platform &&
      (item.assetType || "image") === assetType &&
      (item.status === "queued" || item.status === "posted")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const origin = new URL(req.url).origin;
    const startDate = normalizeDateString(body?.startDate);
    const pinterestBoardId =
      body?.pinterestBoardId ||
      process.env.PINTEREST_BOARD_ID ||
      "";
    const videoPlatform: QueuePlatform =
      body?.videoPlatform === "facebook" ? "facebook" : "instagram";
    const dryRun = body?.dryRun === true || body?.dryRun === "1";

    if (!pinterestBoardId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Pinterest board ID missing",
        },
        { status: 400 }
      );
    }

    const [queueRes, slugsRes] = await Promise.all([
      fetch(`${origin}/api/admin/social/queue`, {
        cache: "no-store",
      }),
      fetch(`${origin}/api/admin/social/slugs`, {
        cache: "no-store",
      }),
    ]);

    const queueData = await queueRes.json().catch(() => ({}));
    const slugsData = await slugsRes.json().catch(() => ({}));

    const queueItems: QueueItem[] = Array.isArray(queueData?.items)
      ? queueData.items
      : [];

    const allSlugs: SlugOption[] = Array.isArray(slugsData?.slugs)
      ? slugsData.slugs
      : [];

    const recipeSlugs = allSlugs.filter((item) => (item.type || "recipe") === "recipe");

    const slugMap = new Map(
      recipeSlugs.map((item) => [
        item.slug,
        {
          slug: item.slug,
          label: baseLabel(item.label, item.slug),
          title: item.title || baseLabel(item.label, item.slug),
        },
      ])
    );

    const pinterestAssetSlugs = (await listBlobSlugs("pinterest", ["png", "jpg", "jpeg", "webp"]))
      .filter((slug) => slugMap.has(slug));

    const instagramAssetSlugs = (await listBlobSlugs("instagram", ["png", "jpg", "jpeg", "webp"]))
      .filter((slug) => slugMap.has(slug));

    const videoAssetSlugs = (await listBlobSlugs("videos", ["mp4", "mov", "m4v"]))
      .filter((slug) => slugMap.has(slug));

    const pinterestCandidates = pinterestAssetSlugs.filter((slug) =>
      notAlreadyUsed(slug, "pinterest", "image", queueItems)
    );

    const instagramImageCandidates = instagramAssetSlugs.filter((slug) =>
      notAlreadyUsed(slug, "instagram", "image", queueItems)
    );

    const videoCandidates = videoAssetSlugs.filter((slug) =>
      notAlreadyUsed(slug, videoPlatform, "video", queueItems)
    );

    const neededPinterest = 14;
    const neededInstagramImages = 14;
    const neededVideos = 7;

    if (pinterestCandidates.length < neededPinterest) {
      return NextResponse.json(
        {
          ok: false,
          error: `Not enough unused Pinterest image assets. Needed ${neededPinterest}, found ${pinterestCandidates.length}.`,
        },
        { status: 400 }
      );
    }

    if (instagramImageCandidates.length < neededInstagramImages) {
      return NextResponse.json(
        {
          ok: false,
          error: `Not enough unused Instagram image assets. Needed ${neededInstagramImages}, found ${instagramImageCandidates.length}.`,
        },
        { status: 400 }
      );
    }

    if (videoCandidates.length < neededVideos) {
      return NextResponse.json(
        {
          ok: false,
          error: `Not enough unused video assets. Needed ${neededVideos}, found ${videoCandidates.length}.`,
        },
        { status: 400 }
      );
    }

    const plan: Array<{
      day: number;
      slug: string;
      platform: QueuePlatform;
      assetType: QueueAssetType;
      scheduledFor: string;
      board?: string;
      title: string;
    }> = [];

    let pIndex = 0;
    let iIndex = 0;
    let vIndex = 0;

    for (let day = 0; day < 7; day++) {
      const date = addDays(startDate, day);

      const pinMorning = pinterestCandidates[pIndex++];
      const igLunch = instagramImageCandidates[iIndex++];
      const pinAfternoon = pinterestCandidates[pIndex++];
      const videoEvening = videoCandidates[vIndex++];
      const igNight = instagramImageCandidates[iIndex++];

      plan.push({
        day: day + 1,
        slug: pinMorning,
        platform: "pinterest",
        assetType: "image",
        scheduledFor: makeSchedule(date, "09:00"),
        board: pinterestBoardId,
        title: slugMap.get(pinMorning)?.title || pinMorning,
      });

      plan.push({
        day: day + 1,
        slug: igLunch,
        platform: "instagram",
        assetType: "image",
        scheduledFor: makeSchedule(date, "12:30"),
        title: slugMap.get(igLunch)?.title || igLunch,
      });

      plan.push({
        day: day + 1,
        slug: pinAfternoon,
        platform: "pinterest",
        assetType: "image",
        scheduledFor: makeSchedule(date, "15:30"),
        board: pinterestBoardId,
        title: slugMap.get(pinAfternoon)?.title || pinAfternoon,
      });

      plan.push({
        day: day + 1,
        slug: videoEvening,
        platform: videoPlatform,
        assetType: "video",
        scheduledFor: makeSchedule(date, "18:30"),
        title: slugMap.get(videoEvening)?.title || videoEvening,
      });

      plan.push({
        day: day + 1,
        slug: igNight,
        platform: "instagram",
        assetType: "image",
        scheduledFor: makeSchedule(date, "20:30"),
        title: slugMap.get(igNight)?.title || igNight,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        count: plan.length,
        startDate,
        plan,
      });
    }

    const results: Array<{
      slug: string;
      platform: QueuePlatform;
      assetType: QueueAssetType;
      scheduledFor: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const item of plan) {
      const res = await fetch(`${origin}/api/admin/social/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: item.slug,
          platform: item.platform,
          scheduledFor: item.scheduledFor,
          board: item.platform === "pinterest" ? item.board : null,
          assetType: item.assetType,
        }),
      });

      const data = await res.json().catch(() => ({}));

      results.push({
        slug: item.slug,
        platform: item.platform,
        assetType: item.assetType,
        scheduledFor: item.scheduledFor,
        ok: res.ok,
        error: res.ok ? undefined : data?.error || "Queue request failed",
      });
    }

    const failed = results.filter((item) => !item.ok);

    return NextResponse.json({
      ok: failed.length === 0,
      count: results.length,
      failed: failed.length,
      startDate,
      results,
      message:
        failed.length === 0
          ? "7-day schedule queued successfully"
          : "7-day schedule queued with some failures",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to build weekly queue",
      },
      { status: 500 }
    );
  }
}