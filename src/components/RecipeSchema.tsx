// src/components/RecipeSchema.tsx
type Props = {
  recipe: any;
  ingredients: string[];
  instructions: string[];
  image: string;
};

function toISO(minutes?: number) {
  if (!minutes) return undefined;
  return `PT${minutes}M`;
}

export default function RecipeSchema({
  recipe,
  ingredients,
  instructions,
  image,
}: Props) {
  const totalMinutes =
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Recipe",

    name: recipe.title,
    description: recipe.description,
    image: [`https://vegan-masala.com${image}`],

    author: {
      "@type": "Person",
      name: "Vegan Masala",
    },

    prepTime: toISO(recipe.prepMinutes),
    cookTime: toISO(recipe.cookMinutes),
    totalTime: toISO(totalMinutes),

    recipeCuisine: recipe.cuisine,
    recipeCategory: "Dinner",

    recipeYield: recipe.servings
      ? `${recipe.servings} servings`
      : undefined,

    keywords: (recipe.tags ?? []).join(", "),

    recipeIngredient: ingredients,

    recipeInstructions: instructions.map((step: string) => ({
      "@type": "HowToStep",
      text: step,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}