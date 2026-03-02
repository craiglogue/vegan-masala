import Link from "next/link";

export default function AboutPage() {
  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition";
  const btnOutline =
    "inline-flex items-center justify-center rounded-xl border border-[var(--brand-gold)] px-6 py-3 text-sm font-semibold text-[var(--brand-gold)] hover:bg-white/5 transition";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-wide text-[var(--brand-gold)]">
        About Vegan Masala
      </h1>

      <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
        Vegan Masala is a growing collection of vegan Indian recipes that aim to taste
        authentic — the kind of food you’d expect from family kitchens and local cafés —
        but made simple and approachable for everyday cooking.
      </p>

      {/* Main content card */}
      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="text-xl font-bold tracking-wide text-[var(--brand-gold)]">
          What you’ll find here
        </h2>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-[var(--text-soft)]">
          <li>
            <span className="font-semibold text-[var(--brand-gold)]">Tested recipes</span> with clear steps,
            timings, and sensible substitutions.
          </li>
          <li>
            <span className="font-semibold text-[var(--brand-gold)]">Guides</span> to spices, herbs,
            equipment and vegan dairy swaps.
          </li>
          <li>
            <span className="font-semibold text-[var(--brand-gold)]">Authentic flavour</span> without needing
            a huge pantry or specialist skills.
          </li>
        </ul>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-black/15 p-6">
            <h3 className="text-base font-bold tracking-wide text-[var(--brand-gold)]">
              The philosophy
            </h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Indian food is about balance — spices, aromatics, acid, salt, and a little sweetness.
              The goal is flavour that tastes “right”, without overcomplicating things.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-black/15 p-6">
            <h3 className="text-base font-bold tracking-wide text-[var(--brand-gold)]">
              100% vegan (always)
            </h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              You’ll find realistic vegan swaps for ghee, yogurt, cream and paneer — so you can cook
              classic dishes without dairy.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/recipes" className={btnPrimary}>
            Browse recipes
          </Link>
          <Link href="/guides" className={btnOutline}>
            Read guides
          </Link>
        </div>
      </section>

      {/* Small footer note card */}
      <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <p className="text-sm text-[var(--text-soft)]">
          Want to suggest a recipe or a guide you’d like next? Add a note to your project TODO list
          and we’ll build a simple “Contact” page when you’re ready.
        </p>
      </section>
    </main>
  );
}