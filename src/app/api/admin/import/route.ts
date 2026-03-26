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
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
    });

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

function readFrontmatterValue(mdx: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = mdx.match(new RegExp(`^\\s*${escapedKey}:\\s*(.+)\\s*$`, "im"));
  if (!match?.[1]) return "";

  return String(match[1])
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function detectRecraftMode(log: string) {
  const text = String(log || "").toLowerCase();

  if (text.includes("reference generation") || text.includes("generated from reference image")) {
    return "reference";
  }

  if (text.includes("remixing image for")) {
    return "remixed";
  }

  if (text.includes("recraft prompt for")) {
    return "generated";
  }

  return "";
}

export async function POST(req: Request) {
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

  const importRes = await run("node", ["scripts/import-recipe.mjs", url]);
  log += importRes.out + "\n";

  if (importRes.code !== 0) {
    return NextResponse.json(
      { ok: false, error: "Import script failed", log },
      { status: 500 }
    );
  }

  const afterFiles = listRecipeFiles();
  const created = afterFiles.find((p) => !beforeFiles.has(p));

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

  if (rewrite) {
    log += "\nRunning AI rewrite...\n";

    const rewriteRes = await run("node", [
      "scripts/ai-rewrite-recipe.mjs",
      "--file",
      createdPath,
    ]);

    log += rewriteRes.out + "\n";

    if (rewriteRes.code !== 0) {
      return NextResponse.json(
        { ok: false, error: "AI rewrite failed", log, mdxBefore },
        { status: 500 }
      );
    }
  }

  log += "\nRunning Recraft image generation...\n";

  const recraftRes = await run("node", [
    "scripts/generate-recraft-image.mjs",
    "--file",
    createdPath,
  ]);

  log += recraftRes.out + "\n";

  if (recraftRes.code !== 0) {
    return NextResponse.json(
      { ok: false, error: "Recraft image generation failed", log, mdxBefore },
      { status: 500 }
    );
  }

  log += "\nFixing recipe image mappings...\n";

  const imageFixRes = await run("node", [
    "scripts/fix-recipe-images.mjs",
    "--update-frontmatter",
  ]);

  log += imageFixRes.out + "\n";

  if (imageFixRes.code !== 0) {
    return NextResponse.json(
      { ok: false, error: "Recipe image sync failed", log, mdxBefore },
      { status: 500 }
    );
  }

  const mdxAfter = fs.readFileSync(createdPath, "utf8");

  const fileName = path.basename(createdPath);
  const relPath = path.relative(process.cwd(), createdPath);
  const slug = guessSlugFromFrontmatter(mdxAfter);
  const absPath = process.env.NODE_ENV === "development" ? createdPath : undefined;

  const sourceImage = readFrontmatterValue(mdxAfter, "sourceImage");
  const recraftMode = detectRecraftMode(log);

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
    sourceImage,
    recraftMode,
  });
}