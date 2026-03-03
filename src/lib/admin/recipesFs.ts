// src/lib/admin/recipesFs.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

export type RecipeMeta = {
  filePath: string;
  fileName: string;
  slug: string;
  title: string;
  description?: string;
};

export function ensureRecipesDir() {
  if (!fs.existsSync(RECIPES_DIR)) {
    throw new Error(`Missing recipes folder: ${RECIPES_DIR}`);
  }
}

export function listRecipeFilesAbs(): string[] {
  ensureRecipesDir();
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f));
}

export function getLatestRecipeFileAbs(): string {
  const files = listRecipeFilesAbs();
  if (!files.length) throw new Error("No recipe files found in content/recipes.");

  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

export function readRecipeMeta(filePathAbs: string): RecipeMeta {
  const raw = fs.readFileSync(filePathAbs, "utf8");
  const { data } = matter(raw);

  const fileName = path.basename(filePathAbs);
  const slug =
    typeof (data as any)?.slug === "string"
      ? String((data as any).slug)
      : fileName.replace(/\.mdx?$/i, "");

  const title =
    typeof (data as any)?.title === "string" ? String((data as any).title) : slug;

  const description =
    typeof (data as any)?.description === "string" ? String((data as any).description) : undefined;

  return { filePath: filePathAbs, fileName, slug, title, description };
}

export function readRecipeRaw(filePathAbs: string) {
  return fs.readFileSync(filePathAbs, "utf8");
}