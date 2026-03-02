// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getAllRecipeSlugs } from "@/lib/recipes";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

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

  return [
    ...staticRoutes.map((p) => ({
      url: `${siteUrl}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...recipeSlugs.map((slug) => ({
      url: `${siteUrl}/recipes/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}