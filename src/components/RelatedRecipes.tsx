import Link from "next/link";
import Image from "next/image";

import { getAllRecipes } from "@/lib/recipes";
import { getRecipeImage } from "@/lib/recipeimages";

type Props = {
  title?: string;
  tags?: string[];
  max?: number;
};

export default function RelatedRecipes({
  title = "Related Recipes",
  tags = [],
  max = 6,
}: Props) {
  const recipes = getAllRecipes();

  const related = recipes
    .filter((r: any) => {
      if (!tags.length) return false;

      const recipeTags = [
        ...(r.tags || []),
        ...(r.diet || []),
        r.title,
        r.slug,
      ]
        .join(" ")
        .toLowerCase();

      return tags.some((t) =>
        recipeTags.includes(t.toLowerCase())
      );
    })
    .slice(0, max);

  if (!related.length) return null;

  return (
    <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">

      <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
        {title}
      </h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((r: any) => {
          const img = getRecipeImage(r.slug);

          return (
            <Link
              key={r.slug}
              href={`/recipes/${r.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20 hover:bg-black/30 transition"
            >
              <div className="relative h-40 w-full">

                <Image
                  src={img}
                  alt={r.title}
                  fill
                  className="object-cover"
                />

              </div>

              <div className="p-4">

                <h3 className="text-sm font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {r.title}
                </h3>

                {r.description && (
                  <p className="mt-2 text-xs text-[var(--text-soft)] line-clamp-2">
                    {r.description}
                  </p>
                )}

              </div>

            </Link>
          );
        })}
      </div>

    </section>
  );
}