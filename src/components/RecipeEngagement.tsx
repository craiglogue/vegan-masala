"use client";

import { useSyncExternalStore } from "react";

const storageEvent = "vegan-masala:saved-recipes-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(storageEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(storageEvent, onChange);
  };
}

export default function RecipeEngagement({ slug, title }: { slug: string; title: string }) {
  const saved = useSyncExternalStore(subscribe, () => {
    const savedRecipes = JSON.parse(localStorage.getItem("vegan-masala:saved-recipes") || "[]") as string[];
    return savedRecipes.includes(slug);
  }, () => false);

  function toggleSaved() {
    const current = new Set(JSON.parse(localStorage.getItem("vegan-masala:saved-recipes") || "[]") as string[]);
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    localStorage.setItem("vegan-masala:saved-recipes", JSON.stringify([...current]));
    window.dispatchEvent(new Event(storageEvent));
  }

  async function shareRecipe() {
    if (typeof navigator.share === "function") await navigator.share({ title, url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
  }

  return (
    <aside className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6" aria-label="Recipe tools">
      <h2 className="text-xl font-extrabold text-[var(--brand-gold)]">Keep this recipe handy</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">Save it on this device, share it, or tell us what was unclear after cooking.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={toggleSaved} aria-pressed={saved} className="rounded-xl bg-[var(--brand-red)] px-4 py-2 text-sm font-bold text-white">
          {saved ? "Saved" : "Save recipe"}
        </button>
        <button type="button" onClick={shareRecipe} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--brand-gold)]">
          Share
        </button>
        <a href={`/contact?recipe=${encodeURIComponent(slug)}`} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--brand-gold)]">
          Report a recipe issue
        </a>
      </div>
    </aside>
  );
}
