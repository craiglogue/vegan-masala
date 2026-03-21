import fs from "node:fs";
import path from "node:path";

export type ContentType = "recipe" | "guide";

const ROOT =
process.env.VERCEL
? "/var/task"
: process.cwd();

const RECIPES_DIR =
path.join(ROOT,"content","recipes");

const GUIDES_DIR =
path.join(ROOT,"content","guides");

export function ensureDir(dir:string){

if(!fs.existsSync(dir)){

fs.mkdirSync(dir,{
recursive:true
});

}

}

function list(dir:string,type:ContentType){

if(!fs.existsSync(dir)) return [];

return fs.readdirSync(dir)

.filter(f=>
f.endsWith(".mdx") ||
f.endsWith(".md")
)

.filter(f=>
!f.includes(".bak")
)

.map(file=>({

file,

type

}));

}

export function allContent(){

return [

...list(RECIPES_DIR,"recipe"),

...list(GUIDES_DIR,"guide")

];

}

export function slugFromFile(file:string){

return file

.replace(".mdx","")
.replace(".md","");

}

export function titleFromSlug(slug:string){

return slug

.replace(/-/g," ")

.replace(/\b\w/g,
c=>c.toUpperCase()
);

}

export function detectContentTypeBySlug(slug:string){

const recipePath =
path.join(
RECIPES_DIR,
`${slug}.mdx`
);

const guidePath =
path.join(
GUIDES_DIR,
`${slug}.mdx`
);

if(fs.existsSync(recipePath))
return "recipe";

if(fs.existsSync(guidePath))
return "guide";

return null;

}

export function latestContent(){

const items =
allContent();

if(!items.length)
return null;

return items[items.length-1];

}