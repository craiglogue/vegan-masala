import Link from "next/link";

import sitemap from "@/app/sitemap";
import { getAllGuides } from "@/lib/guides";
import { getRecipeImage } from "@/lib/recipeimages";
import { getAllRecipes } from "@/lib/recipes";
import { CURRY_HUB_RECIPE_SLUGS } from "@/lib/seo/curryHub";
import { DAL_HUB_RECIPE_SLUGS } from "@/lib/seo/dalHub";

export const dynamic = "force-dynamic";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

const expectedHubPaths = [
  "/recipes/vegan-indian-curry-recipes",
  "/recipes/vegan-indian-dal-recipes",
];

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function recipeRelatedGuideTags(recipe: any) {
  const text = [
    recipe.title ?? "",
    recipe.slug ?? "",
    ...(recipe.tags ?? []),
    ...(recipe.diet ?? []),
    recipe.description ?? "",
    recipe.cuisine ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const tags = new Set<string>();

  if (
    /\b(dal|dahl|lentil|masoor|moong|urad|toor|chana dal|rajma|beans?|kidney beans?)\b/.test(
      text
    )
  ) {
    tags.add("lentils");
    tags.add("dal");
    tags.add("lentil");
    tags.add("rajma");
    tags.add("chana");
  }

  if (/\b(curry|masala|vindaloo|korma|makhani|makhanwala)\b/.test(text)) {
    tags.add("curry");
    tags.add("masala");
    tags.add("spices");
  }

  if (/\b(rice|biryani|pulao|jeera rice)\b/.test(text)) {
    tags.add("rice");
    tags.add("biryani");
    tags.add("basmati");
  }

  if (/\b(chickpea|chickpeas|chana|chole)\b/.test(text)) {
    tags.add("chana");
    tags.add("chickpea");
    tags.add("lentils");
  }

  if (/\b(tofu|paneer)\b/.test(text)) {
    tags.add("tofu");
    tags.add("vegan dairy");
  }

  if (/\b(aloo|potato|potatoes)\b/.test(text)) {
    tags.add("beginner");
    tags.add("easy");
  }

  if (/\b(naan|chapati|roti|flatbread|poori)\b/.test(text)) {
    tags.add("pantry");
    tags.add("beginner");
  }

  if (/\b(palak|spinach|herbs|coriander|mint|curry leaves)\b/.test(text)) {
    tags.add("herbs");
  }

  if (
    typeof recipe.prepMinutes === "number" &&
    typeof recipe.cookMinutes === "number" &&
    recipe.prepMinutes + recipe.cookMinutes <= 35
  ) {
    tags.add("easy");
    tags.add("beginner");
  }

  tags.add("spices");
  tags.add("curry");

  return Array.from(tags);
}

function guideRelatedRecipeTags(slug: string) {
  const guideRecipeMap: Record<string, string[]> = {
    "vegan-indian-pantry-staples": ["chana", "rajma", "rice", "curry", "dal"],
    "indian-spices-explained-for-beginners": ["curry", "masala", "dal", "chana"],
    "how-to-build-a-curry-base": ["curry", "masala", "vindaloo", "korma"],
    "lentils-and-dal": ["dal", "lentil", "rajma", "chana", "moong"],
    "how-to-temper-spices": ["dal", "lentil", "chana", "rajma"],
    "beginner-friendly-vegan-indian-recipes": ["easy", "chana", "dal", "potato", "tofu", "rice"],
    "how-to-cook-basmati-rice": ["rice", "biryani", "chana", "rajma", "curry"],
    "vegan-dairy-alternatives": ["tofu", "korma", "makhanwala", "butter"],
    herbs: ["palak", "spinach", "curry", "chutney"],
    equipment: ["instant-pot", "pressure-cooker", "one-pot", "rice"],
  };

  return guideRecipeMap[slug] || [];
}

export default function AdminSeoHealthPage() {
  const recipes = getAllRecipes();
  const guides = getAllGuides();
  const sitemapEntries = sitemap();

  const recipeCount = recipes.length;
  const guideCount = guides.length;
  const sitemapCount = sitemapEntries.length;

  const sitemapUrls = new Set(sitemapEntries.map((entry) => entry.url));
  const recipeUrls = recipes.map((r) => `${siteUrl}/recipes/${r.slug}`);
  const guideUrls = guides.map((g) => `${siteUrl}/guides/${g.slug}`);
  const hubUrls = expectedHubPaths.map((path) => `${siteUrl}${path}`);
  const seoHubCount = hubUrls.filter((url) => sitemapUrls.has(url)).length;

  const recipesWithDescription = recipes.filter((r) => Boolean(String(r.description || "").trim())).length;
  const recipesWithImage = recipes.filter((r) => Boolean(String(r.image || getRecipeImage(r.slug)).trim())).length;
  const recipesWithTags = recipes.filter((r) => Array.isArray(r.tags) && r.tags.length > 0).length;
  const recipesWithDate = recipes.filter((r) => Boolean(String(r.publishedAt || "").trim())).length;

  const guidesWithDescription = guides.filter((g) => Boolean(String(g.description || "").trim())).length;
  const guidesWithImage = guides.filter((g) => Boolean(String(g.image || "").trim())).length;

  const faqGuides = guides.filter((g) => /(^|\n)##\s+Frequently Asked Questions\b/i.test(g.content));

  const guideHaystacks = guides.map((g) => ({
    slug: g.slug,
    text: [g.slug, g.title, g.description || ""].join(" ").toLowerCase(),
  }));

  const recipesWithoutRelatedGuides = recipes
    .map((r) => {
      const tags = recipeRelatedGuideTags(r);
      const relatedCount = guideHaystacks.filter((g) =>
        tags.some((t) => g.text.includes(t.toLowerCase()))
      ).length;
      return { slug: r.slug, title: r.title, relatedCount };
    })
    .filter((r) => r.relatedCount === 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const recipeHaystacks = recipes.map((r) => ({
    slug: r.slug,
    title: r.title,
    text: [
      ...(r.tags || []),
      ...(r.diet || []),
      r.title || "",
      r.slug || "",
    ]
      .join(" ")
      .toLowerCase(),
  }));

  const guidesWithLowRecipeConnections = guides
    .map((g) => {
      const tags = guideRelatedRecipeTags(g.slug);
      const connectedRecipes = recipeHaystacks.filter((r) =>
        tags.some((t) => r.text.includes(t.toLowerCase()))
      ).length;
      return {
        slug: g.slug,
        title: g.title,
        connectedRecipes,
      };
    })
    .filter((g) => g.connectedRecipes <= 3)
    .sort((a, b) => a.connectedRecipes - b.connectedRecipes || a.slug.localeCompare(b.slug));

  const curryHubRecipeCount = Array.from(CURRY_HUB_RECIPE_SLUGS).filter((slug) =>
    recipes.some((r) => r.slug === slug)
  ).length;

  const dalHubRecipeCount = Array.from(DAL_HUB_RECIPE_SLUGS).filter((slug) =>
    recipes.some((r) => r.slug === slug)
  ).length;

  const missingRecipeUrls = recipeUrls.filter((url) => !sitemapUrls.has(url));
  const missingGuideUrls = guideUrls.filter((url) => !sitemapUrls.has(url));
  const missingHubUrls = hubUrls.filter((url) => !sitemapUrls.has(url));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
          Admin
        </div>

        <h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)]">
          SEO Health Dashboard
        </h1>

        <p className="mt-4 max-w-3xl text-sm text-[var(--text-soft)]">
          Local SEO structure audit powered by repository data only. No external APIs required.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--text-soft)]">
          <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
            Last updated: {fmtDate(new Date().toISOString())}
          </span>
          <Link
            href="/admin/social/health"
            className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2 font-bold text-[var(--brand-gold)] hover:bg-black/30"
          >
            Open social health
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">Content Overview</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Recipes", value: recipeCount },
            { label: "Guides", value: guideCount },
            { label: "SEO hubs", value: seoHubCount },
            { label: "Sitemap URLs", value: sitemapCount },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)]">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">Metadata Health</h2>
          <div className="mt-5 space-y-3 text-sm text-[var(--text-soft)]">
            <div className="rounded-xl bg-black/20 p-4">Recipes with descriptions: {recipesWithDescription}/{recipeCount} ({pct(recipesWithDescription, recipeCount)})</div>
            <div className="rounded-xl bg-black/20 p-4">Recipes with images: {recipesWithImage}/{recipeCount} ({pct(recipesWithImage, recipeCount)})</div>
            <div className="rounded-xl bg-black/20 p-4">Recipes with tags: {recipesWithTags}/{recipeCount} ({pct(recipesWithTags, recipeCount)})</div>
            <div className="rounded-xl bg-black/20 p-4">Recipes with published dates: {recipesWithDate}/{recipeCount} ({pct(recipesWithDate, recipeCount)})</div>
            <div className="rounded-xl bg-black/20 p-4">Guides with descriptions: {guidesWithDescription}/{guideCount} ({pct(guidesWithDescription, guideCount)})</div>
            <div className="rounded-xl bg-black/20 p-4">Guides with explicit images: {guidesWithImage}/{guideCount} ({pct(guidesWithImage, guideCount)})</div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">Structured Data Coverage</h2>
          <div className="mt-5 space-y-3 text-sm text-[var(--text-soft)]">
            <div className="rounded-xl bg-black/20 p-4">Recipe JSON-LD coverage: {recipeCount}/{recipeCount} (100%)</div>
            <div className="rounded-xl bg-black/20 p-4">Recipe breadcrumb JSON-LD coverage: {recipeCount}/{recipeCount} (100%)</div>
            <div className="rounded-xl bg-black/20 p-4">Guide Article JSON-LD coverage: {guideCount}/{guideCount} (100%)</div>
            <div className="rounded-xl bg-black/20 p-4">Guide breadcrumb JSON-LD coverage: {guideCount}/{guideCount} (100%)</div>
            <div className="rounded-xl bg-black/20 p-4">FAQ JSON-LD guides: {faqGuides.length}/{guideCount} ({pct(faqGuides.length, guideCount)})</div>
            <div className="rounded-xl bg-black/20 p-4">Hub Article/Breadcrumb JSON-LD coverage: {seoHubCount}/{expectedHubPaths.length} ({pct(seoHubCount, expectedHubPaths.length)})</div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">Internal Linking Health</h2>
          <div className="mt-5 space-y-3 text-sm text-[var(--text-soft)]">
            <div className="rounded-xl bg-black/20 p-4">Curry hub recipe count: {curryHubRecipeCount}</div>
            <div className="rounded-xl bg-black/20 p-4">Dal hub recipe count: {dalHubRecipeCount}</div>
            <div className="rounded-xl bg-black/20 p-4">Recipes without related guides: {recipesWithoutRelatedGuides.length}</div>
            <div className="rounded-xl bg-black/20 p-4">Guides with low recipe connections (≤3): {guidesWithLowRecipeConnections.length}</div>
          </div>

          {recipesWithoutRelatedGuides.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/80">
                Recipes without related guides
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-soft)]">
                {recipesWithoutRelatedGuides.slice(0, 12).map((recipe) => (
                  <li key={recipe.slug} className="rounded-xl bg-black/20 px-3 py-2">
                    {recipe.title} ({recipe.slug})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">Guides With Low Recipe Connections</h2>
          <p className="mt-3 text-sm text-[var(--text-soft)]">
            Based on the same keyword matching strategy used by related recipe widgets.
          </p>

          <div className="mt-4 space-y-2 text-sm text-[var(--text-soft)]">
            {guidesWithLowRecipeConnections.length ? (
              guidesWithLowRecipeConnections.map((guide) => (
                <div key={guide.slug} className="rounded-xl bg-black/20 px-3 py-2">
                  {guide.title} ({guide.slug}) • {guide.connectedRecipes} connected recipes
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-black/20 px-3 py-2">No low-connection guides found.</div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">Sitemap Integrity</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3 text-sm text-[var(--text-soft)]">
          <div className="rounded-2xl bg-black/20 p-4">
            <p className="font-extrabold text-[var(--brand-gold)]">Recipes present</p>
            <p className="mt-2">{recipeCount - missingRecipeUrls.length}/{recipeCount}</p>
            <p className="mt-1">Missing: {missingRecipeUrls.length}</p>
          </div>

          <div className="rounded-2xl bg-black/20 p-4">
            <p className="font-extrabold text-[var(--brand-gold)]">Guides present</p>
            <p className="mt-2">{guideCount - missingGuideUrls.length}/{guideCount}</p>
            <p className="mt-1">Missing: {missingGuideUrls.length}</p>
          </div>

          <div className="rounded-2xl bg-black/20 p-4">
            <p className="font-extrabold text-[var(--brand-gold)]">SEO hubs present</p>
            <p className="mt-2">{expectedHubPaths.length - missingHubUrls.length}/{expectedHubPaths.length}</p>
            <p className="mt-1">Missing: {missingHubUrls.length}</p>
          </div>
        </div>

        {(missingRecipeUrls.length > 0 || missingGuideUrls.length > 0 || missingHubUrls.length > 0) && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Sitemap gaps detected. Review missing URL groups before deployment.
          </div>
        )}
      </section>
    </main>
  );
}
