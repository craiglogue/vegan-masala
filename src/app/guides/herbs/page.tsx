// src/app/guides/herbs/page.tsx
import Image from "next/image";
import Link from "next/link";

function GuideImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-black/0" />
    </div>
  );
}

const herbs = [
  {
    name: "Coriander (Cilantro)",
    image: "/images/herbs/coriander.jpg",
    alt: "Fresh coriander (cilantro) leaves",
    use: "Fresh, citrusy lift for curries, dals, chaats, and chutneys.",
    tips: "Add at the end for brightness; stems are flavourful too.",
    pairings: ["Lime", "Green chilli", "Cumin", "Mint"],
  },
  {
    name: "Mint",
    image: "/images/herbs/mint.jpg",
    alt: "Fresh mint leaves",
    use: "Cooling, sweet herb for chutneys, vegan raita-style dips, and drinks.",
    tips: "Bruise lightly to release aroma; avoid long cooking (can turn bitter).",
    pairings: ["Coriander", "Lime", "Black salt", "Chilli"],
  },
  {
    name: "Curry leaves",
    image: "/images/herbs/curry_leaves.jpg",
    alt: "Fresh curry leaves",
    use: "Toasty, aromatic leaf used in tempering (tadka) for South Indian dishes.",
    tips: "Fry in oil until crackly; dried works but fresh is best.",
    pairings: ["Mustard seeds", "Urad dal", "Coconut", "Tamarind"],
  },
  {
    name: "Fenugreek leaves (Kasuri methi)",
    image: "/images/herbs/fenugreek_leaf.jpg",
    alt: "Fenugreek leaves (kasuri methi)",
    use: "Aromatic, slightly bitter herb that makes curries taste ‘restaurant style’.",
    tips: "Crush dried kasuri methi between palms and add near the end.",
    pairings: ["Tomato", "Garam masala", "Creamy vegan bases"],
  },
  {
    name: "Holy basil (Tulsi)",
    image: "/images/herbs/holy_basil.jpg",
    alt: "Holy basil (tulsi) leaves",
    use: "Peppery, clove-like basil used mostly in teas and some regional cooking.",
    tips: "Use fresh for tea; if cooking, add late to preserve aroma.",
    pairings: ["Ginger", "Lemon", "Jaggery-style sweetness"],
  },
  {
    name: "Dill",
    image: "/images/herbs/dill.jpg",
    alt: "Fresh dill",
    use: "Fragrant herb used in some regional dals and vegetable dishes.",
    tips: "A little goes a long way; add near the end.",
    pairings: ["Lentils", "Potatoes", "Coconut"],
  },
];

export default function HerbsGuidePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--brand-ink)]/70">Guides</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Herbs used in Indian cooking
        </h1>
        <p className="mt-4 max-w-3xl text-[var(--brand-ink)]/70">
          Herbs add freshness, lift, and complexity. Here’s what each herb brings, how to use it,
          and what it pairs well with.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/guides"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--brand-ink)] hover:bg-white/5"
          >
            Back to guides
          </Link>
          <Link
            href="/recipes"
            className="rounded-xl bg-[var(--brand-teal)] px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Browse recipes
          </Link>
        </div>
      </header>

      {/* Quick tips */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--brand-ink)]">When to add herbs</h2>
          <p className="mt-2 text-sm text-[var(--brand-ink)]/70">
            Most fresh herbs are best added at the end (or as garnish) so they stay bright and aromatic.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--brand-ink)]">Kasuri methi trick</h2>
          <p className="mt-2 text-sm text-[var(--brand-ink)]/70">
            Crush dried fenugreek leaves between your palms before adding — it releases the oils.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--brand-ink)]">Storage</h2>
          <p className="mt-2 text-sm text-[var(--brand-ink)]/70">
            Wrap coriander/mint in paper towel, store in a container in the fridge. Freeze curry leaves.
          </p>
        </div>
      </section>

      {/* Herbs grid */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-ink)]">Essential herbs</h2>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {herbs.map((h) => (
            <article
              key={h.name}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-white/5"
            >
              <div className="p-4">
                <GuideImage src={h.image} alt={h.alt} />
              </div>

              <div className="px-6 pb-6">
                <h3 className="text-base font-semibold tracking-tight text-[var(--brand-ink)]">{h.name}</h3>
                <p className="mt-2 text-sm text-[var(--brand-ink)]/70">{h.use}</p>

                <p className="mt-3 text-sm text-[var(--brand-ink)]/70">
                  <span className="font-medium text-[var(--brand-ink)]">Tip:</span> {h.tips}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {h.pairings.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--brand-ink)]/70"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Next: spices + swaps
        </h2>
        <p className="mt-2 text-[var(--brand-ink)]/70">
          Spices provide the backbone; herbs provide the lift. Combine both for “wow” flavour.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/guides/spices"
            className="rounded-xl bg-[var(--brand-teal)] px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Indian spices guide
          </Link>
          <Link
            href="/guides/vegan-dairy-alternatives"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--brand-ink)] hover:bg-white/5"
          >
            Vegan dairy swaps
          </Link>
        </div>
      </section>
    </main>
  );
}