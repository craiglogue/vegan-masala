import Link from "next/link";

type Guide = {
  title: string;
  href: string;
  desc: string;
  image: string;
};

const guides: Guide[] = [
  {
    title: "Indian Spices (What to Buy + What They Do)",
    href: "/guides/spices",
    desc: "A beginner-friendly spice guide for flavour that tastes ‘right’.",
    image: "/images/guides/spices.jpg",
  },
  {
    title: "Vegan Alternatives to Dairy (Curd, Ghee, Cream + Paneer swaps)",
    href: "/guides/vegan-dairy-alternatives",
    desc: "Simple replacements that work in real Indian cooking.",
    image: "/images/guides/dairy.jpg",
  },
  {
    title: "Herbs used in Indian cooking",
    href: "/guides/herbs",
    desc: "Freshness, lift, and classic pairings — what to use and when.",
    image: "/images/guides/herbs.jpg",
  },
  {
    title: "Indian cooking equipment",
    href: "/guides/equipment",
    desc: "The few tools that make Indian cooking easier and more consistent.",
    image: "/images/guides/equipment.jpg",
  },
];

export default function GuidesIndex() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-wide text-[var(--brand-gold)]">Guides</h1>
      <p className="mt-2 max-w-2xl text-[var(--text-soft)]">
        Helpful guides for spices, techniques, and vegan swaps.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {guides.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group relative grid grid-cols-[1fr_160px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:bg-white/5 transition"
          >
            {/* Text */}
            <div className="p-6">
              <div className="text-base font-bold tracking-wide text-[var(--brand-gold)] group-hover:underline">
                {g.title}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{g.desc}</p>
              <div className="mt-3 text-xs font-bold tracking-wide text-[var(--brand-gold)]/80">
                Read guide →
              </div>
            </div>

            {/* Image hugs edge (no padding) */}
            <div className="relative h-full w-full border-l border-[var(--border)]">
              <img
                src={g.image}
                alt={g.title}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/10 via-black/10 to-transparent" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}