import { EBOOK } from "./ebook";

function hashtags() {
  return [
    "#veganrecipes",
    "#veganindian",
    "#indiansweets",
    "#veganbaking",
    "#plantbased",
    "#veganuk",
    "#veganmasala",
  ].join("\n");
}

export function buildInstagramEbookCaption() {
  return `The ${EBOOK.title} is now available for ${EBOOK.price}.

Inside you'll find 6 comforting vegan Indian sweet recipes, plus pantry notes, troubleshooting help, and festive serving ideas.

Get your copy here:
${EBOOK.url}

${hashtags()}`;
}

export function buildFacebookEbookCaption() {
  return `The ${EBOOK.title} is now live.

It includes 6 comforting vegan sweet recipes, pantry notes, troubleshooting tips, and festive serving ideas in one beautifully designed guide.

Get your copy here:
${EBOOK.url}`;
}

export function buildPinterestEbookCaption() {
  return `Discover the ${EBOOK.title} — a beginner-friendly vegan Indian sweets ebook with 6 comforting recipes, pantry notes, troubleshooting help, and festive serving ideas.

Get it here:
${EBOOK.url}`;
}
