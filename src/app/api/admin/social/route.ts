import { NextResponse } from "next/server";

import { renderPinterestBySlug } from "@/lib/social/pinterest/render";
import {
  generateAllInstagram,
  generateLatestInstagram,
} from "@/lib/social/generateInstagram";
import {
  generateAllPinterest,
  generatePinterestBySlug,
  generateLatestPinterest,
} from "@/lib/social/generatePinterest";
import { renderInstagramBySlug } from "@/lib/social/instagram/render";
import { getSocialCopyForSlug } from "@/lib/social/core/socialCopy";

import { renderInstagramEbookPromo } from "@/lib/social/ebook/renderInstagram";
import { renderPinterestEbookPromo } from "@/lib/social/ebook/renderPinterest";

type Platform = "instagram" | "pinterest" | "facebook" | "all";
type Mode = "all" | "single" | "latest";
type Kind = "recipe" | "ebook";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const platform = body.platform as Platform | undefined;
    const mode = body.mode as Mode | undefined;
    const kind = (body.kind as Kind | undefined) || "recipe";
    const slug = typeof body.slug === "string" ? body.slug.trim() : null;

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    if (!mode) {
      return NextResponse.json({ error: "Mode required" }, { status: 400 });
    }

    if (kind === "ebook") {
      if (platform === "instagram" || platform === "facebook") {
        const result = await renderInstagramEbookPromo();

        return NextResponse.json({
          success: true,
          message: "Ebook generation complete",
          platform,
          mode,
          kind,
          slug: result.slug,
          count: 1,
          image: result.image,
          storage: result.storage,
          path: result.path,
          instagramCaption: result.instagramCaption,
          facebookCaption: result.facebookCaption,
        });
      }

      if (platform === "pinterest") {
        const result = await renderPinterestEbookPromo();

        return NextResponse.json({
          success: true,
          message: "Ebook generation complete",
          platform,
          mode,
          kind,
          slug: result.slug,
          count: 1,
          image: result.image,
          storage: result.storage,
          path: result.path,
          pinterestCaption: result.pinterestCaption,
        });
      }

      if (platform === "all") {
        const [ig, pin] = await Promise.all([
          renderInstagramEbookPromo(),
          renderPinterestEbookPromo(),
        ]);

        return NextResponse.json({
          success: true,
          message: "Ebook generation complete",
          platform,
          mode,
          kind,
          count: 3,
          instagram: ig,
          facebook: {
            ...ig,
            image: ig.image,
            facebookCaption: ig.facebookCaption,
          },
          pinterest: pin,
        });
      }
    }

    if (mode === "single" && !slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    if (platform === "instagram") {
      if (mode === "all") {
        const result = await generateAllInstagram();
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          count: result.count ?? 0,
          generated: (result as any)?.generated ?? [],
        });
      }

      if (mode === "single" && slug) {
        const result = await renderInstagramBySlug(slug);
        const socialCopy = await getSocialCopyForSlug(slug);
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          slug,
          count: (result as any).count ?? 0,
          image: (result as any).image ?? null,
          publishImage: (result as any).publishImage ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
          instagramCaption: socialCopy.instagramCaption,
          instagramCaptionVariants: socialCopy.instagramCaptionVariants ?? [],
          facebookCaption: socialCopy.facebookCaption,
          facebookCaptionVariants: socialCopy.facebookCaptionVariants ?? [],
        });
      }

      if (mode === "latest") {
        const result = await generateLatestInstagram();
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          slug: (result as any).slug ?? null,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          publishImage: (result as any).publishImage ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }
    }

    if (platform === "facebook") {
      if (mode === "all") {
        const result = await generateAllInstagram();
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          count: result.count ?? 0,
          generated: (result as any)?.generated ?? [],
        });
      }

      if (mode === "single" && slug) {
        const result = await renderInstagramBySlug(slug);
        const socialCopy = await getSocialCopyForSlug(slug);
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          slug,
          count: (result as any).count ?? 0,
          image: (result as any).image ?? null,
          publishImage: (result as any).publishImage ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
          instagramCaption: socialCopy.instagramCaption,
          instagramCaptionVariants: socialCopy.instagramCaptionVariants ?? [],
          facebookCaption: socialCopy.facebookCaption,
          facebookCaptionVariants: socialCopy.facebookCaptionVariants ?? [],
        });
      }

      if (mode === "latest") {
        const result = await generateLatestInstagram();
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          slug: (result as any).slug ?? null,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          publishImage: (result as any).publishImage ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }
    }

    if (platform === "pinterest") {
      if (mode === "all") {
        const result = await generateAllPinterest();
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          count: result.count ?? 0,
          generated: (result as any)?.generated ?? [],
        });
      }

      if (mode === "single" && slug) {
        const result = await renderPinterestBySlug(slug);
        const socialCopy = await getSocialCopyForSlug(slug);
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          slug,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
          pinterestCaption: socialCopy.pinterestCaption,
          pinterestCaptionVariants: socialCopy.pinterestCaptionVariants ?? [],
        });
      }

      if (mode === "latest") {
        const result = await generateLatestPinterest();
        return NextResponse.json({
          success: true,
          message: "Generation complete",
          platform,
          mode,
          kind,
          slug: (result as any).slug ?? null,
          count: result.count ?? 0,
          image: (result as any).image ?? null,
          storage: (result as any).storage ?? null,
          path: (result as any).path ?? null,
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid platform or mode" },
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