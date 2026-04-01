// src/app/api/admin/recipes/slugs/route.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function authed(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_TOKEN ?? "";
  return Boolean(expected && token && token === expected);
}

function getRecipeSlugs() {
  if (!fs.existsSync(RECIPES_DIR)) return [];

  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  return files
    .map((file) => {
      const filePath = path.join(RECIPES_DIR, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data } = matter(raw);

      return typeof data?.slug === "string" && data.slug.trim()
        ? String(data.slug).trim()
        : file.replace(/\.mdx?$/i, "");
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function GET(req: Request) {
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

  return NextResponse.json({
    ok: true,
    slugs: getRecipeSlugs(),
  });
}