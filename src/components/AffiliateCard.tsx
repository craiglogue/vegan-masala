import type { ReactNode } from "react";

type AffiliateCardProps = {
  title: string;
  description: string;
  href: string;
  category?: string;
  icon?: ReactNode;
  ctaLabel?: string;
  showDisclosure?: boolean;
};

export default function AffiliateCard({
  title,
  description,
  href,
  category = "Kitchen essential",
  icon = "✦",
  ctaLabel = "View product",
  showDisclosure = true,
}: AffiliateCardProps) {
  return (
    <aside className="relative overflow-hidden rounded-2xl border border-[var(--brand-gold)]/45 bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--brand-gold)]/10 p-5 shadow-sm sm:p-6">
      <div
        aria-hidden="true"
        className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--brand-gold)]/10 blur-2xl"
      />

      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--brand-gold)]/45 bg-[var(--brand-gold)]/10 text-sm"
          >
            {icon}
          </span>
          Vegan Masala recommends
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
          {category}
        </p>
        <h3 className="mt-1 text-xl font-extrabold text-[var(--text)]">{title}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
          {description}
        </p>

        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-gold)] px-5 py-3 text-sm font-extrabold text-[var(--bg)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-gold)]"
        >
          {ctaLabel}
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </a>

        {showDisclosure && (
          <p className="mt-4 text-xs leading-5 text-[var(--text-soft)]/80">
            Affiliate link: we may earn a small commission at no extra cost to you.
          </p>
        )}
      </div>
    </aside>
  );
}
