import Image from "next/image";
import Link from "next/link";

type StorePromoProps = {
  title?: string;
  text?: string;
};

export default function StorePromo({
  title = "Love this recipe?",
  text = "Visit the Vegan Masala Store for the Vegan Indian Sweets Mini Ebook, featuring 6 comforting recipes, pantry notes, troubleshooting tips, and festive serving ideas.",
}: StorePromoProps) {
  return (
    <section className="mt-12 rounded-[2rem] border border-[var(--brand-gold)]/40 bg-black/60 p-6 shadow-lg">
      <div className="grid gap-6 md:grid-cols-[140px_1fr] md:items-center">
        <div className="mx-auto w-full max-w-[140px] overflow-hidden rounded-[1.25rem] border border-[var(--brand-gold)]/40 bg-black/40 p-2">
          <Image
            src="/images/ebook/cover.jpg"
            alt="Vegan Indian Sweets Mini Ebook cover"
            width={1600}
            height={2560}
            className="h-auto w-full rounded-[0.9rem]"
          />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-[var(--brand-gold)]">{title}</h3>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--text-soft)]">
            {text}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href="/store"
              className="inline-flex rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Visit the Store
            </Link>

            <span className="text-sm font-semibold text-[var(--brand-gold)]">
              £7 digital download
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}