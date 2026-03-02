// src/components/SiteHeader.tsx
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]">
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="/images/header/mandala-bg.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/75" />
        </div>

        {/* Top row: logo + browse */}
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <Link href="/" className="relative z-10 flex items-center">
            <img
              src="/brand/logo-flat.png"
              alt="Vegan Masala"
              className="h-auto w-[170px] sm:w-[220px] md:w-[250px] drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]"
            />
          </Link>

          <Link
            href="/recipes"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-red)] px-5 py-2.5 text-sm font-extrabold tracking-wide text-white hover:opacity-90 transition"
          >
            Browse
          </Link>
        </div>

        {/* Mobile nav row (now shows on ALL sizes) ✅ */}
        <div className="relative mx-auto max-w-7xl px-4 pb-2">
          <nav className="flex items-center gap-6 overflow-x-auto whitespace-nowrap text-[14px] font-bold tracking-wide text-[var(--brand-gold)]">
            <Link className="hover:opacity-90" href="/recipes">
              Recipes
            </Link>
            <Link className="hover:opacity-90" href="/guides">
              Guides
            </Link>
            <Link className="hover:opacity-90" href="/about">
              About
            </Link>
            <Link className="hover:opacity-90" href="/contact">
              Contact
            </Link>
          </nav>
        </div>

        {/* Desktop nav row (shows on sm+) */}
        <div className="relative mx-auto hidden max-w-7xl px-4 pb-2 sm:block">
          <nav className="flex items-end gap-6 text-[14px] font-bold tracking-wide text-[var(--brand-gold)]">
            <Link className="hover:opacity-90" href="/recipes">
              Recipes
            </Link>
            <Link className="hover:opacity-90" href="/guides">
              Guides
            </Link>
            <Link className="hover:opacity-90" href="/about">
              About
            </Link>
            <Link className="hover:opacity-90" href="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}