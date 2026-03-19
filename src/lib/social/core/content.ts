import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

export const RECIPES_DIR = path.join(ROOT, "content", "recipes");
export const GUIDES_DIR = path.join(ROOT, "content", "guides");

export type ContentType = "recipe" | "guide";

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function contentFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => path.join(dir, f));
}

export function latestFile(files: string[]): string | null {
  if (!files.length) return null;

  return [...files].sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
  )[0];
}

export function slugFromFile(file: string): string {
  return path.basename(file).replace(/\.mdx?$/i, "");
}

export function titleFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function detectContentTypeBySlug(slug: string): ContentType | null {
  const candidates = [
    { type: "recipe" as const, file: path.join(RECIPES_DIR, `${slug}.mdx`) },
    { type: "recipe" as const, file: path.join(RECIPES_DIR, `${slug}.md`) },
    { type: "guide" as const, file: path.join(GUIDES_DIR, `${slug}.mdx`) },
    { type: "guide" as const, file: path.join(GUIDES_DIR, `${slug}.md`) },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.file)) return candidate.type;
  }

  return null;
}

export function latestContent():
  | { file: string; type: ContentType }
  | null {
  const recipes = contentFiles(RECIPES_DIR);
  const guides = contentFiles(GUIDES_DIR);

  const latestRecipe = latestFile(recipes);
  const latestGuide = latestFile(guides);

  if (!latestRecipe && !latestGuide) return null;

  if (
    latestRecipe &&
    (!latestGuide ||
      fs.statSync(latestRecipe).mtimeMs >= fs.statSync(latestGuide).mtimeMs)
  ) {
    return { file: latestRecipe, type: "recipe" };
  }

  return { file: latestGuide as string, type: "guide" };
}

export function allContent(): Array<{ file: string; type: ContentType }> {
  const recipes = contentFiles(RECIPES_DIR).map((file) => ({
    file,
    type: "recipe" as const,
  }));

  const guides = contentFiles(GUIDES_DIR).map((file) => ({
    file,
    type: "guide" as const,
  }));

  return [...recipes, ...guides];
}