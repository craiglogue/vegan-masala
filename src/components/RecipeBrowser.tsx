"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Recipe = {
  title: string;
  slug: string;
  description?: string;
  cuisine?: string;
  diet?: string[];
  tags?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  publishedAt?: string;

  // added on server
  image: string;
  imageIsPlaceholder: boolean;
};

function totalMinutes(prep?: number, cook?: number) {
  return (prep ?? 0) + (cook ?? 0);
}

function minutesLabel(prep?: number, cook?: number) {
  const total = totalMinutes(prep, cook);
  return total > 0 ? `${total} min` : null;
}

function uniqSorted(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export default function RecipeBrowser({ recipes }: { recipes: Recipe[] }) {
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<string>("all");
  const [diet, setDiet] = useState<string>("all");
  const [time, setTime] = useState<string>("all"); // all | 30 | 45 | 60

  const cuisines = useMemo(
    () => uniqSorted(recipes.map((r) => r.cuisine)),
    [recipes]
  );

  // diet options based on what exists (so it never shows dead filters)
  const dietOptions = useMemo(() => {
    const all = new Set<string>();
    for (const r of recipes) {
      (r.diet ?? []).forEach((d) => all.add(d));
    }
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return recipes.filter((r) => {
      // search
      if (query) {
        const haystack = [
          r.title,
          r.description ?? "",
          r.cuisine ?? "",
          ...(r.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      // cuisine
      if (cuisine !== "all") {
        if ((r.cuisine ?? "").toLowerCase() !== cuisine.toLowerCase()) return false;
      }

      // diet
      if (diet !== "all") {
        const diets = (r.diet ?? []).map((d) => d.toLowerCase());
        if (!diets.includes(diet.toLowerCase())) return false;
      }

      // time
      if (time !== "all") {
        const limit = Number(time);
        const total = totalMinutes(r.prepMinutes, r.cookMinutes);
        if (!total || total > limit) return false;
      }

      return true;
    });
  }, [recipes, q, cuisine, diet, time]);

  const clear = () => {
    setQ("");
    setCuisine("all");
    setDiet("all");
    setTime("all");
  };

  return (
    <div>
      {/* Controls */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_180px_auto] lg:items-end">
          {/* Search */}
          <div>
            <label className="text-sm font-extrabold text-[var(--brand-gold)]">
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. tofu, instant pot, chickpea…"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] placeholder:text-[var(--text-soft)]/60 outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/30"
            />
          </div>

          {/* Cuisine */}
          <div>
            <label className="text-sm font-extrabold text-[var(--brand-gold)]">
              Cuisine
            </label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/30"
            >
              <option value="all">All</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Diet */}
          <div>
            <label className="text-sm font-extrabold text-[var(--brand-gold)]">
              Diet
            </label>
            <select
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/30"
            >
              <option value="all">All</option>
              {dietOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-extrabold text-[var(--brand-gold)]">
              Total time
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/30"
            >
              <option value="all">Any</option>
              <option value="30">Under 30 min</option>
              <option value="45">Under 45 min</option>
              <option value="60">Under 60 min</option>
            </select>
          </div>

          {/* Clear */}
          <div className="lg:justify-self-end">
            <button
              type="button"
              onClick={clear}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-black/20 px-5 py-3 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/30 transition lg:w-auto"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm font-semibold text-[var(--text-soft)]">
          Showing{" "}
          <span className="font-extrabold text-[var(--brand-gold)]">
            {filtered.length}
          </span>{" "}
          of{" "}
          <span className="font-extrabold text-[var(--brand-gold)]">
            {recipes.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <Link
            key={r.slug}
            href={`/recipes/${r.slug}`}
            className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:bg-black/20 transition"
          >
            <div className="relative h-56 w-full bg-black/25">
              <Image
                src={r.image}
                alt={r.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={
                  r.imageIsPlaceholder
                    ? "object-contain p-8 opacity-90"
                    : "object-cover"
                }
              />
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {r.title}
                </h3>

                {minutesLabel(r.prepMinutes, r.cookMinutes) && (
                  <span className="shrink-0 rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-extrabold text-white">
                    {minutesLabel(r.prepMinutes, r.cookMinutes)}
                  </span>
                )}
              </div>

              {r.cuisine && (
                <p className="mt-2 text-xs font-bold text-[var(--brand-gold)]/80">
                  {r.cuisine}
                </p>
              )}

              {r.description && (
                <p className="mt-2 text-sm text-[var(--text-soft)] line-clamp-2">
                  {r.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}