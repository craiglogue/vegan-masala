import fs from "node:fs";
import path from "node:path";
import type { ContentType } from "./content";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const CAPTION_DIR = path.join(ROOT,"generated","captions");

function ensure(dir:string){
fs.mkdirSync(dir,{recursive:true});
}

function titleFromSlug(slug:string){

return slug
.replace(/-/g," ")
.replace(/\b\w/g,c=>c.toUpperCase());

}

function hashtagify(slug:string){

return slug
.split("-")
.map(w=>"#"+w)
.join(" ");

}

function coreHashtags(type:ContentType){

if(type==="recipe"){

return `
#veganrecipes
#indianfood
#veganindian
#plantbased
#veganuk
#veganfoodshare
#veganmeal
#vegancooking
#easyvegan
`;

}

return `
#cookingguide
#veganbeginner
#cookingtips
#veganlifestyle
#plantbaseddiet
#veganeducation
#veganuk
`;

}

export function buildInstagramCaption(
slug:string,
type:ContentType
){

let title=titleFromSlug(slug);

let base=
type==="recipe"
?`Learn how to make ${title} at home with this authentic vegan Indian recipe.

Full step-by-step guide on Vegan Masala.
`
:
`Learn ${title} with this beginner friendly vegan cooking guide.

Full tutorial on Vegan Masala.
`;

let tags=hashtagify(slug);

return `${title}

${base}

Read more:
https://vegan-masala.com

${tags}

${coreHashtags(type)}
#veganmasala
`;
}

export function buildPinterestCaption(
slug:string,
type:ContentType
){

let title=titleFromSlug(slug);

return `
${title} – Vegan Indian ${type==="recipe"?"Recipe":"Cooking Guide"}

Learn ${title} with this easy step-by-step vegan Indian ${type}.

• Beginner friendly  
• Authentic flavours  
• Plant based  
• Easy ingredients  

Read the full guide:
https://vegan-masala.com

#veganrecipes
#indianrecipes
#plantbased
#veganfood
#vegancooking
#easyrecipes
#veganmeals
`;
}

export function buildFacebookCaption(
slug:string,
type:ContentType
){

let title=titleFromSlug(slug);

let hook=
type==="recipe"
?`Most people don't realise how easy it is to make ${title} at home 👇`
:`If you're learning vegan Indian cooking, this ${title} guide will help 👇`;

let body=
type==="recipe"
?`This authentic vegan Indian recipe shows you how to cook ${title} step-by-step using simple ingredients and traditional spices.`
:`This beginner friendly guide explains ${title} clearly so you can improve your cooking skills fast.`;

return `${hook}

${body}

Full guide:
https://vegan-masala.com

Would you try this at home? 👇
`;
}

export function saveCaption(
platform:"instagram"|"pinterest",
slug:string,
text:string
){

let dir=path.join(CAPTION_DIR,platform);

ensure(dir);

fs.writeFileSync(
path.join(dir,slug+".txt"),
text
);

}