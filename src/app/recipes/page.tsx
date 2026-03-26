export const dynamic = "force-dynamic";

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

function buildHref(base: string, params: { tag?: string | null; collection?: string | null }) {
  const sp = new URLSearchParams();
  if (params.collection) sp.set("collection", params.collection);
  if (params.tag) sp.set("tag", params.tag);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

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

    "dal-and-lentils": "dal-and-lentils",

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

  const filterTags = curatedOrder.filter((t) => tagCounts.has(t));

  const filtered = recipes.filter((r: any) => {
    if (selectedCollection && !matchesCollection(r, selectedCollection)) return false;
    if (selectedTag && !recipeCanonicalTags(r).includes(selectedTag)) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              Vegan Masala
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)] sm:text-4xl">
              Vegan Indian Recipes
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
              Browse comforting curries, dals, rice dishes, flatbreads and practical vegan Indian
              recipes written for real home cooking.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-[var(--border)] bg-black/20 px-5 py-3 shadow-sm">
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-gold)]/70">
              Recipe count
            </span>
            <span className="text-2xl font-extrabold text-[var(--brand-gold)]">
              {recipes.length}
            </span>
          </div>
        </div>
      </section>

      {filterTags.length ? (
        <section className="mt-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href={buildHref("/recipes", {
                collection: selectedCollection,
                tag: null,
              })}
              className={
                !selectedTag
                  ? "rounded-full bg-[var(--brand-red)] px-4 py-2 text-sm font-extrabold text-white"
                  : "rounded-full border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] transition hover:bg-black/20"
              }
            >
              All
            </Link>

            {filterTags.map((tag) => (
              <Link
                key={tag}
                href={buildHref("/recipes", {
                  collection: selectedCollection,
                  tag,
                })}
                className={
                  selectedTag === tag
                    ? "rounded-full bg-[var(--brand-red)] px-4 py-2 text-sm font-extrabold text-white"
                    : "rounded-full border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] transition hover:bg-black/20"
                }
              >
                {TAG_LABELS[tag] ?? tag}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r: any) => {
          const baseImg =
            typeof r.image === "string" && r.image.trim().length > 0
              ? r.image
              : getRecipeImage(r.slug);

          const img =
            r.imageVersion !== undefined && r.imageVersion !== null
              ? `${baseImg}${baseImg.includes("?") ? "&" : "?"}v=${r.imageVersion}`
              : baseImg;

          const placeholder = isPlaceholderImage(baseImg);
          const time = minutesLabel(r.prepMinutes, r.cookMinutes);

          return (
            <Link
              key={r.slug}
              href={`/recipes/${r.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-black/20"
            >
              <div className="relative h-52 w-full bg-black/25">
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
                <h2 className="text-base font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {r.title}
                </h2>

                {r.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">
                    {r.description}
                  </p>
                ) : null}

                {Array.isArray(r.tags) && r.tags.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.tags.slice(0, 3).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]/90"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </section>

      {!filtered.length ? (
        <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <p className="text-[var(--text-soft)]">No recipes matched those filters.</p>
        </section>
      ) : null}
    </main>
  );
}