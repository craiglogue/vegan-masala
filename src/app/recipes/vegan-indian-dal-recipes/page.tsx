import type { Metadata } from "next";
import Link from "next/link";

import RelatedRecipes from "@/components/RelatedRecipes";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

const techniqueLinks = [
  {
    href: "/guides/lentils-and-dal",
    title: "Indian Lentils and Dal Explained",
    description:
      "Learn how different dals, lentils and bean curries behave in everyday vegan Indian cooking.",
  },
  {
    href: "/guides/how-to-build-a-curry-base",
    title: "How to Build a Curry Base",
    description:
      "Use a proper onion-tomato masala base to give dal and lentil curries more depth.",
  },
  {
    href: "/guides/how-to-temper-spices",
    title: "How to Temper Spices (Tadka)",
    description:
      "Tadka is the quickest way to add aroma and finish to dal, lentil and bean dishes.",
  },
  {
    href: "/guides/vegan-indian-pantry-staples",
    title: "Essential Vegan Indian Pantry Staples",
    description:
      "Keep the right pulses, spices and pantry ingredients ready for weeknight dal cooking.",
  },
];

export const metadata: Metadata = {
  title: "Vegan Indian Dal Recipes | Lentil & Bean Curries",
  description:
    "Explore vegan Indian dal recipes, lentil curries and bean-based Indian curries with practical techniques for comforting everyday meals.",
  alternates: {
    canonical: `${siteUrl}/recipes/vegan-indian-dal-recipes`,
  },
  openGraph: {
    title: "Vegan Indian Dal Recipes | Vegan Masala",
    description:
      "Explore vegan Indian dal recipes, lentil curries and bean-based Indian curries with practical techniques for comforting everyday meals.",
    url: `${siteUrl}/recipes/vegan-indian-dal-recipes`,
    siteName: "Vegan Masala",
    type: "article",
  },
};

export default function VeganIndianDalRecipesPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
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
        name: "Vegan Indian Dal Recipes",
        item: `${siteUrl}/recipes/vegan-indian-dal-recipes`,
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Vegan Indian Dal Recipes",
    description:
      "A pillar page for vegan Indian dal, lentil curry and bean curry searches, covering the most useful everyday recipes and techniques.",
    mainEntityOfPage: `${siteUrl}/recipes/vegan-indian-dal-recipes`,
    author: {
      "@type": "Organization",
      name: "Vegan Masala",
    },
    publisher: {
      "@type": "Organization",
      name: "Vegan Masala",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/apple-touch-icon.png?v=3`,
      },
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Link
        href="/recipes"
        className="text-sm text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)]"
      >
        ← Back to recipes
      </Link>

      <header className="mt-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="relative p-8 sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-black/35" />
          <div className="relative max-w-4xl">
            <div className="inline-flex rounded-full border border-[var(--border)] bg-black/20 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]/80">
              Dal recipe collection
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-wide text-[var(--brand-gold)] sm:text-4xl lg:text-5xl">
              Vegan Indian Dal Recipes
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)] sm:text-lg sm:leading-8">
              A pillar page for vegan Indian dal, lentil curry and bean curry searches,
              covering comforting everyday recipes, protein-rich pulses and the methods
              that make them taste complete.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-[var(--text-soft)]">
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Classic dal recipes
              </span>
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Lentil curries
              </span>
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Bean-based Indian curries
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Introduction to vegan Indian dal
          </h2>
          <p className="mt-3 text-[var(--text-soft)] leading-7">
            Dal is one of the most useful foundations in vegan Indian cooking: fast,
            flexible, inexpensive and easy to season well. This hub groups the recipes by
            the search intent people actually use, from everyday dal to lentil and bean
            curries that deserve a central parent page.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Classic dal recipes", "Simple, dependable dals for weeknight cooking and meal prep."],
              ["Lentil curries", "Red lentil, moong, mixed lentil and thicker lentil-based curries."],
              ["Bean-based curries", "Rajma, black-eyed bean and butter bean curries with dal energy."],
              ["Techniques", "Tadka, simmering, seasoning and pantry basics for better dal."],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--border)] bg-black/10 p-4"
              >
                <h3 className="text-base font-extrabold text-[var(--brand-gold)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Dal cooking techniques
          </h2>
          <p className="mt-3 text-[var(--text-soft)] leading-7">
            These supporting guides help readers understand how to build flavour into
            lentils and pulses without making the page feel cluttered.
          </p>

          <div className="mt-5 space-y-4">
            {techniqueLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-2xl border border-[var(--border)] bg-black/10 p-4 transition hover:bg-black/20"
              >
                <h3 className="font-extrabold text-[var(--brand-gold)]">{link.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{link.description}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Classic dal recipes
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            The backbone of the hub: everyday dal dishes and dependable lentil staples
            that fit the strongest dal search intent.
          </p>
        </div>
        <RelatedRecipes
          title="Classic dal recipes"
          tags={["dal", "dahl", "lentil", "lentils", "moong", "toor", "masoor"]}
          max={8}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Lentil curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Richer lentil curries and mixed pulse dishes that sit between simple dal and
            more fully built curry-style meals.
          </p>
        </div>
        <RelatedRecipes
          title="Lentil curries"
          tags={["lentil", "lentils", "moong", "masoor", "spicy lentil", "dahl"]}
          max={8}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Bean-based Indian curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Rajma, black-eyed bean and butter bean curries that extend the dal topic into
            a broader pulses-and-beans cluster.
          </p>
        </div>
        <RelatedRecipes
          title="Bean-based Indian curries"
          tags={["rajma", "bean", "beans", "kidney", "blackeye", "butter bean"]}
          max={8}
        />
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7">
        <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
          Choose a dal for the way you cook
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
            <h3 className="font-extrabold text-[var(--brand-gold)]">Matches strong intent</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Dal and lentil searches are broad, recurring, and naturally grouped around a
              single cooking purpose.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
            <h3 className="font-extrabold text-[var(--brand-gold)]">Uses existing depth</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              The current recipe library already has enough dal, lentil and bean recipes
              to justify a true pillar page.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
            <h3 className="font-extrabold text-[var(--brand-gold)]">Supports future clusters</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              This hub can later branch into red lentils, moong dal, rajma and budget bean
              meal subpages without restructuring the site.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
