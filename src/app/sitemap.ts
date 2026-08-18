// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { getAllRecipes } from "@/lib/recipes";
import { getAllGuideSlugs } from "@/lib/guides";
import { RECIPE_COLLECTIONS } from "@/lib/seo/collections";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const recipes = getAllRecipes();
  const guideSlugs = getAllGuideSlugs();

  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/recipes`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/guides`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/cookies`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/store`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/recipes/vegan-indian-curry-recipes`,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/recipes/vegan-indian-dal-recipes`,
      changeFrequency: "monthly",
      priority: 0.85,
    },

    ...recipes.map((recipe) => ({
      url: `${siteUrl}/recipes/${recipe.slug}`,
      lastModified: recipe.publishedAt ? new Date(recipe.publishedAt) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    ...RECIPE_COLLECTIONS.map((collection) => ({
      url: `${siteUrl}/recipes/collections/${collection.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    ...guideSlugs.map((slug) => ({
      url: `${siteUrl}/guides/${slug}`,
      lastModified: (() => {
        const mdx = path.join(process.cwd(), "content", "guides", `${slug}.mdx`);
        const md = path.join(process.cwd(), "content", "guides", `${slug}.md`);
        const file = fs.existsSync(mdx) ? mdx : md;
        return fs.existsSync(file) ? fs.statSync(file).mtime : undefined;
      })(),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}
