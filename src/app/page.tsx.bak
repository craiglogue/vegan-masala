// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";

import { getAllRecipes } from "@/lib/recipes";
import { getAllGuides } from "@/lib/guides";
import { getRecipeImage, isPlaceholderImage } from "@/lib/recipeimages";
import CurrySlider from "@/components/CurrySlider";

function minutes(prep?: number, cook?: number) {
  const total = (prep ?? 0) + (cook ?? 0);
  return total > 0 ? `${total} min` : null;
}

function cleanLabel(label?: string) {
  if (!label) return "";
  return label.replace(/\s*\((recipe|guide)\)\s*$/i, "").trim();
}

function getGuideImage(slug: string, image?: string) {
  if (image) return image;
  return `/images/guides/${slug}.png`;
}

export default function Home() {
  const recipes = getAllRecipes();
  const guides = getAllGuides();

  const latestRecipes = recipes.slice(0, 6);
  const featuredRecipes = recipes.slice(0, 3);
  const featuredGuides = guides.slice(0, 3);

  const currySliderImages = [
    { src: "/images/curries/curry_1.jpg", alt: "Vegan Indian curry" },
    { src: "/images/curries/curry_2.jpg", alt: "Vegan Indian curry" },
    { src: "/images/curries/curry_3.jpg", alt: "Vegan Indian curry" },
    { src: "/images/curries/curry_4.jpg", alt: "Vegan Indian curry" },
    { src: "/images/curries/curry_5.jpg", alt: "Vegan Indian curry" },
    { src: "/images/curries/curry_6.jpg", alt: "Vegan Indian curry" },
  ];

  const collections = [
    {
      label: "30-minute meals",
      href: "/recipes?collection=30-min",
      desc: "Fast, bold, weeknight-friendly recipes.",
    },
    {
      label: "One-pot favourites",
      href: "/recipes?collection=one-pot",
      desc: "Less washing up, plenty of flavour.",
    },
    {
      label: "Dal & lentils",
      href: "/recipes?collection=dal",
      desc: "Comforting staples for everyday cooking.",
    },
    {
      label: "Gluten-free",
      href: "/recipes?collection=gluten-free",
      desc: "Naturally gluten-free Indian favourites.",
    },
  ];

  const exploreTags = [
    { label: "Tofu", key: "tofu" },
    { label: "Potato", key: "potatoes" },
    { label: "Chickpeas", key: "chickpeas" },
    { label: "Dal & Lentils", key: "dal-and-lentils" },
    { label: "Rice & Biryani", key: "rice" },
    { label: "Eggplant", key: "eggplant" },
    { label: "Spinach", key: "spinach" },
    { label: "Instant Pot", key: "instant-pot" },
  ];

  const browseSections = [
    {
      title: "Curries",
      href: "/recipes",
      desc: "Rich, warming classics and cosy everyday favourites.",
    },
    {
      title: "Flatbreads",
      href: "/recipes?tag=flatbread",
      desc: "Chapati, naan and Indian side staples.",
    },
    {
      title: "Snacks",
      href: "/recipes?tag=snacks",
      desc: "Crispy pakoras, bhajis and comfort-food bites.",
    },
    {
      title: "Guides",
      href: "/guides",
      desc: "Learn spices, pantry basics and Indian cooking techniques.",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 pt-6 pb-16">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 pt-10 pb-16 shadow-sm">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-black/20" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-black/20" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--brand-gold)]/80">
              Vegan Masala
            </p>

            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-[var(--brand-gold)] sm:text-5xl">
              Vegan Indian Cooking with Depth, Warmth and Real Flavour
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
              A growing collection of vegan Indian recipes and cooking guides
              built around proper masalas, dependable methods and the generous
              spirit of family-style food — the kind of cooking that brings back
              memories and earns a regular place at the table.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/recipes"
                className="rounded-xl bg-[var(--brand-red)] px-6 py-3 font-bold text-white shadow transition hover:opacity-90"
              >
                Browse Recipes
              </Link>

              <Link
                href="/guides"
                className="rounded-xl border border-[var(--border)] bg-black/10 px-6 py-3 font-bold text-[var(--brand-gold)] transition hover:bg-black/20"
              >
                Explore Guides
              </Link>
            </div>

            <div className="mt-10 grid gap-3 text-sm text-[var(--text-soft)] sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--border)] bg-black/10 px-4 py-3">
                ✓ Vegan-first Indian cooking
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-black/10 px-4 py-3">
                ✓ Family-style recipes and guides
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-black/10 px-4 py-3">
                ✓ Proper flavour, not shortcuts
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-black/10 px-4 py-3">
                ✓ Written for serious curry lovers
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-black/20 shadow-lg">
              <div className="relative aspect-[4/4.5] w-full">
                <Image
                  src="/images/hero-curry.jpg"
                  alt="Vegan Indian curry"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 460px"
                />
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden max-w-[250px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-sm sm:block">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-gold)]">
                Family-table cooking
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                Vegan Indian food with the warmth, depth and generosity that
                make home cooking memorable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COLLECTIONS */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              Cook by mood
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--brand-gold)]">
              Cook by collection
            </h2>
          </div>

          <Link
            href="/recipes"
            className="text-sm font-bold text-[var(--text-soft)] hover:underline"
          >
            View all recipes →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:bg-black/20"
            >
              <div className="text-base font-extrabold text-[var(--brand-gold)]">
                {c.label}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                {c.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED RECIPES */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              Start with these
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--brand-gold)]">
              Recipes worth starting with
            </h2>
          </div>

          <Link
            href="/recipes"
            className="text-sm font-bold text-[var(--text-soft)] hover:underline"
          >
            Browse all →
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {featuredRecipes.map((recipe: any) => {
            const img = getRecipeImage(recipe.slug);
            const placeholder = isPlaceholderImage(img);
            const time = minutes(recipe.prepMinutes, recipe.cookMinutes);

            return (
              <Link
                key={recipe.slug}
                href={`/recipes/${recipe.slug}`}
                className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-black/20"
              >
                <div className="relative h-60 w-full bg-black/25">
                  <Image
                    src={img}
                    alt={recipe.title}
                    fill
                    className={
                      placeholder ? "object-contain p-10 opacity-90" : "object-cover"
                    }
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />

                  {time ? (
                    <div className="absolute right-4 top-4 rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-extrabold text-white shadow">
                      {time}
                    </div>
                  ) : null}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-extrabold text-[var(--brand-gold)] group-hover:underline">
                    {recipe.title}
                  </h3>

                  {recipe.description ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">
                      {recipe.description}
                    </p>
                  ) : null}

                  {!!recipe.tags?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recipe.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-xl border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-extrabold text-[var(--brand-gold)]"
                        >
                          {cleanLabel(tag)}
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

      {/* FEATURED GUIDES */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              Learn the cooking
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--brand-gold)]">
              Guides for better Indian cooking
            </h2>
          </div>

          <Link
            href="/guides"
            className="text-sm font-bold text-[var(--text-soft)] hover:underline"
          >
            View all guides →
          </Link>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {featuredGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-black/20"
            >
              <div className="relative h-52 w-full bg-black/25">
                <Image
                  src={getGuideImage(guide.slug, guide.image)}
                  alt={guide.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>

              <div className="p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-gold)]/70">
                  Guide
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {guide.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                  {guide.description ||
                    "Practical help for building confidence with vegan Indian cooking."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* EXPLORE BY INGREDIENT */}
      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
          Build flavour
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-[var(--brand-gold)]">
          Browse by ingredient
        </h2>

        <div className="mt-5 flex flex-wrap gap-3">
          {exploreTags.map((t) => (
            <Link
              key={t.key}
              href={`/recipes?tag=${encodeURIComponent(t.key)}`}
              className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] transition hover:bg-black/20"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* BROWSE THE SITE */}
      <section className="mt-12">
        <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">
          Explore Vegan Masala
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {browseSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:bg-black/20"
            >
              <h3 className="text-base font-extrabold text-[var(--brand-gold)]">
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                {section.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST RECIPES */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-[var(--brand-gold)]">
            Recently added recipes
          </h2>

          <Link
            href="/recipes"
            className="text-sm font-bold text-[var(--text-soft)] hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {latestRecipes.map((r: any) => {
            const img = getRecipeImage(r.slug);
            const placeholder = isPlaceholderImage(img);
            const time = minutes(r.prepMinutes, r.cookMinutes);

            return (
              <Link
                key={r.slug}
                href={`/recipes/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-black/20"
              >
                <div className="relative h-48 w-full bg-black/25">
                  <Image
                    src={img}
                    alt={r.title}
                    fill
                    className={
                      placeholder ? "object-contain p-10 opacity-90" : "object-cover"
                    }
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />

                  {time ? (
                    <div className="absolute right-3 top-3 rounded-xl bg-[var(--brand-red)] px-3 py-1 text-xs font-extrabold text-white shadow">
                      {time}
                    </div>
                  ) : null}
                </div>

                <div className="p-5">
                  <h3 className="text-base font-extrabold text-[var(--brand-gold)] group-hover:underline">
                    {r.title}
                  </h3>

                  {r.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">
                      {r.description}
                    </p>
                  ) : null}

                  {!!r.tags?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {r.tags.slice(0, 3).map((t: string) => (
                        <span
                          key={t}
                          className="rounded-xl border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-extrabold text-[var(--brand-gold)]"
                        >
                          {cleanLabel(t)}
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

      {/* ABOUT / BRAND */}
      <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
            About Vegan Masala
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">
            Vegan Indian food written with warmth, care and real kitchen knowledge
          </h2>

          <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
            Vegan Masala is built around the belief that vegan Indian cooking
            should never feel like a compromise. The best dishes rely on a
            properly cooked masala, balanced spices, confidence with technique
            and an understanding of how flavour is built layer by layer.
          </p>

          <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
            This is food with the spirit of family meals in it: curries, dals,
            flatbreads and everyday favourites made to be shared, remembered and
            cooked again. The aim is to offer recipes and guides that feel warm
            and welcoming, while still speaking to people who care deeply about
            Indian food and want to cook it well.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
            Follow the journey
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">
            A growing vegan Indian kitchen
          </h2>

          <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
            Vegan Masala is growing into a fuller recipe and guide library with
            more curries, more regional inspiration, stronger kitchen guidance
            and more of the dishes that make Indian home cooking so memorable.
            Explore what is live now and follow along as the site continues to
            grow.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/recipes"
              className="rounded-xl bg-[var(--brand-red)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Explore recipes
            </Link>

            <Link
              href="/guides"
              className="rounded-xl border border-[var(--border)] bg-black/10 px-5 py-3 text-sm font-bold text-[var(--brand-gold)] transition hover:bg-black/20"
            >
              Read guides
            </Link>
          </div>
        </div>
      </section>

      {/* SLIDER */}
      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
              From the Vegan Masala kitchen
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--brand-gold)]">
              Curries, colour and everyday favourites
            </h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20">
          <div className="relative h-[260px] sm:h-[340px] lg:h-[420px]">
            <CurrySlider images={currySliderImages} />
          </div>
        </div>
      </section>
    </main>
  );
}