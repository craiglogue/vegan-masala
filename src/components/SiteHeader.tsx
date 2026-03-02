"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

        <div className="relative mx-auto max-w-7xl px-4 py-2">
          {/* ROW */}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/brand/logo-flat.png"
                alt="Vegan Masala"
                width={520}
                height={200}
                priority
                className="h-auto w-[150px] sm:w-[220px] md:w-[250px] drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]"
              />
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden sm:flex items-center gap-6 text-[14px] font-bold tracking-wide text-[var(--brand-gold)]">
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

              <Link
                href="/recipes"
                className="ml-2 inline-flex items-center justify-center rounded-xl bg-[var(--brand-red)] px-5 py-2.5 text-sm font-extrabold tracking-wide text-white hover:opacity-90 transition"
              >
                Browse
              </Link>
            </nav>

            {/* MOBILE ACTIONS */}
            <div className="flex items-center gap-2 sm:hidden">
              <Link
                href="/recipes"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-red)] px-4 py-2 text-sm font-extrabold tracking-wide text-white hover:opacity-90 transition"
              >
                Browse
              </Link>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label="Open menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-black/20 text-[var(--brand-gold)] hover:bg-black/30 transition"
              >
                {/* hamburger */}
                <span className="block h-[2px] w-5 bg-[var(--brand-gold)] translate-y-[-4px]" />
                <span className="block h-[2px] w-5 bg-[var(--brand-gold)]" />
                <span className="block h-[2px] w-5 bg-[var(--brand-gold)] translate-y-[4px]" />
              </button>
            </div>
          </div>

          {/* MOBILE DROPDOWN */}
          {open && (
            <div className="sm:hidden mt-3 rounded-2xl border border-[var(--border)] bg-black/70 backdrop-blur px-4 py-3">
              <div className="flex flex-col gap-3 text-[15px] font-extrabold tracking-wide text-[var(--brand-gold)]">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}