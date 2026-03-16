// src/app/sitemap.ts
export const runtime = "nodejs";

import type { MetadataRoute } from "next";
import { getAllRecipeSlugs } from "@/lib/recipes";
import { getAllGuideSlugs } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://vegan-masala.com";

  const now = new Date();

  const staticRoutes = [
    "",
    "/recipes",
    "/guides",
    "/about",
    "/contact",
    "/privacy",
    "/cookies",
  ];

  const recipeSlugs = getAllRecipeSlugs();
  const guideSlugs = getAllGuideSlugs();

  return [

    // Core pages
    ...staticRoutes.map((p) => ({
      url: `${siteUrl}${p}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority:
        p === ""
          ? 1
          : p === "/recipes" || p === "/guides"
          ? 0.9
          : 0.7,
    })),

    // Recipes
    ...recipeSlugs.map((slug) => ({
      url: `${siteUrl}/recipes/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    // Guides
    ...guideSlugs.map((slug) => ({
      url: `${siteUrl}/guides/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),

  ];
}