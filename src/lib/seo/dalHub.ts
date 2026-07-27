const DAL_HUB_RECIPE_SLUGS = new Set([
  "indian-red-lentil-dahl",
  "pressure-cooker-indian-moong-dal",
  "slow-cooker-dal",
  "coconut-dal-with-kidney-beans",
  "spicy-lentil-bean-stew",
  "dhal-with-caraway-aubergine",
  "rajma-recipe",
  "madra-recipe-himachali-rajma-madra-recipe",
  "vegan-blackeye-bean-curry",
  "easy-butter-bean-curry",
  "saag-butter-beans",
  "palak-chole",
  "kala-chana-recipe",
  "chana-masala",
]);

export function isDalHubRecipe(slug: string) {
  return DAL_HUB_RECIPE_SLUGS.has(slug);
}

export { DAL_HUB_RECIPE_SLUGS };