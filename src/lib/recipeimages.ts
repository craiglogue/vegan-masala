// src/lib/recipeimages.ts

const PLACEHOLDER = "/brand/image-coming-soon.jpg";

// Only keep true exceptions here
const OVERRIDES: Record<string, string> = {
  "easy-butter-bean-curry": "/images/recipes/butterbean-curry.png",
  "eggplant-curry-south-indian-brinjal-curry": "/images/recipes/egg-plant-curry.png",
  "veg-kurma-recipe-hotel-style-vegetable-korma": "/images/recipes/veg-kurma.png",
  "sweet-potato-chickpea-spinach-curry": "/images/recipes/sweetpotato-chickpea-spinach-recipe.png",
  "instant-pot-chana-masala": "/images/recipes/instant-pot-chana-masala.png",
};

export function getRecipeImage(slug: string): string {
  if (!slug) return PLACEHOLDER;
  return OVERRIDES[slug] || `/images/recipes/${slug}.png`;
}

export function isPlaceholderImage(src: string) {
  return src === PLACEHOLDER;
}

export function resetRecipeImageIndex() {
  // no-op now
}