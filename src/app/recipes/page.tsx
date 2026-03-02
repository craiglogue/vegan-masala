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
  return input.trim().toLowerCase();
}

function recipeText(r: any) {
  return `${r.slug ?? ""} ${r.title ?? ""} ${(r.tags ?? []).join(" ")} ${(r.diet ?? []).join(
    " "
  )}`.toLowerCase();
}

/** Build href preserving filters */
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

/* Tag normalisation */
function canonicalizeTag(raw: string): string | null {
  const t = norm(String(raw));
  const clean = t.replace(/[&]/g, "and").replace(/[^a-z0-9\s-]/g, "").trim();
  if (!clean) return null;

  const alias: Record<string, string> = {
    curry: "curries",
    curries: "curries",
    "one pot": "one-pot",
    "30 min": "30-min",
    "gluten free": "gluten-free",
    chickpea: "chickpeas",
    chana: "chickpeas",
    chole: "chickpeas",
    lentil: "dal-and-lentils",
    dal: "dal-and-lentils",
    tofu: "tofu",
    paneer: "tofu",
    spinach: "spinach",
    palak: "spinach",
    potato: "potatoes",
    aloo: "potatoes",
    aubergine: "eggplant",
    brinjal: "eggplant",
    gobi: "cauliflower",
    mushrooms: "mushroom",
    biryani: "rice",
    rice: "rice",
  };

  if (alias[clean]) return alias[clean];
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
  return Array.from(out);
}

function matchesCollection(r: any, collection: string) {
  const txt = recipeText(r);

  switch (collection) {
    case "30-min":
      const t = totalMinutes(r.prepMinutes, r.cookMinutes);
      return t !== null && t <= 30;

    case "one-pot":
      return txt.includes("one-pot") || txt.includes("instant pot");

    case "dal":
      return txt.includes("dal") || txt.includes("lentil");

    case "gluten-free":
      return txt.includes("gluten-free");

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

  /* Filter recipes */
  let filtered = recipes;

  if (selectedTag) {
    filtered = filtered.filter((r: any) =>
      recipeCanonicalTags(r).includes(selectedTag)
    );
  }
  if (selectedCollection) {
    filtered = filtered.filter((r: any) =>
      matchesCollection(r, selectedCollection)
    );
  }

  const btnBase =
    "flex-1 min-w-[150px] text-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-extrabold transition";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--brand-gold)] sm:text-4xl">
            Recipes
          </h1>
          <p className="mt-2 text-[var(--text-soft)]">
            Browse curries, dals, sides and comfort food — all vegan.
          </p>
        </div>

        <div className="text-sm font-bold text-[var(--text-soft)]">
          Showing{" "}
          <span className="text-[var(--brand-gold)]">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "recipe" : "recipes"}
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Link href="/recipes" className={btnBase + " bg-[var(--brand-red)] text-white"}>
            All
          </Link>
        </div>
      </section>

      {/* GRID */}
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
                />

                {time && (
                  <div className="absolute right-3 top-3 rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-extrabold text-white">
                    {time}
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-base font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {r.title}
                </h3>

                {r.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">
                    {r.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}