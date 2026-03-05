// src/app/recipes/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";

import { getRecipeBySlug } from "@/lib/recipes";
import { getRecipeImage, isPlaceholderImage } from "@/lib/recipeimages";
import PrintButton from "@/components/PrintButton";

/**
 * Extract sections from MDX body.
 * Supports headings like:
 * ## Ingredients
 * ## Method
 * ## Instructions
 * ## Notes
 * ## Tips
 */
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

function minutes(prep?: number, cook?: number) {
  const total = (prep ?? 0) + (cook ?? 0);
  return total > 0 ? `${total} min` : null;
}

function toIsoDurationFromMinutes(mins?: number) {
  const m = typeof mins === "number" && mins > 0 ? mins : 0;
  return m > 0 ? `PT${m}M` : undefined;
}

function absoluteUrl(siteUrl: string, p: string) {
  if (!p) return p;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${siteUrl}${p.startsWith("/") ? "" : "/"}${p}`;
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const recipe: any = getRecipeBySlug(slug);
  if (!recipe) return notFound();

  const hero = getRecipeImage(recipe.slug);
  const placeholder = isPlaceholderImage(hero);

  // ✅ robust raw body source (covers lots of shapes)
  const rawBody: string =
    recipe.content ||
    recipe.raw ||
    recipe.mdx ||
    recipe.body ||
    recipe.source ||
    recipe.mdxSource ||
    "";

  const sections = extractSections(rawBody);

  // Prefer extracted markdown fields from your loader if present
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

  // Notes block candidates
  const notesBlock =
    recipe.notesMarkdown || sections["notes"] || sections["tips"] || "";

  const ingredientsFromBody = extractBullets(ingredientsBlock);
  const methodFromBody = extractNumbered(methodBlock);

  // ✅ FIX: notes extraction checks multiple likely sources in a safe order
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

  // ✅ anchor offset for sticky header when jumping
  const anchorOffsetClass = "scroll-mt-[160px] sm:scroll-mt-[140px]";

  // ✅ Site URL for absolute schema URLs (use env first, fallback to prod domain)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://vegan-masala.com";

  const pageUrl = `${siteUrl}/recipes/${recipe.slug}`;

  const totalMins =
    (typeof recipe.prepMinutes === "number" ? recipe.prepMinutes : 0) +
    (typeof recipe.cookMinutes === "number" ? recipe.cookMinutes : 0);

  const recipeSchema: any = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description || undefined,
    url: pageUrl,
    image: placeholder ? undefined : [absoluteUrl(siteUrl, hero)],
    recipeCuisine: recipe.cuisine || "Indian",
    keywords: Array.isArray(recipe.tags) ? recipe.tags.join(", ") : undefined,
    datePublished: recipe.publishedAt || undefined,
    author: { "@type": "Organization", name: "Vegan Masala" },
    publisher: {
      "@type": "Organization",
      name: "Vegan Masala",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteUrl, "/brand/logo-flat.png"),
      },
    },
    prepTime: toIsoDurationFromMinutes(recipe.prepMinutes),
    cookTime: toIsoDurationFromMinutes(recipe.cookMinutes),
    totalTime: totalMins > 0 ? `PT${totalMins}M` : undefined,
    recipeYield:
      typeof recipe.servings === "number"
        ? `${recipe.servings} servings`
        : recipe.servings
        ? String(recipe.servings)
        : undefined,
    recipeCategory: "Main course",
    recipeIngredient: ingredients.length ? ingredients : undefined,
    recipeInstructions: instructions.length
      ? instructions.map((step: string) => ({
          "@type": "HowToStep",
          text: step,
        }))
      : undefined,
    suitableForDiet:
      recipe?.diet?.includes("vegan") || recipe?.diet?.includes("Vegan")
        ? "https://schema.org/VeganDiet"
        : undefined,
  };

  // Remove undefined keys so Google’s parser is happier
  for (const k of Object.keys(recipeSchema)) {
    if (recipeSchema[k] === undefined) delete recipeSchema[k];
  }

  const breadcrumbSchema = {
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
        item: pageUrl,
      },
    ],
  };

  // Output both Recipe + Breadcrumbs as an array (valid JSON-LD)
  const jsonLd = [breadcrumbSchema, recipeSchema];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* ✅ Rich Results schema (Next.js-safe) */}
      <Script
        id="recipe-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`html { scroll-behavior: smooth; }`}</style>

      <Link
        href="/recipes"
        className="text-sm text-[var(--text-soft)] hover:underline"
      >
        ← Back to recipes
      </Link>

      {/* TOP CARD */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[340px_1fr] lg:items-start">
          {/* HERO IMAGE */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black/25">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={hero}
                alt={recipe.title}
                fill
                className={
                  placeholder ? "object-contain p-8 opacity-90" : "object-cover"
                }
                sizes="(max-width: 1024px) 100vw, 340px"
                priority
              />
            </div>
          </div>

          {/* TITLE + META */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-wide text-[var(--brand-gold)] sm:text-4xl">
              {recipe.title}
            </h1>

            {recipe.description && (
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
                {recipe.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {minutes(recipe.prepMinutes, recipe.cookMinutes) && (
                <span className="rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-bold text-white">
                  {minutes(recipe.prepMinutes, recipe.cookMinutes)}
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

            {/* JUMP TO SECTION BUTTONS + PRINT */}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#ingredients"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/20 transition"
              >
                Ingredients
              </a>
              <a
                href="#method"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/20 transition"
              >
                Method
              </a>
              <a
                href="#notes"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/20 transition"
              >
                Notes
              </a>

              {/* ✅ Print */}
              <PrintButton />
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT GRID */}
      <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
        {/* METHOD */}
        <div
          id="method"
          className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm ${anchorOffsetClass}`}
        >
          <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
            Method
          </h2>

          {instructions.length ? (
            <ol className="mt-6 space-y-5">
              {instructions.map((step: string, i: number) => (
                <li key={i} className="flex gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red)] text-sm font-extrabold text-white">
                    {i + 1}
                  </div>
                  <p className="leading-7 text-[var(--text-soft)]">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-soft)]/80">
              No method found yet for this recipe.
            </p>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-10">
          {/* INGREDIENTS */}
          <div
            id="ingredients"
            className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm ${anchorOffsetClass}`}
          >
            <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
              Ingredients
            </h2>

            {ingredients.length ? (
              <ul className="mt-6 space-y-2 text-[var(--text-soft)]">
                {ingredients.map((item: string, i: number) => (
                  <li key={i} className="leading-7">
                    <span className="mr-2 text-[var(--brand-gold)]">•</span>
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

          {/* NOTES */}
          <div
            id="notes"
            className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm ${anchorOffsetClass}`}
          >
            <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
              Notes
            </h2>

            {notes.length ? (
              <ul className="mt-6 space-y-2 text-[var(--text-soft)]">
                {notes.map((n: string, i: number) => (
                  <li key={i} className="leading-7">
                    <span className="mr-2 text-[var(--brand-gold)]">•</span>
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
    </main>
  );
}