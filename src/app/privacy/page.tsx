// src/app/privacy/page.tsx
export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Vegan Masala.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-[var(--brand-gold)]">
        Privacy Policy
      </h1>

      <p className="mt-6 text-[var(--text-soft)] leading-7">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      {/* INTRO */}
      <section className="mt-10 space-y-6 text-[var(--text-soft)] leading-7">
        <p>
          This website (“Vegan Masala”, “we”, “our”, “us”) is committed to protecting
          your privacy. This policy explains what information we collect, how we use
          it, and your rights under UK and GDPR privacy law.
        </p>
      </section>

      {/* INFORMATION WE COLLECT */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Information we collect
        </h2>

        <div className="mt-6 space-y-6 text-[var(--text-soft)] leading-7">
          <p>We may collect the following types of information:</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              Contact details you provide voluntarily (for example when using the
              contact form).
            </li>
            <li>
              Anonymous usage data such as pages visited and time spent on the
              website.
            </li>
            <li>
              Technical information such as browser type, device type and country.
            </li>
          </ul>
        </div>
      </section>

      {/* HOW WE USE DATA */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          How we use your information
        </h2>

        <div className="mt-6 space-y-4 text-[var(--text-soft)] leading-7">
          <p>We use information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Respond to enquiries and messages</li>
            <li>Improve website content and recipes</li>
            <li>Understand how visitors use the site</li>
            <li>Maintain website security</li>
          </ul>
        </div>
      </section>

      {/* COOKIES */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Cookies & analytics
        </h2>

        <p className="mt-6 text-[var(--text-soft)] leading-7">
          This website uses cookies and privacy-friendly analytics to understand how
          the site is used. These cookies do not personally identify you.
        </p>
      </section>

      {/* DATA SHARING */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Sharing your data
        </h2>

        <p className="mt-6 text-[var(--text-soft)] leading-7">
          We do not sell, trade, or rent your personal data. We may share limited
          data with trusted services that help operate the website (such as hosting
          and analytics providers).
        </p>
      </section>

      {/* YOUR RIGHTS */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Your rights
        </h2>

        <div className="mt-6 space-y-4 text-[var(--text-soft)] leading-7">
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Request a copy of any personal data we hold</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </div>
      </section>

      {/* CONTACT */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">
          Contact
        </h2>

        <p className="mt-6 text-[var(--text-soft)] leading-7">
          For privacy questions, contact: hello@vegan-masala.com
        </p>
      </section>
    </main>
  );
}