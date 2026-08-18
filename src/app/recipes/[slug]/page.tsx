// src/app/recipes/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getAllRecipeSlugs, getRecipeBySlug } from "@/lib/recipes";
import { getRecipeImage, isPlaceholderImage } from "@/lib/recipeimages";
import { isCurryHubRecipe } from "@/lib/seo/curryHub";
import { isDalHubRecipe } from "@/lib/seo/dalHub";
import { getCollectionsForRecipe } from "@/lib/seo/collections";
import PrintButton from "@/components/PrintButton";
import RelatedGuides from "@/components/RelatedGuides";
import RelatedRecipes from "@/components/RelatedRecipes";
import StorePromo from "@/components/StorePromo";
import RecipeEngagement from "@/components/RecipeEngagement";

function extractSections(raw: string) {
  const sections: Record<string, string> = {};
  const re = /(^|\n)##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|\s*$)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const heading = m[2].trim().toLowerCase();
    const body = (m[3] ?? "").trim();
    sections[heading] = body;
  }
  return sections;
}

function extractBullets(block?: string): string[] {
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-+\s+/, "").trim())
    .filter(Boolean);
}

function extractNumbered(block?: string): string[] {
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

function extractNotes(block?: string): string[] {
  if (!block) return [];
  const bullets = extractBullets(block);
  if (bullets.length) return bullets;

  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("<a ") && !l.startsWith("</a>"));
}

function totalMinutesNumber(prep?: number, cook?: number) {
  const total = (prep ?? 0) + (cook ?? 0);
  return total > 0 ? total : null;
}

function minutesLabel(prep?: number, cook?: number) {
  const t = totalMinutesNumber(prep, cook);
  return t !== null ? `${t} min` : null;
}

function isoDurationFromMinutes(mins?: number) {
  if (typeof mins !== "number" || !Number.isFinite(mins) || mins <= 0) return undefined;
  return `PT${Math.round(mins)}M`;
}

function absUrl(siteUrl: string, maybePath: string) {
  if (!maybePath) return maybePath;
  if (maybePath.startsWith("http://") || maybePath.startsWith("https://")) return maybePath;
  return `${siteUrl}${maybePath.startsWith("/") ? "" : "/"}${maybePath}`;
}

function normaliseText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function recipeSearchText(recipe: any) {
  return [
    recipe?.title ?? "",
    recipe?.slug ?? "",
    recipe?.description ?? "",
    recipe?.cuisine ?? "",
    ...(Array.isArray(recipe?.tags) ? recipe.tags : []),
    ...(Array.isArray(recipe?.diet) ? recipe.diet : []),
  ]
    .join(" ")
    .toLowerCase();
}

function buildSeoTypeLabel(recipe: any) {
  const text = recipeSearchText(recipe);

  if (/\bchana|chickpea|chickpeas|chole\b/.test(text)) {
    return "Vegan Indian Chickpea Curry";
  }

  if (/\bdal|dahl|lentil|lentils|masoor|moong|urad|toor\b/.test(text)) {
    return "Vegan Indian Dal";
  }

  if (/\bsaag|palak|spinach\b/.test(text) && /\baloo|potato|potatoes\b/.test(text)) {
    return "Vegan Indian Spinach Potato Curry";
  }

  if (/\baloo|potato|potatoes\b/.test(text) && /\bcurry|masala\b/.test(text)) {
    return "Vegan Indian Potato Curry";
  }

  if (/\btofu\b/.test(text) && /\bbutter\b/.test(text)) {
    return "Vegan Indian Butter Tofu Curry";
  }

  if (/\btofu\b/.test(text) && /\bcurry|masala|makhani|korma|vindaloo\b/.test(text)) {
    return "Vegan Indian Tofu Curry";
  }

  if (/\brajma|kidney beans?\b/.test(text)) {
    return "Vegan Indian Kidney Bean Curry";
  }

  if (/\bbiryani\b/.test(text)) {
    return "Vegan Indian Biryani";
  }

  if (/\brice|pulao\b/.test(text)) {
    return "Vegan Indian Rice Dish";
  }

  if (/\bnaan|roti|chapati|poori|paratha|flatbread\b/.test(text)) {
    return "Vegan Indian Bread";
  }

  if (/\bpakora|bhaji|samosa\b/.test(text)) {
    return "Vegan Indian Snack";
  }

  if (/\bcurry|masala|korma|vindaloo|makhani|makhanwala\b/.test(text)) {
    return "Vegan Indian Curry";
  }

  return "Vegan Indian Recipe";
}

function buildSeoTitle(recipe: any) {
  const title = String(recipe?.title ?? "Recipe").trim();
  const lowerTitle = title.toLowerCase();
  const typeLabel = buildSeoTypeLabel(recipe);

  if (lowerTitle.includes("recipe")) {
    return `${title} | ${typeLabel}`;
  }

  return `${title} Recipe | ${typeLabel}`;
}

export function generateStaticParams() {
  return getAllRecipeSlugs().map((slug) => ({ slug }));
}

function buildSeoDescription(recipe: any) {
  const existing = String(recipe?.description ?? "").trim();
  if (existing) {
    return existing.length <= 160 ? existing : `${existing.slice(0, 157).trim()}...`;
  }

  const title = String(recipe?.title ?? "This recipe").trim();
  const typeLabel = buildSeoTypeLabel(recipe);
  const total = totalMinutesNumber(recipe?.prepMinutes, recipe?.cookMinutes);
  const serves =
    typeof recipe?.servings === "number"
      ? recipe.servings
      : typeof recipe?.serves === "number"
      ? recipe.serves
      : null;

  let sentence = `${title} is a ${typeLabel.toLowerCase()} with clear step-by-step instructions, proper masala flavour and a vegan-friendly method for home cooks.`;

  if (total && serves) {
    sentence = `${title} is a ${typeLabel.toLowerCase()} with clear step-by-step instructions, proper masala flavour, ready in about ${total} minutes and serving ${serves}.`;
  } else if (total) {
    sentence = `${title} is a ${typeLabel.toLowerCase()} with clear step-by-step instructions, proper masala flavour and a cooking time of about ${total} minutes.`;
  } else if (serves) {
    sentence = `${title} is a ${typeLabel.toLowerCase()} with clear step-by-step instructions, proper masala flavour and a recipe yield of ${serves} servings.`;
  }

  return sentence.length <= 160 ? sentence : `${sentence.slice(0, 157).trim()}...`;
}

function buildRecipeCategory(recipe: any) {
  const text = recipeSearchText(recipe);

  if (/\bdal|dahl|lentil|lentils|masoor|moong|urad|toor\b/.test(text)) {
    return "Vegan Indian Dal";
  }

  if (/\bbiryani|rice|pulao\b/.test(text)) {
    return "Vegan Indian Rice Dish";
  }

  if (/\bnaan|roti|chapati|poori|paratha|flatbread\b/.test(text)) {
    return "Vegan Indian Bread";
  }

  if (/\bpakora|bhaji|samosa\b/.test(text)) {
    return "Vegan Indian Snack";
  }

  return "Vegan Indian Curry";
}

function getRelatedGuideTags(recipe: any) {
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

function buildIntroFallback(recipe: any) {
  const text = [
    recipe.title ?? "",
    recipe.slug ?? "",
    ...(recipe.tags ?? []),
    recipe.description ?? "",
    recipe.cuisine ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (/\bchana|chickpea|chickpeas\b/.test(text)) {
    return "This kind of dish depends on a properly cooked onion and tomato base. Once the chickpeas have had time to sit in the masala, the whole curry tastes rounder, deeper and much more settled.";
  }

  if (/\bdal|dahl|lentil|masoor|moong|urad\b/.test(text)) {
    return "The main thing here is texture. Give the lentils enough time to soften fully, then season at the end so the finished dish tastes full, calm and properly balanced.";
  }

  if (/\baloo|potato\b/.test(text)) {
    return "Potato dishes like this are best when the spices have been given a little time to catch in the oil before everything comes together. That is what gives the final dish its warmth and depth.";
  }

  if (/\btofu\b/.test(text)) {
    return "The balance matters more than anything here. Once the sauce is properly cooked and the tofu has had time to take on some flavour, the whole dish feels much more complete.";
  }

  if (/\bbiryani|rice\b/.test(text)) {
    return "With a dish like this, the texture needs as much attention as the seasoning. The grains should stay separate, the spices should smell settled, and the whole thing should feel generous rather than heavy.";
  }

  if (/\bpakora|bhaji|samosa\b/.test(text)) {
    return "This is best approached with an eye on texture. You want a mixture that feels well-seasoned and balanced, with a final result that is crisp where it should be and still full of flavour inside.";
  }

  return "A dish like this benefits from care in the early stages. Give the base enough time, season steadily, and the final result will taste fuller, rounder and much more convincing at the table.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const recipe: any = getRecipeBySlug(slug);
  if (!recipe) return {};

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const heroBase =
    typeof recipe.image === "string" && recipe.image.trim().length > 0
      ? recipe.image
      : getRecipeImage(recipe.slug);

  const hero =
    recipe.imageVersion !== undefined && recipe.imageVersion !== null
      ? `${heroBase}${heroBase.includes("?") ? "&" : "?"}v=${recipe.imageVersion}`
      : heroBase;

  const heroAbs = absUrl(siteUrl, hero);
  const canonical = `${siteUrl}/recipes/${slug}`;

  const seoTitle = buildSeoTitle(recipe);
  const seoDescription = buildSeoDescription(recipe);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonical,
      siteName: "Vegan Masala",
      type: "article",
      publishedTime: recipe.publishedAt || undefined,
      images: heroAbs ? [{ url: heroAbs }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: heroAbs ? [heroAbs] : undefined,
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const recipe: any = getRecipeBySlug(slug);
  if (!recipe) return notFound();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const heroBase =
    typeof recipe.image === "string" && recipe.image.trim().length > 0
      ? recipe.image
      : getRecipeImage(recipe.slug);

  const hero =
    recipe.imageVersion !== undefined && recipe.imageVersion !== null
      ? `${heroBase}${heroBase.includes("?") ? "&" : "?"}v=${recipe.imageVersion}`
      : heroBase;

  const placeholder = isPlaceholderImage(heroBase);

  const rawBody: string =
    recipe.content ||
    recipe.raw ||
    recipe.mdx ||
    recipe.body ||
    recipe.source ||
    recipe.mdxSource ||
    "";

  const sections = extractSections(rawBody);

  const ingredientsBlock =
    recipe.ingredientsMarkdown ||
    sections["ingredients"] ||
    sections["ingredient"] ||
    "";

  const methodBlock =
    recipe.methodMarkdown ||
    sections["method"] ||
    sections["instructions"] ||
    sections["instruction"] ||
    "";

  const notesBlock =
    recipe.notesMarkdown || sections["notes"] || sections["tips"] || "";

  const ingredientsFromBody = extractBullets(ingredientsBlock);
  const methodFromBody = extractNumbered(methodBlock);

  const notesFromBody = (() => {
    const a = extractNotes(recipe.notesMarkdown);
    if (a.length) return a;

    const b = extractNotes(sections["notes"]);
    if (b.length) return b;

    const c = extractNotes(sections["tips"]);
    if (c.length) return c;

    const d = extractNotes(notesBlock);
    if (d.length) return d;

    return [];
  })();

  const ingredients =
    (Array.isArray(recipe.ingredients) && recipe.ingredients.length
      ? recipe.ingredients
      : ingredientsFromBody) || [];

  const instructions =
    (Array.isArray(recipe.instructions) && recipe.instructions.length
      ? recipe.instructions
      : methodFromBody) || [];

  const notes =
    (Array.isArray(recipe.notes) && recipe.notes.length
      ? recipe.notes
      : notesFromBody) || [];

  const anchorOffsetClass = "scroll-mt-[160px] sm:scroll-mt-[140px]";

  const totalMins = totalMinutesNumber(recipe.prepMinutes, recipe.cookMinutes);
  const totalLabel = minutesLabel(recipe.prepMinutes, recipe.cookMinutes);

  const canonicalUrl = `${siteUrl}/recipes/${recipe.slug}`;
  const heroAbs = absUrl(siteUrl, hero);
  const relatedGuideTags = getRelatedGuideTags(recipe);
  const showCurryHubCallout = isCurryHubRecipe(recipe.slug);
  const showDalHubCallout = isDalHubRecipe(recipe.slug);
  const recipeCollections = getCollectionsForRecipe(recipe);

  const servingIdeas = (() => {
    if (typeof recipe.servingSuggestion === "string" && recipe.servingSuggestion.trim()) {
      return recipe.servingSuggestion.trim();
    }

    const text = `${recipe.title ?? ""} ${recipe.slug ?? ""} ${(recipe.tags ?? []).join(" ")}`
      .toLowerCase();

    if (/\b(biryani|rice|pulao)\b/.test(text)) {
      return "Serve with vegan raita, onion salad, pickle or a simple cucumber side.";
    }

    if (/\b(dal|chana|rajma|curry|masala|korma|vindaloo|makhani)\b/.test(text)) {
      return "Best served hot with basmati rice, roti, naan or a spoonful of pickle on the side.";
    }

    if (/\b(naan|chapati|roti|poori)\b/.test(text)) {
      return "Serve warm with curry, dal or a simple vegetable side while still fresh.";
    }

    return "Serve hot and simply, with sides that let the spices and masala stay at the centre.";
  })();

  const storePromoSlugs = [
    "jalebi-recipe-traditional-method",
    "vegan-gulab-jamun",
    "coconut-ladoo",
    "kheer",
    "carrot-halwa",
    "mango-lassi",
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Recipes",
        item: `${siteUrl}/recipes`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: recipe.title,
        item: canonicalUrl,
      },
    ],
  };

  const recipeJsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: buildSeoDescription(recipe),
    url: canonicalUrl,
    image: heroAbs || undefined,
    datePublished: recipe.publishedAt || undefined,
    author: {
      "@type": "Organization",
      name: "Vegan Masala",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Vegan Masala",
      url: siteUrl,
    },
    recipeCuisine: recipe.cuisine || "Indian",
    recipeCategory: buildRecipeCategory(recipe),
    keywords: Array.isArray(recipe.tags) ? recipe.tags.join(", ") : undefined,
    recipeYield:
      typeof recipe.servings === "number"
        ? `${recipe.servings} servings`
        : typeof recipe.serves === "number"
        ? `${recipe.serves} servings`
        : undefined,
    prepTime: isoDurationFromMinutes(recipe.prepMinutes),
    cookTime: isoDurationFromMinutes(recipe.cookMinutes),
    totalTime: isoDurationFromMinutes(totalMins ?? undefined),
    recipeIngredient: ingredients.length ? ingredients : undefined,
    recipeInstructions: instructions.length
      ? instructions.map((step: string, i: number) => ({
          "@type": "HowToStep",
          name: `Step ${i + 1}`,
          text: step,
        }))
      : undefined,
    suitableForDiet: "https://schema.org/VeganDiet",
  };

  return (
    <main className="relative mx-auto max-w-6xl px-6 py-10">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage: "url('/images/header/mandala-bg.jpg')",
          backgroundSize: "900px",
          backgroundRepeat: "repeat",
          backgroundPosition: "top center",
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }}
      />

      <Link
        href="/recipes"
        className="inline-flex items-center text-sm text-[var(--text-soft)] transition hover:underline"
      >
        ← Back to recipes
      </Link>

      <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black/10" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--brand-gold)]/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[var(--brand-red)]/5 blur-3xl" />

        <div className="relative grid gap-8 p-6 lg:grid-cols-[380px_1fr] lg:items-start lg:p-8">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-black/25 shadow-lg">
            <div className="relative aspect-[4/4.5] w-full">
              <Image
                src={hero}
                alt={recipe.title}
                fill
                className={placeholder ? "object-contain p-8 opacity-90" : "object-cover"}
                sizes="(max-width: 1024px) 100vw, 380px"
                priority
              />
              {!placeholder && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-gold)]/70">
              Vegan Masala Recipe
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-wide text-[var(--brand-gold)] sm:text-4xl lg:text-5xl">
              {recipe.title}
            </h1>

            {recipe.description && (
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-soft)] sm:text-lg">
                {recipe.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {totalLabel && (
                <span className="rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-bold text-white shadow">
                  {totalLabel}
                </span>
              )}

              {typeof recipe.prepMinutes === "number" && (
                <span className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  Prep: {recipe.prepMinutes} min
                </span>
              )}

              {typeof recipe.cookMinutes === "number" && (
                <span className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  Cook: {recipe.cookMinutes} min
                </span>
              )}

              {typeof recipe.servings === "number" && (
                <span className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  Serves {recipe.servings}
                </span>
              )}

              {recipe.cuisine && (
                <span className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                  {recipe.cuisine}
                </span>
              )}

              {recipe.diet?.includes("vegan") && (
                <span className="rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-bold text-white">
                  Vegan
                </span>
              )}
            </div>

            {recipe.tags?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {recipe.tags.slice(0, 10).map((t: string) => (
                  <span
                    key={t}
                    className="rounded-xl border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-bold text-[var(--text-soft)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#ingredients"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] transition hover:bg-black/20"
              >
                Ingredients
              </a>
              <a
                href="#method"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] transition hover:bg-black/20"
              >
                Method
              </a>
              <a
                href="#notes"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] transition hover:bg-black/20"
              >
                Notes
              </a>

              <PrintButton />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
            From the kitchen
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-[var(--brand-gold)]">
            What to expect
          </h2>
          <p className="mt-3 leading-7 text-[var(--text-soft)]">
            {recipe.introNote || buildIntroFallback(recipe)}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-black/15 p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
            Serving idea
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-[var(--brand-gold)]">
            Best served simply
          </h2>
          <p className="mt-3 leading-7 text-[var(--text-soft)]">{servingIdeas}</p>
        </div>
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
        <div
          id="method"
          className={`relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm lg:p-8 ${anchorOffsetClass}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />

          <div className="relative">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              Cook the recipe
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">
              Method
            </h2>

            {instructions.length ? (
              <ol className="mt-8 space-y-6">
                {instructions.map((step: string, i: number) => (
                  <li key={i} className="flex gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red)] text-sm font-extrabold text-white shadow">
                      {i + 1}
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/10 px-4 py-3">
                      <p className="leading-7 text-[var(--text-soft)]">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-soft)]/80">
                No method found yet for this recipe.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div
            id="ingredients"
            className={`rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-sm ${anchorOffsetClass}`}
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              Gather everything first
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">
              Ingredients
            </h2>

            {ingredients.length ? (
              <ul className="mt-6 space-y-3 text-[var(--text-soft)]">
                {ingredients.map((item: string, i: number) => (
                  <li
                    key={i}
                    className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 leading-7"
                  >
                    <span className="mr-2 font-bold text-[var(--brand-gold)]">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-soft)]/80">
                No ingredients found yet for this recipe.
              </p>
            )}
          </div>

          <div
            id="notes"
            className={`rounded-[2rem] border border-[var(--border)] bg-black/15 p-6 shadow-sm ${anchorOffsetClass}`}
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              A few useful notes
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">
              Notes
            </h2>

            {notes.length ? (
              <ul className="mt-6 space-y-3 text-[var(--text-soft)]">
                {notes.map((n: string, i: number) => (
                  <li
                    key={i}
                    className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 leading-7"
                  >
                    <span className="mr-2 font-bold text-[var(--brand-gold)]">•</span>
                    {n}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-soft)]/80">
                No notes yet.
              </p>
            )}
          </div>
        </div>
      </section>

      {storePromoSlugs.includes(recipe.slug) && <StorePromo />}

      <RecipeEngagement slug={recipe.slug} title={recipe.title} />

      {showCurryHubCallout && (
        <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
            Topic hub
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-[var(--brand-gold)]">
            Explore Vegan Indian Curry Recipes
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--text-soft)]">
            Browse the curated curry hub for related chickpea, dal, potato, tofu and vegetable recipes in one place.
          </p>
          <Link
            href="/recipes/vegan-indian-curry-recipes"
            className="mt-4 inline-flex rounded-xl bg-[var(--brand-red)] px-4 py-2 text-sm font-extrabold text-white transition hover:opacity-90"
          >
            Visit the curry hub
          </Link>
        </section>
      )}

      {showDalHubCallout && (
        <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
            Topic hub
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-[var(--brand-gold)]">
            Explore Vegan Indian Dal Recipes
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--text-soft)]">
            Browse the dal hub for classic dal recipes, lentil curries, and bean-based Indian curries in one place.
          </p>
          <Link
            href="/recipes/vegan-indian-dal-recipes"
            className="mt-4 inline-flex rounded-xl bg-[var(--brand-red)] px-4 py-2 text-sm font-extrabold text-white transition hover:opacity-90"
          >
            Visit the dal hub
          </Link>
        </section>
      )}

      <RelatedRecipes
        title="Cook next"
        tags={recipe.tags ?? []}
        excludeSlugs={[recipe.slug]}
        max={6}
      />

      {recipeCollections.length > 0 && (
        <nav aria-label="Recipe collections" className="mt-8 flex flex-wrap gap-3">
          {recipeCollections.map((collection) => (
            <Link key={collection.slug} href={`/recipes/collections/${collection.slug}`} className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-bold text-[var(--brand-gold)] hover:bg-black/20">
              More {collection.title}
            </Link>
          ))}
        </nav>
      )}

      <RelatedGuides title="Learn the technique" tags={relatedGuideTags} max={3} />
    </main>
  );
}
