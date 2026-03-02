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

function decodeHtmlText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

// Parses ISO 8601 duration like PT25M or PT1H10M into minutes
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
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return undefined;
}

function asArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function normalizeHowToSteps(recipe) {
  // recipeInstructions can be:
  // - string
  // - array of strings
  // - array of HowToStep objects with "text"
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
      // HowToStep or HowToSection
      if (item.text) steps.push(String(item.text).trim());
      // Some pages nest steps inside item.itemListElement
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
      // Sometimes JSON-LD contains multiple objects or invalid trailing commas.
      // Skip in this simple version.
      continue;
    }

    const candidates = [];
    const pushCandidate = (obj) => {
      if (!obj) return;
      if (Array.isArray(obj)) obj.forEach(pushCandidate);
      else candidates.push(obj);
    };

    pushCandidate(json);

    // JSON-LD often uses @graph
    for (const c of [...candidates]) {
      if (c && c["@graph"]) pushCandidate(c["@graph"]);
    }

    // Find first object with @type including Recipe
    for (const c of candidates) {
      const t = c?.["@type"];
      const types = Array.isArray(t) ? t : [t];
      if (types.map(String).includes("Recipe")) return c;
    }
  }

  return null;
}

function fallbackExtractFromHtml($) {
  // Very basic fallback: try common classnames/structures
  const title =
    decodeHtmlText($("h1").first().text()) ||
    decodeHtmlText($('meta[property="og:title"]').attr("content")) ||
    "Imported Recipe";

  // Ingredients: common patterns
  const ingredientSelectors = [
    '[itemprop="recipeIngredient"]',
    ".recipe-ingredients li",
    ".ingredients li",
    "li.ingredient",
  ];
  let ingredients = [];
  for (const sel of ingredientSelectors) {
    const list = $(sel)
      .map((_, el) => decodeHtmlText($(el).text()))
      .get()
      .filter(Boolean);
    if (list.length >= 3) {
      ingredients = list;
      break;
    }
  }

  // Instructions: common patterns
  const instructionSelectors = [
    '[itemprop="recipeInstructions"]',
    ".recipe-instructions li",
    ".instructions li",
    "li.instruction",
  ];
  let instructions = [];
  for (const sel of instructionSelectors) {
    const list = $(sel)
      .map((_, el) => decodeHtmlText($(el).text()))
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

function mdxFromRecipe(recipe) {
  const title = pickFirst(recipe, ["name", "headline"]) || "Imported Recipe";
  const slug = slugify(title);

  const description =
    (Array.isArray(recipe.description) ? recipe.description[0] : recipe.description) ||
    recipe.summary ||
    "";

  const prepMinutes = parseIsoDurationToMinutes(recipe.prepTime);
  const cookMinutes = parseIsoDurationToMinutes(recipe.cookTime);
  const totalMinutes = parseIsoDurationToMinutes(recipe.totalTime);

  const servingsRaw = pickFirst(recipe, ["recipeYield", "yield"]);
  const servings =
    typeof servingsRaw === "string"
      ? (servingsRaw.match(/\d+/)?.[0] ? Number(servingsRaw.match(/\d+/)[0]) : undefined)
      : typeof servingsRaw === "number"
        ? servingsRaw
        : undefined;

  const ingredients = asArray(recipe.recipeIngredient).map((x) => decodeHtmlText(x)).filter(Boolean);
  const steps = normalizeHowToSteps(recipe);

  const cuisine = asArray(recipe.recipeCuisine).map(String).find(Boolean);
  const keywords = asArray(recipe.keywords)
    .flatMap((k) => String(k).split(","))
    .map((s) => s.trim())
    .filter(Boolean);

  // Keep tags conservative — you can edit later
  const tags = keywords.slice(0, 6);

  const frontmatter = [
    `title: ${JSON.stringify(title)}`,
    `slug: ${JSON.stringify(slug)}`,
    description ? `description: ${JSON.stringify(String(description).trim())}` : null,
    cuisine ? `cuisine: ${JSON.stringify(cuisine)}` : null,
    prepMinutes ? `prepMinutes: ${prepMinutes}` : null,
    // Prefer explicit cookMinutes, else approximate from total-prep if present
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

  const ingredientsBlock =
    ingredients.length
      ? ingredients.map((i) => `- ${i}`).join("\n")
      : `- (Add ingredients here)`;

  const stepsBlock =
    steps.length
      ? steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")
      : `1. (Add instructions here)`;

  // Add anchor tags (safe MDX)
  const mdx = `---
${frontmatter}
---

<a id="ingredients"></a>

## Ingredients

${ingredientsBlock}

<a id="instructions"></a>

## Instructions

${stepsBlock}

## Notes

- Rewrite the instructions in your own words before publishing.
- Consider testing the recipe and adding your own tips/substitutions.
`;

  return { slug, mdx };
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
  console.log("Next: open the file, rewrite instructions in your own voice, then refresh /recipes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});