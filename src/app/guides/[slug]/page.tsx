import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import RelatedRecipes from "@/components/RelatedRecipes";

import { getAllGuideSlugs, getGuideBySlug } from "@/lib/guides";

type CardItem = {
  title: string;
  image: string;
  description: string;
};

function extractSections(raw: string) {
  const sections: { heading: string; body: string }[] = [];
  const re = /(^|\n)##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|\s*$)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    sections.push({
      heading: m[2].trim(),
      body: (m[3] ?? "").trim(),
    });
  }

  return sections;
}

function extractFAQs(content: string) {
  const faqs: { question: string; answer: string }[] = [];

  const faqBlock = content.split("## Frequently Asked Questions")[1];
  if (!faqBlock) return [];

  const matches = faqBlock.matchAll(/### (.*?)\n([\s\S]*?)(?=\n###|\n##|$)/g);

  for (const m of matches) {
    faqs.push({
      question: m[1].trim(),
      answer: m[2].trim().replace(/\n/g, " "),
    });
  }

  return faqs;
}

function getObjectPosition(token?: string) {
  switch ((token || "").toLowerCase()) {
    case "top30":
      return "center 30%";
    case "center55":
      return "center 55%";
    case "center60":
      return "center 60%";
    case "center62":
      return "center 62%";
    case "center72":
      return "center 72%";
    default:
      return "center center";
  }
}

function getGuideImage(guide: { slug: string; image?: string }) {
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

function absUrl(siteUrl: string, maybePath?: string) {
  if (!maybePath) return undefined;
  if (maybePath.startsWith("http://") || maybePath.startsWith("https://")) return maybePath;
  return `${siteUrl}${maybePath.startsWith("/") ? "" : "/"}${maybePath}`;
}

function guideSearchText(guide: any) {
  return [
    guide?.title ?? "",
    guide?.slug ?? "",
    guide?.description ?? "",
    guide?.content ?? "",
    guide?.category ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function buildGuideSeoTypeLabel(guide: any) {
  const text = guideSearchText(guide);

  if (/\bspice|spices|masala\b/.test(text)) {
    return "Indian Spices Guide";
  }

  if (/\bpantry|staples|essential|essentials\b/.test(text)) {
    return "Vegan Indian Pantry Guide";
  }

  if (/\bcurry base|base gravy|onion tomato base\b/.test(text)) {
    return "Indian Curry Base Guide";
  }

  if (/\bdal|lentil|lentils\b/.test(text)) {
    return "Indian Lentils and Dal Guide";
  }

  if (/\bbasmati|rice|biryani\b/.test(text)) {
    return "Indian Rice Guide";
  }

  if (/\bherb|herbs|coriander|mint|curry leaves\b/.test(text)) {
    return "Indian Herbs Guide";
  }

  if (/\bequipment|tools|kitchen\b/.test(text)) {
    return "Indian Cooking Equipment Guide";
  }

  if (/\bdairy|alternatives|substitutes|vegan dairy\b/.test(text)) {
    return "Vegan Dairy Alternatives Guide";
  }

  if (/\bbeginner|beginners\b/.test(text)) {
    return "Beginner's Guide to Vegan Indian Cooking";
  }

  return "Vegan Indian Cooking Guide";
}

function buildGuideSeoTitle(guide: any) {
  const title = String(guide?.title ?? "Guide").trim();
  const lower = title.toLowerCase();
  const typeLabel = buildGuideSeoTypeLabel(guide);

  if (lower.includes("guide")) {
    return title;
  }

  if (lower === typeLabel.toLowerCase()) {
    return title;
  }

  return `${title} | ${typeLabel}`;
}

function buildGuideSeoDescription(guide: any) {
  const existing = String(guide?.description ?? "").trim();
  if (existing) {
    return existing.length <= 160 ? existing : `${existing.slice(0, 157).trim()}...`;
  }

  const title = String(guide?.title ?? "This guide").trim();
  const typeLabel = buildGuideSeoTypeLabel(guide);

  const sentence = `${title} is a practical ${typeLabel.toLowerCase()} with clear explanations, useful kitchen guidance and beginner-friendly help for vegan Indian cooking.`;

  return sentence.length <= 160 ? sentence : `${sentence.slice(0, 157).trim()}...`;
}

function getRelatedRecipeTags(slug: string) {
  const guideRecipeMap: Record<string, string[]> = {
    "vegan-indian-pantry-staples": ["chana", "rajma", "rice", "curry", "dal"],
    "indian-spices-explained-for-beginners": ["curry", "masala", "dal", "chana"],
    "how-to-build-a-curry-base": ["curry", "masala", "vindaloo", "korma"],
    "lentils-and-dal": ["dal", "lentil", "rajma", "chana", "moong"],
    "how-to-temper-spices": ["dal", "lentil", "chana", "rajma"],
    "beginner-friendly-vegan-indian-recipes": ["easy", "chana", "dal", "potato", "tofu", "rice"],
    "how-to-cook-basmati-rice": ["rice", "biryani", "chana", "rajma", "curry"],
    "vegan-dairy-alternatives": ["tofu", "korma", "makhanwala", "butter"],
    herbs: ["palak", "spinach", "curry", "chutney"],
    equipment: ["instant-pot", "pressure-cooker", "one-pot", "rice"],
  };

  return guideRecipeMap[slug] || [];
}

function renderBlock(body: string) {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);

  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];
  let para: string[] = [];
  let cards: CardItem[] = [];

  function flushPara() {
    if (!para.length) return;

    out.push(
      <p key={`p-${out.length}`} className="mt-4 leading-7 text-[var(--text-soft)]">
        {para.join(" ")}
      </p>
    );

    para = [];
  }

  function flushBullets() {
    if (!bullets.length) return;

    out.push(
      <ul key={`ul-${out.length}`} className="mt-4 space-y-2 text-[var(--text-soft)]">
        {bullets.map((item, i) => (
          <li key={i} className="leading-7">
            <span className="mr-2 text-[var(--brand-gold)]">•</span>
            {item}
          </li>
        ))}
      </ul>
    );

    bullets = [];
  }

  function flushNumbered() {
    if (!numbered.length) return;

    out.push(
      <ol key={`ol-${out.length}`} className="mt-4 space-y-3 text-[var(--text-soft)]">
        {numbered.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red)] text-xs font-extrabold text-white">
              {i + 1}
            </span>
            <span className="leading-7">{item}</span>
          </li>
        ))}
      </ol>
    );

    numbered = [];
  }

  function flushCards() {
    if (!cards.length) return;

    out.push(
      <div
        key={`cards-${out.length}`}
        className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card, i) => {
          const parts = card.image.split("#");
          const imgSrc = parts[0];
          const pos = getObjectPosition(parts[1]);

          return (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20"
            >
              <div className="relative h-48 w-full overflow-hidden border-b border-[var(--border)] bg-black/25">
                <Image
                  src={imgSrc}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="h-full w-full object-cover"
                  style={{ objectPosition: pos }}
                />
              </div>

              <div className="p-5">
                <h4 className="text-sm font-extrabold text-[var(--brand-gold)]">
                  {card.title}
                </h4>

                <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );

    cards = [];
  }

  function flushAll() {
    flushPara();
    flushBullets();
    flushNumbered();
    flushCards();
  }

  for (const line of lines) {
    const cardMatch = line.match(/^\[CARD:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\]$/i);

    if (cardMatch) {
      flushPara();
      flushBullets();
      flushNumbered();

      cards.push({
        title: cardMatch[1].trim(),
        image: cardMatch[2].trim(),
        description: cardMatch[3].trim(),
      });

      continue;
    }

    if (line.startsWith("### ")) {
      flushAll();

      out.push(
        <h3
          key={`h3-${out.length}`}
          className="mt-6 text-lg font-extrabold text-[var(--brand-gold)]"
        >
          {line.replace(/^###\s+/, "").trim()}
        </h3>
      );

      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      flushBullets();
      flushCards();

      numbered.push(line.replace(/^\d+\.\s+/, "").trim());
      continue;
    }

    if (line.startsWith("- ")) {
      flushPara();
      flushNumbered();
      flushCards();

      bullets.push(line.replace(/^-+\s+/, "").trim());
      continue;
    }

    flushBullets();
    flushNumbered();
    flushCards();

    para.push(line);
  }

  flushAll();
  return out;
}

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) return {};

  const image = getGuideImage(guide);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";
  const canonical = `${siteUrl}/guides/${slug}`;
  const imageAbs = absUrl(siteUrl, image);
  const seoTitle = buildGuideSeoTitle(guide);
  const seoDescription = buildGuideSeoDescription(guide);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonical,
      siteName: "Vegan Masala",
      type: "article",
      images: imageAbs ? [{ url: imageAbs }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: imageAbs ? [imageAbs] : undefined,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const guide = getGuideBySlug(slug);

  if (!guide) return notFound();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com";

  const sections = extractSections(guide.content);
  const faqs = extractFAQs(guide.content);
  const heroImage = getGuideImage(guide);
  const heroImageAbs = absUrl(siteUrl, heroImage);
  const relatedTags = getRelatedRecipeTags(guide.slug);
  const canonical = `${siteUrl}/guides/${guide.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${siteUrl}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: canonical,
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: buildGuideSeoDescription(guide),
    image: heroImageAbs ? [heroImageAbs] : undefined,
    author: {
      "@type": "Organization",
      name: "Vegan Masala",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Vegan Masala",
      url: siteUrl,
    },
    mainEntityOfPage: canonical,
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: f.answer,
                },
              })),
            }),
          }}
        />
      )}

      <Link
        href="/guides"
        className="text-sm text-[var(--text-soft)] hover:underline"
      >
        ← Back to guides
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {heroImage && (
          <Image
            src={heroImage}
            alt={guide.title}
            width={1200}
            height={500}
            priority
            className="h-64 w-full object-cover"
          />
        )}

        <div className="p-8">
          <h1 className="text-3xl font-extrabold text-[var(--brand-gold)] sm:text-4xl">
            {guide.title}
          </h1>

          {guide.description && (
            <p className="mt-4 max-w-3xl text-[var(--text-soft)] leading-7">
              {guide.description}
            </p>
          )}
        </div>
      </section>

      <section className="mt-10 space-y-8">
        {sections.map((section) => (
          <div
            key={section.heading}
            className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
          >
            <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
              {section.heading}
            </h2>

            <div className="mt-4">{renderBlock(section.body)}</div>
          </div>
        ))}
      </section>

      <RelatedRecipes
        title="Recipes to try next"
        tags={relatedTags}
        max={6}
      />
    </main>
  );
}
