import Link from "next/link";

const BRAND_GREEN = "#2FA36B";
const EARTH_INK = "#2B2A28"; // dark earthy ink for the outline

export default function BrandLogo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const scale =
    size === "sm" ? "w-[170px]" : size === "lg" ? "w-[280px]" : "w-[220px]";

  return (
    <Link href="/" className="inline-flex items-center gap-3">
      {/* Emblem */}
      <svg
        className={`${scale} h-auto`}
        viewBox="0 0 320 220"
        role="img"
        aria-label="Vegan Masala logo"
      >
        {/* Taj-inspired frame */}
        <path
          d="M38 198
             Q160 210 282 198
             Q295 197 295 184
             Q295 169 286 162
             Q266 145 257 125
             Q249 108 246 88
             Q244 71 233 60
             Q222 49 206 49
             Q190 49 178 60
             Q170 68 160 68
             Q150 68 142 60
             Q130 49 114 49
             Q98 49 87 60
             Q76 71 74 88
             Q71 108 63 125
             Q54 145 34 162
             Q25 169 25 184
             Q25 197 38 198 Z"
          fill="none"
          stroke={EARTH_INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Small finial */}
        <path
          d="M160 34 L160 16"
          stroke={EARTH_INK}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="160" cy="12" r="6" fill="none" stroke={EARTH_INK} strokeWidth="4" />

        {/* Spice illustration (no bowl): star anise + cardamom + cinnamon sticks */}
        <g transform="translate(0,0)" stroke={EARTH_INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Star anise (simple 8-point star) */}
          <path d="M160 98 L170 120 L194 124 L176 138 L182 162 L160 150 L138 162 L144 138 L126 124 L150 120 Z" />

          {/* Cardamom pods (left) */}
          <path d="M112 128 C98 112, 98 92, 114 80 C130 68, 148 78, 150 96 C152 118, 130 140, 112 128 Z" />
          <path d="M116 84 C122 98, 122 112, 114 124" />

          {/* Cardamom pods (right) */}
          <path d="M208 128 C222 112, 222 92, 206 80 C190 68, 172 78, 170 96 C168 118, 190 140, 208 128 Z" />
          <path d="M204 84 C198 98, 198 112, 206 124" />

          {/* Cinnamon sticks (bottom) */}
          <path d="M134 168 C150 180, 170 180, 186 168" />
          <path d="M140 172 C152 180, 168 180, 180 172" />
          <path d="M146 176 C154 181, 166 181, 174 176" />
        </g>

        {/* Wordmark (REAL font via CSS @font-face) */}
        <text
          x="160"
          y="212"
          textAnchor="middle"
          fill={BRAND_GREEN}
          style={{
            fontFamily: "Shivaraja, serif",
            fontSize: 44,
            letterSpacing: 0.5,
          }}
        >
          Vegan Masala
        </text>
      </svg>
    </Link>
  );
}