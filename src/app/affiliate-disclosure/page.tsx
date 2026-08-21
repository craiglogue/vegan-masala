import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How affiliate links and recommendations work on Vegan Masala.",
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm sm:p-10">
        <h1 className="text-3xl font-extrabold text-[var(--brand-gold)]">
          Affiliate Disclosure
        </h1>

        <div className="mt-6 space-y-6 text-[var(--text-soft)] leading-7">
          <p>
            Some Vegan Masala pages contain affiliate links. If you follow one of
            these links and make a qualifying purchase, Vegan Masala may receive a
            small commission at no additional cost to you.
          </p>

          <p>
            Affiliate links are labelled clearly near the recommendation.
            Commercial relationships do not determine which recipes, techniques or
            equipment we discuss, and readers should choose products that suit their
            own kitchen, budget and needs.
          </p>

          <p className="font-semibold text-[var(--text)]">
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        </div>
      </section>
    </main>
  );
}
