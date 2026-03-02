// src/app/recipes/page.tsx
import Link from "next/link";
import Image from "next/image";

import { getAllRecipes } from "@/lib/recipes";
import { getRecipeImage, isPlaceholderImage } from "@/lib/recipeimages";

function totalMinutes(prep?: number, cook?: number) {
  const t = (prep ?? 0) + (cook ?? 0);
  return t > 0 ? t : null;
}

function minutesLabel(prep?: number, cook?: number) {
  const t = totalMinutes(prep, cook);
  return t ? `${t} min` : null;
}

function norm(input: string) {
  return String(input ?? "").trim().toLowerCase();
}

function recipeText(r: any) {
  return `${r.slug ?? ""} ${r.title ?? ""} ${(r.tags ?? []).join(" ")} ${(r.diet ?? []).join(
    " "
  )}`.toLowerCase();
}

/** Build href preserving existing filters */
function buildHref(
  base: string,
  params: { tag?: string | null; collection?: string | null }
) {
  const sp = new URLSearchParams();
  if (params.collection) sp.set("collection", params.collection);
  if (params.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Consolidate messy tags into a small set of canonical tags
 * (so the filter bar doesn't explode into dozens of near-duplicates).
 */
function canonicalizeTag(raw: string): string | null {
  const t = norm(String(raw));
  const clean = t.replace(/[&]/g, "and").replace(/[^a-z0-9\s-]/g, "").trim();

  if (!clean) return null;
  if (clean === "course" || clean === "mains") return null;

  const alias: Record<string, string> = {
    curry: "curries",
    curries: "curries",
    "one pot": "one-pot",
    "one-pot": "one-pot",
    "30 min": "30-min",
    "30-min": "30-min",
    "30-minute": "30-min",
    "30 minute": "30-min",
    "gluten free": "gluten-free",
    "gluten-free": "gluten-free",

    chickpea: "chickpeas",
    chickpeas: "chickpeas",
    chana: "chickpeas",
    chole: "chickpeas",

    rajma: "beans",
    "kidney beans": "beans",
    beans: "beans",

    lentil: "dal-and-lentils",
    lentils: "dal-and-lentils",
    dal: "dal-and-lentils",
    dahl: "dal-and-lentils",
    moong: "dal-and-lentils",
    urad: "dal-and-lentils",
    masoor: "dal-and-lentils",

    tofu: "tofu",
    paneer: "tofu",

    spinach: "spinach",
    palak: "spinach",

    potato: "potatoes",
    potatoes: "potatoes",
    aloo: "potatoes",

    eggplant: "eggplant",
    aubergine: "eggplant",
    brinjal: "eggplant",

    cauliflower: "cauliflower",
    gobi: "cauliflower",

    mushroom: "mushroom",
    mushrooms: "mushroom",

    biryani: "rice",
    rice: "rice",

    "instant pot": "instant-pot",
    "instant-pot": "instant-pot",
    "pressure cooker": "instant-pot",
  };

  if (alias[clean]) return alias[clean];

  const containsMap: Array<[RegExp, string]> = [
    [/instant\s*pot|pressure\s*cooker/i, "instant-pot"],
    [/gluten[-\s]*free/i, "gluten-free"],
    [/\b(one[-\s]*pot)\b/i, "one-pot"],
    [/\b(30)\s*[-]?\s*(min|minute)\b/i, "30-min"],
    [/\b(dal|dahl|lentil|moong|urad|masoor)\b/i, "dal-and-lentils"],
    [/\b(chickpea|chole|chana)\b/i, "chickpeas"],
    [/\b(rajma|kidney|bean|beans)\b/i, "beans"],
    [/\b(tofu|paneer)\b/i, "tofu"],
    [/\b(potato|potatoes|aloo)\b/i, "potatoes"],
    [/\b(eggplant|aubergine|brinjal)\b/i, "eggplant"],
    [/\b(cauliflower|gobi)\b/i, "cauliflower"],
    [/\b(mushroom|mushrooms)\b/i, "mushroom"],
    [/\b(spinach|palak)\b/i, "spinach"],
    [/\b(biryani|rice)\b/i, "rice"],
  ];

  for (const [re, key] of containsMap) {
    if (re.test(clean)) return key;
  }

  if (clean.length <= 20 && clean.split(" ").length <= 3) return clean.replace(/\s+/g, "-");
  return null;
}

function recipeCanonicalTags(r: any): string[] {
  const out = new Set<string>();

  for (const t of r.tags ?? []) {
    const c = canonicalizeTag(String(t));
    if (c) out.add(c);
  }
  for (const d of r.diet ?? []) {
    const c = canonicalizeTag(String(d));
    if (c) out.add(c);
  }

  // extra heuristic scan
  const txt = recipeText(r);
  const heuristics: Array<[RegExp, string]> = [
    [/instant[-\s]*pot|pressure[-\s]*cooker/i, "instant-pot"],
    [/\b(dal|dahl|lentil|moong|urad|masoor)\b/i, "dal-and-lentils"],
    [/\b(chana|chole|chickpea)\b/i, "chickpeas"],
    [/\b(rajma|kidney\s*beans?)\b/i, "beans"],
    [/\b(tofu|paneer)\b/i, "tofu"],
    [/\b(aloo|potato)\b/i, "potatoes"],
    [/\b(brinjal|eggplant|aubergine)\b/i, "eggplant"],
    [/\b(gobi|cauliflower)\b/i, "cauliflower"],
    [/\b(mushroom)\b/i, "mushroom"],
    [/\b(palak|spinach)\b/i, "spinach"],
    [/\b(biryani|rice)\b/i, "rice"],
    [/\b(curry|masala|korma|vindaloo)\b/i, "curries"],
  ];
  for (const [re, key] of heuristics) {
    if (re.test(txt)) out.add(key);
  }

  return Array.from(out);
}

function matchesCollection(r: any, collection: string) {
  const txt = recipeText(r);

  switch (collection) {
    case "30-min": {
      const t = totalMinutes(r.prepMinutes, r.cookMinutes);
      return t !== null && t <= 30;
    }
    case "one-pot": {
      return (
        txt.includes("instant-pot") ||
        txt.includes("instant pot") ||
        txt.includes("one-pot") ||
        txt.includes("one pot")
      );
    }
    case "dal": {
      const keys = ["dal", "dahl", "lentil", "masoor", "moong", "urad"];
      return keys.some((k) => txt.includes(k));
    }
    case "gluten-free": {
      const diet = (r.diet ?? []).map((d: string) => norm(String(d)));
      const tags = (r.tags ?? []).map((t: string) => norm(String(t)));
      return (
        diet.includes("gluten-free") || tags.includes("gluten-free") || txt.includes("gluten-free")
      );
    }
    default:
      return true;
  }
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tag?: string | string[]; collection?: string | string[] }>;
}) {
  const recipes = getAllRecipes();

  const sp = (await searchParams) ?? {};
  const tagRaw = Array.isArray(sp.tag) ? sp.tag?.[0] : sp.tag;
  const collectionRaw = Array.isArray(sp.collection) ? sp.collection?.[0] : sp.collection;

  const selectedTag = tagRaw ? norm(tagRaw) : null;
  const selectedCollection = collectionRaw ? norm(collectionRaw) : null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Vegan Indian Recipes",
    itemListElement: recipes.map((r: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/recipes/${r.slug}`,
      name: r.title,
    })),
  };

  const TAG_LABELS: Record<string, string> = {
    "instant-pot": "Instant Pot",
    "one-pot": "One-pot",
    "gluten-free": "Gluten-free",
    "dal-and-lentils": "Dal & Lentils",
    chickpeas: "Chickpeas",
    beans: "Beans",
    tofu: "Tofu",
    potatoes: "Potato",
    spinach: "Spinach",
    eggplant: "Eggplant",
    cauliflower: "Cauliflower",
    mushroom: "Mushroom",
    rice: "Rice & Biryani",
    curries: "Curries",
  };

  const tagCounts = new Map<string, number>();
  for (const r of recipes) {
    for (const t of recipeCanonicalTags(r)) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }

  const curatedOrder = [
    "instant-pot",
    "one-pot",
    "gluten-free",
    "dal-and-lentils",
    "chickpeas",
    "beans",
    "tofu",
    "potatoes",
    "spinach",
    "eggplant",
    "cauliflower",
    "mushroom",
    "rice",
    "curries",
  ];

  const allTags = curatedOrder
    .filter((k) => (tagCounts.get(k) ?? 0) > 0)
    .map((k) => ({ key: k, label: TAG_LABELS[k] ?? k }));

  const quickCollections = [
    { label: "30-minute meals", key: "30-min" },
    { label: "One-pot", key: "one-pot" },
    { label: "Dal & lentils", key: "dal" },
    { label: "Gluten-free", key: "gluten-free" },
  ];

  let filtered = recipes;

  if (selectedTag) filtered = filtered.filter((r: any) => recipeCanonicalTags(r).includes(selectedTag));
  if (selectedCollection) filtered = filtered.filter((r: any) => matchesCollection(r, selectedCollection));

  const btnBase =
    "flex-1 min-w-[150px] text-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold transition";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--brand-gold)] sm:text-4xl">Recipes</h1>
          <p className="mt-2 text-[var(--text-soft)]">
            Browse curries, dals, sides and comfort food — all vegan.
          </p>
        </div>

        <div className="text-sm font-bold text-[var(--text-soft)]">
          Showing <span className="text-[var(--brand-gold)]">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "recipe" : "recipes"}
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-5">
        {/* COLLECTION BUTTONS */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/recipes"
            className={
              btnBase +
              " " +
              (!selectedTag && !selectedCollection
                ? "bg-[var(--brand-red)] text-white"
                : "bg-black/10 text-[var(--brand-gold)] hover:bg-black/20")
            }
          >
            All
          </Link>

          {quickCollections.map((c) => {
            const active = selectedCollection === c.key;
            return (
              <Link
                key={c.key}
                href={buildHref("/recipes", { collection: c.key, tag: selectedTag })}
                className={
                  btnBase +
                  " " +
                  (active
                    ? "bg-[var(--brand-red)] text-white"
                    : "bg-black/10 text-[var(--brand-gold)] hover:bg-black/20")
                }
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        {/* TAG BUTTONS */}
        {allTags.length ? (
          <div className="flex flex-wrap gap-3">
            {allTags.map((t) => {
              const active = selectedTag === t.key;
              return (
                <Link
                  key={t.key}
                  href={buildHref("/recipes", { tag: t.key, collection: selectedCollection })}
                  className={
                    btnBase +
                    " " +
                    (active
                      ? "bg-[var(--brand-red)] text-white"
                      : "bg-black/10 text-[var(--brand-gold)] hover:bg-black/20")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        {(selectedTag || selectedCollection) && (
          <div className="flex">
            <Link
              href="/recipes"
              className="inline-flex rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-extrabold text-white hover:opacity-90 transition"
            >
              Clear filters
            </Link>
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r: any) => {
          const img = getRecipeImage(r.slug);
          const placeholder = isPlaceholderImage(img);
          const time = minutesLabel(r.prepMinutes, r.cookMinutes);

          return (
            <Link
              key={r.slug}
              href={`/recipes/${r.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:bg-black/20 transition"
            >
              <div className="relative h-48 w-full overflow-hidden bg-black/25">
                <Image
                  src={img}
                  alt={r.title}
                  fill
                  className={placeholder ? "object-contain p-10 opacity-90" : "object-cover"}
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                {time && (
                  <div className="absolute right-3 top-3 rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-extrabold text-white shadow">
                    {time}
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-base font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {r.title}
                </h3>

                {r.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{r.description}</p>
                )}

                {!!r.tags?.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(r.tags ?? []).slice(0, 3).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-xl border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-bold text-[var(--text-soft)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">No recipes found</h2>
          <p className="mt-3 text-[var(--text-soft)]">Try clearing the filter or picking a different button.</p>
          <div className="mt-6">
            <Link
              href="/recipes"
              className="inline-flex rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-extrabold text-white hover:opacity-90 transition"
            >
              View all recipes
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}