import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function authed(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_TOKEN ?? "";
  return Boolean(expected && token && token === expected);
}

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; out: string }>((resolve) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
    });

    let out = "";

    child.stdout.on("data", (d) => {
      out += d.toString();
    });

    child.stderr.on("data", (d) => {
      out += d.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, out });
    });
  });
}

function findRecipeFileBySlug(slug: string) {
  if (!fs.existsSync(RECIPES_DIR)) return null;

  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  for (const f of files) {
    const filePath = path.join(RECIPES_DIR, f);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data } = matter(raw);

    const fmSlug =
      typeof data?.slug === "string"
        ? String(data.slug).trim()
        : f.replace(/\.mdx?$/i, "");

    if (fmSlug === slug) return filePath;
  }

  return null;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Disabled in production" },
      { status: 404 }
    );
  }

  if (!authed(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const slug = String(body?.slug ?? "").trim();
  const remixPrompt = String(body?.remixPrompt ?? "").trim();
  const strengthRaw = body?.strength;
  const strength =
    typeof strengthRaw === "number"
      ? strengthRaw
      : typeof strengthRaw === "string" && strengthRaw.trim()
      ? Number(strengthRaw)
      : 0.35;

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Missing slug" },
      { status: 400 }
    );
  }

  if (!remixPrompt) {
    return NextResponse.json(
      { ok: false, error: "Missing remixPrompt" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    return NextResponse.json(
      { ok: false, error: "Strength must be between 0 and 1" },
      { status: 400 }
    );
  }

  const recipePath = findRecipeFileBySlug(slug);
  if (!recipePath) {
    return NextResponse.json(
      { ok: false, error: `Could not find recipe file for slug: ${slug}` },
      { status: 404 }
    );
  }

  let log = `Running Recraft remix...\nSlug: ${slug}\nStrength: ${strength}\nPrompt: ${remixPrompt}\n\n`;

  const remixRes = await run("node", [
    "scripts/generate-recraft-image.mjs",
    "--slug",
    slug,
    "--remix-prompt",
    remixPrompt,
    "--strength",
    String(strength),
  ]);

  log += remixRes.out + "\n";

  if (remixRes.code !== 0) {
    return NextResponse.json(
      { ok: false, error: "Recraft remix failed", log },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    slug,
    log,
    message: "Recraft image remixed successfully",
  });
}