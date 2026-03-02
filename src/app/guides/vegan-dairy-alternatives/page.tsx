import Image from "next/image";
import Link from "next/link";

type DairyAlt = {
  name: string;
  file: string;
  alt: string;
  description: string;
  uses: string;
  substitutes: string;
  tip: string;
};

const dairyAlternatives: DairyAlt[] = [
  {
    name: "Coconut Milk",
    file: "coconut_milk.jpg",
    alt: "Coconut milk used in vegan Indian cooking",
    description:
      "Rich and creamy with a subtle sweetness. A staple in many Indian curries and stews.",
    uses: "Curries, dals, rice dishes",
    substitutes: "Cashew cream, almond milk (thinner)",
    tip: "Use full-fat coconut milk for the best texture.",
  },
  {
    name: "Cashew Cream",
    file: "cashew_cream.jpg",
    alt: "Cashew cream used as a dairy substitute",
    description:
      "Smooth, neutral and luxurious. One of the closest dairy cream replacements.",
    uses: "Curries, kormas, gravies",
    substitutes: "Blended almonds, coconut cream",
    tip: "Soak cashews in hot water for 15 minutes before blending.",
  },
  {
    name: "Almond Milk",
    file: "almond_milk.jpg",
    alt: "Almond milk used in vegan cooking",
    description:
      "Light and slightly nutty. Best for lighter dishes rather than rich gravies.",
    uses: "Soups, sauces, desserts",
    substitutes: "Oat milk, soy milk",
    tip: "Choose unsweetened varieties for savoury cooking.",
  },
  {
    name: "Soy Milk",
    file: "soy_milk.jpg",
    alt: "Soy milk used in vegan Indian cooking",
    description:
      "High protein and neutral when cooked properly. Widely available and versatile.",
    uses: "Curries, baking, sauces",
    substitutes: "Oat milk, almond milk",
    tip: "Simmer gently to avoid splitting.",
  },
  {
    name: "Oat Milk",
    file: "oat_milk.jpg",
    alt: "Oat milk used as a dairy alternative",
    description:
      "Mild, slightly sweet and very accessible. Works best in softer, comforting dishes.",
    uses: "Soups, dals, baking",
    substitutes: "Soy milk",
    tip: "Avoid barista versions for cooking — they’re often sweetened.",
  },
  {
    name: "Vegan Yogurt",
    file: "vegan_yogurt.jpg",
    alt: "Vegan yogurt used in dairy-free Indian cooking",
    description:
      "Tangy and creamy. Adds acidity and richness similar to dairy yogurt.",
    uses: "Marinades, curries, raita-style sides",
    substitutes: "Blended cashew + lemon juice",
    tip: "Stir in off the heat to prevent splitting.",
  },
  {
    name: "Vegan Butter",
    file: "vegan_butter.jpg",
    alt: "Vegan butter used as a dairy substitute",
    description:
      "Adds richness and mouthfeel. Useful for finishing dishes.",
    uses: "Curries, breads, finishing sauces",
    substitutes: "Neutral oil + pinch of salt",
    tip: "Add at the end for maximum flavour.",
  },
  {
    name: "Nutritional Yeast",
    file: "nutritional_yeast.jpg",
    alt: "Nutritional yeast flakes used in vegan cooking",
    description:
      "Cheesy, savoury flavour without dairy. Great for depth and umami.",
    uses: "Sauces, toppings, savoury snacks",
    substitutes: "White miso (sparingly)",
    tip: "Use lightly — it’s powerful.",
  },
];

export default function DairyAlternativesGuide() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/guides"
        className="text-sm text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)]"
      >
        ← Back to guides
      </Link>

      <header className="mt-4 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Dairy Alternatives Guide
        </h1>
        <p className="mt-3 text-lg text-[var(--brand-ink)]/70">
          Practical vegan substitutes for milk, cream, yogurt and butter — what works best, when
          to use it, and how to avoid common cooking mistakes.
        </p>
      </header>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dairyAlternatives.map((d) => (
          <article
            key={d.name}
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:bg-white/5 transition"
          >
            <div className="relative aspect-[4/3] w-full bg-black/10">
              <Image
                src={`/images/dairy_alternatives/${d.file}`}
                alt={d.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0" />
            </div>

            <div className="p-5">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--brand-ink)]">
                {d.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--brand-ink)]/70">
                {d.description}
              </p>

              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-[var(--brand-ink)]">Best uses</dt>
                  <dd className="text-[var(--brand-ink)]/70">{d.uses}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--brand-ink)]">Substitutes</dt>
                  <dd className="text-[var(--brand-ink)]/70">{d.substitutes}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--brand-ink)]">Tip</dt>
                  <dd className="text-[var(--brand-ink)]/70">{d.tip}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Cooking tips for vegan dairy substitutes
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[var(--brand-ink)]/70">
          <li>Add plant milks gradually and simmer gently to avoid splitting.</li>
          <li>Balance richness with acid (lemon or tomato) at the end.</li>
          <li>Blend nuts fully for the smoothest texture.</li>
          <li>Taste and adjust salt — plant milks vary widely.</li>
        </ul>
      </section>
    </main>
  );
}