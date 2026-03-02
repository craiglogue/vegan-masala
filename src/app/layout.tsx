// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Rajdhani } from "next/font/google";

import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vegan-masala.com"
  ),
  title: {
    default: "Vegan Masala",
    template: "%s | Vegan Masala",
  },
  description: "Vegan Indian recipes made simple. Weeknight-friendly and tested.",

  // ✅ Google Search Console verification
  verification: {
    google: "YpPgzdzyFcDfPTJ-m6ANwOVq0L1uH3pjr8LyE5RgSQ8",
  },

  // ✅ Favicons + PWA manifest (cache-busted)
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/favicon.svg?v=3", type: "image/svg+xml" },
      { url: "/favicon-96x96.png?v=3", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=3" }],
  },

  manifest: "/site.webmanifest?v=3",
};

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-black/80">
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-[var(--text-soft)]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Image
              src="/brand/logo-flat.png"
              alt="Vegan Masala"
              width={220}
              height={90}
              className="h-auto w-[120px] opacity-90"
            />
            <div>
              <div className="text-base font-extrabold tracking-wide text-[var(--brand-gold)]">
                Vegan Masala
              </div>
              <p className="mt-2 max-w-sm text-[var(--text-soft)]">
                Authentic vegan Indian recipes, spices, and cooking guides — built to be
                practical and weeknight-friendly.
              </p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <div>
              <h4 className="text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
                Explore
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/recipes" className="hover:text-[var(--brand-gold)]">
                    Recipes
                  </Link>
                </li>
                <li>
                  <Link href="/guides" className="hover:text-[var(--brand-gold)]">
                    Guides
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[var(--brand-gold)]">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
                Legal
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/privacy" className="hover:text-[var(--brand-gold)]">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-[var(--brand-gold)]">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[var(--brand-gold)]">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-extrabold tracking-wide text-[var(--brand-gold)]">
                Follow
              </h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="https://www.instagram.com/veganmasalaonline/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--brand-gold)]"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/@vegan-masala"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--brand-gold)]"
                  >
                    YouTube
                  </a>
                </li>
                <li>
                  <a
                    href="https://uk.pinterest.com/VeganMasala/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--brand-gold)]"
                  >
                    Pinterest
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/profile.php?id=61588342679463"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--brand-gold)]"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.tiktok.com/@user2554050179629?lang=en-GB"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--brand-gold)]"
                  >
                    TikTok
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-soft)]/70">
          © {new Date().getFullYear()} Vegan Masala • Cooked with ♥ • Vegan-Masala.com
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rajdhani.variable} scroll-pt-[140px]`}>
      <body className="min-h-screen">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}