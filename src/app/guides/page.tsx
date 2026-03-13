import Link from "next/link";
import { getAllGuides } from "@/lib/guides";

type Guide = {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  category?: string;
};

function GuideCard({
  guide,
  featured = false,
}: {
  guide: Guide;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={[
        "group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-white/5",
        featured
          ? "grid gap-0 lg:grid-cols-[1.15fr_320px]"
          : "grid gap-0 sm:grid-cols-[1fr_180px]",
      ].join(" ")}
    >
      <div className={featured ? "p-7 sm:p-8" : "p-6"}>
        {guide.category ? (
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-gold)]/70">
            {guide.category}
          </div>
        ) : null}

        <h3
          className={[
            "mt-2 font-extrabold tracking-wide text-[var(--brand-gold)] group-hover:underline",
            featured ? "text-2xl sm:text-3xl" : "text-base",
          ].join(" ")}
        >
          {guide.title}
        </h3>

        {guide.description ? (
          <p
            className={[
              "mt-3 text-[var(--text-soft)]",
              featured
                ? "max-w-2xl text-base leading-7"
                : "line-clamp-3 text-sm leading-6",
            ].join(" ")}
          >
            {guide.description}
          </p>
        ) : null}

        <div className="mt-5 text-xs font-bold tracking-wide text-[var(--brand-gold)]/80">
          Read guide →
        </div>
      </div>

      <div
        className={[
          "relative overflow-hidden",
          featured
            ? "min-h-[220px] border-t border-[var(--border)] lg:min-h-full lg:border-l lg:border-t-0"
            : "h-44 border-t border-[var(--border)] sm:h-full sm:border-l sm:border-t-0",
        ].join(" ")}
      >
        <img
          src={guide.image || "/images/guides/spices.jpg"}
          alt={guide.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/20 via-black/10 to-transparent" />
      </div>
    </Link>
  );
}

export default function GuidesIndexPage() {
  const guides = getAllGuides();

  const featuredSlugs = [
    "vegan-indian-pantry-staples",
    "indian-spices-explained",
    "how-to-build-a-curry-base",
  ];

  const featured = featuredSlugs
    .map((slug) => guides.find((g) => g.slug === slug))
    .filter(Boolean) as Guide[];

  const remaining = guides.filter((g) => !featuredSlugs.includes(g.slug));

  const grouped = remaining.reduce<Record<string, Guide[]>>((acc, guide) => {
    const key = guide.category || "More Guides";
    if (!acc[key]) acc[key] = [];
    acc[key].push(guide);
    return acc;
  }, {});

  const orderedGroups = [
    "Core Cooking Guides",
    "Ingredient & Swap Guides",
    "Kitchen Setup",
    "More Guides",
  ].filter((name) => grouped[name]);

  const extraGroups = Object.keys(grouped).filter(
    (name) => !orderedGroups.includes(name)
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-black/40" />
          <div className="relative p-8 sm:p-10">
            <div className="inline-flex rounded-full border border-[var(--border)] bg-black/20 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]/80">
              Vegan Masala Guides
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-wide text-[var(--brand-gold)] sm:text-4xl">
              Learn the foundations of vegan Indian cooking
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">
              Explore practical guides on Indian spices, pantry staples, vegan
              swaps, kitchen setup, and essential techniques to help you cook
              with more confidence at home.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-[var(--text-soft)]">
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                {guides.length} guides
              </span>
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Spices, swaps, techniques
              </span>
              <span className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-2">
                Built for beginners
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length ? (
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
              Start here
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-soft)]">
              These are the best guides to begin with if you are new to vegan
              Indian cooking.
            </p>
          </div>

          <div className="space-y-6">
            {featured.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} featured />
            ))}
          </div>
        </section>
      ) : null}

      {/* GROUPED GUIDES */}
      <div className="mt-12 space-y-12">
        {[...orderedGroups, ...extraGroups].map((groupName) => (
          <section key={groupName}>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
                  {groupName}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  {grouped[groupName].length} guide
                  {grouped[groupName].length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {grouped[groupName].map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">
          Want to start cooking straight away?
        </h2>
        <p className="mt-3 text-[var(--text-soft)]">
          Browse the recipe collection for curries, dals, tofu dishes, and easy
          weeknight meals.
        </p>
        <div className="mt-6">
          <Link
            href="/recipes"
            className="inline-flex rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-extrabold text-white hover:opacity-90"
          >
            Browse recipes
          </Link>
        </div>
      </section>
    </main>
  );
}