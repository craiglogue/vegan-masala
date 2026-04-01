// src/app/sitemap.ts
export const runtime = "nodejs";

import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getAllRecipes } from "@/lib/recipes";
import { getAllGuideSlugs } from "@/lib/guides";

function fileDateOrNow(relativePath: string) {
  const fullPath = path.join(process.cwd(), relativePath);

  try {
    return fs.statSync(fullPath).mtime;
  } catch {
    return new Date();
  }
}

function getGuideLastModified(slug: string) {
  const mdxPath = path.join(process.cwd(), "content", "guides", `${slug}.mdx`);
  const mdPath = path.join(process.cwd(), "content", "guides", `${slug}.md`);

  if (fs.existsSync(mdxPath)) return fs.statSync(mdxPath).mtime;
  if (fs.existsSync(mdPath)) return fs.statSync(mdPath).mtime;

  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const staticRoutes = [
    { path: "", file: "src/app/page.tsx", priority: 1, changeFrequency: "weekly" as const },
    {
      path: "/recipes",
      file: "src/app/recipes/page.tsx",
      priority: 0.9,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/guides",
      file: "src/app/guides/page.tsx",
      priority: 0.9,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/about",
      file: "src/app/about/page.tsx",
      priority: 0.7,
      changeFrequency: "monthly" as const,
    },
    {
      path: "/contact",
      file: "src/app/contact/page.tsx",
      priority: 0.7,
      changeFrequency: "monthly" as const,
    },
    {
      path: "/privacy",
      file: "src/app/privacy/page.tsx",
      priority: 0.4,
      changeFrequency: "yearly" as const,
    },
    {
      path: "/cookies",
      file: "src/app/cookies/page.tsx",
      priority: 0.4,
      changeFrequency: "yearly" as const,
    },
    {
      path: "/store",
      file: "src/app/store/page.tsx",
      priority: 0.6,
      changeFrequency: "monthly" as const,
    },
  ];

  const recipeHubRoutes = [
    "/recipes/hub/chickpea",
    "/recipes/hub/tofu",
    "/recipes/hub/potato",
    "/recipes/hub/lentil",
    "/recipes/hub/cauliflower",
  ];

  const recipes = getAllRecipes();
  const guideSlugs = getAllGuideSlugs();

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: fileDateOrNow(route.file),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),

    ...recipeHubRoutes.map((p) => ({
      url: `${siteUrl}${p}`,
      lastModified: fileDateOrNow("src/app/recipes/page.tsx"),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),

    ...recipes.map((recipe) => ({
      url: `${siteUrl}/recipes/${recipe.slug}`,
      lastModified: recipe.publishedAt ? new Date(recipe.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    ...guideSlugs.map((slug) => ({
      url: `${siteUrl}/guides/${slug}`,
      lastModified: getGuideLastModified(slug),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}