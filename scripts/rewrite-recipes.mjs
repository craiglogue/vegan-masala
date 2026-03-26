// scripts/rewrite-recipes.mjs
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, "content", "recipes");
const OUTPUT_DIR = path.join(ROOT, "content", "recipes_rewritten");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function titleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeSpace(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function sentenceCase(s) {
  const text = normalizeSpace(s);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseIngredientLine(line) {
  const original = normalizeSpace(line);
  const lower = original.toLowerCase();

  const patterns = [
    "oil",
    "ghee",
    "onion",
    "onions",
    "shallot",
    "shallots",
    "garlic",
    "ginger",
    "green chilli",
    "green chillies",
    "chilli",
    "chilies",
    "chillies",
    "cumin seeds",
    "mustard seeds",
    "nigella seeds",
    "fennel seeds",
    "fenugreek seeds",
    "cardamom",
    "cloves",
    "cinnamon",
    "bay leaf",
    "bay leaves",
    "asafoetida",
    "hing",
    "tomato",
    "tomatoes",
    "tomato purée",
    "tomato puree",
    "passata",
    "turmeric",
    "ground cumin",
    "ground coriander",
    "coriander powder",
    "garam masala",
    "chilli powder",
    "kashmiri chilli",
    "paprika",
    "salt",
    "water",
    "stock",
    "broth",
    "chickpeas",
    "kidney beans",
    "rajma",
    "urad dal",
    "chana dal",
    "toor dal",
    "moong dal",
    "red lentils",
    "lentils",
    "beans",
    "potato",
    "potatoes",
    "aubergine",
    "eggplant",
    "cauliflower",
    "peas",
    "spinach",
    "tofu",
    "oat cream",
    "cream",
    "coconut milk",
    "kasuri methi",
    "lemon juice",
    "lime juice",
    "fresh coriander",
    "coriander leaves",
  ];

  let key = original;
  for (const p of patterns) {
    if (lower.includes(p)) {
      key = p;
      break;
    }
  }

  return { original, lower, key };
}

function ingredientPriority(line) {
  const l = normalizeSpace(line).toLowerCase();

  if (/\boil\b/.test(l)) return 10;
  if (/\bcumin seeds?\b|\bmustard seeds?\b|\bhing\b|\basafoetida\b|\bcloves?\b|\bcardamom\b|\bcinnamon\b|\bbay leaf\b|\bnigella\b|\bfennel seeds?\b|\bfenugreek seeds?\b/.test(l)) return 20;
  if (/\bonions?\b|\bshallots?\b/.test(l)) return 30;
  if (/\bgarlic\b|\bginger\b|\bgreen chilli\b|\bgreen chillies\b|\bchillies\b|\bchilies\b/.test(l)) return 40;
  if (/\bground cumin\b|\bcoriander powder\b|\bground coriander\b|\bturmeric\b|\bchilli powder\b|\bgaram masala\b|\bpaprika\b|\bkashmiri chilli\b/.test(l)) return 50;
  if (/\btomato\b|\btomatoes\b|\bpassata\b|\bpurée\b|\bpuree\b/.test(l)) return 60;
  if (/\bchickpeas\b|\bkidney beans\b|\brajma\b|\burad dal\b|\bchana dal\b|\btoor dal\b|\bmoong dal\b|\bred lentils\b|\blentils\b|\bbeans\b|\bpotato\b|\bpotatoes\b|\baubergine\b|\beggplant\b|\bcauliflower\b|\bpeas\b|\bspinach\b|\btofu\b/.test(l)) return 70;
  if (/\bsalt\b|\bwater\b|\bstock\b|\bbroth\b/.test(l)) return 80;
  if (/\bcream\b|\boat cream\b|\bcoconut milk\b|\bkasuri methi\b|\blemon juice\b|\blime juice\b/.test(l)) return 90;
  if (/\bfresh coriander\b|\bcoriander leaves\b/.test(l)) return 100;

  return 85;
}

function reorderIngredients(list) {
  return [...list]
    .map((x) => normalizeSpace(x))
    .filter(Boolean)
    .sort((a, b) => ingredientPriority(a) - ingredientPriority(b));
}

function ingredientLookup(ingredients) {
  const map = new Map();

  for (const item of ingredients) {
    const parsed = parseIngredientLine(item);
    map.set(parsed.key, item);
  }

  return map;
}

function findIngredient(map, keys) {
  for (const k of keys) {
    if (map.has(k)) return map.get(k);
  }
  return null;
}

function buildDescription(data, ingredients) {
  const title = data.title || titleFromSlug(data.slug);
  const cuisine = data.cuisine ? `${data.cuisine} ` : "";
  const lowerTitle = String(title).toLowerCase();

  if (lowerTitle.includes("dal makhani")) {
    return "A vegan dal makhani with the slow-cooked depth the dish is known for: lentils and beans simmered until rich, rounded and fully settled into the masala. This is patient, family-style North Indian cooking, made for serving hot with rice or naan.";
  }

  if (/\b(chana|chickpea)\b/.test(lowerTitle)) {
    return "A proper vegan chickpea curry built on a well-cooked onion and tomato base, warm spices and enough simmering time for the chickpeas to absorb the masala. This is generous family-table cooking, best served hot with rice, roti or naan.";
  }

  if (/\bdal|dahl|lentil\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan dal made to taste rounded, deeply savoury and properly cooked, with the lentils carrying the body of the dish rather than sitting in a thin sauce. This is the kind of family-style cooking that rewards patience and simple, dependable technique.`;
  }

  if (/\baloo|potato\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan potato dish built on careful frying, balanced spices and the sort of practical, family-style cooking that appears on the table again and again. The best version depends on getting the masala right and giving the potatoes time to absorb it.`;
  }

  if (/\bnaan|chapati|roti|poori|flatbread\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan flatbread recipe with the warmth and rhythm of everyday Indian cooking: practical, satisfying and best eaten fresh. This version keeps the spirit of the original while staying straightforward to make at home.`;
  }

  if (/\bpakora|bhaji|samosa\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan snack recipe built on proper seasoning, good texture and the sort of family-style cooking that is meant to be served hot and shared. The aim here is crispness, warmth and enough spice to keep every bite interesting.`;
  }

  return `A ${cuisine}vegan Indian recipe built around proper masalas, dependable technique and the generous spirit of family-style cooking. This is the kind of dish that earns a regular place at the table because it is full of character, warmth and real flavour.`;
}

function rewriteNotes(data, ingredients, instructions) {
  const title = String(data.title || "").toLowerCase();
  const notes = [];

  if (title.includes("dal")) {
    notes.push("Do not rush the final simmer. Good dal develops its texture and depth gradually, and it should taste settled rather than sharp.");
    notes.push("If the dal becomes too thick, loosen it with a splash of hot water. It should be rich and spoonable, not stiff.");
  } else if (title.includes("chana")) {
    notes.push("Do not rush the onion and tomato stages. Much of the character in chana masala comes from cooking the base until it tastes rounded rather than sharp.");
    notes.push("If you prefer a thicker texture, mash a small spoonful of the chickpeas into the sauce during the final simmer.");
  } else {
    notes.push("The flavour of this dish depends on cooking the masala properly, not just combining the ingredients quickly.");
    notes.push("Taste before serving and adjust the salt, acidity or heat only once the dish has finished cooking fully.");
  }

  notes.push("Leftovers often taste even better the next day once the spices have had more time to settle.");
  notes.push("Store leftovers in an airtight container in the fridge for up to 3 days.");

  return notes;
}

function stepHasQuantityText(step) {
  return /\b\d/.test(step) || /\b(one|two|three|half|quarter)\b/i.test(step);
}

function rewriteInstructions(data, ingredients) {
  const map = ingredientLookup(ingredients);
  const title = String(data.title || "").toLowerCase();
  const steps = [];

  const oil = findIngredient(map, ["oil"]) || "2 tbsp oil";
  const onion = findIngredient(map, ["onion", "onions"]) || "1 onion, finely chopped";
  const garlic = findIngredient(map, ["garlic"]);
  const ginger = findIngredient(map, ["ginger"]);
  const greenChillies = findIngredient(map, ["green chilli", "green chillies"]);
  const wholeSpices = [
    findIngredient(map, ["cumin seeds"]),
    findIngredient(map, ["mustard seeds"]),
    findIngredient(map, ["cloves"]),
    findIngredient(map, ["cardamom"]),
    findIngredient(map, ["cinnamon"]),
    findIngredient(map, ["bay leaf"]),
    findIngredient(map, ["hing", "asafoetida"]),
  ].filter(Boolean);

  const groundSpices = [
    findIngredient(map, ["ground cumin"]),
    findIngredient(map, ["ground coriander"]),
    findIngredient(map, ["turmeric"]),
    findIngredient(map, ["chilli powder"]),
    findIngredient(map, ["garam masala"]),
    findIngredient(map, ["paprika"]),
    findIngredient(map, ["kashmiri chilli"]),
  ].filter(Boolean);

  const tomatoes =
    findIngredient(map, ["tomato", "tomatoes", "tomato purée", "tomato puree", "passata"]);
  const mainIngredient = [
    findIngredient(map, ["chickpeas"]),
    findIngredient(map, ["kidney beans", "rajma"]),
    findIngredient(map, ["urad dal"]),
    findIngredient(map, ["chana dal"]),
    findIngredient(map, ["toor dal"]),
    findIngredient(map, ["moong dal"]),
    findIngredient(map, ["red lentils", "lentils"]),
    findIngredient(map, ["potato", "potatoes"]),
    findIngredient(map, ["aubergine", "eggplant"]),
    findIngredient(map, ["cauliflower"]),
    findIngredient(map, ["peas"]),
    findIngredient(map, ["spinach"]),
    findIngredient(map, ["tofu"]),
  ].filter(Boolean);

  const salt = findIngredient(map, ["salt"]);
  const water = findIngredient(map, ["water", "stock", "broth"]);
  const cream = findIngredient(map, ["oat cream", "cream", "coconut milk"]);
  const kasuriMethi = findIngredient(map, ["kasuri methi"]);
  const lemon = findIngredient(map, ["lemon juice", "lime juice"]);
  const coriander = findIngredient(map, ["fresh coriander", "coriander leaves"]);

  if (title.includes("dal makhani")) {
    const uradDal = findIngredient(map, ["urad dal"]) || "1 cup whole urad dal, rinsed";
    const kidneyBeans = findIngredient(map, ["kidney beans", "rajma"]) || "1 tin kidney beans, drained and rinsed";
    const waterText = water || "4 cups water, plus more as needed";

    steps.push(`Soak ${uradDal} overnight in plenty of water. Drain and rinse well the next day.`);
    steps.push(`Add ${uradDal} and ${kidneyBeans} to a pressure cooker with ${waterText}. Cook until the lentils are very soft and beginning to break down. Set aside with the cooking liquid.`);
    if (tomatoes) {
      steps.push(`Blend ${tomatoes} into a smooth purée and keep ready.`);
    }
    if (wholeSpices.length) {
      steps.push(`Heat ${oil} in a heavy pan over medium heat. Add ${wholeSpices.join(", ")} and fry for 20 to 30 seconds, until fragrant.`);
    } else {
      steps.push(`Heat ${oil} in a heavy pan over medium heat.`);
    }
    steps.push(`Add ${onion} and cook for 8 to 10 minutes, stirring regularly, until soft and lightly golden.`);
    if (garlic || greenChillies || ginger) {
      const aromatics = [garlic, ginger, greenChillies].filter(Boolean).join(", ");
      steps.push(`Stir in ${aromatics}. Cook briefly, just until the raw smell fades.`);
    }
    if (tomatoes || groundSpices.length || salt) {
      steps.push(`Add ${[tomatoes, ...groundSpices, salt].filter(Boolean).join(", ")} and cook until the masala thickens, darkens slightly and looks glossy.`);
    }
    steps.push(`Add the cooked lentils, beans and their cooking liquid to the pan. Stir well and add a little extra water if needed to loosen the mixture.`);
    steps.push(`Simmer on low heat for 25 to 30 minutes, stirring often so the dal does not catch. The texture should become thick, creamy and gently cohesive.`);
    if (cream || kasuriMethi) {
      const finishers = [cream, kasuriMethi].filter(Boolean).join(" and ");
      steps.push(`Stir in ${finishers} and cook for a few more minutes, until the dal tastes rounded and fully settled.`);
    }
    if (coriander) {
      steps.push(`Finish with ${coriander} and serve hot.`);
    }

    return steps;
  }

  if (title.includes("chana masala")) {
    steps.push(`Heat ${oil} in a wide pan over medium heat.`);
    steps.push(`Add ${onion} and fry until soft, golden and beginning to sweeten.`);
    if (garlic || ginger) {
      steps.push(`Add ${[garlic, ginger].filter(Boolean).join(" and ")} and cook briefly, just until the raw smell fades.`);
    }
    if (groundSpices.length) {
      steps.push(`Stir in ${groundSpices.join(", ")} and fry for 15 to 20 seconds, stirring constantly so the spices bloom without catching.`);
    }
    if (tomatoes) {
      steps.push(`Add ${tomatoes} and cook until the mixture thickens and loses its raw tomato smell.`);
    }
    if (mainIngredient.length || salt || water) {
      steps.push(`Add ${[...mainIngredient, salt, water].filter(Boolean).join(", ")} and stir well.`);
    }
    steps.push(`Simmer until the chickpeas have absorbed the masala and the sauce is thick enough to coat them rather than pool around them.`);
    if (lemon || coriander) {
      steps.push(`Stir in ${[lemon, coriander].filter(Boolean).join(" and ")}, taste and adjust the seasoning if needed, then serve hot.`);
    }
    return steps;
  }

  if (wholeSpices.length) {
    steps.push(`Heat ${oil} over medium heat. Add ${wholeSpices.join(", ")} and fry briefly until fragrant.`);
  } else {
    steps.push(`Heat ${oil} over medium heat.`);
  }

  if (onion) {
    steps.push(`Add ${onion} and cook until soft and lightly golden.`);
  }

  if (garlic || ginger || greenChillies) {
    steps.push(`Stir in ${[garlic, ginger, greenChillies].filter(Boolean).join(", ")} and cook briefly until the raw smell fades.`);
  }

  if (groundSpices.length) {
    steps.push(`Add ${groundSpices.join(", ")} and cook for 15 to 20 seconds, stirring so the spices bloom without scorching.`);
  }

  if (tomatoes) {
    steps.push(`Add ${tomatoes} and cook until the masala thickens and loses its raw edge.`);
  }

  if (mainIngredient.length) {
    const extras = [salt, water].filter(Boolean);
    steps.push(`Add ${[...mainIngredient, ...extras].join(", ")} and stir well so everything is coated in the masala.`);
    steps.push(`Simmer until the main ingredients are properly cooked and the sauce has enough body to cling to them.`);
  }

  if (cream || kasuriMethi || lemon) {
    steps.push(`Finish with ${[cream, kasuriMethi, lemon].filter(Boolean).join(", ")} and cook just long enough for the flavours to settle.`);
  }

  if (coriander) {
    steps.push(`Scatter over ${coriander} before serving.`);
  }

  return steps;
}

function renderList(items, numbered = false) {
  return items
    .map((item, i) => (numbered ? `${i + 1}. ${item}` : `- ${item}`))
    .join("\n");
}

function buildBody(ingredients, instructions, notes) {
  return [
    "## Ingredients",
    renderList(ingredients, false),
    "",
    "## Method",
    renderList(instructions, true),
    "",
    "## Notes",
    renderList(notes, false),
    "",
  ].join("\n");
}

function rewriteRecipeFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);

  const originalIngredients = Array.isArray(data.ingredients) ? data.ingredients.map(normalizeSpace).filter(Boolean) : [];
  if (!originalIngredients.length) return null;

  const rewrittenIngredients = reorderIngredients(originalIngredients);
  const rewrittenInstructions = rewriteInstructions(data, rewrittenIngredients);
  const rewrittenNotes = rewriteNotes(data, rewrittenIngredients, rewrittenInstructions);
  const rewrittenDescription = buildDescription(data, rewrittenIngredients);

  const nextData = {
    ...data,
    description: rewrittenDescription,
    ingredients: rewrittenIngredients,
    instructions: rewrittenInstructions,
    notes: rewrittenNotes,
  };

  const body = buildBody(rewrittenIngredients, rewrittenInstructions, rewrittenNotes);
  const frontmatter = yaml.dump(nextData, {
    lineWidth: 1000,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
  });

  return `---\n${frontmatter}---\n${body}`;
}

function main() {
  ensureDir(OUTPUT_DIR);

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort();

  let written = 0;

  for (const file of files) {
    const inPath = path.join(INPUT_DIR, file);
    const outPath = path.join(OUTPUT_DIR, file);

    try {
      const rewritten = rewriteRecipeFile(inPath);
      if (!rewritten) {
        console.log(`SKIP  ${file}`);
        continue;
      }

      fs.writeFileSync(outPath, rewritten, "utf8");
      written += 1;
      console.log(`WROTE ${file}`);
    } catch (err) {
      console.error(`FAIL  ${file}`);
      console.error(err);
    }
  }

  console.log(`\nDone. Rewrote ${written} recipe files into ${OUTPUT_DIR}`);
}

main();