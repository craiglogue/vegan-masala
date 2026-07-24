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

function cleanSocialText(text?: string) {
  return String(text || "")
    .replace(/\bpacked with flavour\b/gi, "")
    .replace(/\bflavour-packed\b/gi, "")
    .replace(/\bflavourful\b/gi, "")
    .replace(/\bperfect weeknight meal\b/gi, "")
    .replace(/\brestaurant-quality\b/gi, "")
    .replace(/\bcomes together beautifully\b/gi, "")
    .replace(/\bwritten in the style of\b/gi, "")
    .replace(/\bcomforting and\b/gi, "")
    .replace(/\bwarming and\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(text?: string) {
  const cleaned = cleanSocialText(text);
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function trimToSentenceBoundary(text: string, max = 180) {
  const cleaned = cleanSocialText(text);
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const sliced = cleaned.slice(0, max);
  const lastPunctuation = Math.max(
    sliced.lastIndexOf("."),
    sliced.lastIndexOf("!"),
    sliced.lastIndexOf("?")
  );

  if (lastPunctuation > Math.floor(max * 0.55)) {
    return sliced.slice(0, lastPunctuation + 1).trim();
  }

  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.7)) {
    return `${sliced.slice(0, lastSpace).trim()}…`;
  }

  return `${sliced.trim()}…`;
}

function makeSentence(text?: string, max = 180) {
  const trimmed = trimToSentenceBoundary(text || "", max);
  if (!trimmed) return "";
  return sentence(trimmed);
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

function normalizedWords(text: string) {
  return cleanSocialText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function countSharedWords(a: string, b: string) {
  const aWords = new Set(normalizedWords(a));
  const bWords = new Set(normalizedWords(b));
  let count = 0;

  for (const word of aWords) {
    if (bWords.has(word)) count++;
  }

  return count;
}

function pickDistinct(slug: string, options: string[], existing: string[] = []) {
  const rotated = [...options];
  const seed = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const offset = seed % rotated.length;
  const ordered = rotated.slice(offset).concat(rotated.slice(0, offset));

  let best = ordered[0];
  let bestScore = Infinity;

  for (const option of ordered) {
    const score = existing.reduce((acc, item) => acc + countSharedWords(option, item), 0);
    if (score < bestScore) {
      best = option;
      bestScore = score;
    }
  }

  return best;
}

function shortEnough(text?: string, max = 115) {
  const cleaned = cleanSocialText(text || "");
  return cleaned && cleaned.length <= max ? cleaned : "";
}


function hasAny(text: string, terms: string[]) {
  const lower = cleanSocialText(text).toLowerCase();
  return terms.some((t) => lower.includes(t));
}

function recipeSignals(slug: string, content: ReturnType<typeof getEditorialContent>) {
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
    content.title || "",
    content.description || "",
    content.introNote || "",
    content.servingSuggestion || "",
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
    isTempered: has(["temper", "tadka"]),
  };
}

function recipeProfile(slug: string, content: ReturnType<typeof getEditorialContent>) {
  const sig = recipeSignals(slug, content);

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

function recipeHookOptions(profile: string, slug?: string, content?: ReturnType<typeof getEditorialContent>) {
  const sig = slug && content ? recipeSignals(slug, content) : null;

  if (profile === "pastry") {
    return [
      "A crisp-topped bake with a spiced filling that holds together properly when sliced",
      "The kind of pie where the filling does the real work and the top gives it contrast",
      "A baked savoury dish that feels more like a proper dinner than a quick shortcut",
      "Built around a well-seasoned filling and a top that should stay golden and crisp",
    ];
  }

  if (profile === "potato-aubergine") {
    return [
      "Potatoes and aubergine work best here once the masala has had time to settle properly",
      "Built around soft aubergine, tender potatoes, and a masala that ties the whole pan together",
      "Aubergine and potato make a better pair once the base is cooked long enough to carry both",
      "The kind of vegetable curry that depends on getting the base right rather than overcomplicating it",
    ];
  }

  if (profile === "potato") {
    return [
      "A potato curry that depends on a well-cooked masala and a bit of patience",
      "Soft potatoes and a proper masala base do most of the work here",
      "Built around tender potatoes, warm spice, and a sauce worth spooning up",
      "The potatoes carry the masala properly when the base is cooked well",
    ];
  }

  if (profile === "chickpea") {
    return [
      "A chickpea dish with a rich base and enough depth to keep it interesting",
      "Built on chickpeas, onions, tomatoes, and a masala worth cooking properly",
      "The sort of chickpea curry that settles into itself as it cooks",
      "A steady, satisfying pan of food that earns a place in the regular rotation",
    ];
  }

  if (profile === "dal") {
    if (sig?.isTempered) {
      return [
        "A lentil dish that comes alive once the tempering hits the top",
        "Soft lentils underneath, a proper finishing layer on top, and enough warmth to carry the bowl",
        "The kind of dal that depends as much on the finish as the simmer",
        "Built on lentils, patience, and a final tempering that gives it shape",
      ];
    }

    return [
      "Soft lentils and a good spice base make this the kind of meal you come back to",
      "A dal that depends on patience, balance, and letting the lentils do their work",
      "Simple lentils, properly cooked, with enough depth to carry the bowl",
      "The kind of dal that feels generous without being complicated",
    ];
  }

  if (profile === "rice") {
    return [
      "A rice dish that rewards careful seasoning and giving it time to settle properly",
      "Built to make the most of good rice, warm spices, and what you already have",
      "The sort of dish that brings everything together in one pan",
      "A good way to turn familiar ingredients into a proper meal",
    ];
  }

  if (profile === "tofu") {
    return [
      "Tofu works best here once the sauce has enough depth to carry it properly",
      "A tofu curry built on a proper base rather than trying to do too much",
      "The kind of dinner that keeps things simple without feeling flat",
      "Built around tofu, spice, and a sauce worth letting simmer properly",
    ];
  }

  if (profile === "cauliflower") {
    return [
      "A cauliflower dish that depends on keeping the vegetables tender, not overworked",
      "Built on simple vegetables, warm spice, and a masala that does the heavy lifting",
      "The kind of curry that proves simple ingredients can still carry the table",
      "A steady vegetable dish with enough warmth and texture to feel complete",
    ];
  }

  return [
    "A good masala base makes all the difference here",
    "The kind of dinner that earns a regular place in the rotation",
    "Simple ingredients, cooked properly and served hot",
    "A steady, satisfying dish that works just as well the next day",
    "Built on onions, spice, and enough patience to make it worth it",
  ];
}

function recipeMiddleOptions(profile: string, slug?: string, content?: ReturnType<typeof getEditorialContent>) {
  if (profile === "pastry") {
    return [
      "Best once the top is crisp and the filling has had a moment to settle before slicing",
      "A good one for sharing, serving warm, and coming back to later in the day",
      "The contrast between the crisp top and the soft filling is what makes it land properly",
      "Serve it warm with chutney, salad, or whatever gives it a sharper edge",
    ];
  }

  if (profile === "potato-aubergine") {
    return [
      "Best served hot with roti and something cool or sharp on the side",
      "The aubergine should feel soft and settled into the masala rather than separate from it",
      "A very good weeknight option once the vegetables have had time to absorb the base",
      "Good at the table straight away and even better once the flavours have had a little time",
    ];
  }

  if (profile === "potato") {
    return [
      "Best served hot with naan, rice, or something cool and sharp on the side",
      "A good one for evenings when you want something rich without making the meal complicated",
      "The potatoes should feel soft and settled, carrying the sauce rather than sitting apart from it",
      "It holds up well if you make enough for tomorrow and warm it through gently",
    ];
  }

  if (profile === "chickpea") {
    return [
      "Good with rice, roti, and a spoonful of chutney or yoghurt on the side",
      "Once the chickpeas have had time in the sauce, the whole dish feels rounder and more complete",
      "A very good weeknight dinner and an even better lunch the next day",
      "This is the kind of curry that reheats well and rarely feels like a compromise",
    ];
  }

  if (profile === "dal") {
    return [
      "Good with rice, flatbread, or just a spoon and a quiet evening",
      "The lentils should feel soft and full, with the spice sitting underneath rather than shouting over them",
      "Easy to batch cook, easy to reheat, and worth keeping in the regular rotation",
      "A dependable one for busy weeks when you still want the food to feel properly cooked",
    ];
  }

  if (profile === "rice") {
    return [
      "Best served hot, with yoghurt, pickle, or whatever gives it a sharper edge",
      "It works best when the rice is settled, the seasoning is balanced, and everything feels like it belongs together",
      "A good way to turn what you already have into a proper meal",
      "Useful for end-of-week cooking when you want something complete rather than patched together",
    ];
  }

  if (profile === "tofu") {
    return [
      "Good with rice, flatbread, and whatever greens or herbs you have to hand",
      "The sauce needs enough depth to carry the tofu properly, otherwise the whole thing stays flat",
      "A useful one for weeknights when you want something steady and filling",
      "It is also a good way to use up greens, herbs, or extras without the meal feeling improvised",
    ];
  }

  if (profile === "cauliflower") {
    return [
      "Best served hot with roti and something cool or sharp on the side",
      "It works best when the vegetables stay tender and the masala stays balanced all the way through",
      "A good reminder that a simple vegetable curry can still feel like a proper dinner",
      "Especially useful when you want something steady without opening half the fridge",
    ];
  }

  return [
    "Best served hot with rice, roti, or naan and something sharp on the side",
    "Good for weeknights and even better if you make enough for tomorrow",
    "Best when the onions are cooked properly and the seasoning is balanced at the end",
    "Easy to bring to the table with rice, flatbread, and a spoonful of yoghurt or chutney",
  ];
}

function recipeHook(slug: string, content: ReturnType<typeof getEditorialContent>) {
  const shortHook =
    shortEnough(content.socialHook, 115) ||
    shortEnough(content.introNote, 115);

  if (shortHook) return sentence(shortHook);

  const profile = recipeProfile(slug, content);

  return sentence(
    pickDistinct(
      slug,
      recipeHookOptions(profile, slug, content),
      []
    )
  );
}

function recipeMiddle(slug: string, content: ReturnType<typeof getEditorialContent>, hook: string) {
  const shortServe = shortEnough(content.servingSuggestion, 105);
  if (shortServe) return sentence(shortServe);

  const profile = recipeProfile(slug, content);

  return sentence(
    pickDistinct(
      slug,
      recipeMiddleOptions(profile, slug, content),
      [hook]
    )
  );
}

function guideHook(slug: string, content: ReturnType<typeof getEditorialContent>) {
  const shortGuide = shortEnough(content.description, 115);
  if (shortGuide) return sentence(shortGuide);

  return sentence(
    pickDistinct(
      slug,
      [
        "A practical guide for home cooks who want a clearer handle on the basics",
        "Useful kitchen guidance that helps everyday cooking feel easier",
        "A simpler way to understand an important part of Indian cooking",
        "Clear, usable help for building confidence in the kitchen",
        "A straightforward guide designed to make cooking feel less guesswork-driven",
      ],
      []
    )
  );
}

function guideMiddle(slug: string, hook: string) {
  return sentence(
    pickDistinct(
      slug,
      [
        "The aim is not theory for its own sake, but something you can actually use at the stove",
        "A little clarity in the right place can make everyday meals much easier to manage",
        "Good kitchen knowledge tends to pay off quietly over time",
        "The useful part is being able to put the advice straight into practice",
        "It is the kind of guidance that helps cooking feel steadier and more natural",
      ],
      [hook]
    )
  );
}

function ctaByType(type: ContentType, slug: string) {
  if (type === "recipe") {
    return pickDistinct(slug, [
      "Full recipe on Vegan Masala.",
      "Find the full recipe on Vegan Masala.",
      "Get the full method on Vegan Masala.",
      "Read the full recipe on Vegan Masala.",
    ]);
  }

  return pickDistinct(slug, [
    "Read the full guide on Vegan Masala.",
    "Explore the full guide on Vegan Masala.",
    "See the full guide on Vegan Masala.",
    "Read more on Vegan Masala.",
  ]);
}

function recipeHashtags(slug: string) {
  const base = [
    "#veganrecipes",
    "#veganindian",
    "#indianfood",
    "#plantbased",
    "#vegancooking",
    "#homecooking",
    "#veganuk",
    "#veganmasala",
  ];

  const extras: Array<[RegExp, string]> = [
    [/\bchana|chickpea|chole\b/i, "#chickpeacurry"],
    [/\bdal|dahl|lentil|masoor|moong\b/i, "#dalrecipe"],
    [/\baloo|potato\b/i, "#potatocurry"],
    [/\btofu\b/i, "#tofurecipe"],
    [/\bbiryani|rice\b/i, "#ricedish"],
    [/\bnaan|roti|chapati\b/i, "#flatbread"],
  ];

  const selected = extras
    .filter(([re]) => re.test(slug))
    .slice(0, 2)
    .map(([, tag]) => tag);

  return [...selected, ...base].join("\n");
}

function guideHashtags(slug: string) {
  const base = [
    "#cookingtips",
    "#cookingguide",
    "#vegancooking",
    "#plantbased",
    "#homecooking",
    "#veganuk",
    "#kitchentips",
    "#veganmasala",
  ];

  const extras: Array<[RegExp, string]> = [
    [/\bspice|masala\b/i, "#spiceguide"],
    [/\bdal|lentil|bean\b/i, "#pantryguide"],
    [/\btofu\b/i, "#veganbasics"],
    [/\brice|biryani\b/i, "#cookingtips"],
  ];

  const selected = extras
    .filter(([re]) => re.test(slug))
    .slice(0, 2)
    .map(([, tag]) => tag);

  return [...selected, ...base].join("\n");
}

function pinterestRecipeTitle(title: string, slug: string) {
  return pickDistinct(slug, [
    `${title} Recipe`,
    `How To Make ${title}`,
    `${title} - Vegan Indian Recipe`,
    `${title} For A Proper Homemade Dinner`,
    `Save This ${title} Recipe`,
  ]);
}

function pinterestGuideTitle(title: string, slug: string) {
  return pickDistinct(slug, [
    `${title} Guide`,
    `${title} Explained Simply`,
    `How To Use ${title}`,
    `Beginner's Guide To ${title}`,
    `${title} For Home Cooks`,
  ]);
}

function compactSlugTags(_slug: string) {
  return "";
}

function buildInstagramBody(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const emoji = emojiByType(type, slug);
  const cta = ctaByType(type, slug);
  const slugTags = compactSlugTags(slug);

  if (type === "recipe") {
    const hook = recipeHook(slug, content);
    const middle = recipeMiddle(slug, content, hook);

    return `${emoji} ${hook}

${middle}

${cta}

${slugTags ? `${slugTags}\n` : ""}${recipeHashtags(slug)}`;
  }

  const hook = guideHook(slug, content);
  const middle = guideMiddle(slug, hook);

  return `${emoji} ${hook}

${middle}

${cta}

${slugTags ? `${slugTags}\n` : ""}${guideHashtags(slug)}`;
}

export function buildInstagramCaption(slug: string, type: ContentType) {
  return buildInstagramBody(slug, type);
}


export function buildInstagramCaptionVariants(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const emoji = emojiByType(type, slug);
  const cta = ctaByType(type, slug);

  if (type === "guide") {
    const hook = guideHook(slug, content);

    const warm = `${emoji} ${hook}

${guideMiddle(slug, hook)}

${cta}

${guideHashtags(slug)}`;

    const practical = `${emoji} ${hook}

Useful, clear kitchen guidance you can actually put to work.

${cta}

${guideHashtags(slug)}`;

    const punchy = `${emoji} ${hook}

A small shift in understanding usually makes everyday cooking much easier.

${cta}

${guideHashtags(slug)}`;

    return [warm, practical, punchy];
  }

  const profile = recipeProfile(slug, content);
  const hook = recipeHook(slug, content);

  let warmMiddle = "Best served hot with rice, roti, or something sharp on the side.";
  let warmCloser = "This is the sort of dish that feels most at home when the base has had time to settle properly.";

  let practicalMiddle = "A strong option for weeknights and even better if you make enough for tomorrow.";
  let practicalCloser = "The kind of recipe that works hard once and then keeps paying you back at lunch.";

  let punchyMiddle = "This is the kind of dinner that earns another go as soon as the pan is empty.";
  let punchyCloser = "Simple ingredients, but they only land properly when the masala is doing its job.";

  if (profile === "potato") {
    warmMiddle = "Best served hot with naan, rice, or something cool and sharp on the side.";
    warmCloser = "The potatoes should feel soft and settled, carrying the sauce rather than sitting apart from it.";

    practicalMiddle = "A good one for evenings when you want something rich without making the meal complicated.";
    practicalCloser = "It also holds up well if you make enough for tomorrow and warm it through gently.";

    punchyMiddle = "Soft potatoes and a proper masala base do a lot of heavy lifting here.";
    punchyCloser = "Give it a little patience in the pan and it rewards you.";
  } else if (profile === "chickpea") {
    warmMiddle = "Good with rice, roti, and a spoonful of chutney or yoghurt on the side.";
    warmCloser = "Once the chickpeas have had time in the sauce, the whole dish feels rounder and more complete.";

    practicalMiddle = "A very good weeknight dinner and an even better lunch the next day.";
    practicalCloser = "This is the kind of curry that reheats well and rarely feels like a compromise.";

    punchyMiddle = "Once the chickpeas settle into the sauce, the whole dish lands properly.";
    punchyCloser = "That is where the dish starts to feel worth repeating.";
  } else if (profile === "dal") {
    warmMiddle = "Good with rice, flatbread, or just a spoon and a quiet evening.";
    warmCloser = "The lentils should feel soft and full, with the spice sitting underneath rather than shouting over them.";

    practicalMiddle = "Easy to batch cook, easy to reheat, and worth keeping in the regular rotation.";
    practicalCloser = "A very dependable one for busy weeks when you still want the food to feel properly cooked.";

    punchyMiddle = "Simple lentils, cooked properly, can carry a whole meal without trying too hard.";
    punchyCloser = "This is where patience matters more than fuss.";
  } else if (profile === "rice") {
    warmMiddle = "Best served hot, with yoghurt, pickle, or whatever gives it a sharper edge.";
    warmCloser = "It works best when the rice is settled, the seasoning is balanced, and everything feels like it belongs together.";

    practicalMiddle = "A good way to turn what you already have into a proper meal.";
    practicalCloser = "Useful for end-of-week cooking when you want something complete rather than patched together.";

    punchyMiddle = "One-pan dinners are hard to argue with when they come out like this.";
    punchyCloser = "Good rice and careful seasoning do most of the work.";
  } else if (profile === "tofu") {
    warmMiddle = "Good with rice, flatbread, and whatever greens or herbs you have to hand.";
    warmCloser = "The sauce needs enough depth to carry the tofu properly, otherwise the whole thing stays flat.";

    practicalMiddle = "A useful one for weeknights when you want something steady and filling.";
    practicalCloser = "It is also a good way to use up greens, herbs, or extras without the meal feeling improvised.";

    punchyMiddle = "The sauce does the work here, so let it cook properly and the tofu will follow.";
    punchyCloser = "Once the base is right, the rest comes together easily.";
  } else if (profile === "cauliflower") {
    warmMiddle = "Best served hot with roti and something cool or sharp on the side.";
    warmCloser = "It works best when the vegetables stay tender and the masala stays balanced all the way through.";

    practicalMiddle = "A good reminder that a simple vegetable curry can still feel like a proper dinner.";
    practicalCloser = "Especially useful when you want something steady without opening half the fridge.";

    punchyMiddle = "Simple vegetables can still carry the table when the masala is doing its job.";
    punchyCloser = "That is what gives a dish like this its weight.";
  }

  const warm = `${emoji} ${hook}

${warmMiddle}

${warmCloser}

${cta}

${recipeHashtags(slug)}`;

  const practical = `${emoji} ${hook}

${practicalMiddle}

${practicalCloser}

${cta}

${recipeHashtags(slug)}`;

  const punchy = `${emoji} ${hook}

${punchyMiddle}

${punchyCloser}

${cta}

${recipeHashtags(slug)}`;

  return [warm, practical, punchy];
}


export function buildFacebookCaptionVariants(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const cta = ctaByType(type, slug);

  if (type === "guide") {
    const hook = guideHook(slug, content);

    const warm = `${hook}

${guideMiddle(slug, hook)}

${cta}

#veganmasala #cookingtips #plantbased`;

    const practical = `${hook}

Useful, clear kitchen guidance you can actually put to work in everyday cooking.

${cta}

#veganmasala #cookingtips #plantbased`;

    return [warm, practical];
  }

  const profile = recipeProfile(slug, content);
  const hook = recipeHook(slug, content);

  let warmMiddle = "Best served hot with rice, roti, or something sharp on the side.";
  let warmCloser = "This is the sort of dish that feels most at home when the base has had time to settle properly.";

  let practicalMiddle = "A strong option for weeknights and even better if you make enough for tomorrow.";
  let practicalCloser = "The kind of recipe that works hard once and then keeps paying you back at lunch.";

  if (profile === "potato") {
    warmMiddle = "Best served hot with naan, rice, or something cool and sharp on the side.";
    warmCloser = "The potatoes should feel soft and settled, carrying the sauce rather than sitting apart from it.";

    practicalMiddle = "A good one for evenings when you want something rich without making the meal complicated.";
    practicalCloser = "It also holds up well if you make enough for tomorrow and warm it through gently.";
  } else if (profile === "chickpea") {
    warmMiddle = "Good with rice, roti, and a spoonful of chutney or yoghurt on the side.";
    warmCloser = "Once the chickpeas have had time in the sauce, the whole dish feels rounder and more complete.";

    practicalMiddle = "A very good weeknight dinner and an even better lunch the next day.";
    practicalCloser = "This is the kind of curry that reheats well and rarely feels like a compromise.";
  } else if (profile === "dal") {
    warmMiddle = "Good with rice, flatbread, or just a spoon and a quiet evening.";
    warmCloser = "The lentils should feel soft and full, with the spice sitting underneath rather than shouting over them.";

    practicalMiddle = "Easy to batch cook, easy to reheat, and worth keeping in the regular rotation.";
    practicalCloser = "A dependable one for busy weeks when you still want the food to feel properly cooked.";
  } else if (profile === "rice") {
    warmMiddle = "Best served hot, with yoghurt, pickle, or whatever gives it a sharper edge.";
    warmCloser = "It works best when the rice is settled, the seasoning is balanced, and everything feels like it belongs together.";

    practicalMiddle = "A good way to turn what you already have into a proper meal.";
    practicalCloser = "Useful for end-of-week cooking when you want something complete rather than patched together.";
  } else if (profile === "tofu") {
    warmMiddle = "Good with rice, flatbread, and whatever greens or herbs you have to hand.";
    warmCloser = "The sauce needs enough depth to carry the tofu properly, otherwise the whole thing stays flat.";

    practicalMiddle = "A useful one for weeknights when you want something steady and filling.";
    practicalCloser = "It is also a good way to use up greens, herbs, or extras without the meal feeling improvised.";
  } else if (profile === "cauliflower") {
    warmMiddle = "Best served hot with roti and something cool or sharp on the side.";
    warmCloser = "It works best when the vegetables stay tender and the masala stays balanced all the way through.";

    practicalMiddle = "A good reminder that a simple vegetable curry can still feel like a proper dinner.";
    practicalCloser = "Especially useful when you want something steady without opening half the fridge.";
  }

  const warm = `${hook}

${warmMiddle}

${warmCloser}

${cta}

#veganmasala #plantbased #indianfood`;

  const practical = `${hook}

${practicalMiddle}

${practicalCloser}

${cta}

#veganmasala #plantbased #indianfood`;

  return [warm, practical];
}

export function buildPinterestCaptionVariants(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const title = content.title || titleFromSlug(slug);

  if (type === "guide") {
    const hook = guideHook(slug, content);

    const searchFriendly = `${pinterestGuideTitle(title, slug)}

${hook}

Useful for:
• everyday home cooking
• clearer kitchen confidence
• practical help you can use straight away

Read the full guide:
https://vegan-masala.com

${guideHashtags(slug)}`;

    const inviting = `${pinterestGuideTitle(title, slug)}

${hook}

A practical guide designed to make everyday cooking feel easier and more natural.

Read the full guide:
https://vegan-masala.com

${guideHashtags(slug)}`;

    return [searchFriendly, inviting];
  }

  const profile = recipeProfile(slug, content);
  const hook = recipeHook(slug, content);

  let benefit = "Good for weeknight cooking, serving with rice or roti, and saving for later.";
  let inviting = "Built on a proper masala base and the kind of cooking that rewards a little patience.";

  if (profile === "potato") {
    benefit = "Good for weeknight dinners, serving with naan or rice, and saving for later.";
    inviting = "Soft potatoes, warm spice, and a sauce that settles properly as it cooks.";
  } else if (profile === "chickpea") {
    benefit = "Good for meal planning, easy lunches, and serving with rice or flatbread.";
    inviting = "Chickpeas, a rich sauce, and a masala base worth giving time to.";
  } else if (profile === "dal") {
    benefit = "Good for batch cooking, easy lunches, and simple weeknight dinners.";
    inviting = "Soft lentils, steady spice, and the kind of bowl you come back to.";
  } else if (profile === "rice") {
    benefit = "Good for one-pan cooking, flexible meal planning, and using what you already have.";
    inviting = "A rice dish that brings everything together without feeling overworked.";
  } else if (profile === "tofu") {
    benefit = "Good for weeknight cooking, protein-focused meals, and flexible dinners.";
    inviting = "Tofu works best here once the sauce has enough depth to carry it.";
  } else if (profile === "cauliflower") {
    benefit = "Good for vegetable-led dinners, flatbread nights, and simple meal planning.";
    inviting = "A warm, balanced curry that proves simple vegetables can still carry the table.";
  }

  const searchFriendly = `${pinterestRecipeTitle(title, slug)}

${hook}

Good for:
• ${benefit.split(", ")[0]}
• easy serving ideas
• ${benefit}

Get the full recipe:
https://vegan-masala.com

${recipeHashtags(slug)}`;

  const invitingVariant = `${pinterestRecipeTitle(title, slug)}

${hook}

${inviting}

Get the full recipe:
https://vegan-masala.com

${recipeHashtags(slug)}`;

  return [searchFriendly, invitingVariant];
}

export function buildFacebookCaption(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const cta = ctaByType(type, slug);
  const slugTags = compactSlugTags(slug);

  if (type === "recipe") {
    const hook = recipeHook(slug, content);
    const middle = recipeMiddle(slug, content, hook);

    return `${hook}

${middle}

${cta}

${slugTags ? `${slugTags}\n` : ""}#veganmasala #plantbased #indianfood`;
  }

  const hook = guideHook(slug, content);
  const middle = guideMiddle(slug, hook);

  return `${hook}

${middle}

${cta}

${slugTags ? `${slugTags}\n` : ""}#veganmasala #cookingtips #plantbased`;
}

export function buildPinterestCaption(slug: string, type: ContentType) {
  const content = getEditorialContent(slug, type);
  const title = content.title || titleFromSlug(slug);

  if (type === "recipe") {
    const hook = recipeHook(slug, content);

    const bullets = pickDistinct(
      slug,
      [
        `• good for weeknight cooking
• useful leftovers
• easy to serve with rice or roti`,
        `• a good family-style dinner
• balanced, savoury cooking
• simple ingredients, properly cooked`,
        `• strong weeknight option
• works well the next day
• easy to build into a regular rotation`,
      ],
      [hook]
    );

    return `${pinterestRecipeTitle(title, slug)}

${hook}

${bullets}

Get the full recipe:
https://vegan-masala.com

${recipeHashtags(slug)}`;
  }

  const hook = guideHook(slug, content);

  const bullets = pickDistinct(
    slug,
    [
      `• useful for everyday cooking
• clearer kitchen confidence
• practical help you can apply straight away`,
      `• beginner-friendly guidance
• better flavour and technique
• made for home cooks`,
      `• simple, usable advice
• less guesswork in the kitchen
• easier everyday cooking`,
    ],
    [hook]
  );

  return `${pinterestGuideTitle(title, slug)}

${hook}

${bullets}

Read the full guide:
https://vegan-masala.com

${guideHashtags(slug)}`;
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