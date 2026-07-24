import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

function authed(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_TOKEN ?? "";
  return Boolean(expected && token && token === expected);
}

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; out: string }>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
    });

    let out = "";

    child.stdout.on("data", (d) => {
      out += d.toString();
    });

    child.stderr.on("data", (d) => {
      out += d.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, out });
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

export async function POST(req: Request) {
  if (!authed(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const mode = String(body?.mode ?? "").trim(); // latest | slug | all | import-url
  const slug = String(body?.slug ?? "").trim();
  const importUrl = String(body?.importUrl ?? "").trim();

  const skipRewrite = !!body?.skipRewrite;
  const skipQuantities = !!body?.skipQuantities;
  const skipStructure = !!body?.skipStructure;
  const skipImages = !!body?.skipImages;
  const skipPrompts = !!body?.skipPrompts;

  const args: string[] = ["scripts/recipe-pipeline.mjs"];

  if (mode === "latest") {
    args.push("--latest");
  } else if (mode === "slug") {
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing slug" },
        { status: 400 }
      );
    }
    args.push("--slug", slug);
  } else if (mode === "all") {
    args.push("--all");
  } else if (mode === "import-url") {
    if (!importUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing importUrl" },
        { status: 400 }
      );
    }
    args.push("--import-url", importUrl);
  } else {
    return NextResponse.json(
      { ok: false, error: "Invalid mode" },
      { status: 400 }
    );
  }

  if (skipRewrite) args.push("--skip-rewrite");
  if (skipQuantities) args.push("--skip-quantities");
  if (skipStructure) args.push("--skip-structure");
  if (skipImages) args.push("--skip-images");
  if (skipPrompts) args.push("--skip-prompts");

  try {
    const result = await run("node", args);

    if (result.code !== 0) {
      return NextResponse.json(
        { ok: false, error: "Pipeline failed", log: result.out },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      log: result.out,
      mode,
      slug: slug || undefined,
      importUrl: importUrl || undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Pipeline crashed",
        log: String(err?.stack || err?.message || err),
      },
      { status: 500 }
    );
  }
}