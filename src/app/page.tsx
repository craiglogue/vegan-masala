// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

import { getAllRecipes } from "@/lib/recipes";
import { getRecipeImage, isPlaceholderImage } from "@/lib/recipeimages";
import CurrySlider from "@/components/CurrySlider";

function minutes(prep?: number, cook?: number) {
  const total = (prep ?? 0) + (cook ?? 0);
  return total > 0 ? `${total} min` : null;
}

export default function Home() {
  const recipes = getAllRecipes();
  const latest = recipes.slice(0, 6);

  const currySliderImages = [
    { src: "/images/curries/curry_1.jpg", alt: "Indian curry" },
    { src: "/images/curries/curry_2.jpg", alt: "Indian curry" },
    { src: "/images/curries/curry_3.jpg", alt: "Indian curry" },
    { src: "/images/curries/curry_4.jpg", alt: "Indian curry" },
    { src: "/images/curries/curry_5.jpg", alt: "Indian curry" },
    { src: "/images/curries/curry_6.jpg", alt: "Indian curry" },
  ];

  // These match your Recipes page query params
  const collections = [
    {
      label: "30-minute meals",
      href: "/recipes?collection=30-min",
      desc: "Fast and weeknight-friendly.",
    },
    {
      label: "One-pot",
      href: "/recipes?collection=one-pot",
      desc: "Minimal washing up.",
    },
    {
      label: "Dal & lentils",
      href: "/recipes?collection=dal",
      desc: "Comfort food staples.",
    },
    {
      label: "Gluten-free",
      href: "/recipes?collection=gluten-free",
      desc: "Naturally GF favourites.",
    },
  ];

  // These match your canonical tag keys on /recipes
  const exploreTags = [
    { label: "Tofu", key: "tofu" },
    { label: "Potato", key: "potatoes" },
    { label: "Chickpeas", key: "chickpeas" },
    { label: "Dal & Lentils", key: "dal-and-lentils" },
    { label: "Instant Pot", key: "instant-pot" },
    { label: "Rice & Biryani", key: "rice" },
    { label: "Eggplant", key: "eggplant" },
    { label: "Spinach", key: "spinach" },
  ];

  return (
    // ✅ was: py-10 (adds too much top space now)
    // ✅ now: controlled top + bottom padding
    <main className="mx-auto max-w-6xl px-6 pt-6 pb-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 shadow-sm">
        {/* soft orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-black/20" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-black/20" />

        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          {/* LEFT TEXT */}
          <div>
            <p className="text-sm font-extrabold tracking-wide text-[var(--brand-gold)]/80">
              Vegan Masala
            </p>

            <h1 className="mt-2 text-4xl font-extrabold leading-tight text-[var(--brand-gold)] sm:text-5xl">
              Vegan Indian Cooking Made Easy
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-soft)]">
              Bold flavours, real spices and weeknight-friendly recipes.
              Discover curries, dals and comfort food you’ll cook again and again.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/recipes"
                className="rounded-xl bg-[var(--brand-red)] px-6 py-3 font-bold text-white shadow hover:opacity-90 transition"
              >
                Browse Recipes
              </Link>

              <Link
                href="/guides"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-6 py-3 font-bold text-[var(--brand-gold)] hover:bg-black/20 transition"
              >
                Start With Basics
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-[var(--text-soft)]">
              <span>✓ 30+ recipes and growing</span>
              <span>✓ Beginner friendly</span>
              <span>✓ Weeknight ready</span>
              <span>✓ 100% vegan</span>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20 shadow-lg">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/images/curries/curry_1.jpg"
                  alt="Vegan Indian curry"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 520px"
                />
              </div>
            </div>

            {/* little “stamp” */}
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm sm:block">
              <p className="text-xs font-extrabold text-[var(--brand-gold)]">New</p>
              <p className="text-sm font-bold text-[var(--text-soft)]">
                Fresh recipe drops weekly
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COLLECTIONS */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
            Featured collections
          </h2>
          <Link
            href="/recipes"
            className="text-sm font-bold text-[var(--text-soft)] hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm hover:bg-black/20 transition"
            >
              <div className="text-base font-extrabold text-[var(--brand-gold)]">
                {c.label}
              </div>
              <p className="mt-2 text-sm text-[var(--text-soft)]">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* EXPLORE BY INGREDIENT */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Explore by ingredient
        </h2>

        <div className="mt-4 flex flex-wrap gap-3">
          {exploreTags.map((t) => (
            <Link
              key={t.key}
              href={`/recipes?tag=${encodeURIComponent(t.key)}`}
              className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/20 transition"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST RECIPES */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Latest recipes
        </h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((r: any) => {
            const img = getRecipeImage(r.slug);
            const placeholder = isPlaceholderImage(img);
            const time = minutes(r.prepMinutes, r.cookMinutes);

            return (
              <Link
                key={r.slug}
                href={`/recipes/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:bg-black/20 transition"
              >
                <div className="relative h-48 w-full bg-black/25">
                  <Image
                    src={img}
                    alt={r.title}
                    fill
                    className={
                      placeholder
                        ? "object-contain p-10 opacity-90"
                        : "object-cover"
                    }
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />

                  {time && (
                    <div className="absolute right-3 top-3 rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-extrabold text-white shadow">
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

                  {!!r.tags?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {r.tags.slice(0, 3).map((t: string) => (
                        <span
                          key={t}
                          className="rounded-xl border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-bold text-[var(--text-soft)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SLIDER */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Curry inspiration
        </h2>
        <div className="mt-6">
          <CurrySlider images={currySliderImages} />
        </div>
      </section>
    </main>
  );
}