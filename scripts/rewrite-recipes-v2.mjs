// scripts/rewrite-recipes-v2.mjs
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

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function titleFromSlug(slug) {
  return normalizeSpace(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isArrayOfStrings(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function parseIngredientLine(line) {
  const original = normalizeSpace(line);
  const lower = original.toLowerCase();

  return { original, lower };
}

function priorityForIngredient(line) {
  const l = normalizeSpace(line).toLowerCase();

  if (/\boil\b|\bghee\b/.test(l)) return 10;
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

function ingredientLooksOutOfOrder(ingredients) {
  const scores = ingredients.map(priorityForIngredient);
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] < scores[i - 1]) return true;
  }
  return false;
}

function reorderIngredientsConservatively(ingredients) {
  const clean = ingredients.map(normalizeSpace).filter(Boolean);
  if (!ingredientLooksOutOfOrder(clean)) return clean;

  return [...clean].sort((a, b) => priorityForIngredient(a) - priorityForIngredient(b));
}

function buildLookup(ingredients) {
  const entries = ingredients.map((line) => parseIngredientLine(line));

  function find(patterns) {
    for (const pattern of patterns) {
      const found = entries.find((e) => e.lower.includes(pattern));
      if (found) return found.original;
    }
    return null;
  }

  return { find };
}

function buildDescription(data, ingredients) {
  const title = String(data.title || titleFromSlug(data.slug || ""));
  const cuisine = typeof data.cuisine === "string" ? `${data.cuisine} ` : "";
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("dal makhani")) {
    return "A vegan dal makhani with the slow-cooked depth the dish is known for: lentils and beans simmered until rich, rounded and properly settled into the masala. This is patient, family-style North Indian cooking, best served hot with rice or naan.";
  }

  if (lowerTitle.includes("chana masala")) {
    return "A proper vegan chana masala built on a well-cooked onion and tomato base, warm spices and chickpeas simmered until they absorb the masala. This is generous family-style cooking, made for serving hot with rice, roti or naan.";
  }

  if (/\bdal|dahl|lentil\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan dal made to taste rounded, savoury and properly cooked, with the lentils giving the dish its body rather than sitting in a thin sauce. This is the kind of family-style cooking that rewards patience and a careful hand with the masala.`;
  }

  if (/\baloo|potato\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan potato dish built on balanced spices, a properly cooked masala and the sort of practical family cooking that earns a regular place at the table. The best version depends on giving the potatoes time to absorb the seasoning rather than rushing the pan.`;
  }

  if (/\bnaan|chapati|roti|poori|flatbread\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan flatbread recipe with the warmth and rhythm of everyday Indian cooking: practical, satisfying and best eaten fresh. This version keeps the spirit of family-table cooking while staying straightforward to make at home.`;
  }

  if (/\bpakora|bhaji|samosa\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan snack recipe built around good seasoning, proper texture and the sort of cooking that is meant to be served hot and shared. The aim is warmth, contrast and enough spice to keep every bite interesting.`;
  }

  if (/\bcurry|masala|vindaloo|korma|makhani|makhanwala\b/.test(lowerTitle)) {
    return `A ${cuisine}vegan curry built around proper masalas, dependable technique and the generous spirit of family-style cooking. The goal is a sauce with real depth and body, not just heat or colour.`;
  }

  return `A ${cuisine}vegan Indian recipe built around proper masalas, dependable technique and the warmth of family-style cooking. This is the kind of dish that deserves a regular place at the table because it brings real flavour and practical kitchen confidence together.`;
}

function buildNotes(data, ingredients) {
  const title = String(data.title || "").toLowerCase();
  const notes = [];

  if (title.includes("dal")) {
    notes.push("Do not rush the final simmer. Good dal develops its body gradually, and it should taste rounded rather than sharp.");
    notes.push("If the mixture becomes too thick, loosen it with a splash of hot water. It should be rich and spoonable, not stiff.");
  } else if (title.includes("chana")) {
    notes.push("Do not rush the onion and tomato stages. Much of the character in chana masala comes from cooking the base until it tastes rounded rather than sharp.");
    notes.push("If you prefer a thicker texture, mash a small spoonful of the chickpeas into the sauce during the final simmer.");
  } else if (title.includes("aloo") || title.includes("potato")) {
    notes.push("Give the potatoes enough time to absorb the masala properly. A good potato dish should taste seasoned all the way through, not just coated at the end.");
    notes.push("If the spices begin to catch, lower the heat and add a small splash of water rather than letting the masala burn.");
  } else {
    notes.push("The flavour of this dish depends on cooking the masala properly rather than rushing straight to the final simmer.");
    notes.push("Taste before serving and adjust the salt, heat or acidity only once the dish has cooked fully.");
  }

  notes.push("Leftovers often taste even better the next day once the spices have had more time to settle.");
  notes.push("Store leftovers in an airtight container in the fridge for up to 3 days.");

  return notes;
}

function buildInstructions(data, ingredients, originalInstructions) {
  const { find } = buildLookup(ingredients);
  const title = String(data.title || "").toLowerCase();

  const oil = find(["oil"]) || "2 tbsp oil";
  const onion = find(["onion", "onions"]) || null;
  const garlic = find(["garlic"]) || null;
  const ginger = find(["ginger"]) || null;
  const greenChillies = find(["green chilli", "green chillies", "chilies", "chillies"]) || null;

  const wholeSpices = [
    find(["cumin seeds"]),
    find(["mustard seeds"]),
    find(["cloves"]),
    find(["cardamom"]),
    find(["cinnamon"]),
    find(["bay leaf"]),
    find(["asafoetida", "hing"]),
  ].filter(Boolean);

  const groundSpices = [
    find(["ground cumin"]),
    find(["ground coriander", "coriander powder"]),
    find(["turmeric"]),
    find(["chilli powder", "kashmiri chilli", "paprika"]),
    find(["garam masala"]),
  ].filter(Boolean);

  const tomatoes = find(["tomato purée", "tomato puree", "tomatoes", "tomato", "passata"]);
  const salt = find(["salt"]);
  const water = find(["water", "stock", "broth"]);
  const cream = find(["oat cream", "cream", "coconut milk"]);
  const kasuriMethi = find(["kasuri methi"]);
  const lemon = find(["lemon juice", "lime juice"]);
  const coriander = find(["fresh coriander", "coriander leaves"]);

  const mains = [
    find(["chickpeas"]),
    find(["kidney beans", "rajma"]),
    find(["urad dal"]),
    find(["chana dal"]),
    find(["toor dal"]),
    find(["moong dal"]),
    find(["red lentils", "lentils"]),
    find(["potato", "potatoes"]),
    find(["aubergine", "eggplant"]),
    find(["cauliflower"]),
    find(["peas"]),
    find(["spinach"]),
    find(["tofu"]),
  ].filter(Boolean);

  const hasUsableOriginals =
    Array.isArray(originalInstructions) &&
    originalInstructions.length >= 3 &&
    originalInstructions.every((x) => typeof x === "string");

  if (title.includes("dal makhani")) {
    const uradDal = find(["urad dal"]) || "1 cup whole urad dal, rinsed";
    const kidneyBeans = find(["kidney beans", "rajma"]) || "1 tin kidney beans, drained and rinsed";
    const waterText = water || "4 cups water, plus more as needed";

    return [
      `Soak ${uradDal} overnight in plenty of water. Drain and rinse well the next day.`,
      `Add ${uradDal} and ${kidneyBeans} to a pressure cooker with ${waterText}. Cook until the lentils are very soft and beginning to break down. Set aside with the cooking liquid.`,
      tomatoes ? `Blend ${tomatoes} into a smooth purée and keep ready.` : `Prepare the tomatoes so they are ready to go into the pan once the onions are cooked.`,
      wholeSpices.length
        ? `Heat ${oil} in a heavy pan over medium heat. Add ${wholeSpices.join(", ")} and fry briefly until fragrant.`
        : `Heat ${oil} in a heavy pan over medium heat.`,
      onion
        ? `Add ${onion} and cook until soft and lightly golden.`
        : `Add the onion and cook until soft and lightly golden.`,
      [garlic, ginger, greenChillies].filter(Boolean).length
        ? `Stir in ${[garlic, ginger, greenChillies].filter(Boolean).join(", ")} and cook briefly until the raw smell fades.`
        : `Add the aromatics and cook briefly until fragrant.`,
      [tomatoes, ...groundSpices, salt].filter(Boolean).length
        ? `Add ${[tomatoes, ...groundSpices, salt].filter(Boolean).join(", ")} and cook until the masala thickens and looks glossy.`
        : `Add the masala ingredients and cook until thick and glossy.`,
      `Add the cooked lentils, beans and their cooking liquid to the pan. Stir well and loosen with a little extra water if needed.`,
      `Simmer on low heat, stirring often, until the dal becomes thick, creamy and well integrated.`,
      [cream, kasuriMethi].filter(Boolean).length
        ? `Stir in ${[cream, kasuriMethi].filter(Boolean).join(" and ")} and cook for a few more minutes, until the dal tastes rounded and settled.`
        : `Finish the dal over low heat until it tastes rounded and settled.`,
      coriander
        ? `Finish with ${coriander} and serve hot.`
        : `Serve hot.`,
    ];
  }

  if (!hasUsableOriginals) {
    const fallback = [];

    fallback.push(
      wholeSpices.length
        ? `Heat ${oil} over medium heat. Add ${wholeSpices.join(", ")} and fry briefly until fragrant.`
        : `Heat ${oil} over medium heat.`
    );

    if (onion) fallback.push(`Add ${onion} and cook until soft and lightly golden.`);
    if ([garlic, ginger, greenChillies].filter(Boolean).length) {
      fallback.push(
        `Stir in ${[garlic, ginger, greenChillies].filter(Boolean).join(", ")} and cook briefly until the raw smell fades.`
      );
    }
    if (groundSpices.length) {
      fallback.push(`Add ${groundSpices.join(", ")} and cook briefly so the spices bloom without scorching.`);
    }
    if (tomatoes) {
      fallback.push(`Add ${tomatoes} and cook until the masala thickens and loses its raw edge.`);
    }
    if (mains.length || salt || water) {
      fallback.push(`Add ${[...mains, salt, water].filter(Boolean).join(", ")} and cook until the dish is properly settled and the flavours have come together.`);
    }
    if ([cream, kasuriMethi, lemon].filter(Boolean).length) {
      fallback.push(`Finish with ${[cream, kasuriMethi, lemon].filter(Boolean).join(", ")} and cook briefly so the final flavours settle.`);
    }
    if (coriander) fallback.push(`Scatter over ${coriander} before serving.`);

    return fallback;
  }

  // Conservative rewrite of existing instructions:
  const rewritten = originalInstructions.map((step) => normalizeSpace(step)).filter(Boolean);

  return rewritten.map((step, index) => {
    const lower = step.toLowerCase();

    if (/heat/.test(lower) && /oil/.test(lower) && !/\b\d/.test(step)) {
      return step.replace(/oil/i, oil);
    }

    if (/onion/.test(lower) && onion && !/\b\d/.test(step)) {
      return step.replace(/onion[s]?/i, onion);
    }

    if (/garlic/.test(lower) && garlic && !step.includes(garlic)) {
      step = step.replace(/garlic/i, garlic);
    }

    if (/ginger/.test(lower) && ginger && !step.includes(ginger)) {
      step = step.replace(/ginger/i, ginger);
    }

    if (/tomato/.test(lower) && tomatoes && !step.includes(tomatoes)) {
      step = step.replace(/tomato(?:es)?(?: pur[eé]e)?/i, tomatoes);
    }

    if (/salt/.test(lower) && salt && !step.includes(salt)) {
      step = step.replace(/salt/i, salt);
    }

    if (/lemon/.test(lower) && lemon && !step.includes(lemon)) {
      step = step.replace(/lemon juice/i, lemon);
    }

    if (/coriander/.test(lower) && coriander && !step.includes(coriander)) {
      step = step.replace(/fresh coriander|coriander/i, coriander);
    }

    if (/chickpea/.test(lower) && mains.some((m) => /chickpeas/.test(m.toLowerCase()))) {
      const chickpeas = mains.find((m) => /chickpeas/.test(m.toLowerCase()));
      if (chickpeas && !step.includes(chickpeas)) {
        step = step.replace(/chickpeas?/i, chickpeas);
      }
    }

    if (/kidney beans|rajma/.test(lower)) {
      const beans = mains.find((m) => /kidney beans|rajma/.test(m.toLowerCase()));
      if (beans && !step.includes(beans)) {
        step = step.replace(/kidney beans|rajma/i, beans);
      }
    }

    return step;
  });
}

function renderList(items, numbered = false) {
  return items.map((item, i) => (numbered ? `${i + 1}. ${item}` : `- ${item}`)).join("\n");
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

  const originalIngredients = isArrayOfStrings(data.ingredients)
    ? data.ingredients.map(normalizeSpace).filter(Boolean)
    : [];
  const originalInstructions = isArrayOfStrings(data.instructions)
    ? data.instructions.map(normalizeSpace).filter(Boolean)
    : [];
  const originalNotes = isArrayOfStrings(data.notes)
    ? data.notes.map(normalizeSpace).filter(Boolean)
    : [];

  if (!originalIngredients.length) return null;

  const rewrittenIngredients = reorderIngredientsConservatively(originalIngredients);
  const rewrittenInstructions = buildInstructions(data, rewrittenIngredients, originalInstructions);
  const rewrittenNotes =
    originalNotes.length >= 2 ? buildNotes(data, rewrittenIngredients) : buildNotes(data, rewrittenIngredients);
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
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    try {
      const rewritten = rewriteRecipeFile(inputPath);
      if (!rewritten) {
        console.log(`SKIP  ${file}`);
        continue;
      }

      fs.writeFileSync(outputPath, rewritten, "utf8");
      written += 1;
      console.log(`WROTE ${file}`);
    } catch (err) {
      console.error(`FAIL  ${file}`);
      console.error(err);
    }
  }

  console.log(`\nDone. Rewrote ${written} files into ${OUTPUT_DIR}`);
}

main();