import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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

function getObjectPosition(token?: string) {
  switch ((token || "").toLowerCase()) {
    case "top30":
      return "center 30%";

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

            <span className="leading-7">
              {item}
            </span>

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

              <div className="h-48 w-full overflow-hidden border-b border-[var(--border)] bg-black/25">

                <img
                  src={imgSrc}
                  alt={card.title}
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

    const cardMatch = line.match(
      /^\[CARD:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\]$/i
    );

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

    if (/^\d+\.\s+/.test(line)) {

      flushPara();
      flushBullets();
      flushCards();

      numbered.push(
        line.replace(/^\d+\.\s+/, "").trim()
      );

      continue;
    }

    if (line.startsWith("- ")) {

      flushPara();
      flushNumbered();
      flushCards();

      bullets.push(
        line.replace(/^-+\s+/, "").trim()
      );

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

  return getAllGuideSlugs().map(
    (slug) => ({ slug })
  );

}

export async function generateMetadata({

  params,

}: {

  params: Promise<{ slug: string }>;

}): Promise<Metadata> {

  const { slug } = await params;

  const guide = getGuideBySlug(slug);

  if (!guide) return {};

  return {

    title: `${guide.title} | Vegan Masala`,

    description: guide.description,

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

  const sections = extractSections(
    guide.content
  );

  return (

    <main className="mx-auto max-w-5xl px-6 py-12">

      <Link
        href="/guides"
        className="text-sm text-[var(--text-soft)] hover:underline"
      >
        ← Back to guides
      </Link>

      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">

        {guide.image && (

          <img
            src={guide.image}
            alt={guide.title}
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

            <div className="mt-4">
              {renderBlock(section.body)}
            </div>

          </div>

        ))}

      </section>

    </main>

  );

}