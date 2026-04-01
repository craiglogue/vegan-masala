import { renderInstagramBySlug } from "../src/lib/social/instagram/render.ts";

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: node scripts/test-instagram-render.mjs <slug>");
  process.exit(1);
}

renderInstagramBySlug(slug)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });