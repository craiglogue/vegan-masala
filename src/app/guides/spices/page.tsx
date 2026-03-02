import Image from "next/image";
import Link from "next/link";

type Spice = {
  name: string;
  file: string;
  alt: string;
  description: string;
  uses: string;
  substitutes: string;
  tip: string;
};

const spices: Spice[] = [
  {
    name: "Chilli Powder",
    file: "chilli_powder.jpg",
    alt: "Indian chilli powder made from dried red chillies",
    description:
      "Adds heat and colour. Strength varies a lot (mild Kashmiri vs hot blends), so start small and adjust.",
    uses: "Curries, dals, marinades",
    substitutes: "Paprika (mild), cayenne (hot)",
    tip: "Add early for heat, add near the end for colour.",
  },
  {
    name: "Coriander Seed",
    file: "coriander_seed.jpg",
    alt: "Whole coriander seeds used in Indian cooking",
    description:
      "Warm, citrusy and gently sweet. Toasting and grinding fresh makes a big difference.",
    uses: "Curry bases, spice blends, pickles",
    substitutes: "Ground coriander (less aromatic)",
    tip: "Dry-toast lightly, then grind for maximum aroma.",
  },
  {
    name: "Cumin Seeds",
    file: "cumin_seeds.jpg",
    alt: "Whole cumin seeds commonly used in Indian cooking",
    description:
      "Earthy, deep and essential. Often bloomed in hot oil to start a dish (tadka).",
    uses: "Tadka, dals, rice dishes",
    substitutes: "Ground cumin",
    tip: "Don’t burn them — they turn bitter quickly.",
  },
  {
    name: "Curry Leaves",
    file: "curry_leaves.jpg",
    alt: "Fresh curry leaves used in South Indian cooking",
    description:
      "Distinct citrus-nut aroma. A small handful transforms dals and South Indian-style dishes.",
    uses: "Dals, sambars, chutneys",
    substitutes: "Bay leaf (not the same, but workable)",
    tip: "Freeze fresh curry leaves to preserve aroma.",
  },
  {
    name: "Fenugreek",
    file: "fenugreek.jpg",
    alt: "Fenugreek seeds used in Indian spice blends",
    description:
      "Bitter-sweet and powerful. Used sparingly, it adds depth and complexity.",
    uses: "Spice blends, pickles, curries",
    substitutes: "A pinch of maple syrup + mustard seed (approx.)",
    tip: "A little goes a long way — start with a pinch.",
  },
  {
    name: "Garam Masala",
    file: "garam_masala.jpg",
    alt: "Garam masala spice blend used in Indian cooking",
    description:
      "A warming blend that varies by region and family. Usually added at the end for fragrance.",
    uses: "Curries, dals, vegetables",
    substitutes: "Mild curry powder (not ideal)",
    tip: "Add near the end to keep the aroma fresh.",
  },
  {
    name: "Hing (Asafoetida)",
    file: "hing.jpg",
    alt: "Asafoetida (hing) used in Indian cooking",
    description:
      "Strong raw aroma that mellows into savoury onion-garlic depth when cooked. Great for vegan cooking.",
    uses: "Dals, lentils, vegetables",
    substitutes: "Onion + garlic powder (or use fresh onion/garlic)",
    tip: "Use a tiny pinch — it’s potent.",
  },
  {
    name: "Mustard Seed",
    file: "mustard_seed.jpg",
    alt: "Black mustard seeds used in Indian tempering",
    description:
      "Nutty, sharp and classic in tempering. Cook until they pop to unlock flavour.",
    uses: "Tadka, pickles, South Indian dishes",
    substitutes: "Yellow mustard seeds (milder)",
    tip: "Cover the pan briefly — they jump when popping.",
  },
  {
    name: "Turmeric",
    file: "turmeric.jpg",
    alt: "Turmeric powder used in Indian cooking",
    description:
      "Earthy and vibrant. Used in small amounts as a base note and for colour.",
    uses: "Curries, dals, rice",
    substitutes: "None for flavour",
    tip: "Cook briefly to remove the raw taste.",
  },
  {
    name: "Green Cardamom",
    file: "green_cardamom.jpg",
    alt: "Green cardamom pods used in Indian cooking",
    description:
      "Sweet, floral and aromatic. Green cardamom is used in both savoury dishes and desserts.",
    uses: "Curries, rice dishes, desserts, chai",
    substitutes: "A pinch of ground cardamom",
    tip: "Lightly crush pods before using to release flavour.",
  },
  {
    name: "Black Cardamom",
    file: "black_cardamom.jpg",
    alt: "Black cardamom pods used in Indian cooking",
    description:
      "Smoky and bold, black cardamom adds depth rather than sweetness. Very different from green cardamom.",
    uses: "Curries, dals, biryanis",
    substitutes: "Smoked paprika + green cardamom (approx.)",
    tip: "Use sparingly — one pod goes a long way.",
  },
  {
    name: "Cinnamon",
    file: "cinnamon.jpg",
    alt: "Cinnamon sticks used in Indian cooking",
    description:
      "Warm and sweet. Indian cinnamon (cassia) is stronger than Western varieties.",
    uses: "Curries, rice, spice blends",
    substitutes: "Ground cinnamon (use less)",
    tip: "Add whole sticks early, remove before serving.",
  },
  {
    name: "Peppercorns",
    file: "peppercorns.jpg",
    alt: "Whole black peppercorns used in Indian cooking",
    description:
      "Sharp, woody heat. Peppercorns were historically more prized than chillies.",
    uses: "South Indian dishes, rasam, spice blends",
    substitutes: "Fresh ground black pepper",
    tip: "Crush coarsely for better flavour release.",
  },
  {
    name: "Bay Leaf",
    file: "bay_leaf.jpg",
    alt: "Indian bay leaf (tej patta) used in cooking",
    description:
      "Indian bay leaf (tej patta) is aromatic and different from European bay leaf.",
    uses: "Curries, rice dishes, biryanis",
    substitutes: "European bay leaf (milder)",
    tip: "Remove before serving — it stays tough.",
  },
  {
    name: "Cloves",
    file: "cloves.jpg",
    alt: "Whole cloves used in Indian cooking",
    description:
      "Strong, sweet and warming. Used whole to perfume dishes rather than dominate.",
    uses: "Rice dishes, curries, spice blends",
    substitutes: "Allspice (roughly)",
    tip: "Use 1–2 cloves per dish to avoid bitterness.",
  },
  {
    name: "Fennel Seed",
    file: "fennel_seed.jpg",
    alt: "Fennel seeds used in Indian cooking",
    description:
      "Sweet, liquorice-like and cooling. Common in North Indian cooking.",
    uses: "Curries, spice blends, pickles",
    substitutes: "Anise seed (stronger)",
    tip: "Lightly toast to enhance sweetness.",
  },
  {
    name: "Saffron",
    file: "saffron.jpg",
    alt: "Saffron threads used in Indian cooking",
    description:
      "Delicate, floral and luxurious. Used for aroma and colour rather than heat.",
    uses: "Rice dishes, desserts, festive foods",
    substitutes: "Turmeric (colour only)",
    tip: "Soak threads in warm water or milk before using.",
  },
];

export default function SpicesGuide() {
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
          Indian Spices Guide
        </h1>
        <p className="mt-3 text-lg text-[var(--brand-ink)]/70">
          A practical, beginner-friendly guide to the spices that make vegan Indian food taste
          authentic — what they do, where they shine, and what to use if you’re missing one.
        </p>
      </header>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {spices.map((s) => (
          <article
            key={s.name}
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:bg-white/5 transition"
          >
            <div className="relative aspect-[4/3] w-full bg-black/10">
              <Image
                src={`/images/spices/${s.file}`}
                alt={s.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                priority={s.name === "Turmeric"}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0" />
            </div>

            <div className="p-5">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--brand-ink)]">
                {s.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--brand-ink)]/70">
                {s.description}
              </p>

              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-[var(--brand-ink)]">Common uses</dt>
                  <dd className="text-[var(--brand-ink)]/70">{s.uses}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--brand-ink)]">Substitutes</dt>
                  <dd className="text-[var(--brand-ink)]/70">{s.substitutes}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--brand-ink)]">Tip</dt>
                  <dd className="text-[var(--brand-ink)]/70">{s.tip}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Quick rules that make spices taste “right”
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[var(--brand-ink)]/70">
          <li>
            <span className="font-medium text-[var(--brand-ink)]">Bloom whole spices</span> in hot oil for
            10–20 seconds — fragrant, not burnt.
          </li>
          <li>
            <span className="font-medium text-[var(--brand-ink)]">Add garam masala near the end</span> so it
            stays aromatic.
          </li>
          <li>
            <span className="font-medium text-[var(--brand-ink)]">Balance</span> with salt + acid (lemon) +
            sweetness (onion/tomato).
          </li>
          <li>
            <span className="font-medium text-[var(--brand-ink)]">Store well</span>: airtight jars, away from
            light/heat. Replace when they smell dusty.
          </li>
        </ul>
      </section>
    </main>
  );
}