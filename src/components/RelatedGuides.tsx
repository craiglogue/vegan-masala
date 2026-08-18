import Link from "next/link";
import Image from "next/image";
import { getAllGuides } from "@/lib/guides";

type Guide = {
  title: string;
  slug: string;
  description?: string;
  image?: string;
  category?: string;
};

type Props = {
  title?: string;
  tags?: string[];
  max?: number;
};

function getGuideImage(guide: Guide) {
  const slugImage = `/images/guides/${guide.slug}.png`;

  const legacyMap: Record<string, string> = {
    spices: "/images/guides/indian-spices-guide.png",
    "vegan-dairy-alternatives": "/images/guides/dairy.jpg",
    equipment: "/images/guides/equipment.jpg",
    herbs: "/images/guides/herbs.jpg",
    "vegan-indian-pantry-staples": "/images/guides/vegan-indian-pantry-staples.png",
  };

  if (legacyMap[guide.slug]) return legacyMap[guide.slug];
  return guide.image || slugImage || "/images/guides/spices.jpg";
}

export default function RelatedGuides({
  title = "Learn more",
  tags = [],
  max = 3,
}: Props) {
  const guides = getAllGuides() as Guide[];

  const related = guides
    .filter((g) => {
      if (!tags.length) return false;

      const haystack = [
        g.slug,
        g.title,
        g.description || "",
        g.category || "",
      ]
        .join(" ")
        .toLowerCase();

      return tags.some((t) => haystack.includes(t.toLowerCase()));
    })
    .slice(0, max);

  if (!related.length) return null;

  return (
    <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
        {title}
      </h2>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((guide) => {
          const image = getGuideImage(guide);

          return (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20 transition hover:bg-black/30"
            >
              <div className="relative h-40 w-full overflow-hidden border-b border-[var(--border)] bg-black/25">
                <Image
                  src={image}
                  alt={guide.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-4">
                <h3 className="text-sm font-extrabold text-[var(--brand-gold)] group-hover:underline">
                  {guide.title}
                </h3>

                {guide.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--text-soft)]">
                    {guide.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
