// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getAllRecipes } from "@/lib/recipes";
import { getAllGuideSlugs } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const recipes = getAllRecipes();
  const guideSlugs = getAllGuideSlugs();

  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/recipes`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/store`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },

    ...recipes.map((recipe) => ({
      url: `${siteUrl}/recipes/${recipe.slug}`,
      lastModified: recipe.publishedAt ? new Date(recipe.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    ...guideSlugs.map((slug) => ({
      url: `${siteUrl}/guides/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}