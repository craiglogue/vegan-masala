export type RecipeCollection = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
};

export const RECIPE_COLLECTIONS: RecipeCollection[] = [
  {
    slug: "vegan-indian-potato-recipes",
    title: "Vegan Indian Potato Recipes",
    description: "Aloo curries, dry potato dishes and Indian snacks built around one of the most useful ingredients in the vegan kitchen.",
    tags: ["aloo", "potato", "potatoes", "dum aloo"],
  },
  {
    slug: "vegan-indian-tofu-recipes",
    title: "Vegan Indian Tofu Recipes",
    description: "Tofu curries and paneer-style vegan adaptations, from butter masala and korma to regional sauces.",
    tags: ["tofu", "paneer", "tofu curry", "tofu masala"],
  },
  {
    slug: "vegan-indian-rice-recipes",
    title: "Vegan Indian Rice and Biryani Recipes",
    description: "Basmati rice, pulao, biryani and practical rice dishes for complete vegan Indian meals.",
    tags: ["rice", "biryani", "pulao", "pulav", "basmati"],
  },
  {
    slug: "vegan-indian-bread-recipes",
    title: "Vegan Indian Bread Recipes",
    description: "Roti, chapati, naan, poori and other breads with clear methods for dough, shaping and cooking.",
    tags: ["naan", "roti", "chapati", "poori", "flatbread", "dosa"],
  },
  {
    slug: "vegan-indian-snack-recipes",
    title: "Vegan Indian Snacks and Street Food",
    description: "Pakora, bhaji, samosa, tikki and street-food favourites with practical frying and serving guidance.",
    tags: ["pakora", "bhaji", "samosa", "tikki", "vada pav", "gobi 65", "snack"],
  },
  {
    slug: "vegan-indian-chutney-recipes",
    title: "Vegan Indian Chutney Recipes",
    description: "Fresh, nutty, sweet and tangy chutneys for snacks, dosa, rice dishes and everyday meals.",
    tags: ["chutney", "coriander chutney", "coconut chutney", "tamarind chutney"],
  },
  {
    slug: "vegan-indian-sweets-recipes",
    title: "Vegan Indian Sweets",
    description: "Vegan versions of Indian sweets and desserts, with technique-led guidance for texture and storage.",
    tags: ["sweet", "dessert", "jalebi", "gulab jamun", "kheer", "rasgulla", "barfi"],
  },
];

export function getRecipeCollection(slug: string) {
  return RECIPE_COLLECTIONS.find((collection) => collection.slug === slug);
}

export function getCollectionsForRecipe(recipe: { title?: string; slug?: string; tags?: string[] }) {
  const text = [recipe.title, recipe.slug, ...(recipe.tags ?? [])].join(" ").toLowerCase();
  return RECIPE_COLLECTIONS.filter((collection) =>
    collection.tags.some((tag) => text.includes(tag.toLowerCase()))
  );
}
