"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-[var(--border)] bg-black/10 px-4 py-2 text-sm font-extrabold text-[var(--brand-gold)] hover:bg-black/20 transition"
    >
      Print
    </button>
  );
}