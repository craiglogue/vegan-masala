import { NextResponse } from "next/server";

import {

allContent,
slugFromFile,
titleFromSlug

} from "@/lib/social/core/content";

export async function GET() {
  try {
    const items = allContent()
      .map((item) => {
        const slug = slugFromFile(item.file);
        const title = titleFromSlug(slug);

        return {
          slug,
          title,
          type: item.type,
          label: title,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "recipe" ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });

    return NextResponse.json({
      ok: true,
      slugs: items,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load slugs",
        slugs: [],
      },
      { status: 500 }
    );
  }
}