import fs from "node:fs";
import path from "node:path";
import type { ContentType } from "./content";

import { getRecipeBySlug } from "@/lib/recipes";
import { getGuideBySlug } from "@/lib/guides";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const CAPTION_DIR = path.join(ROOT, "generated", "captions");

function ensure(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function hashtagify(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => `#${w}`)
    .join(" ");
}

function cleanSocialText(text?: string) {
  return String(text || "")
    .replace(/\bpacked with flavour\b/gi, "")
    .replace(/\bperfect weeknight meal\b/gi, "")
    .replace(/\brestaurant-quality\b/gi, "")
    .replace(/\bcomes together beautifully\b/gi, "")
    .replace(/\bwritten in the style of\b/gi, "")
    .replace(/\bflavour-packed\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(text?: string) {
  const cleaned = cleanSocialText(text);
  if (!cleaned) return "";
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function shorten(text: string, max = 180) {
  const cleaned = cleanSocialText(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trimEnd()}…`;
}

function getEditorialContent(slug: string, type: ContentType) {
  if (type === "recipe") {
    const recipe: any = getRecipeBySlug(slug);

    if (recipe) {
      return {
        title: recipe.title || titleFromSlug(slug),
        description: recipe.description || "",
        introNote: recipe.introNote || "",
        servingSuggestion: recipe.servingSuggestion || "",
        socialHook: recipe.socialHook || "",
      };
    }
  }

  const guide: any = getGuideBySlug(slug);

  if (guide) {
    return {
      title: guide.title || titleFromSlug(slug),
      description: guide.description || "",
      introNote: "",
      servingSuggestion: "",
      socialHook: "",
    };
  }

  return {
    title: titleFromSlug(slug),
    description: "",
    introNote: "",
    servingSuggestion: "",
    socialHook: "",
  };
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
}

function emojiByType(type: ContentType, slug: string) {
  if (type === "recipe") {
    return pickFromSeed(slug, ["🍛", "🌿", "🥘", "✨", "🔥"]);
  }

  return pickFromSeed(slug, ["🌿", "📚", "✨", "🥄", "👩‍🍳"]);
}

function recipeHook(slug: string, content: ReturnType<typeof getEditorialContent>) {
  if (content.socialHook) return sentence(shorten(content.socialHook, 150));
  if (content.introNote) return sentence(shorten(content.introNote, 150));
  if (content.description) return sentence(shorten(content.description, 150));

  return sentence(
    pickFromSeed(slug, [
      "Vegan Indian cooking with depth, warmth and real flavour",
      "The kind of dish that earns a regular place at the table",
      "Proper masala, steady seasoning and a dish worth making well",
      "Family-style vegan Indian food, served hot and simply",
    ])
  );
}

function recipeMiddle(slug: string, content: ReturnType<typeof getEditorialContent>) {
  if (content.servingSuggestion) return sentence(shorten(content.servingSuggestion, 150));

  return sentence(
    pickFromSeed(slug, [
      "Best served hot with rice, roti or naan and something sharp on the side",
      "A good dish to bring to the table while the masala is still fragrant",
      "The flavour lands best when the base is cooked properly and the seasoning is balanced at the end",
      "Simple, generous cooking that feels at home at the centre of the table",
    ])
  );
}

function guideHook(slug: string, content: ReturnType<typeof getEditorialContent>) {
  if (content.description) return sentence(shorten(content.description, 150));

  return sentence(
    pickFromSeed(slug, [
      "A practical guide for better everyday cooking",
      "Clear help for building confidence in the kitchen",
      "Useful guidance for home cooks who want better flavour and technique",
      "A simpler way to understand an essential part of Indian cooking",
    ])
  );
}

function guideMiddle(slug: string) {
  return sentence(
    pickFromSeed(slug, [
      "Clear, useful cooking guidance is often what makes everyday meals easier and more consistent",
      "The aim here is practical understanding you can actually use in the kitchen",
      "A little clarity in the right place can make home cooking feel far more natural",
      "Straightforward kitchen knowledge makes a big difference over time",
    ])
  );
}

function ctaByType(type: ContentType, slug: string) {
  if (type === "recipe") {
    return pickFromSeed(slug, [
      "Find the full recipe on Vegan Masala.",
      "Get the full method on Vegan Masala.",
      "Read the full recipe on Vegan Masala.",
      "See the full step-by-step recipe on Vegan Masala.",
    ]);
  }

  return pickFromSeed(slug, [
    "Read the full guide on Vegan Masala.",
    "See the full guide on Vegan Masala.",
    "Explore the full guide on Vegan Masala.",
    "Read more on Vegan Masala.",
  ]);
}

function recipeHashtags() {
  return [
    "#veganrecipes",
    "#veganindian",
    "#indianfood",
    "#plantbased",
    "#vegancooking",
    "#homecooking",
    "#comfortfood",
    "#veganuk",
    "#veganmasala",
  ].join("\n");
}

function guideHashtags() {
  return [
    "#cookingtips",
    "#cookingguide",
    "#vegancooking",
    "#plantbased",
    "#homecooking",
    "#veganuk",
    "#kitchentips",
    "#learncooking",
    "#veganmasala",
  ].join("\n");
}

function pinterestRecipeTitle(title: string, slug: string) {
  return pickFromSeed(slug, [
    `${title} Recipe`,
    `How To Make ${title}`,
    `${title} - Vegan Indian Recipe`,
    `${title} For A Family-Style Meal`,
    `Save This ${title} Recipe`,
  ]);
}

function pinterestGuideTitle(title: string, slug: string) {
  return pickFromSeed(slug, [
    `${title} Guide`,
    `${title} Explained Simply`,
    `How To Use ${title}`,
    `Beginner's Guide To ${title}`,
    `${title} For Home Cooks`,
  ]);
}

export function buildInstagramCaption(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const title = content.title || titleFromSlug(slug);
  const emoji = emojiByType(type, slug);
  const tags = hashtagify(slug);

  if (type === "recipe") {
    return `${emoji} ${recipeHook(slug, content)}

${recipeMiddle(slug, content)}

${ctaByType(type, slug)}

Read more:
https://vegan-masala.com

${tags}

${recipeHashtags()}`;
  }

  return `${emoji} ${guideHook(slug, content)}

${guideMiddle(slug)}

${ctaByType(type, slug)}

Read more:
https://vegan-masala.com

${tags}

${guideHashtags()}`;
}

export function buildFacebookCaption(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const title = content.title || titleFromSlug(slug);

  if (type === "recipe") {
    return `${recipeHook(slug, content)}

${recipeMiddle(slug, content)}

${ctaByType(type, slug)}

Read more:
https://vegan-masala.com

${hashtagify(slug)}
#veganmasala #plantbased #indianfood`;
  }

  return `${guideHook(slug, content)}

${guideMiddle(slug)}

${ctaByType(type, slug)}

Read more:
https://vegan-masala.com

${hashtagify(slug)}
#veganmasala #cookingtips #plantbased`;
}

export function buildPinterestCaption(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const title = content.title || titleFromSlug(slug);

  if (type === "recipe") {
    return `${pinterestRecipeTitle(title, slug)}

${recipeHook(slug, content)}

Good for:
• family-style cooking
• balanced, flavour-led meals
• vegan Indian food with real character
• serving hot with rice, roti or naan

Get the full recipe:
https://vegan-masala.com

#veganrecipes
#veganindian
#indianfood
#plantbased
#vegancooking
#comfortfood
#veganmasala`;
  }

  return `${pinterestGuideTitle(title, slug)}

${guideHook(slug, content)}

Useful for:
• everyday home cooks
• better flavour and technique
• clearer kitchen confidence
• practical vegan cooking help

Read the full guide:
https://vegan-masala.com

#cookingtips
#cookingguide
#vegancooking
#plantbased
#kitchentips
#learncooking
#veganmasala`;
}

export function saveCaption(
  platform: "instagram" | "pinterest" | "facebook",
  slug: string,
  text: string
) {
  const dir = path.join(CAPTION_DIR, platform);

  ensure(dir);

  fs.writeFileSync(path.join(dir, `${slug}.txt`), text);
}