import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

type SlugEntry = {
  slug: string;
  title: string;
  type: "recipe" | "guide";
  label: string;
};

const ROOT = process.cwd();

function getMdxFiles(dir: string) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => path.join(dir, file));
}

function loadEntriesFromDir(dir: string, type: "recipe" | "guide"): SlugEntry[] {
  const files = getMdxFiles(dir);

  return files
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf8");
      const { data } = matter(raw);
      const slug = path.basename(filePath, ".mdx");

      const title =
        typeof data?.title === "string" && data.title.trim()
          ? data.title.trim()
          : slug;

      return {
        slug,
        title,
        type,
        label: `${title} (${type})`,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function GET() {
  try {
    const recipeDir = path.join(ROOT, "content", "recipes");
    const guideDir = path.join(ROOT, "content", "guides");

    const recipeEntries = loadEntriesFromDir(recipeDir, "recipe");
    const guideEntries = loadEntriesFromDir(guideDir, "guide");

    return NextResponse.json({
      ok: true,
      slugs: [...recipeEntries, ...guideEntries].sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load slugs",
      },
      { status: 500 }
    );
  }
}