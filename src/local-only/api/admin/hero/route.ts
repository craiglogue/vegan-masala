// src/app/api/admin/hero/route.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");
const PUBLIC_RECIPES_DIR = path.join(process.cwd(), "public", "recipes");

function authed(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_TOKEN ?? "";
  return expected && token && token === expected;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function findRecipeFileBySlug(slug: string) {
  if (!fs.existsSync(RECIPES_DIR)) return null;

  const files = fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  for (const f of files) {
    const p = path.join(RECIPES_DIR, f);
    const raw = fs.readFileSync(p, "utf8");
    const { data } = matter(raw);
    const fmSlug =
      typeof (data as any)?.slug === "string"
        ? String((data as any).slug)
        : f.replace(/\.mdx?$/i, "");
    if (fmSlug === slug) return p;
  }

  return null;
}

function safeExt(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase().split("?")[0];
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") return ext;
  return ".png"; // default
}

export async function POST(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Important: Vercel/serverless filesystem is not persistent
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Disabled in production. Upload locally, then git commit/push." },
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  const slug = String(form.get("slug") ?? "").trim();
  const file = form.get("file");

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const recipePath = findRecipeFileBySlug(slug);
  if (!recipePath) {
    return NextResponse.json(
      { ok: false, error: `Could not find recipe file for slug: ${slug}` },
      { status: 404 }
    );
  }

  ensureDir(PUBLIC_RECIPES_DIR);

  const ext = safeExt(file.name);
  const imageFileName = `${slug}${ext}`;
  const imageAbsPath = path.join(PUBLIC_RECIPES_DIR, imageFileName);
  const imagePublicPath = `/recipes/${imageFileName}`;

  // Save image to /public/recipes
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(imageAbsPath, buf);

  // Inject into MDX frontmatter
  const raw = fs.readFileSync(recipePath, "utf8");
  const parsed = matter(raw);

  const newData = { ...(parsed.data ?? {}), image: imagePublicPath };
  const nextMdx = matter.stringify(parsed.content ?? "", newData);

  fs.writeFileSync(recipePath, nextMdx, "utf8");

  return NextResponse.json({
    ok: true,
    slug,
    imagePublicPath,
    imageAbsPath,
    recipeRelPath: path.relative(process.cwd(), recipePath),
  });
}