import Link from "next/link";
import { getAllRecipes } from "@/lib/recipes";

export default function RecipeHubPage({
  params,
}: {
  params: { tag: string };
}) {
  const recipes = getAllRecipes();

  const tag = params.tag.replace(/-/g, " ");

  const filtered = recipes.filter((r: any) =>
    r.tags?.some((t: string) =>
      t.toLowerCase().includes(tag.toLowerCase())
    )
  );

  if (!filtered.length) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">No recipes found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-4xl font-extrabold text-[var(--brand-gold)] mb-8">
        {tag.replace(/\b\w/g, (c) => c.toUpperCase())} Recipes
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((recipe: any) => (
          <Link
            key={recipe.slug}
            href={`/recipes/${recipe.slug}`}
            className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:shadow-lg transition"
          >
            <h2 className="text-lg font-bold text-[var(--brand-gold)]">
              {recipe.title}
            </h2>

            {recipe.description && (
              <p className="mt-2 text-sm text-[var(--text-soft)] line-clamp-3">
                {recipe.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}