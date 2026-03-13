import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

export type Guide = {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  content: string;
};

function ensureDir() {
  if (!fs.existsSync(GUIDES_DIR)) {
    fs.mkdirSync(GUIDES_DIR, { recursive: true });
  }
}

export function getAllGuideSlugs(): string[] {
  ensureDir();

  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.mdx?$/i, ""));
}

export function getGuideBySlug(slug: string): Guide | null {
  ensureDir();

  const mdxPath = path.join(GUIDES_DIR, `${slug}.mdx`);
  const mdPath = path.join(GUIDES_DIR, `${slug}.md`);

  const filePath = fs.existsSync(mdxPath)
    ? mdxPath
    : fs.existsSync(mdPath)
    ? mdPath
    : null;

  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    title: String(data.title ?? slug),
    slug: String(data.slug ?? slug),
    description: data.description ? String(data.description) : "",
    image: data.image ? String(data.image) : "",
    content: content.trim(),
  };
}

export function getAllGuides(): Guide[] {
  const slugs = getAllGuideSlugs();

  return slugs
    .map((slug) => getGuideBySlug(slug))
    .filter(Boolean)
    .sort((a, b) => a!.title.localeCompare(b!.title)) as Guide[];
}