// src/app/api/admin/import/route.ts
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function authed(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_TOKEN ?? "";
  return expected && token && token === expected;
}

function listRecipeFiles() {
  if (!fs.existsSync(RECIPES_DIR)) return [];
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f));
}

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; out: string }>((resolve) => {
    const child = spawn(cmd, args, { cwd: process.cwd() });

    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));

    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

function guessSlugFromFrontmatter(mdx: string) {
  const m = mdx.match(/^\s*slug:\s*["']?([a-z0-9-]+)["']?\s*$/im);
  if (m?.[1]) return m[1];
  const t = mdx.match(/^\s*title:\s*(.+)\s*$/im)?.[1] ?? "recipe";
  return t
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export async function POST(req: Request) {
  // ✅ PRODUCTION SAFETY: disable this route on Vercel / live deployments
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Disabled in production" },
      { status: 404 }
    );
  }

  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const url = String(body?.url ?? "").trim();
  const rewrite = !!body?.rewrite;

  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  if (!fs.existsSync(RECIPES_DIR)) {
    return NextResponse.json(
      { ok: false, error: `Missing recipes folder: ${RECIPES_DIR}` },
      { status: 500 }
    );
  }

  const beforeFiles = new Set(listRecipeFiles());

  let log = `Running import...\nURL: ${url}\n\n`;

  // 1) Import (scrape → mdx)
  const importRes = await run("node", ["scripts/import-recipe.mjs", url]);
  log += importRes.out + "\n";

  if (importRes.code !== 0) {
    return NextResponse.json({ ok: false, error: "Import script failed", log }, { status: 500 });
  }

  const afterFiles = listRecipeFiles();
  const created = afterFiles.find((p) => !beforeFiles.has(p));

  // Fallback: use newest file if we can’t diff it cleanly
  const createdPath =
    created ??
    afterFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  if (!createdPath || !fs.existsSync(createdPath)) {
    return NextResponse.json(
      { ok: false, error: "Could not locate created recipe file.", log },
      { status: 500 }
    );
  }

  const mdxBefore = fs.readFileSync(createdPath, "utf8");

  // 2) Optional rewrite (AI)
  if (rewrite) {
    log += "\nRunning AI rewrite...\n";
    const rewriteRes = await run("node", ["scripts/ai-rewrite-recipe.mjs", createdPath]);
    log += rewriteRes.out + "\n";

    if (rewriteRes.code !== 0) {
      return NextResponse.json(
        { ok: false, error: "AI rewrite failed", log, mdxBefore },
        { status: 500 }
      );
    }
  }

  const mdxAfter = fs.readFileSync(createdPath, "utf8");

  const fileName = path.basename(createdPath);
  const relPath = path.relative(process.cwd(), createdPath);
  const slug = guessSlugFromFrontmatter(mdxAfter);

  // Absolute path is useful for the "Open in VS Code" button (local dev)
  // Only return absPath when running locally (never on Vercel)
const absPath = process.env.NODE_ENV === "development" ? createdPath : undefined;

  log += `\n✅ Done.\nSaved: ${relPath}\n`;

  return NextResponse.json({
    ok: true,
    slug,
    fileName,
    relPath,
    absPath,
    mdxBefore,
    mdxAfter,
    log,
  });
}