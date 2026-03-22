import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RecipeHubPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-white">
      <div className="rounded-2xl border border-yellow-700/40 bg-black/40 p-8">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-yellow-300">
          Recipe Hub
        </p>

        <h1 className="mb-4 text-4xl font-bold text-yellow-100">{slug}</h1>

        <p className="mb-6 text-neutral-300">
          This recipe hub page is loading correctly for the slug:
          <span className="ml-2 font-semibold text-white">{slug}</span>
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/recipes/${slug}`}
            className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white"
          >
            View recipe
          </Link>

          <Link
            href="/recipes"
            className="rounded-xl border border-yellow-700/40 px-5 py-3 font-semibold text-yellow-100"
          >
            Back to recipes
          </Link>
        </div>
      </div>
    </main>
  );
}