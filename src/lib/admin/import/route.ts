// src/app/api/admin/import/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "node:path";
import { spawn } from "node:child_process";

import { guardAdmin } from "@/lib/admin/guard";
import { getLatestRecipeFileAbs, readRecipeMeta } from "@/lib/admin/recipesFs";

function runNodeScript(args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));

    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function POST(req: Request) {
  const blocked = guardAdmin(req);
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const url = String(body?.url ?? "").trim();
    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
    }

    // Capture the current "latest" before import, so we can detect the new file
    const before = (() => {
      try {
        return getLatestRecipeFileAbs();
      } catch {
        return null;
      }
    })();

    const scriptPath = path.join("scripts", "import-recipe.mjs");
    const { code, stdout, stderr } = await runNodeScript([scriptPath, url]);

    if (code !== 0) {
      return NextResponse.json(
        { ok: false, error: "Import failed", details: stderr || stdout },
        { status: 500 }
      );
    }

    // After import: find newest file and assume it's the created/updated one
    const after = getLatestRecipeFileAbs();

    // If "after" equals "before", still return meta (script may have overwritten same file)
    const meta = readRecipeMeta(after);

    return NextResponse.json({
      ok: true,
      meta,
      log: (stdout || "").slice(-6000),
      note: before && after === before ? "Latest file unchanged (may have overwritten existing)." : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}