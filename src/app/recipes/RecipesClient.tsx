"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type RecipeSummary = {
  title: string;
  slug: string;
  description?: string;
  cuisine?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  diet?: string[];
  tags?: string[];
  publishedAt?: string;

  // ✅ server-resolved image path
  image: string;
};

const PLACEHOLDER = "/brand/image-coming-soon.jpg";

function totalMinutes(prep?: number, cook?: number) {
  const total = (prep ?? 0) + (cook ?? 0);
  return total > 0 ? total : null;
}

function minutesLabel(prep?: number, cook?: number) {
  const total = totalMinutes(prep, cook);
  return total ? `${total} min` : null;
}

function norm(s: string) {
  return s.toLowerCase().trim();
}

export default function RecipesClient({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "quickest" | "az">("newest");

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) if (r.cuisine) set.add(r.cuisine);
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [recipes]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) for (const t of r.tags ?? []) set.add(t);
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = norm(query);

    let list = recipes.filter((r) => {
      if (cuisine !== "all" && (r.cuisine ?? "") !== cuisine) return false;
      if (tag !== "all" && !(r.tags ?? []).includes(tag)) return false;

      if (!q) return true;

      const hay = [
        r.title,
        r.description ?? "",
        r.cuisine ?? "",
        ...(r.tags ?? []),
        ...(r.diet ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });

    if (sort === "newest") {
      list = [...list].sort((a, b) =>
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
      );
    } else if (sort === "quickest") {
      list = [...list].sort((a, b) => {
        const ta = totalMinutes(a.prepMinutes, a.cookMinutes) ?? 99999;
        const tb = totalMinutes(b.prepMinutes, b.cookMinutes) ?? 99999;
        return ta - tb;
      });
    } else if (sort === "az") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [recipes, query, cuisine, tag, sort]);

  return (
    <>
      {/* FILTER BAR */}
      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_200px_240px_180px] lg:items-end">
          {/* Search */}
          <div>
            <label className="text-xs font-extrabold tracking-wide text-[var(--brand-gold)]">
              Search
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: dal, tofu, instant pot..."
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/15 px-4 py-3 text-sm font-bold text-[var(--text-soft)] outline-none placeholder:text-[var(--text-soft)]/50 focus:border-[var(--brand-gold)]"
            />
          </div>

          {/* Cuisine */}
          <div>
            <label className="text-xs font-extrabold tracking-wide text-[var(--brand-gold)]">
              Cuisine
            </label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/15 px-4 py-3 text-sm font-bold text-[var(--text-soft)] outline-none focus:border-[var(--brand-gold)]"
            >
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All" : c}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <div>
            <label className="text-xs font-extrabold tracking-wide text-[var(--brand-gold)]">
              Tag
            </label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/15 px-4 py-3 text-sm font-bold text-[var(--text-soft)] outline-none focus:border-[var(--brand-gold)]"
            >
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All" : t}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-extrabold tracking-wide text-[var(--brand-gold)]">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "quickest" | "az")}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/15 px-4 py-3 text-sm font-bold text-[var(--text-soft)] outline-none focus:border-[var(--brand-gold)]"
            >
              <option value="newest">Newest</option>
              <option value="quickest">Quickest</option>
              <option value="az">A → Z</option>
            </select>
          </div>
        </div>

        {/* Quick tag chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {["all", ...tags.slice(1, 9)].map((t) => {
            const active = tag === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={
                  active
                    ? "rounded-full bg-[var(--brand-red)] px-4 py-2 text-xs font-extrabold text-white"
                    : "rounded-full border border-[var(--border)] bg-black/15 px-4 py-2 text-xs font-extrabold text-[var(--brand-gold)] hover:bg-black/25"
                }
              >
                {t === "all" ? "All tags" : t}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-xs font-bold text-[var(--text-soft)]/70">
          Showing {filtered.length} of {recipes.length}
        </div>
      </section>

      {/* GRID */}
      <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((recipe) => {
          const mins = minutesLabel(recipe.prepMinutes, recipe.cookMinutes);
          const placeholder = recipe.image === PLACEHOLDER;

          return (
            <Link
              key={recipe.slug}
              href={`/recipes/${recipe.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-black/20"
            >
              <div className="relative h-52 w-full border-b border-[var(--border)] bg-black/25">
                <Image
                  src={recipe.image}
                  alt={`${recipe.title} recipe`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className={placeholder ? "object-contain p-8 opacity-90" : "object-cover"}
                />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-extrabold tracking-wide text-[var(--brand-gold)] group-hover:underline">
                    {recipe.title}
                  </h2>

                  {mins ? (
                    <span className="shrink-0 rounded-xl border border-[var(--border)] bg-black/20 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]">
                      {mins}
                    </span>
                  ) : null}
                </div>

                {recipe.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">
                    {recipe.description}
                  </p>
                ) : null}

                {(recipe.tags ?? []).length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(recipe.tags ?? []).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[var(--border)] bg-black/15 px-3 py-1 text-xs font-bold text-[var(--brand-gold)]/85"
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

      {filtered.length === 0 ? (
        <p className="mt-6 text-[var(--text-soft)]">No matches — try removing filters.</p>
      ) : null}
    </>
  );
}