import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import opentype from "opentype.js";

import { getRecipeBySlug } from "../../recipes";
import { getGuideBySlug } from "../../guides";
import { detectContentTypeBySlug, titleFromSlug } from "../core/content";
import { cleanPromoText, fitWrappedTextBlock, wrapWords } from "../core/text";
import {
  findBrandBackground,
  findBrandLogo,
  findContentImage,
  findFontPath,
} from "../core/assets";
import { saveGeneratedInstagramImage } from "../core/generatedAssets";
import { updateManifest } from "../core/manifest";
import { buildInstagramCaption, saveCaption } from "../core/captions";
import { getSocialCopyForSlug } from "../core/socialCopy";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const OUTPUT = path.join(ROOT, "generated", "instagram");
const PUBLIC_OUTPUT = process.env.VERCEL
  ? null
  : path.join(process.cwd(), "public", "generated", "instagram");

const WIDTH = 1080;
const HEIGHT = 1080;

const BRAND = {
  bg: "#081318",
  red: "#a33f3a",
  gold: "#c8a646",
  border: "#c8a646",
  soft: "rgba(255,255,255,0.95)",
};

function getBaseUrl() {
  return (
    process.env.SOCIAL_ASSET_BASE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function fetchBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function resolveSourceImage(
  slug: string,
  type: "recipe" | "guide"
): Promise<string | Buffer | null> {
  const local = findContentImage(slug, type);
  if (local) return local;

  const baseUrl = getBaseUrl();
  const exts = ["png", "jpg", "jpeg", "webp"];

  const candidateBases =
    type === "recipe"
      ? [
          `${baseUrl}/recipes/${slug}`,
          `${baseUrl}/images/recipes/${slug}`,
          `${baseUrl}/public/recipes/${slug}`,
        ]
      : [
          `${baseUrl}/guides/${slug}`,
          `${baseUrl}/images/guides/${slug}`,
          `${baseUrl}/public/guides/${slug}`,
        ];

  for (const base of candidateBases) {
    for (const ext of exts) {
      const buffer = await fetchBuffer(`${base}.${ext}`);
      if (buffer) return buffer;
    }
  }

  return null;
}

async function resolveBrandBackgroundBuffer(): Promise<Buffer | null> {
  const local = findBrandBackground();
  if (local) {
    try {
      return await sharp(local).png().toBuffer();
    } catch {}
  }

  const baseUrl = getBaseUrl();
  const candidates = [
    `${baseUrl}/images/page-background.jpg`,
    `${baseUrl}/images/page-background.png`,
    `${baseUrl}/page-background.jpg`,
    `${baseUrl}/page-background.png`,
    `${baseUrl}/brand/page-background.jpg`,
    `${baseUrl}/brand/page-background.png`,
  ];

  for (const url of candidates) {
    const buffer = await fetchBuffer(url);
    if (buffer) return buffer;
  }

  return null;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFontOrThrow() {
  const fontPath = findFontPath();
  if (!fontPath) throw new Error("Rajdhani font not found");
  return opentype.loadSync(fontPath);
}

function getEditorialContent(slug: string, type: "recipe" | "guide") {
  if (type === "recipe") {
    const recipe: any = getRecipeBySlug(slug);
    if (recipe) {
      return {
        title: recipe.title || titleFromSlug(slug),
        description: recipe.description || "",
        socialHook: recipe.socialHook || "",
        introNote: recipe.introNote || "",
        servingSuggestion: recipe.servingSuggestion || "",
      };
    }
  }

  const guide: any = getGuideBySlug(slug);
  if (guide) {
    return {
      title: guide.title || titleFromSlug(slug),
      description: guide.description || "",
      socialHook: "",
      introNote: "",
      servingSuggestion: "",
    };
  }

  return {
    title: titleFromSlug(slug),
    description: "",
    socialHook: "",
    introNote: "",
    servingSuggestion: "",
  };
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
}

function trimNatural(text?: string, max = 120) {
  const cleaned = cleanPromoText(text || "");
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const sliced = cleaned.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 40 ? lastSpace : max).trim()}…`;
}



function shortNatural(text?: string, max = 90) {
  const cleaned = cleanPromoText(text || "");
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return "";
}









function imageRecipeSignals(slug: string, editorial: ReturnType<typeof getEditorialContent>) {
  const recipe = getRecipeBySlug(slug);

  const ingredientsText = [
    ...(recipe?.ingredients || []),
    recipe?.ingredientsMarkdown || "",
  ].join(" ").toLowerCase();

  const methodText = [
    ...(recipe?.instructions || []),
    recipe?.methodMarkdown || "",
    ...(recipe?.notes || []),
    recipe?.notesMarkdown || "",
    recipe?.servingSuggestion || "",
  ].join(" ").toLowerCase();

  const titleText = [
    slug,
    editorial.title || "",
    editorial.description || "",
    editorial.introNote || "",
    editorial.servingSuggestion || "",
  ].join(" ").toLowerCase();

  const full = `${titleText} ${ingredientsText} ${methodText}`;
  const has = (terms: string[]) => terms.some((t) => full.includes(t));

  return {
    full,
    hasPotato: has(["potato", "potatoes", "aloo"]),
    hasAubergine: has(["aubergine", "eggplant", "eggplants", "baingan"]),
    hasChickpea: has(["chickpea", "chickpeas", "chana", "chole"]),
    hasLentil: has(["lentil", "lentils", "dal", "dahl", "masoor", "moong", "urad"]),
    hasRice: has(["rice", "basmati", "biryani"]),
    hasTofu: has(["tofu"]),
    hasCauliflower: has(["cauliflower", "gobi"]),
    hasPastry: has(["pastry", "pie", "puff pastry", "filo"]),
    isBaked: has(["bake", "baked", "oven"]),
    isRoasted: has(["roast", "roasted"]),
    isFried: has(["fry", "fried"]),
    isSimmered: has(["simmer", "simmered"]),
    isTempered: has(["temper", "tadka"]),
    servesWithNaan: has(["naan"]),
    servesWithRoti: has(["roti", "chapati"]),
    servesWithRice: has(["rice", "basmati"]),
    servesWithYoghurt: has(["yoghurt", "yogurt"]),
    servesWithChutney: has(["chutney"]),
    servesWithPickle: has(["pickle"]),
  };
}

function imageRecipeProfile(
  slug: string,
  editorial: ReturnType<typeof getEditorialContent>
): "pastry" | "potato-aubergine" | "potato" | "chickpea" | "dal" | "rice" | "tofu" | "cauliflower" | "general" {
  const sig = imageRecipeSignals(slug, editorial);

  if (sig.hasPastry) return "pastry";
  if (sig.hasPotato && sig.hasAubergine) return "potato-aubergine";
  if (sig.hasPotato) return "potato";
  if (sig.hasChickpea) return "chickpea";
  if (sig.hasLentil) return "dal";
  if (sig.hasRice) return "rice";
  if (sig.hasTofu) return "tofu";
  if (sig.hasCauliflower) return "cauliflower";
  return "general";
}

function pickImageTextFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
}

function buildHook(
  slug: string,
  type: "recipe" | "guide",
  editorial: ReturnType<typeof getEditorialContent>
) {
  if (type === "guide") {
    return pickImageTextFromSeed(slug, [
      "Practical kitchen guidance written to make everyday cooking feel clearer, steadier, and easier to repeat well",
      "Useful cooking guidance for home cooks who want better judgement, better flavour, and more confidence at the stove",
      "A straightforward guide that helps the essentials feel less vague and much easier to put into practice",
      "The kind of kitchen guidance that makes a visible difference once you start using it in real cooking",
    ]);
  }

  const profile = imageRecipeProfile(slug, editorial);
  const sig = imageRecipeSignals(slug, editorial);

  if (profile === "pastry") {
    return pickImageTextFromSeed(slug, [
      "A crisp-topped bake with a properly spiced filling, where the contrast between the top and the centre is doing the real work",
      "The kind of savoury pie that feels worth making properly, with a filling that stays rich and a top that should stay golden and crisp",
      "A baked dish that depends on a well-seasoned filling underneath and enough colour on top to make the whole thing feel finished",
      "Built like a proper savoury bake, with a filling that should taste full and settled before it ever goes under the pastry",
    ]);
  }

  if (profile === "potato-aubergine") {
    return pickImageTextFromSeed(slug, [
      "Potatoes and aubergine work best here once the masala has had time to settle properly and coat both vegetables evenly",
      "Built around soft aubergine, tender potatoes, and a masala base that needs to be cooked properly to hold the whole pan together",
      "Aubergine and potato make a far better curry once the onions, spices, and tomatoes have been cooked long enough to carry them both",
      "The kind of vegetable curry that depends on getting the base right first, so the potatoes hold shape and the aubergine softens into the masala",
    ]);
  }

  if (profile === "potato") {
    if (sig.isBaked) {
      return pickImageTextFromSeed(slug, [
        "A potato dish that depends on proper seasoning, enough heat, and letting the edges catch a little colour before it is ready",
        "Built around potatoes, warmth, and enough time in the oven for the whole thing to taste settled rather than rushed",
        "The kind of potato-led dish that only works properly once the seasoning is right and the texture has had time to develop",
        "Potatoes do a lot of the work here, but only once they have taken on enough spice and enough colour to feel complete",
      ]);
    }

    return pickImageTextFromSeed(slug, [
      "A potato curry that depends on a properly cooked masala, soft edges on the potatoes, and enough patience for the sauce to settle",
      "Soft potatoes and a well-cooked masala base do most of the heavy lifting here, especially once the onions and spices have had enough time",
      "Built around tender potatoes, warm spice, and a sauce that should feel rich enough to cling rather than run thin",
      "The potatoes carry the masala properly when the base is cooked long enough to taste rounded, savoury, and complete",
    ]);
  }

  if (profile === "chickpea") {
    return pickImageTextFromSeed(slug, [
      "A chickpea dish with a rich masala base, enough depth to keep it interesting, and the kind of texture that improves as it sits",
      "Built on chickpeas, onions, tomatoes, and a spice base that needs to be cooked properly before the whole thing comes together",
      "The sort of chickpea curry that feels much better once the chickpeas have had time to absorb the masala rather than sit on top of it",
      "A steady, satisfying pan of food that earns its place by being simple, balanced, and properly cooked rather than overworked",
    ]);
  }

  if (profile === "dal") {
    if (sig.isTempered) {
      return pickImageTextFromSeed(slug, [
        "A lentil dish that comes alive when the tempering hits the top, adding warmth, aroma, and a proper finish to the bowl",
        "Soft lentils underneath, a proper finishing layer on top, and enough warmth in the tempering to give the whole bowl some shape",
        "The kind of dal that depends as much on the final tempering as the simmer, because that is where the character really lands",
        "Built on lentils, patience, and a proper finish at the end, rather than trying to force all the flavour in too early",
      ]);
    }

    return pickImageTextFromSeed(slug, [
      "Soft lentils and a good spice base make this the kind of meal you come back to, especially when the texture is full and properly settled",
      "A dal that depends on patience, balance, and letting the lentils break down just enough to feel generous without turning flat",
      "Simple lentils, properly cooked, with enough depth in the base to carry the bowl without needing to overcomplicate it",
      "The kind of dal that feels complete once the lentils are soft, the seasoning is right, and the whole pot has had time to come together",
    ]);
  }

  if (profile === "rice") {
    return pickImageTextFromSeed(slug, [
      "A rice dish that rewards careful seasoning, proper heat control, and enough time for everything in the pan to settle into each other",
      "Built to make the most of good rice, warm spices, and whatever else is going into the pan, without losing balance along the way",
      "The sort of dish that brings everything together in one pan, but still depends on judgement if you want the rice to stay right",
      "A good way to turn familiar ingredients into a proper meal, especially when the rice is cooked with enough care to stay distinct",
    ]);
  }

  if (profile === "tofu") {
    return pickImageTextFromSeed(slug, [
      "Tofu works best here once the sauce has enough depth to carry it properly, rather than leaving it to do the work on its own",
      "A tofu curry built on a proper masala base, where the sauce matters just as much as the protein sitting inside it",
      "The kind of dinner that keeps things simple without feeling flat, provided the base is cooked long enough to give the tofu some weight",
      "Built around tofu, spice, and a sauce that needs a little patience before the whole dish feels convincing",
    ]);
  }

  if (profile === "cauliflower") {
    return pickImageTextFromSeed(slug, [
      "A cauliflower dish that depends on keeping the vegetables tender, not overworked, while the masala carries the rest of the flavour",
      "Built on simple vegetables, warm spice, and a masala that does the heavy lifting without drowning the cauliflower itself",
      "The kind of curry that proves simple ingredients can still carry the table, so long as the balance stays right from start to finish",
      "A steady vegetable dish with enough warmth, texture, and seasoning to feel complete without trying to be more than it is",
    ]);
  }

  return pickImageTextFromSeed(slug, [
    "A good masala base makes all the difference here, especially once the onions, spices, and tomatoes have had time to settle properly",
    "The kind of dinner that earns a regular place in the rotation by being properly cooked, balanced, and generous at the table",
    "Simple ingredients, cooked properly and served hot, with enough depth in the base to make the whole dish feel worth repeating",
    "A steady, satisfying dish that works because the cooking is patient enough to let the flavour build rather than forcing it",
  ]);
}

function buildSubtitle(
  slug: string,
  type: "recipe" | "guide",
  editorial: ReturnType<typeof getEditorialContent>,
  hook: string
) {
  if (type === "guide") {
    return pickImageTextFromSeed(slug, [
      "Useful, practical guidance for the home kitchen",
      "Written to make everyday cooking feel easier to judge",
      "Clear enough to use, simple enough to return to",
      "The sort of guidance that becomes more useful the more you cook",
    ]);
  }

  const profile = imageRecipeProfile(slug, editorial);

  if (profile === "pastry") {
    return pickImageTextFromSeed(slug, [
      "Best once the top is crisp, the filling has settled, and the slices hold properly when served",
      "Serve it warm with chutney, salad, or something sharp enough to cut through the richness",
      "The contrast between the crisp top and the soft filling is what makes the whole thing land properly",
      "A good one for sharing, serving warm, and coming back to later without it feeling like an afterthought",
    ]);
  }

  if (profile === "potato-aubergine") {
    return pickImageTextFromSeed(slug, [
      "Best served hot with roti and something cool or sharp on the side",
      "The aubergine should soften into the masala while the potatoes keep just enough shape to give the pan some structure",
      "A very good weeknight option once the vegetables have had time to absorb the base properly",
      "Good at the table straight away and often better once the flavours have had a little more time to settle",
    ]);
  }

  if (profile === "potato") {
    return pickImageTextFromSeed(slug, [
      "Best served hot with naan, rice, or something cool and sharp on the side",
      "The potatoes should feel soft and settled, carrying the sauce rather than sitting apart from it",
      "A good one for evenings when you want something rich without making the whole meal complicated",
      "It holds up well if you make enough for tomorrow and warm it through gently",
    ]);
  }

  if (profile === "chickpea") {
    return pickImageTextFromSeed(slug, [
      "Good with rice, roti, and a spoonful of chutney or yoghurt on the side",
      "Once the chickpeas have had time in the sauce, the whole dish feels rounder, fuller, and much more settled",
      "A very good weeknight dinner and an even better lunch the next day",
      "This is the kind of curry that reheats well and rarely feels like a compromise",
    ]);
  }

  if (profile === "dal") {
    return pickImageTextFromSeed(slug, [
      "Good with rice, flatbread, or just a spoon and a quiet evening",
      "The lentils should feel soft and full, with the spice sitting underneath rather than shouting over the bowl",
      "Easy to batch cook, easy to reheat, and worth keeping in the regular rotation",
      "A dependable one for busy weeks when you still want the food to feel properly cooked",
    ]);
  }

  if (profile === "rice") {
    return pickImageTextFromSeed(slug, [
      "Best served hot, with yoghurt, pickle, or whatever gives it a sharper edge",
      "It works best when the rice is settled, the seasoning is balanced, and everything in the pan feels like it belongs there",
      "A good way to turn what you already have into a proper meal rather than a stopgap",
      "Useful for end-of-week cooking when you want something complete rather than patched together",
    ]);
  }

  if (profile === "tofu") {
    return pickImageTextFromSeed(slug, [
      "Good with rice, flatbread, and whatever greens or herbs you have to hand",
      "The sauce needs enough depth to carry the tofu properly, otherwise the whole thing stays flatter than it should",
      "A useful one for weeknights when you want something steady and filling",
      "It is also a good way to use up greens, herbs, or extras without the meal feeling improvised",
    ]);
  }

  if (profile === "cauliflower") {
    return pickImageTextFromSeed(slug, [
      "Best served hot with roti and something cool or sharp on the side",
      "It works best when the vegetables stay tender and the masala stays balanced all the way through",
      "A good reminder that a simple vegetable curry can still feel like a proper dinner",
      "Especially useful when you want something steady without opening half the fridge",
    ]);
  }

  return pickImageTextFromSeed(slug, [
    "Best served hot with rice, roti, or naan and something sharp on the side",
    "Good for weeknights and even better if you make enough for tomorrow",
    "Best when the base is cooked properly and the seasoning is balanced at the end",
    "Easy to bring to the table with rice or flatbread and not much else",
  ]);
}

function makeTextPathSvg(
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  x: number,
  baselineY: number,
  letterSpacing = 0,
  align: "left" | "center" = "center"
) {
  if (!text.trim()) return "";

  let cursorX = 0;
  const glyphs = font.stringToGlyphs(text);
  const unitsPerEm = font.unitsPerEm || 1000;
  const scale = fontSize / unitsPerEm;

  const parts: string[] = [];
  let minX = Infinity;
  let maxX = -Infinity;

  for (const glyph of glyphs) {
    const pathObj = glyph.getPath(cursorX, baselineY, fontSize);
    const bbox = pathObj.getBoundingBox();

    if (Number.isFinite(bbox.x1) && Number.isFinite(bbox.x2)) {
      minX = Math.min(minX, bbox.x1);
      maxX = Math.max(maxX, bbox.x2);
    }

    parts.push(pathObj.toPathData(2));
    cursorX += (glyph.advanceWidth || unitsPerEm * 0.5) * scale + letterSpacing;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return "";

  let translateX = x;
  if (align === "center") {
    const width = maxX - minX;
    translateX = x - (minX + width / 2);
  } else {
    translateX = x - minX;
  }

  return `<g transform="translate(${translateX},0)"><path d="${parts.join(" ")}" fill="${fill}" /></g>`;
}

function makeShadowedTextPathSvg(
  text: string,
  font: opentype.Font,
  fontSize: number,
  fill: string,
  x: number,
  baselineY: number,
  letterSpacing = 0,
  shadowOpacity = 0.18,
  shadowOffsetY = 2,
  align: "left" | "center" = "center"
) {
  const shadow = makeTextPathSvg(
    text,
    font,
    fontSize,
    `rgba(0,0,0,${shadowOpacity})`,
    x,
    baselineY + shadowOffsetY,
    letterSpacing,
    align
  );

  const main = makeTextPathSvg(text, font, fontSize, fill, x, baselineY, letterSpacing, align);
  return `${shadow}${main}`;
}

async function backgroundLayer() {
  const bgPath = findBrandBackground();

  if (!bgPath) {
    return sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: BRAND.bg,
      },
    })
      .png()
      .toBuffer();
  }

  return sharp(bgPath)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .modulate({ brightness: 1.7, saturation: 1.2 })
    .gamma(1.15)
    .png()
    .toBuffer();
}

async function darkOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#081318" fill-opacity="0.04"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function topGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.30"/>
            <stop offset="22%" stop-color="black" stop-opacity="0.10"/>
            <stop offset="48%" stop-color="black" stop-opacity="0.02"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function bottomGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="black" stop-opacity="0.12"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.05"/>
            <stop offset="36%" stop-color="black" stop-opacity="0.01"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function outerFrame() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="${WIDTH - 36}" height="${HEIGHT - 36}" rx="34" ry="34"
          fill="none" stroke="${BRAND.border}" stroke-opacity="0.95" stroke-width="2.5" />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function imageFrame() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect x="128" y="280" width="808" height="532" rx="30" ry="30"
          fill="none" stroke="${BRAND.border}" stroke-opacity="0.95" stroke-width="3" />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function badgeLayer(font: opentype.Font, type: "recipe" | "guide") {
  const label = type === "recipe" ? "RECIPE" : "GUIDE";
  const badgeWidth = type === "recipe" ? 175 : 160;

  const rect = `
    <rect x="88" y="86" rx="22" ry="22" width="${badgeWidth}" height="52" fill="${BRAND.red}" />
  `;

  const text = makeShadowedTextPathSvg(
    label,
    font,
    27,
    "#ffffff",
    88 + badgeWidth / 2,
    120,
    0.7,
    0.15,
    2,
    "center"
  );

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        ${rect}
        ${text}
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function textLayer(font: opentype.Font, title: string, hook: string, subtitle: string) {
  const titleLines = wrapWords(cleanPromoText(title), 30);

  const hookBlock = fitWrappedTextBlock({
    text: hook,
    baseChars: 52,
    baseFontSize: 22,
    baseLineHeight: 26,
    maxHeight: 112,
    minFontSize: 17,
  });

  const hookLines = hookBlock.lines;

  let titleFont = 48;
  let titleLine = 42;

  if (title.length > 26) {
    titleFont = 44;
    titleLine = 38;
  }

  if (title.length > 38) {
    titleFont = 40;
    titleLine = 35;
  }

  if (title.length > 52) {
    titleFont = 36;
    titleLine = 31;
  }

  const titleSvg = titleLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        titleFont,
        BRAND.gold,
        88,
        210 + i * titleLine,
        0.42,
        0.18,
        3,
        "left"
      )
    )
    .join("");

  const hookBaseY = 870;

  const hookSvg = hookLines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        hookBlock.fontSize,
        BRAND.gold,
        88,
        hookBaseY + i * hookBlock.lineHeight,
        0.1,
        0.14,
        2,
        "left"
      )
    )
    .join("");

  const subtitleBlock = fitWrappedTextBlock({
    text: subtitle,
    baseChars: 44,
    baseFontSize: 21,
    baseLineHeight: 26,
    maxHeight: 80,
    minFontSize: 16,
  });

  const subtitleBaseY = hookBaseY + hookLines.length * hookBlock.lineHeight + 22;

  const subtitleSvg = subtitleBlock.lines
    .map((line, i) =>
      makeShadowedTextPathSvg(
        line,
        font,
        subtitleBlock.fontSize,
        BRAND.soft,
        88,
        subtitleBaseY + i * subtitleBlock.lineHeight,
        0.05,
        0.1,
        2,
        "left"
      )
    )
    .join("");

  const siteSvg = makeShadowedTextPathSvg(
    "vegan-masala.com",
    font,
    28,
    "#ffffff",
    WIDTH / 2,
    HEIGHT - 28,
    0.05,
    0.1,
    2,
    "center"
  );

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        ${titleSvg}
        ${hookSvg}
        ${subtitleSvg}
        ${siteSvg}
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

async function logoLayer() {
  const logoPath = findBrandLogo();
  if (!logoPath) return null;

  return sharp(logoPath)
    .trim({ threshold: 10 })
    .resize(185, 185, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function heroImageLayer(slug: string, type: "recipe" | "guide") {
  const img = findContentImage(slug, type);
  if (!img) return { image: null, shadow: null };

  const roundedMask = Buffer.from(`
    <svg width="808" height="532" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="808" height="532" rx="30" ry="30" fill="white"/>
    </svg>
  `);

  const image = await sharp(img)
    .resize(808, 532, { fit: "cover" })
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const shadow = await sharp(
    Buffer.from(`
      <svg width="836" height="560" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="black" flood-opacity="0.20"/>
          </filter>
        </defs>
        <rect x="14" y="14" width="808" height="532" rx="30" ry="30"
          fill="black" opacity="0.14" filter="url(#shadow)" />
      </svg>
    `)
  )
    .png()
    .toBuffer();

  return { image, shadow };
}

export async function renderInstagramBySlug(slug: string) {
  const detected = detectContentTypeBySlug(slug);
  if (!detected) throw new Error("Slug not found");

  const type = detected as "recipe" | "guide";
  const editorial = getEditorialContent(slug, type);
  const font = loadFontOrThrow();

  ensureDir(OUTPUT);
  if (PUBLIC_OUTPUT) ensureDir(PUBLIC_OUTPUT);

  const bg = await backgroundLayer();
  const overlay = await darkOverlay();
  const top = await topGradient();
  const bottom = await bottomGradient();
  const frame = await outerFrame();
  const imgFrame = await imageFrame();
  const badge = await badgeLayer(font, type);
  const socialCopy = await getSocialCopyForSlug(slug);

  const hook =
    socialCopy.instagramImageHook && socialCopy.instagramImageHook.trim()
      ? socialCopy.instagramImageHook.trim()
      : buildHook(slug, type, editorial);

  const subtitle =
    socialCopy.instagramImageSubtitle && socialCopy.instagramImageSubtitle.trim()
      ? socialCopy.instagramImageSubtitle.trim()
      : buildSubtitle(slug, type, editorial, hook);

  const text = await textLayer(font, editorial.title, hook, subtitle);
  const logo = await logoLayer();
  const hero = await heroImageLayer(slug, type);

  const layers: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },
    { input: overlay, left: 0, top: 0 },
  ];

  if (hero.shadow) layers.push({ input: hero.shadow, left: 114, top: 266 });
  if (hero.image) layers.push({ input: hero.image, left: 128, top: 280 });

  layers.push(
    { input: top, left: 0, top: 0 },
    { input: bottom, left: 0, top: 0 },
    { input: badge, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: imgFrame, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 }
  );

  if (logo) {
    layers.push({ input: logo, left: WIDTH - 230, top: HEIGHT - 210 });
  }

  const finalJpgBuffer = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BRAND.bg,
    },
  })
    .composite(layers)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const out = path.join(OUTPUT, `${slug}.jpg`);
  fs.writeFileSync(out, finalJpgBuffer);

  if (PUBLIC_OUTPUT) {
    fs.writeFileSync(path.join(PUBLIC_OUTPUT, `${slug}.jpg`), finalJpgBuffer);
  }

  const saved = await saveGeneratedInstagramImage(slug, finalJpgBuffer);
  const caption = buildInstagramCaption(slug, type);
  saveCaption("instagram", slug, caption);
  updateManifest(slug, "instagram");

  return {
    success: true,
    count: 1,
    slug,
    image: saved.url,
    publishImage: (saved as any).publishUrl || saved.url,
    storage: saved.storage,
    path: saved.path,
    message: `Instagram generated for ${slug}`,
  };
}