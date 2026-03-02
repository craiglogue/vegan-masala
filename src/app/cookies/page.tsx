// src/app/cookies/page.tsx
export const metadata = {
  title: "Cookie Policy",
  description: "Cookie policy for Vegan Masala.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-[var(--brand-gold)]">
        Cookie Policy
      </h1>

      <p className="mt-6 text-[var(--text-soft)] leading-7">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="mt-10 space-y-6 text-[var(--text-soft)] leading-7">
        <p>
          This Cookie Policy explains what cookies are, how Vegan Masala uses them,
          and how you can control them.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          What are cookies?
        </h2>
        <p className="mt-6 text-[var(--text-soft)] leading-7">
          Cookies are small text files stored on your device when you visit a
          website. They help websites work properly and can provide information to
          website owners about how the site is used.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Cookies we use
        </h2>

        <div className="mt-6 space-y-6 text-[var(--text-soft)] leading-7">
          <div>
            <h3 className="font-extrabold text-[var(--brand-gold)]">
              Essential cookies
            </h3>
            <p className="mt-2">
              These cookies are necessary for the website to function (for example,
              security and basic navigation). The site cannot work properly without
              them.
            </p>
          </div>

          <div>
            <h3 className="font-extrabold text-[var(--brand-gold)]">
              Analytics cookies (optional)
            </h3>
            <p className="mt-2">
              These help us understand how visitors use the site (for example,
              which pages are most popular). We use this to improve recipes and
              content. Analytics cookies should be treated as optional.
            </p>
          </div>

          <div>
            <h3 className="font-extrabold text-[var(--brand-gold)]">
              Functional cookies (optional)
            </h3>
            <p className="mt-2">
              These remember your preferences (for example, settings or display
              choices) to improve your experience.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Managing cookies
        </h2>

        <div className="mt-6 space-y-4 text-[var(--text-soft)] leading-7">
          <p>
            You can control cookies in your browser settings. You can delete
            existing cookies and choose to block future cookies.
          </p>
          <p>
            Blocking some cookies may impact your experience and parts of the site
            may not function as intended.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Contact
        </h2>
        <p className="mt-6 text-[var(--text-soft)] leading-7">
          Questions? Contact: hello@vegan-masala.com
        </p>
      </section>
    </main>
  );
}