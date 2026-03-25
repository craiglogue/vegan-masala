import path from "node:path";
import fs from "node:fs";

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

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

async function main() {
  console.log(`Queue base URL: ${CONFIG.baseUrl}`);
  console.log(`Plan file: ${CONFIG.planFile}`);
  console.log(`Start date: ${CONFIG.startDate}`);
  console.log(`Video platform: ${CONFIG.videoPlatform}`);
  console.log(`Dry run: ${CONFIG.dryRun ? "yes" : "no"}`);

  if (!CONFIG.pinterestBoardId) {
    throw new Error("PINTEREST_BOARD_ID is required");
  }

  if (fs.existsSync(CONFIG.planFile)) {
    console.log(`Plan file exists: ${CONFIG.planFile}`);
  }

  const res = await fetch(`${CONFIG.baseUrl}/api/admin/social/queue/auto-week`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: CONFIG.startDate,
      pinterestBoardId: CONFIG.pinterestBoardId,
      videoPlatform: CONFIG.videoPlatform,
      dryRun: CONFIG.dryRun,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    console.error("\nERROR:", data?.error || "Request failed");
    process.exit(1);
  }

  if (data?.dryRun) {
    console.log(`\nDry run plan generated: ${data.count} items\n`);
    for (const item of data.plan || []) {
      console.log(
        `[Day ${item.day}] ${item.scheduledFor} | ${item.platform} | ${item.assetType} | ${item.slug}`
      );
    }
    return;
  }

  console.log(`\nQueued ${data.count} items`);
  if (Array.isArray(data.results)) {
    for (const item of data.results) {
      console.log(
        `${item.ok ? "Queued" : "FAILED"}: ${item.scheduledFor} | ${item.platform} | ${item.assetType} | ${item.slug}`
      );
      if (item.error) {
        console.log(`  -> ${item.error}`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nERROR:", err?.message || err);
  process.exit(1);
});