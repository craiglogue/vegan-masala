"use client";

export default function RecipeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-wide text-[var(--brand-gold)]">
        Something went wrong loading this recipe
      </h1>

      <p className="mt-3 text-[var(--text-soft)]">
        This page hit an error while rendering. It’s usually caused by a formatting issue inside the recipe MDX.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-[var(--brand-red)] px-5 py-3 text-sm font-extrabold text-white hover:opacity-90 transition"
        >
          Try again
        </button>

        <a
          href="/recipes"
          className="rounded-xl border border-[var(--border)] bg-black/20 px-5 py-3 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/30 transition"
        >
          Back to recipes
        </a>
      </div>

      <details className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-soft)]">
        <summary className="cursor-pointer font-bold text-[var(--brand-gold)]">Tech details</summary>
        <pre className="mt-3 whitespace-pre-wrap">{error.message}</pre>
      </details>
    </main>
  );
}