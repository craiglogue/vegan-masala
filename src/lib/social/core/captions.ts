import fs from "node:fs";
import path from "node:path";
import type { ContentType } from "./content";

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

function recipeHooks(title: string) {
  const hooks = [
    `Comforting, flavour-packed, and far easier than it looks — ${title} is one of those dishes that always delivers.`,
    `If you want something rich, cosy, and seriously satisfying, ${title} is a brilliant one to make.`,
    `${title} is the kind of vegan Indian dish that tastes like it took hours, but is surprisingly approachable.`,
    `Big flavour, simple ingredients, and proper comfort food energy — that’s exactly why ${title} is worth making.`,
    `Craving something warm, hearty, and full of spice? ${title} hits the spot beautifully.`,
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}

function guideHooks(title: string) {
  const hooks = [
    `Want to feel more confident in the kitchen? ${title} makes vegan Indian cooking much easier to understand.`,
    `${title} is one of those small cooking lessons that can make a huge difference to flavour and confidence.`,
    `If vegan Indian cooking feels intimidating, ${title} is a great place to start.`,
    `${title} helps break things down in a simple, practical way so cooking feels less confusing.`,
    `Learning ${title} can make everyday cooking easier, tastier, and much more enjoyable.`,
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}

function recipeBenefits(title: string) {
  const options = [
    `Expect bold spices, comforting textures, and the kind of homemade flavour that makes you want seconds.`,
    `It is packed with warmth, depth, and proper home-cooked character.`,
    `This is the kind of dish that feels nourishing, filling, and full of real flavour.`,
    `You get a deeply satisfying meal with simple ingredients and a lot of reward for the effort.`,
    `It brings together rich flavour, cosy texture, and that unmistakable homemade feel.`,
  ];

  return options[Math.floor(Math.random() * options.length)];
}

function guideBenefits() {
  const options = [
    `It is designed to be clear, practical, and genuinely useful in real cooking.`,
    `The aim is to make things feel simple, approachable, and easy to use straight away.`,
    `It helps turn confusion into confidence with straightforward explanations.`,
    `You can use it to build confidence quickly without overcomplicating things.`,
    `It focuses on practical understanding, not jargon or guesswork.`,
  ];

  return options[Math.floor(Math.random() * options.length)];
}

function ctaByType(type: ContentType, title: string) {
  if (type === "recipe") {
    const options = [
      `Save this for your next cosy dinner and try the full recipe on Vegan Masala.`,
      `Bookmark this one for later — the full step-by-step recipe is on Vegan Masala.`,
      `If this looks like your kind of food, the full method is waiting on Vegan Masala.`,
      `Ready to make it yourself? The full recipe is on Vegan Masala.`,
      `Get the full step-by-step recipe now on Vegan Masala.`,
    ];

    return options[Math.floor(Math.random() * options.length)];
  }

  const options = [
    `Read the full guide now on Vegan Masala.`,
    `You can find the full beginner-friendly guide on Vegan Masala.`,
    `Explore the full guide now on Vegan Masala.`,
    `See the full walkthrough on Vegan Masala.`,
    `Read the full practical guide on Vegan Masala.`,
  ];

  return options[Math.floor(Math.random() * options.length)];
}

function emojiByType(type: ContentType) {
  if (type === "recipe") {
    const options = ["✨", "🔥", "🍛", "🥘", "🌿"];
    return options[Math.floor(Math.random() * options.length)];
  }

  const options = ["🌿", "✨", "📚", "🥄", "👩‍🍳"];
  return options[Math.floor(Math.random() * options.length)];
}

function recipeHashtags() {
  return [
    "#veganrecipes",
    "#indianfood",
    "#veganindian",
    "#plantbased",
    "#vegancooking",
    "#easyvegan",
    "#comfortfood",
    "#homecooking",
    "#veganuk",
  ].join("\n");
}

function guideHashtags() {
  return [
    "#cookingtips",
    "#cookingguide",
    "#veganbeginner",
    "#vegancooking",
    "#plantbased",
    "#veganuk",
    "#kitchentips",
    "#learncooking",
    "#veganlifestyle",
  ].join("\n");
}

function pinterestRecipeTitle(title: string) {
  const options = [
    `${title} Recipe`,
    `Easy ${title}`,
    `${title} - Vegan Indian Recipe`,
    `How To Make ${title}`,
    `${title} For A Cosy Dinner`,
  ];

  return options[Math.floor(Math.random() * options.length)];
}

function pinterestGuideTitle(title: string) {
  const options = [
    `${title} Guide`,
    `Beginner's Guide To ${title}`,
    `How To Use ${title}`,
    `${title} Explained Simply`,
    `${title} For Beginners`,
  ];

  return options[Math.floor(Math.random() * options.length)];
}

export function buildInstagramCaption(
  slug: string,
  type: ContentType
) {
  const title = titleFromSlug(slug);
  const emoji = emojiByType(type);
  const tags = hashtagify(slug);

  if (type === "recipe") {
    return `${emoji} ${recipeHooks(title)}

${recipeBenefits(title)}

${ctaByType(type, title)}

Read more:
https://vegan-masala.com

${tags}

${recipeHashtags()}
#veganmasala`;
  }

  return `${emoji} ${guideHooks(title)}

${guideBenefits()}

${ctaByType(type, title)}

Read more:
https://vegan-masala.com

${tags}

${guideHashtags()}
#veganmasala`;
}

export function buildFacebookCaption(
  slug: string,
  type: ContentType
) {
  const title = titleFromSlug(slug);

  if (type === "recipe") {
    return `${recipeHooks(title)}

${recipeBenefits(title)}

${ctaByType(type, title)}

Read more:
https://vegan-masala.com

${hashtagify(slug)}
#veganmasala #plantbased #indianfood`;
  }

  return `${guideHooks(title)}

${guideBenefits()}

${ctaByType(type, title)}

Read more:
https://vegan-masala.com

${hashtagify(slug)}
#veganmasala #cookingtips #plantbased`;
}

export function buildPinterestCaption(
  slug: string,
  type: ContentType
) {
  const title = titleFromSlug(slug);

  if (type === "recipe") {
    return `${pinterestRecipeTitle(title)}

A flavour-packed vegan Indian recipe that feels comforting, satisfying, and surprisingly achievable at home.

Perfect if you want:
• bold flavour
• cosy comfort food
• simple ingredients
• a beautiful homemade result

Get the full recipe:
https://vegan-masala.com

#veganrecipes
#indianrecipes
#plantbased
#easyrecipes
#vegancooking
#veganfood
#comfortfood`;
  }

  return `${pinterestGuideTitle(title)}

A simple, beginner-friendly Vegan Masala guide to help you cook with more confidence and understanding.

Perfect for:
• beginners
• better flavour
• practical cooking knowledge
• everyday vegan cooking

Read the full guide:
https://vegan-masala.com

#cookingtips
#cookingguide
#vegancooking
#plantbased
#veganbeginner
#kitchentips
#veganfood`;
}

export function saveCaption(
  platform: "instagram" | "pinterest" | "facebook",
  slug: string,
  text: string
) {
  const dir = path.join(CAPTION_DIR, platform);

  ensure(dir);

  fs.writeFileSync(
    path.join(dir, `${slug}.txt`),
    text
  );
}