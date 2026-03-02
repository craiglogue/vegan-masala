import React from "react";

type Platform = "instagram" | "tiktok" | "youtube" | "pinterest" | "facebook";

type SocialLink = {
  platform: Platform;
  href: string;
  label: string;
};

function Icon({ platform }: { platform: Platform }) {
  const common = "h-5 w-5";
  switch (platform) {
    case "instagram":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5Z" />
          <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
          <path d="M17.5 6.3a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.5 3c.3 2.6 2.1 4.7 4.5 5.1v2.6c-1.8-.1-3.5-.8-4.7-2v7.2c0 3.4-2.8 6.1-6.2 6.1S4 19.2 4 15.8c0-3.4 2.8-6.1 6.2-6.1.4 0 .8 0 1.2.1v2.9c-.4-.2-.8-.3-1.2-.3-1.8 0-3.2 1.4-3.2 3.2 0 1.8 1.4 3.2 3.2 3.2 1.9 0 3.3-1.5 3.3-3.4V3h2.5Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10.2 15.3V8.7L15.9 12l-5.7 3.3Z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-3.5 19.4c-.1-.8-.2-2.1 0-3l1.6-6.7s-.4-.8-.4-2c0-1.9 1.1-3.3 2.5-3.3 1.2 0 1.7.9 1.7 1.9 0 1.2-.8 3-1.1 4.6-.3 1.3.6 2.3 1.9 2.3 2.2 0 3.9-2.3 3.9-5.6 0-2.9-2.1-4.9-5.1-4.9-3.5 0-5.5 2.6-5.5 5.3 0 1.1.4 2.2 1 2.8.1.1.1.2.1.4l-.4 1.5c-.1.4-.3.5-.6.3-1.7-.8-2.7-3.2-2.7-5.2C6.1 6.4 8.5 4 12.1 4c3 0 5.4 2.1 5.4 5 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.6-1.3l-.7 2.6c-.3 1-1 2.3-1.5 3.1A10 10 0 0 0 12 22 10 10 0 0 0 12 2Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6V11H7.2v3h2.6v8h3.7Z" />
        </svg>
      );
    default:
      return null;
  }
}

export function SocialLinks({
  links,
  variant = "icon",
}: {
  links: SocialLink[];
  variant?: "icon" | "button";
}) {
  const base =
    "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] text-[var(--brand-gold)] hover:bg-white/5 transition";
  const iconOnly = "px-3 py-2";
  const button = "px-4 py-3 font-semibold";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links.map((l) => (
        <a
          key={l.platform}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${variant === "icon" ? iconOnly : button}`}
          aria-label={l.label}
          title={l.label}
        >
          <Icon platform={l.platform} />
          {variant === "button" ? <span>{l.label}</span> : null}
        </a>
      ))}
    </div>
  );
}