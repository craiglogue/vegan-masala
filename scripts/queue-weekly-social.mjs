import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const CONFIG = {
  baseUrl: process.env.SOCIAL_QUEUE_BASE_URL || "http://localhost:3000",
  pinterestBoardId: process.env.PINTEREST_BOARD_ID || "",
  videoPlatform: process.env.VIDEO_PLATFORM || "instagram",
  dryRun: process.env.DRY_RUN === "1",
  startDate: process.env.START_DATE || getTomorrowDateString(),
  planFile:
    process.env.WEEKLY_PLAN_FILE ||
    path.join(process.cwd(), "scripts", "weekly-social-plan.json"),
};

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateOnly(d);
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateString, daysToAdd) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysToAdd);
  return formatDateOnly(date);
}

function toLocalDateTime(dateString, timeString) {
  return `${dateString}T${timeString}`;
}

function loadPlan() {
  if (!fs.existsSync(CONFIG.planFile)) {
    throw new Error(`Plan file not found: ${CONFIG.planFile}`);
  }

  const raw = fs.readFileSync(CONFIG.planFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Plan file must contain a non-empty array");
  }

  for (const [index, day] of parsed.entries()) {
    const required = ["pin1", "insta1", "pin2", "video", "insta2"];
    for (const key of required) {
      if (!day?.[key] || typeof day[key] !== "string") {
        throw new Error(`Plan day ${index + 1} is missing "${key}"`);
      }
    }
  }

  return parsed;
}

async function queuePost({ slug, platform, assetType, scheduledFor, board }) {
  const body = {
    slug,
    platform,
    assetType,
    scheduledFor,
    board: platform === "pinterest" ? board : null,
  };

  if (CONFIG.dryRun) {
    console.log("[DRY RUN]", JSON.stringify(body));
    return { ok: true, item: body };
  }

  const res = await fetch(`${CONFIG.baseUrl}/api/admin/social/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `Queue failed for ${slug} (${platform}/${assetType}) at ${scheduledFor}: ${
        data?.error || "Unknown error"
      }`
    );
  }

  return data;
}

async function queueDay(dayIndex, plan) {
  const date = addDays(CONFIG.startDate, dayIndex);

  const jobs = [
    {
      slug: plan.pin1,
      platform: "pinterest",
      assetType: "image",
      scheduledFor: toLocalDateTime(date, "09:00"),
      board: CONFIG.pinterestBoardId,
    },
    {
      slug: plan.insta1,
      platform: "instagram",
      assetType: "image",
      scheduledFor: toLocalDateTime(date, "12:30"),
    },
    {
      slug: plan.pin2,
      platform: "pinterest",
      assetType: "image",
      scheduledFor: toLocalDateTime(date, "15:30"),
      board: CONFIG.pinterestBoardId,
    },
    {
      slug: plan.video,
      platform: CONFIG.videoPlatform,
      assetType: "video",
      scheduledFor: toLocalDateTime(date, "18:30"),
    },
    {
      slug: plan.insta2,
      platform: "instagram",
      assetType: "image",
      scheduledFor: toLocalDateTime(date, "20:30"),
    },
  ];

  for (const job of jobs) {
    const result = await queuePost(job);
    console.log(
      `Queued: ${job.scheduledFor} | ${job.platform} | ${job.assetType} | ${job.slug}`
    );
    if (result?.message) {
      console.log(`  -> ${result.message}`);
    }
  }
}

async function main() {
  const plan = loadPlan();

  if (!CONFIG.pinterestBoardId) {
    throw new Error(
      "Missing Pinterest board ID. Set PINTEREST_BOARD_ID before running."
    );
  }

  if (!["instagram", "facebook"].includes(CONFIG.videoPlatform)) {
    throw new Error(`VIDEO_PLATFORM must be "instagram" or "facebook".`);
  }

  console.log("Queue base URL:", CONFIG.baseUrl);
  console.log("Plan file:", CONFIG.planFile);
  console.log("Start date:", CONFIG.startDate);
  console.log("Video platform:", CONFIG.videoPlatform);
  console.log("Dry run:", CONFIG.dryRun ? "yes" : "no");
  console.log("");

  for (let i = 0; i < plan.length; i++) {
    console.log(`--- Day ${i + 1} ---`);
    await queueDay(i, plan[i]);
    console.log("");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("");
  console.error("ERROR:", err.message || err);
  process.exit(1);
});