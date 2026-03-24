import { NextResponse } from "next/server";

import {
  generateAllInstagram,
  generateInstagramBySlug,
  generateLatestInstagram,
} from "@/lib/social/generateInstagram";

import {
  generateAllPinterest,
  generatePinterestBySlug,
  generateLatestPinterest,
} from "@/lib/social/generatePinterest";

type Platform = "instagram" | "pinterest" | "all";
type Mode = "all" | "single" | "latest";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const platform = body.platform as Platform | undefined;
    const mode = body.mode as Mode | undefined;
    const slug = typeof body.slug === "string" ? body.slug.trim() : null;

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    if (!mode) {
      return NextResponse.json({ error: "Mode required" }, { status: 400 });
    }

    if (mode === "single" && !slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    if (platform === "instagram") {
      if (mode === "all") {
        const result = await generateAllInstagram();
        const generated = (result as any)?.generated ?? [];

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          count: result.count ?? 0,
          generated,
        });
      }

      if (mode === "single" && slug) {
        const result = await generateInstagramBySlug(slug);

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          slug,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }

      if (mode === "latest") {
        const result = await generateLatestInstagram();

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          slug: (result as any).slug ?? null,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }
    }

    if (platform === "pinterest") {
      if (mode === "all") {
        const result = await generateAllPinterest();
        const generated = (result as any)?.generated ?? [];

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          count: result.count ?? 0,
          generated,
        });
      }

      if (mode === "single" && slug) {
        const result = await generatePinterestBySlug(slug);

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          slug,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }

      if (mode === "latest") {
        const result = await generateLatestPinterest();

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          slug: (result as any).slug ?? null,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }
    }

    if (platform === "all") {
      if (mode === "all") {
        const [ig, pin] = await Promise.all([
          generateAllInstagram(),
          generateAllPinterest(),
        ]);

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          count: (ig.count ?? 0) + (pin.count ?? 0),
          instagram: {
            count: ig.count ?? 0,
            generated: (ig as any).generated ?? [],
          },
          pinterest: {
            count: pin.count ?? 0,
            generated: (pin as any).generated ?? [],
          },
        });
      }

      if (mode === "single" && slug) {
        const [ig, pin] = await Promise.all([
          generateInstagramBySlug(slug),
          generatePinterestBySlug(slug),
        ]);

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          slug,
          count: (ig.count ?? 0) + (pin.count ?? 0),
          instagram: {
            count: ig.count ?? 0,
            image: (ig as any).image ?? null,
            storage: (ig as any).storage ?? null,
            path: (ig as any).path ?? null,
          },
          pinterest: {
            count: pin.count ?? 0,
            image: (pin as any).image ?? null,
            storage: (pin as any).storage ?? null,
            path: (pin as any).path ?? null,
          },
        });
      }

      if (mode === "latest") {
        const [ig, pin] = await Promise.all([
          generateLatestInstagram(),
          generateLatestPinterest(),
        ]);

        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          count: (ig.count ?? 0) + (pin.count ?? 0),
          instagram: {
            slug: (ig as any).slug ?? null,
            count: ig.count ?? 0,
            image: (ig as any).image ?? null,
            storage: (ig as any).storage ?? null,
            path: (ig as any).path ?? null,
          },
          pinterest: {
            slug: (pin as any).slug ?? null,
            count: pin.count ?? 0,
            image: (pin as any).image ?? null,
            storage: (pin as any).storage ?? null,
            path: (pin as any).path ?? null,
          },
        });
      }
    }

    return NextResponse.json(
      {
        error: "Invalid platform or mode",
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Generation failed",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}