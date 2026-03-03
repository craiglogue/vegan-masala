// src/app/api/admin/rewrite/route.ts
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
    const mode = String(body?.mode ?? "latest"); // "latest" | "file"
    const filePath = String(body?.filePath ?? "").trim();

    const scriptPath = path.join("scripts", "ai-rewrite-recipe.mjs");

    const args =
      mode === "file" && filePath
        ? [scriptPath, filePath]
        : [scriptPath, "--latest"];

    const { code, stdout, stderr } = await runNodeScript(args);

    if (code !== 0) {
      return NextResponse.json(
        { ok: false, error: "Rewrite failed", details: stderr || stdout },
        { status: 500 }
      );
    }

    // Return meta for latest file after rewrite
    const latest = getLatestRecipeFileAbs();
    const meta = readRecipeMeta(latest);

    return NextResponse.json({
      ok: true,
      meta,
      log: (stdout || "").slice(-6000),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}