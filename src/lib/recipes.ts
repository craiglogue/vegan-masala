// src/lib/recipes.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

export type Recipe = {
  // frontmatter
  title: string;
  slug: string;
  description?: string;
  cuisine?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  diet?: string[];
  tags?: string[];
  publishedAt?: string;

  // optional extra frontmatter you’ve been using in some files
  serves?: number;
  servings?: number;
  spice?: string;
  spiceLevel?: string;

  // ✅ arrays (preferred, if present in frontmatter)
  ingredients?: string[];
  instructions?: string[];
  notes?: string[];

  // raw mdx + body
  raw: string;
  content: string;

  // extracted markdown sections (fallback if arrays missing)
  ingredientsMarkdown?: string;
  methodMarkdown?: string;
  notesMarkdown?: string;
};

function safeNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function safeStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v
    .map((x) => (typeof x === "string" ? x : String(x)))
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

function readRecipeFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { raw, data: (data ?? {}) as Record<string, unknown>, content: content ?? "" };
}

/**
 * Extract markdown between headings, eg:
 * ## Ingredients ... ## Method
 * Works with Ingredients/Method/Instructions/Notes, any casing.
 */
function extractSection(body: string, headingNames: string[]) {
  const names = headingNames.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  // match: "## Ingredients" (or ###) with optional whitespace, any case
  const startRe = new RegExp(`^#{2,3}\\s*(${names})\\s*$`, "im");
  const startMatch = startRe.exec(body);
  if (!startMatch) return undefined;

  const startIdx = startMatch.index + startMatch[0].length;

  // find next heading after this
  const rest = body.slice(startIdx);
  const nextHeadingRe = /^#{1,3}\s+.+$/im;
  const nextMatch = nextHeadingRe.exec(rest);

  const section = nextMatch ? rest.slice(0, nextMatch.index) : rest;
  const cleaned = section.trim();

  return cleaned.length ? cleaned : undefined;
}

function buildRecipeFromFile(file: string): Recipe | null {
  const filePath = path.join(RECIPES_DIR, file);
  if (!fs.existsSync(filePath)) return null;

  const { raw, data, content } = readRecipeFile(filePath);

  const title = typeof data.title === "string" ? data.title : "";
  const slug = typeof data.slug === "string" ? data.slug : file.replace(/\.mdx?$/i, "");
  if (!title || !slug) return null;

  const prepMinutes = safeNumber(data.prepMinutes);
  const cookMinutes = safeNumber(data.cookMinutes);

  const recipe: Recipe = {
    title,
    slug,
    description: typeof data.description === "string" ? data.description : undefined,
    cuisine: typeof data.cuisine === "string" ? data.cuisine : undefined,
    prepMinutes,
    cookMinutes,
    diet: Array.isArray(data.diet) ? (data.diet.filter(Boolean).map(String) as string[]) : undefined,
    tags: Array.isArray(data.tags) ? (data.tags.filter(Boolean).map(String) as string[]) : undefined,
    publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : undefined,
    serves: safeNumber(data.serves),
    servings: safeNumber(data.servings),
    spice: typeof data.spice === "string" ? data.spice : undefined,
    spiceLevel: typeof data.spiceLevel === "string" ? data.spiceLevel : undefined,

    // ✅ arrays (if present)
    ingredients: safeStringArray((data as any).ingredients),
    instructions: safeStringArray((data as any).instructions),
    notes: safeStringArray((data as any).notes),

    raw,
    content,
  };

  // ✅ markdown section extraction (fallback)
  recipe.ingredientsMarkdown = extractSection(content, ["Ingredients", "ingredients"]);
  recipe.methodMarkdown = extractSection(content, ["Method", "method", "Instructions", "instructions"]);
  recipe.notesMarkdown = extractSection(content, ["Notes", "notes", "Tips", "tips"]);

  return recipe;
}

export function getAllRecipeSlugs() {
  if (!fs.existsSync(RECIPES_DIR)) return [];
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => {
      const filePath = path.join(RECIPES_DIR, f);
      const { data } = readRecipeFile(filePath);
      const slug = typeof data.slug === "string" ? data.slug : f.replace(/\.mdx?$/i, "");
      return slug;
    });
}

export function getAllRecipes(): Recipe[] {
  if (!fs.existsSync(RECIPES_DIR)) return [];

  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const recipes = files.map((f) => buildRecipeFromFile(f)).filter(Boolean) as Recipe[];

  recipes.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return recipes;
}

export function getRecipeBySlug(slug: string): Recipe | null {
  if (!slug) return null;
  if (!fs.existsSync(RECIPES_DIR)) return null;

  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(RECIPES_DIR, file);
    const { data } = readRecipeFile(filePath);
    const fmSlug = typeof data.slug === "string" ? data.slug : file.replace(/\.mdx?$/i, "");
    if (fmSlug === slug) return buildRecipeFromFile(file);
  }

  return null;
}