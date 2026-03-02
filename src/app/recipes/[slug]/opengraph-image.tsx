// src/app/recipes/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getRecipeBySlug } from "@/lib/recipes";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const recipe = getRecipeBySlug(params.slug);

  const title = recipe?.title ?? "Vegan Masala Recipe";
  const subtitle = recipe?.cuisine ? `${recipe.cuisine} • Vegan Masala` : "Vegan Masala";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #07070a 0%, #0c0c12 50%, #07070a 100%)",
          color: "#F5D77C",
          position: "relative",
        }}
      >
        {/* subtle pattern-ish orbs */}
        <div
          style={{
            position: "absolute",
            right: "-120px",
            top: "-120px",
            width: "420px",
            height: "420px",
            borderRadius: "999px",
            background: "rgba(255, 215, 124, 0.10)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-140px",
            bottom: "-140px",
            width: "460px",
            height: "460px",
            borderRadius: "999px",
            background: "rgba(255, 0, 64, 0.08)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 26, color: "rgba(245,215,124,0.85)", fontWeight: 700 }}>
            {subtitle}
          </div>

          <div style={{ fontSize: 74, lineHeight: 1.05, fontWeight: 900, color: "#F5D77C" }}>
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "rgba(240,240,240,0.85)",
            fontWeight: 700,
          }}
        >
          <div>vegan-masala.com</div>
          <div style={{ color: "#ff2d55" }}>100% vegan</div>
        </div>
      </div>
    ),
    size
  );
}