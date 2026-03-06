#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function hasQuantity(s) {
  const text = String(s).toLowerCase().trim();

  return (
    /^\d/.test(text) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)\b/.test(text) ||
    /\b(tsp|tbsp|teaspoon|teaspoons|tablespoon|tablespoons|cup|cups|ml|l|g|kg|oz|lb|inch|inches|clove|cloves)\b/.test(text)
  );
}

function norm(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[()]/g, "")
    .replace(/[_]/g, " ")
    .replace(/\s+/g, " ");
}

function extractHeadingBlock(body, headingAlternativesRegex) {
  const re = new RegExp(
    `(^|\\n)##\\s+(${headingAlternativesRegex})\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|\\s*$)`,
    "i"
  );
  const m = re.exec(body);
  return m ? (m[3] || "").trim() : "";
}

function parseBullets(block) {
  if (!block) return [];
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-+\s+/, "").trim())
    .filter(Boolean);
}

function ensureBullets(items) {
  return items
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("- ") ? s : `- ${s}`))
    .join("\n");
}

function replaceIngredientsBlock(body, ingredientsItems) {
  const newBlock = `## Ingredients\n${ensureBullets(ingredientsItems)}\n`;
  const re = /(^|\n)##\s+Ingredients\s*\n([\s\S]*?)(?=\n##\s+|\s*$)/i;

  if (re.test(body)) {
    return body.replace(re, `\n${newBlock}`);
  }

  // If there is no Ingredients section, prepend one
  return `${newBlock}\n${body.trim()}\n`;
}

/**
 * Default quantity map for typical vegan Indian recipes.
 * These are intentionally conservative, "normal home cook" amounts.
 */
function applyDefaultQuantity(item) {
  const raw = String(item).trim();
  const t = norm(raw);

  if (!t) return raw;
  if (hasQuantity(t)) return raw;

  const rules = [
    { re: /\boil\b/, out: "2 tbsp oil" },
    { re: /\bonion\b/, out: "1 large onion, finely chopped" },
    { re: /\bred onion\b/, out: "1 large red onion, finely chopped" },
    { re: /\bshallot\b/, out: "2 shallots, finely chopped" },

    { re: /\bgarlic\b/, out: "4 cloves garlic, minced" },
    { re: /\bginger\b/, out: "1 inch ginger, grated" },
    { re: /\bginger garlic paste\b/, out: "1 tbsp ginger-garlic paste" },

    { re: /\bgreen chilli\b/, out: "1 green chilli, finely chopped" },
    { re: /\bgreen chillies\b/, out: "2 green chillies, finely chopped" },
    { re: /\bred chilli\b/, out: "1 red chilli, finely chopped" },

    { re: /\btomato puree\b/, out: "200 ml tomato puree" },
    { re: /\btomatoes\b/, out: "2 medium tomatoes, chopped" },
    { re: /\btomato\b/, out: "1 medium tomato, chopped" },

    { re: /\bpotatoes\b/, out: "3 medium potatoes, cubed" },
    { re: /\bpotato\b/, out: "1 large potato, cubed" },
    { re: /\baloo\b/, out: "3 medium potatoes, cubed" },

    { re: /\bcauliflower florets\b/, out: "1 small cauliflower, cut into florets" },
    { re: /\bcauliflower\b/, out: "1 small cauliflower, cut into florets" },
    { re: /\bgobi\b/, out: "1 small cauliflower, cut into florets" },

    { re: /\beggplant\b/, out: "1 medium eggplant, chopped" },
    { re: /\baubergine\b/, out: "1 medium aubergine, chopped" },
    { re: /\bbrinjal\b/, out: "1 medium brinjal, chopped" },

    { re: /\bspinach\b/, out: "200 g spinach" },
    { re: /\bpalak\b/, out: "200 g spinach" },

    { re: /\bmushrooms\b/, out: "200 g mushrooms, sliced" },
    { re: /\bmushroom\b/, out: "200 g mushrooms, sliced" },

    { re: /\btofu\b/, out: "200 g firm tofu, cubed" },
    { re: /\bpaneer\b/, out: "200 g firm tofu, cubed" },

    { re: /\bchickpeas\b/, out: "1 tin chickpeas, drained and rinsed" },
    { re: /\bchickpea\b/, out: "1 tin chickpeas, drained and rinsed" },
    { re: /\bchana\b/, out: "1 tin chickpeas, drained and rinsed" },
    { re: /\bkala chana\b/, out: "1 tin kala chana, drained and rinsed" },

    { re: /\bkidney beans\b/, out: "1 tin kidney beans, drained and rinsed" },
    { re: /\bbeans\b/, out: "1 tin beans, drained and rinsed" },
    { re: /\brajma\b/, out: "1 tin kidney beans, drained and rinsed" },

    { re: /\bred lentils\b/, out: "1 cup red lentils, rinsed" },
    { re: /\blentils\b/, out: "1 cup lentils, rinsed" },
    { re: /\bmoong dal\b/, out: "1 cup moong dal, rinsed" },
    { re: /\bmasoor dal\b/, out: "1 cup masoor dal, rinsed" },
    { re: /\burad dal\b/, out: "1 cup urad dal, rinsed" },
    { re: /\bdal\b/, out: "1 cup dal, rinsed" },
    { re: /\bdahl\b/, out: "1 cup dal, rinsed" },

    { re: /\bcoconut milk\b/, out: "1 tin coconut milk" },
    { re: /\bcoconut cream\b/, out: "150 ml coconut cream" },
    { re: /\bcream\b/, out: "100 ml oat cream" },
    { re: /\byoghurt\b/, out: "3 tbsp unsweetened plant yoghurt" },
    { re: /\byogurt\b/, out: "3 tbsp unsweetened plant yoghurt" },
    { re: /\bcurd\b/, out: "3 tbsp unsweetened plant yoghurt" },

    { re: /\bcumin seeds\b/, out: "1 tsp cumin seeds" },
    { re: /\bmustard seeds\b/, out: "1 tsp mustard seeds" },
    { re: /\bfennel seeds\b/, out: "1 tsp fennel seeds" },
    { re: /\bnigella seeds\b/, out: "1/2 tsp nigella seeds" },
    { re: /\bfenugreek seeds\b/, out: "1/4 tsp fenugreek seeds" },

    { re: /\bcumin powder\b/, out: "1 tsp cumin powder" },
    { re: /\bcoriander powder\b/, out: "2 tsp coriander powder" },
    { re: /\bturmeric powder\b/, out: "1/2 tsp turmeric powder" },
    { re: /\bred chilli powder\b/, out: "1 tsp red chilli powder" },
    { re: /\bchilli powder\b/, out: "1 tsp chilli powder" },
    { re: /\bkashmiri chilli powder\b/, out: "1 tsp Kashmiri chilli powder" },
    { re: /\bgaram masala\b/, out: "1 tsp garam masala" },
    { re: /\bpaprika\b/, out: "1 tsp paprika" },
    { re: /\bchaat masala\b/, out: "1/2 tsp chaat masala" },
    { re: /\bhing\b/, out: "1 pinch hing" },
    { re: /\basafetida\b/, out: "1 pinch asafoetida" },

    { re: /\bsalt\b/, out: "1 tsp salt" },
    { re: /\bblack pepper\b/, out: "1/2 tsp black pepper" },
    { re: /\bpeppercorns\b/, out: "1/2 tsp peppercorns" },

    { re: /\bcinnamon stick\b/, out: "1 small cinnamon stick" },
    { re: /\bcinnamon\b/, out: "1/2 tsp cinnamon" },
    { re: /\bcardamom\b/, out: "2 green cardamom pods" },
    { re: /\bcloves\b/, out: "3 cloves" },
    { re: /\bbay leaf\b/, out: "1 bay leaf" },

    { re: /\blemon juice\b/, out: "1 tbsp lemon juice" },
    { re: /\blime juice\b/, out: "1 tbsp lime juice" },
    { re: /\bvinegar\b/, out: "1 tbsp vinegar" },

    { re: /\bcoriander leaves\b/, out: "2 tbsp fresh coriander, chopped" },
    { re: /\bfresh coriander\b/, out: "2 tbsp fresh coriander, chopped" },
    { re: /\bcoriander\b/, out: "2 tbsp fresh coriander, chopped" },

    { re: /\bwater\b/, out: "1 cup water" },
    { re: /\bvegetable stock\b/, out: "1 cup vegetable stock" },
    { re: /\brice\b/, out: "1 cup rice" },
  ];

  for (const rule of rules) {
    if (rule.re.test(t)) return rule.out;
  }

  // Fallback: leave unknown ingredients unchanged
  return raw;
}

function getAllRecipePaths() {
  if (!fs.existsSync(RECIPES_DIR)) die(`Missing folder: ${RECIPES_DIR}`);
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => path.join(RECIPES_DIR, f))
    .filter((p) => fs.statSync(p).isFile());
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const files = getAllRecipePaths();
  if (!files.length) die("No recipe files found.");

  let updated = 0;
  let skipped = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = matter(raw);

    const title = parsed.data?.title || path.basename(filePath);
    const body = parsed.content;

    const ingBlock = extractHeadingBlock(body, "Ingredients");
    const bodyIngredients = parseBullets(ingBlock);

    const fmIngredients =
      Array.isArray(parsed.data?.ingredients) && parsed.data.ingredients.length
        ? parsed.data.ingredients.map(String)
        : [];

    const sourceIngredients = fmIngredients.length ? fmIngredients : bodyIngredients;

    if (!sourceIngredients.length) {
      warn(`No ingredients found: ${title}`);
      skipped++;
      continue;
    }

    const fixedIngredients = sourceIngredients.map((ing) => applyDefaultQuantity(ing));

    const changed =
      JSON.stringify(sourceIngredients) !== JSON.stringify(fixedIngredients);

    if (!changed) {
      skipped++;
      continue;
    }

    const nextData = {
      ...parsed.data,
      ingredients: fixedIngredients,
    };

    const nextBody = replaceIngredientsBlock(body, fixedIngredients);
    const nextMdx = matter.stringify(nextBody, nextData);

    if (dryRun) {
      ok(`[dry-run] Would update: ${path.relative(process.cwd(), filePath)}`);
    } else {
      // backup
      const bak = `${filePath}.bak-ingredients`;
      if (!fs.existsSync(bak)) {
        fs.copyFileSync(filePath, bak);
      }

      fs.writeFileSync(filePath, nextMdx, "utf8");
      ok(`Updated: ${path.relative(process.cwd(), filePath)}`);
    }

    updated++;
  }

  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Script failed:\n", err);
  process.exit(1);
});