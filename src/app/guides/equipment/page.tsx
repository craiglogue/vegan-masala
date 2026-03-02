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

const equipment = [
  {
    name: "Tadka pan (tempering pan)",
    image: "/images/equipment/tadka.jpg",
    alt: "Small tadka pan for tempering spices in oil",
    why: "Perfect for blooming spices in oil (tadka) and pouring over dal, chana, and curries.",
    tip: "Keep it small — spices bloom fast and can burn.",
  },
  {
    name: "Kadai / Karahi (wok-like pan)",
    image: "/images/equipment/kadai.jpeg",
    alt: "Kadai (karahi) pan",
    why: "Great for stir-frying, bhaji-style dishes, and quick curries.",
    tip: "Hot pan + quick movement = better flavour and texture.",
  },
  {
    name: "Tawa (flat griddle)",
    image: "/images/equipment/tawa.jpg",
    alt: "Tawa for cooking rotis and flatbreads",
    why: "Essential for rotis, chapatis, parathas, and toasting spices.",
    tip: "Heat until a sprinkle of water dances; don’t oil for chapati.",
  },
  {
    name: "Heavy-bottom pot / Dutch oven",
    image: "/images/equipment/dutch_oven.jpeg",
    alt: "Heavy-bottom pot or Dutch oven on a stovetop",
    why: "Best for curries and dals: even heat prevents sticking and scorching.",
    tip: "Use medium heat and stir after adding tomatoes or purées.",
  },
  {
    name: "Pressure cooker / Instant Pot",
    image: "/images/equipment/pressure_cooker.jpg",
    alt: "Pressure cooker used for lentils and beans",
    why: "Speeds up lentils, chickpeas, and beans — weeknight game-changer.",
    tip: "Finish with tadka for best flavour.",
  },
  {
    name: "Spice grinder / coffee grinder",
    image: "/images/equipment/spice_grinder.jpg",
    alt: "Spice grinder with whole spices",
    why: "Fresh-ground spices taste dramatically better (cumin, coriander, pepper).",
    tip: "Grind small batches and keep in a sealed jar.",
  },
  {
    name: "Mortar & pestle",
    image: "/images/equipment/pestle_morter.jpg",
    alt: "Mortar and pestle for crushing spices",
    why: "Crush ginger/garlic, chilli, and whole spices for pastes and marinades.",
    tip: "A rough paste is often better than perfectly smooth.",
  },
  {
    name: "Fine mesh strainer (sieve)",
    image: "/images/equipment/sieve.jpg",
    alt: "Fine mesh sieve",
    why: "Great for rinsing lentils and straining chai or stocks.",
    tip: "Rinse lentils until water runs clearer for cleaner flavour.",
  },
  {
    name: "Wooden spoon",
    image: "/images/equipment/wooden_spoon.jpg",
    alt: "Wooden spoon for stirring curries",
    why: "Simple but essential — great for stirring without scratching pans.",
    tip: "Stir after adding tomatoes to prevent catching at the bottom.",
  },
];

export default function EquipmentGuidePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--brand-ink)]/70">Guides</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Indian cooking equipment
        </h1>
        <p className="mt-4 max-w-3xl text-[var(--brand-ink)]/70">
          You don’t need a full kitchen makeover — a few key tools make Indian cooking easier, faster,
          and more consistent.
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

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Tools that help most
        </h2>
        <p className="mt-2 max-w-3xl text-[var(--brand-ink)]/70">
          Start with a heavy pot, a good pan, and one way to grind spices. Add a pressure cooker later if you want speed.
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((e) => (
            <article
              key={e.name}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:bg-white/5"
            >
              <div className="p-4">
                <GuideImage src={e.image} alt={e.alt} />
              </div>

              <div className="px-6 pb-6">
                <h3 className="text-base font-semibold tracking-tight text-[var(--brand-ink)]">
                  {e.name}
                </h3>
                <p className="mt-2 text-sm text-[var(--brand-ink)]/70">{e.why}</p>
                <p className="mt-3 text-sm text-[var(--brand-ink)]/70">
                  <span className="font-medium text-[var(--brand-ink)]">Tip:</span> {e.tip}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-ink)]">
          Next: spices + herbs
        </h2>
        <p className="mt-2 text-[var(--brand-ink)]/70">
          Tools help with consistency — spices and herbs bring the magic.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/guides/spices"
            className="rounded-xl bg-[var(--brand-teal)] px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Indian spices guide
          </Link>
          <Link
            href="/guides/herbs"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--brand-ink)] hover:bg-white/5"
          >
            Herbs guide
          </Link>
        </div>
      </section>
    </main>
  );
}