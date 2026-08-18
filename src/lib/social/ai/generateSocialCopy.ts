import OpenAI from "openai";
import { getRecipeBySlug } from "@/lib/recipes";
import { getGuideBySlug } from "@/lib/guides";

type ContentType = "recipe" | "guide";

type SocialCopyResult = {
  instagramCaptionVariants: string[];
  facebookCaptionVariants: string[];
  pinterestCaptionVariants: string[];
  instagramImageHook: string;
  instagramImageSubtitle: string;
  pinterestImageHook: string;
  pinterestImageSubtitle: string;
  videoHook: string;
  videoMainLine: string;
  videoOutroLine: string;
};

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || "").trim()).filter(Boolean);
}

function safeString(value: unknown): string {
  return String(value || "").trim();
}

function extractJson(text: string): SocialCopyResult {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI returned no JSON");
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1));

  return {
    instagramCaptionVariants: cleanArray(parsed.instagramCaptionVariants).slice(0, 3),
    facebookCaptionVariants: cleanArray(parsed.facebookCaptionVariants).slice(0, 2),
    pinterestCaptionVariants: cleanArray(parsed.pinterestCaptionVariants).slice(0, 2),
    instagramImageHook: safeString(parsed.instagramImageHook),
    instagramImageSubtitle: safeString(parsed.instagramImageSubtitle),
    pinterestImageHook: safeString(parsed.pinterestImageHook),
    pinterestImageSubtitle: safeString(parsed.pinterestImageSubtitle),
    videoHook: safeString(parsed.videoHook),
    videoMainLine: safeString(parsed.videoMainLine),
    videoOutroLine: safeString(parsed.videoOutroLine),
  };
}

export async function generateSocialCopyForSlug(
  slug: string,
  type: ContentType
): Promise<SocialCopyResult | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return null;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const source =
    type === "recipe" ? getRecipeBySlug(slug) : getGuideBySlug(slug);

  if (!source) {
    return null;
  }

  const payload =
    type === "recipe"
      ? {
          type,
          slug,
          title: source.title,
          description: source.description || "",
          introNote: (source as any).introNote || "",
          servingSuggestion: (source as any).servingSuggestion || "",
          socialHook: (source as any).socialHook || "",
          ingredients: (source as any).ingredients || [],
          instructions: (source as any).instructions || [],
          notes: (source as any).notes || [],
          ingredientsMarkdown: (source as any).ingredientsMarkdown || "",
          methodMarkdown: (source as any).methodMarkdown || "",
          notesMarkdown: (source as any).notesMarkdown || "",
          tags: (source as any).tags || [],
        }
      : {
          type,
          slug,
          title: source.title,
          description: source.description || "",
        };

  const response = await client.responses.create({
    model: "gpt-5.4",
    input: [
      {
        role: "system",
        content: `
You are a professional Indian chef and food writer creating social media copy for a premium vegan Indian cooking brand.

Write copy that is:
- specific to the exact dish
- grounded in ingredients, method, texture, and serving style
- natural and confident
- never generic or repetitive
- never full of empty adjectives
- never obviously AI-written

Use the recipe data heavily.
If the dish uses aubergine, potato, lentils, chickpeas, pastry, rice, tofu, or tempering, reflect that directly.
If the dish is baked, roasted, simmered, fried, or finished with a tadka, reflect that directly.

Return STRICT JSON only.
No markdown.
No explanation.

JSON shape:
{
  "instagramCaptionVariants": ["...", "...", "..."],
  "facebookCaptionVariants": ["...", "..."],
  "pinterestCaptionVariants": ["...", "..."],
  "instagramImageHook": "...",
  "instagramImageSubtitle": "...",
  "pinterestImageHook": "...",
  "pinterestImageSubtitle": "...",
  "videoHook": "...",
  "videoMainLine": "...",
  "videoOutroLine": "..."
}

Rules:
- Instagram variants: Warm, Practical, Punchy
- Facebook variants: Warm, Practical
- Pinterest variants: Search-friendly, Inviting
- Every Instagram caption variant must end with 8 to 12 relevant hashtags, each on its own line
- Every Facebook caption variant must end with 3 to 5 relevant hashtags
- Every Pinterest caption variant must end with 5 to 8 relevant hashtags
- Always include brand-safe core tags where relevant, such as #veganrecipes #veganindian #indianfood #plantbased #veganmasala
- Add dish-specific hashtags when relevant, such as ingredient, dish name, or style of cooking
- instagramImageHook: 1 sentence, premium, elegant, concise
- instagramImageSubtitle: 1 sentence, service/texture/cooking payoff
- pinterestImageHook: 1 sentence, more descriptive, more ingredient-led, more explicit
- pinterestImageSubtitle: 1 sentence, mention serving style, texture, or what the dish contains
- videoHook: 1 short striking reel opening line, fast and scroll-stopping
- videoMainLine: 1 short line for the main food section, vivid and dish-specific
- videoOutroLine: 1 short CTA line for reels, such as save this recipe, cook this tonight, full recipe on Vegan Masala
- Keep image and video text readable on the graphic
- For video text, prefer shorter, punchier lines than for static posts
        `.trim(),
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

  const text = response.output_text || "";
  return extractJson(text);
}
