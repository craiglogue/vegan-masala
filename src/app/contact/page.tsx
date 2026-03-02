"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Instagram,
  Youtube,
  Facebook,
  Pin,
  Music2,
  Mail,
} from "lucide-react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message"),
      }),
    });

    if (res.ok) {
      setStatus("sent");
      e.currentTarget.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-4xl font-bold text-[var(--brand-gold)]">Contact</h1>
      <p className="mt-3 max-w-2xl text-[var(--text-soft)]">
        Partnerships, questions, recipe requests or brand collaborations — I'd love to hear from you.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {/* CONTACT FORM */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[var(--brand-gold)]">
            Send a message
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <input
              required
              name="name"
              placeholder="Your name"
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm"
            />

            <input
              required
              name="email"
              type="email"
              placeholder="Your email"
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm"
            />

            <textarea
              required
              name="message"
              rows={5}
              placeholder="Your message"
              className="w-full rounded-lg border border-[var(--border)] bg-black/30 px-4 py-3 text-sm"
            />

            <button
              disabled={status === "sending"}
              className="rounded-lg bg-[var(--brand-red)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send message"}
            </button>

            {status === "sent" && (
              <p className="text-sm text-green-400">Message sent successfully 🎉</p>
            )}
            {status === "error" && (
              <p className="text-sm text-red-400">Something went wrong. Try again.</p>
            )}
          </form>
        </div>

        {/* SOCIAL + MONETISATION */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--brand-gold)]">
              Follow Vegan Masala
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <a href="https://www.instagram.com/veganmasalaonline/" target="_blank" className="social">
                <Instagram size={18} /> Instagram
              </a>

              <a href="https://www.youtube.com/@vegan-masala" target="_blank" className="social">
                <Youtube size={18} /> YouTube
              </a>

              <a href="https://uk.pinterest.com/VeganMasala/" target="_blank" className="social">
                <Pin size={18} /> Pinterest
              </a>

              <a href="https://www.facebook.com/profile.php?id=61588342679463" target="_blank" className="social">
                <Facebook size={18} /> Facebook
              </a>

              <a href="https://www.tiktok.com/@user2554050179629?lang=en-GB" target="_blank" className="social">
                <Music2 size={18} /> TikTok
              </a>
            </div>
          </div>

          {/* FUTURE MONETISATION */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--brand-gold)]">
              Work with Vegan Masala
            </h2>

            <ul className="mt-4 space-y-3 text-sm text-[var(--text-soft)]">
              <li>• Brand partnerships & sponsored recipes</li>
              <li>• Product reviews</li>
              <li>• Social media collaborations</li>
              <li>• Recipe development</li>
              <li>• Affiliate partnerships</li>
            </ul>

            <p className="mt-5 text-sm text-[var(--text-soft)]">
              Email: <span className="text-[var(--brand-gold)]">hello@vegan-masala.com</span>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .social {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--border);
          transition: 0.2s;
        }
        .social:hover {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </main>
  );
}