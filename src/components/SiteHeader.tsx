// src/components/SiteHeader.tsx
import Link from "next/link";
import Image from "next/image";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/header/mandala-bg.jpg"
            alt=""
            fill
            sizes="100vw"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/75" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-center overflow-hidden">
            <Link href="/" className="flex items-center justify-center">
              <Image
                src="/brand/logo-flat.png"
                alt="Vegan Masala"
                width={220}
                height={90}
                style={{
                  height: "clamp(120px, 14vw, 180px)",
                  width: "auto",
                  display: "block",
                }}
              />
            </Link>
          </div>

          <nav className="mt-2 flex items-center justify-center gap-8 text-[18px] font-bold tracking-wide text-[var(--brand-gold)] sm:text-[20px]">
            <Link className="hover:opacity-90" href="/recipes">
              Recipes
            </Link>
            <Link className="hover:opacity-90" href="/guides">
              Guides
            </Link>
            <Link className="hover:opacity-90" href="/store">
              Store
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
