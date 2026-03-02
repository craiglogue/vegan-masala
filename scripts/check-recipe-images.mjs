import fs from "node:fs";
import path from "node:path";

const recipesDir = path.join(process.cwd(), "content", "recipes");
const imagesDir = path.join(process.cwd(), "public", "images", "recipes");
const placeholder = "/brand/image-coming-soon.jpg";

function norm(input) {
  return input
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|avif)$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function tokens(s) {
  return new Set(norm(s).split("-").filter(Boolean));
}
function score(slug, file) {
  const slugKey = norm(slug);
  const fileKey = norm(file);
  if (slugKey === fileKey) return 999;

  const a = tokens(slugKey);
  const b = tokens(fileKey);

  let overlap = 0;
  for (const t of b) if (a.has(t)) overlap++;
  const union = new Set([...a, ...b]).size || 1;

  const jaccard = overlap / union;
  const contains = slugKey.includes(fileKey) || fileKey.includes(slugKey) ? 0.25 : 0;

  return jaccard + contains;
}

const images = fs.existsSync(imagesDir)
  ? fs.readdirSync(imagesDir).filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
  : [];

const mdxFiles = fs.readdirSync(recipesDir).filter((f) => f.endsWith(".mdx"));

const missing = [];

for (const f of mdxFiles) {
  const raw = fs.readFileSync(path.join(recipesDir, f), "utf8");
  const m = raw.match(/slug:\s*\"([^\"]+)\"|slug:\s*'([^']+)'|slug:\s*([^\n\r]+)/);
  const slug = m ? (m[1] || m[2] || m[3]).trim().replace(/\"|'/g, "") : null;
  if (!slug) continue;

  // direct check
  const direct = images.find((img) => norm(img) === norm(slug));
  if (direct) continue;

  // fuzzy best
  let best = null;
  for (const img of images) {
    const s = score(slug, img);
    if (!best || s > best.score) best = { img, score: s };
  }

  if (!best || best.score < 0.22) {
    missing.push({ slug, best: best ? `${best.img} (${best.score.toFixed(2)})` : "none" });
  }
}

console.log("Missing (or too-weak match) images:", missing.length);
for (const x of missing) console.log("-", x.slug, "-> best:", x.best);