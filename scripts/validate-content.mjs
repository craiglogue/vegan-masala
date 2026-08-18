#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const recipesDir = path.join(root, "content", "recipes");
const publicDir = path.join(root, "public");
const strict = process.argv.includes("--strict");
const errors = [];
const warnings = [];
const seen = new Set();

function issue(list, slug, message) {
  list.push(`${slug}: ${message}`);
}

for (const file of fs.readdirSync(recipesDir).filter((name) => /\.mdx?$/.test(name))) {
  const raw = fs.readFileSync(path.join(recipesDir, file), "utf8");
  const { data, content } = matter(raw);
  const slug = String(data.slug || file.replace(/\.mdx?$/, ""));
  if (seen.has(slug)) issue(errors, slug, "duplicate slug");
  seen.add(slug);

  for (const field of ["title", "description", "image", "publishedAt", "cuisine"]) {
    if (!data[field]) issue(errors, slug, `missing ${field}`);
  }
  for (const field of ["ingredients", "instructions", "notes"]) {
    if (!Array.isArray(data[field]) || data[field].length === 0) issue(errors, slug, `missing ${field}`);
  }
  if (!Number.isFinite(data.prepMinutes)) issue(warnings, slug, "missing prepMinutes");
  if (!Number.isFinite(data.cookMinutes)) issue(warnings, slug, "missing cookMinutes");
  if (!Number.isFinite(data.servings)) issue(warnings, slug, "missing servings");
  if (!data.introNote) issue(warnings, slug, "missing recipe-specific introNote");
  if (!Array.isArray(data.tags) || data.tags.length === 0) issue(warnings, slug, "missing tags");
  if (String(data.description || "").length > 160) issue(warnings, slug, "description exceeds 160 characters");

  const imagePath = path.join(publicDir, String(data.image || "").replace(/^\//, ""));
  if (!fs.existsSync(imagePath)) issue(errors, slug, `missing image file ${data.image}`);
  else if (fs.statSync(imagePath).size > 1_000_000) issue(warnings, slug, "hero source exceeds 1 MB");

  const instructions = (data.instructions || []).join(" ");
  const suspicious = /\b\d+\s+(?:minced|drained|chopped)\s+\d+|\b(\d+\s+(?:tbsp|tsp|tablespoons?|teaspoons?|cans?|cloves?))\b[^.!]{0,35}\b\1\b/i;
  if (suspicious.test(instructions)) issue(errors, slug, "possible duplicated quantity in instructions; culinary review required");

  for (const heading of ["Ingredients", "Method", "Notes"]) {
    if (!new RegExp(`^## ${heading}$`, "m").test(content)) issue(errors, slug, `missing ${heading} section`);
  }
}

console.log(`Validated ${seen.size} recipes.`);
if (errors.length) console.error(`\nErrors (${errors.length}):\n- ${errors.join("\n- ")}`);
if (warnings.length) console.warn(`\nWarnings (${warnings.length}):\n- ${warnings.join("\n- ")}`);
if (errors.length || (strict && warnings.length)) process.exitCode = 1;
