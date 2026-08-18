import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RelatedRecipes from "@/components/RelatedRecipes";
import { getRecipeCollection, RECIPE_COLLECTIONS } from "@/lib/seo/collections";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

export function generateStaticParams() {
  return RECIPE_COLLECTIONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = getRecipeCollection(slug);
  if (!collection) return {};
  const canonical = `${siteUrl}/recipes/collections/${collection.slug}`;
  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical },
    openGraph: { title: collection.title, description: collection.description, url: canonical, type: "website" },
  };
}

export default async function RecipeCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getRecipeCollection(slug);
  if (!collection) notFound();
  const canonical = `${siteUrl}/recipes/collections/${collection.slug}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Recipes", item: `${siteUrl}/recipes` },
      { "@type": "ListItem", position: 3, name: collection.title, item: canonical },
    ],
  };
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Link href="/recipes" className="text-sm text-[var(--text-soft)] hover:underline">← All recipes</Link>
      <header className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-gold)]/70">Recipe collection</p>
        <h1 className="mt-3 text-4xl font-extrabold text-[var(--brand-gold)]">{collection.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">{collection.description}</p>
      </header>
      <RelatedRecipes title={`Browse ${collection.title}`} tags={collection.tags} max={24} />
    </main>
  );
}
