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

        {/* Centered logo + nav */}
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-3">
          <Link href="/" className="flex items-center justify-center">
            <img
              src="/brand/logo-flat.png"
              alt="Vegan Masala"
              className="h-auto w-[180px] sm:w-[240px] md:w-[270px] drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]"
            />
          </Link>

          <nav className="mt-2 flex items-center justify-center gap-7 text-[15px] sm:text-[16px] font-bold tracking-wide text-[var(--brand-gold)]">
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