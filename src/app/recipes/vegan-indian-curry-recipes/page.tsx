import type { Metadata } from "next";
import Link from "next/link";

import RelatedRecipes from "@/components/RelatedRecipes";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

const techniqueLinks = [
  {
    href: "/guides/how-to-build-a-curry-base",
    title: "How to Build a Curry Base",
    description:
      "Learn the onion-tomato masala method that underpins many vegan Indian curries.",
  },
  {
    href: "/guides/how-to-temper-spices",
    title: "How to Temper Spices (Tadka)",
    description:
      "Master the sizzling spice step that wakes up dals, curries and vegetable dishes.",
  },
  {
    href: "/guides/indian-spices-explained-for-beginners",
    title: "Indian Spices Explained for Beginners",
    description:
      "Understand the core spices that make curry flavour balanced, aromatic and layered.",
  },
  {
    href: "/guides/lentils-and-dal",
    title: "Indian Lentils and Dal Explained",
    description:
      "Use this guide to build richer lentil curries and improve everyday dal recipes.",
  },
];

export const metadata: Metadata = {
  title: "Vegan Indian Curry Recipes | Dal, Tofu & Vegetables",
  description:
    "Explore vegan Indian curry recipes across chickpea, dal, potato, tofu and vegetable curries, plus practical cooking techniques for deeper flavour.",
  alternates: {
    canonical: `${siteUrl}/recipes/vegan-indian-curry-recipes`,
  },
  openGraph: {
    title: "Vegan Indian Curry Recipes | Vegan Masala",
    description:
      "Explore vegan Indian curry recipes across chickpea, dal, potato, tofu and vegetable curries, plus practical cooking techniques for deeper flavour.",
    url: `${siteUrl}/recipes/vegan-indian-curry-recipes`,
    siteName: "Vegan Masala",
    type: "article",
  },
};

export default function VeganIndianCurryRecipesPage() {
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
        name: "Vegan Indian Curry Recipes",
        item: `${siteUrl}/recipes/vegan-indian-curry-recipes`,
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Vegan Indian Curry Recipes",
    description:
      "A pillar page for vegan Indian curry recipes, covering chickpea, dal, potato, tofu and vegetable curries alongside the core techniques behind them.",
    mainEntityOfPage: `${siteUrl}/recipes/vegan-indian-curry-recipes`,
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
              Curry recipe collection
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-wide text-[var(--brand-gold)] sm:text-4xl lg:text-5xl">
              Vegan Indian Curry Recipes
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)] sm:text-lg sm:leading-8">
              A pillar page for vegan Indian curry searches, covering chickpea, dal,
              potato, tofu and vegetable curries plus the cooking techniques that build
              depth, aroma and a proper curry base.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-[var(--text-soft)]">
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Chickpea curries
              </span>
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Dal and lentil curries
              </span>
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Potato, tofu and vegetable curries
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            What this page covers
          </h2>
          <p className="mt-3 text-[var(--text-soft)] leading-7">
            This hub groups the curry library into search-intent themes so readers can
            move from a broad query like “vegan Indian curry recipes” into a specific
            recipe family without losing topical relevance.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Chickpea curries", "Chana masala, kala chana, palak chole and more."],
              ["Dal and lentil curries", "Comforting dal, moong, lentil and bean-based curries."],
              ["Potato curries", "Aloo recipes, dum aloo and potato-forward curries."],
              ["Tofu curries", "Tofu masala, korma, pasanda and pan-Indian tofu dishes."],
              ["Vegetable curries", "Cauliflower, eggplant, mushroom and mixed veg curries."],
              ["Techniques", "Curry base, tadka, spices and core Indian cooking methods."],
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
            Curry cooking techniques
          </h2>
          <p className="mt-3 text-[var(--text-soft)] leading-7">
            These supporting guides strengthen the hub and help readers understand why
            the recipes taste the way they do.
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
            Chickpea curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            High-demand chana and chickpea curry recipes that anchor one of the strongest
            vegan Indian search clusters on the site.
          </p>
        </div>
        <RelatedRecipes
          title="Chickpea curries"
          tags={["chana", "chickpea", "chickpeas", "chole"]}
          max={8}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Dal and lentil curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Everyday dal, lentil and bean curries that deserve a central parent page for
            both SEO and user navigation.
          </p>
        </div>
        <RelatedRecipes
          title="Dal and lentil curries"
          tags={["dal", "dahl", "lentil", "lentils", "moong", "rajma", "bean"]}
          max={8}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Potato curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Aloo recipes, dum aloo and potato-rich curries that are broad enough to rank
            as a standalone hub.
          </p>
        </div>
        <RelatedRecipes
          title="Potato curries"
          tags={["aloo", "potato", "potatoes", "dum aloo"]}
          max={8}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Tofu curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Tofu masala, korma, pasanda and regional tofu curries for readers searching
            for vegan paneer-style dishes.
          </p>
        </div>
        <RelatedRecipes
          title="Tofu curries"
          tags={["tofu", "tofu curry", "tofu masala", "tofu tikka", "tofu pasanda"]}
          max={8}
        />
      </section>

      <section className="mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
            Vegetable curries
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Cauliflower, eggplant, mushroom, spinach and mixed vegetable curries that can
            branch into their own subclusters over time.
          </p>
        </div>
        <RelatedRecipes
          title="Vegetable curries"
          tags={[
            "cauliflower",
            "gobi",
            "eggplant",
            "aubergine",
            "brinjal",
            "mushroom",
            "spinach",
            "palak",
            "saag",
            "vegetable",
          ]}
          max={8}
        />
      </section>

      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7">
        <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
          Find the right curry for your table
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
            <h3 className="font-extrabold text-[var(--brand-gold)]">Matches broad intent</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              The URL maps cleanly to a high-volume query family without forcing users to
              choose one narrow ingredient up front.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
            <h3 className="font-extrabold text-[var(--brand-gold)]">Uses existing depth</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              The current recipe library already has enough chickpea, dal, potato, tofu
              and vegetable content to justify a true pillar page.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
            <h3 className="font-extrabold text-[var(--brand-gold)]">Strengthens internal links</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              It gives isolated recipes a central parent and points users toward the
              technique guides that explain the cooking logic.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
