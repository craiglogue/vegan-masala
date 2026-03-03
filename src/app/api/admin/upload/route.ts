import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function authed(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_TOKEN ?? "";
  return expected && token && token === expected;
}

function safeExtFromFile(file: File) {
  const name = file.name || "";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;

  // fallback from MIME
  const mime = (file.type || "").toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "jpg";
}

export async function POST(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const slug = String(form.get("slug") ?? "").trim();
  const hero = String(form.get("hero") ?? "0") === "1";

  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const ext = safeExtFromFile(file);

  // Save into public/recipes (matches a common convention for getRecipeImage lookups)
  const outDir = path.join(process.cwd(), "public", "recipes");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileName = hero
    ? `${slug}.${ext}`
    : `${slug}-${Date.now().toString(36)}.${ext}`;

  const absPath = path.join(outDir, fileName);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absPath, buf);

  const url = `/recipes/${fileName}`;
  const relPath = path.relative(process.cwd(), absPath);

  return NextResponse.json({ ok: true, url, fileName, relPath });
}