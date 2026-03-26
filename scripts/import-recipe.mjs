#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function parseIsoDurationToMinutes(iso) {
  if (!iso || typeof iso !== "string") return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const hours = m[1] ? Number(m[1]) : 0;
  const mins = m[2] ? Number(m[2]) : 0;
  const total = hours * 60 + mins;
  return Number.isFinite(total) && total > 0 ? total : undefined;
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return undefined;
}

function asArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function normalizeHowToSteps(recipe) {
  const ri = recipe.recipeInstructions;
  if (!ri) return [];

  if (typeof ri === "string") {
    return ri
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const arr = asArray(ri);
  const steps = [];

  for (const item of arr) {
    if (typeof item === "string") {
      steps.push(item.trim());
    } else if (item && typeof item === "object") {
      if (item.text) steps.push(String(item.text).trim());

      if (item.itemListElement) {
        for (const nested of asArray(item.itemListElement)) {
          if (typeof nested === "string") steps.push(nested.trim());
          else if (nested?.text) steps.push(String(nested.text).trim());
        }
      }
    }
  }

  return steps.filter(Boolean);
}

function extractJsonLdRecipe($) {
  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();

  for (const raw of scripts) {
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }

    const candidates = [];
    const pushCandidate = (obj) => {
      if (!obj) return;
      if (Array.isArray(obj)) obj.forEach(pushCandidate);
      else candidates.push(obj);
    };

    pushCandidate(json);

    for (const c of [...candidates]) {
      if (c && c["@graph"]) pushCandidate(c["@graph"]);
    }

    for (const c of candidates) {
      const t = c?.["@type"];
      const types = Array.isArray(t) ? t : [t];
      if (types.map(String).includes("Recipe")) return c;
    }
  }

  return null;
}

function fallbackExtractFromHtml($) {
  const title =
    cleanText($("h1").first().text()) ||
    cleanText($('meta[property="og:title"]').attr("content")) ||
    "Imported Recipe";

  const ingredientSelectors = [
    '[itemprop="recipeIngredient"]',
    ".recipe-ingredients li",
    ".ingredients li",
    "li.ingredient",
  ];

  let ingredients = [];
  for (const sel of ingredientSelectors) {
    const list = $(sel)
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean);
    if (list.length >= 3) {
      ingredients = list;
      break;
    }
  }

  const instructionSelectors = [
    '[itemprop="recipeInstructions"]',
    ".recipe-instructions li",
    ".instructions li",
    "li.instruction",
  ];

  let instructions = [];
  for (const sel of instructionSelectors) {
    const list = $(sel)
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean);
    if (list.length >= 2) {
      instructions = list;
      break;
    }
  }

  return {
    name: title,
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
}

function buildStarterDescription(title, cuisine) {
  const lower = String(title).toLowerCase();

  if (lower.includes("dal")) {
    return "A vegan Indian dal imported for refinement. Rewrite this so it sounds confident, flavour-led and rooted in family-style cooking rather than generic food-blog language.";
  }

  if (lower.includes("chana") || lower.includes("chickpea")) {
    return "A vegan chickpea curry imported for refinement. Rewrite this in a warmer, more authoritative Vegan Masala voice with clearer culinary detail.";
  }

  if (lower.includes("aloo") || lower.includes("potato")) {
    return "A vegan Indian potato dish imported for refinement. Rewrite this in a more grounded, family-table style with stronger flavour and technique language.";
  }

  return "A vegan Indian recipe imported for refinement. Rewrite this in the Vegan Masala voice: warm, experienced, family-oriented and specific about flavour and method.";
}

function mdxFromRecipe(recipe) {
  const title = pickFirst(recipe, ["name", "headline"]) || "Imported Recipe";
  const slug = slugify(title);

  const description =
    cleanText(
      Array.isArray(recipe.description) ? recipe.description[0] : recipe.description
    ) || buildStarterDescription(title, recipe.recipeCuisine);

  const prepMinutes = parseIsoDurationToMinutes(recipe.prepTime);
  const cookMinutes = parseIsoDurationToMinutes(recipe.cookTime);
  const totalMinutes = parseIsoDurationToMinutes(recipe.totalTime);

  const servingsRaw = pickFirst(recipe, ["recipeYield", "yield"]);
  const servings =
    typeof servingsRaw === "string"
      ? servingsRaw.match(/\d+/)?.[0]
        ? Number(servingsRaw.match(/\d+/)[0])
        : undefined
      : typeof servingsRaw === "number"
      ? servingsRaw
      : undefined;

  const ingredients = asArray(recipe.recipeIngredient)
    .map((x) => cleanText(x))
    .filter(Boolean);

  const steps = normalizeHowToSteps(recipe);

  const cuisine = asArray(recipe.recipeCuisine).map(String).find(Boolean) || "Indian";

  const keywords = asArray(recipe.keywords)
    .flatMap((k) => String(k).split(","))
    .map((s) => s.trim())
    .filter(Boolean);

  const tags = Array.from(new Set(keywords)).slice(0, 6);

  const frontmatter = [
    `title: ${JSON.stringify(title)}`,
    `slug: ${JSON.stringify(slug)}`,
    `description: ${JSON.stringify(description)}`,
    `cuisine: ${JSON.stringify(cuisine)}`,
    prepMinutes ? `prepMinutes: ${prepMinutes}` : null,
    cookMinutes
      ? `cookMinutes: ${cookMinutes}`
      : totalMinutes && prepMinutes && totalMinutes > prepMinutes
      ? `cookMinutes: ${totalMinutes - prepMinutes}`
      : null,
    servings ? `servings: ${servings}` : null,
    `diet: ["vegan"]`,
    tags.length ? `tags: ${JSON.stringify(tags)}` : null,
    `publishedAt: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ingredientsBlock = ingredients.length
    ? ingredients.map((i) => `- ${i}`).join("\n")
    : "- (Add ingredients here)";

  const stepsBlock = steps.length
    ? steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")
    : "1. (Add instructions here)";

  return {
    slug,
    mdx: `---
${frontmatter}
---

## Ingredients

${ingredientsBlock}

## Method

${stepsBlock}

## Notes

- Rewrite this recipe into the Vegan Masala voice before publishing.
- Put ingredients in order of use.
- Make sure the method mentions quantities when ingredients are first used.
- Replace generic phrases with more specific flavour and technique language.
`,
  };
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/import-recipe.mjs <recipe-url>");
    process.exit(1);
  }

  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    },
  });

  if (!res.ok) {
    console.error(`Fetch failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let recipe = extractJsonLdRecipe($);

  if (!recipe) {
    console.log("No JSON-LD Recipe found. Using fallback HTML extraction.");
    recipe = fallbackExtractFromHtml($);
  } else {
    console.log("Found JSON-LD Recipe.");
  }

  const { slug, mdx } = mdxFromRecipe(recipe);

  const outDir = path.join(process.cwd(), "content", "recipes");
  ensureDir(outDir);

  const outPath = path.join(outDir, `${slug}.mdx`);
  fs.writeFileSync(outPath, mdx, "utf8");

  console.log(`Saved: ${outPath}`);
  console.log("Next: run the AI rewrite so the recipe matches the Vegan Masala style.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});