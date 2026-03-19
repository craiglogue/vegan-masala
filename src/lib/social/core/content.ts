import fs from "node:fs";
import path from "node:path";

export type ContentType = "recipe" | "guide";

/* Ignore backup files */
function isRealContentFile(file: string) {

  const lower = file.toLowerCase();

  const isMarkdown =
    lower.endsWith(".md") ||
    lower.endsWith(".mdx");

  const isBackup =
    lower.includes(".bak");

  return isMarkdown && !isBackup;

}

function listContentFiles(dir: string){

  if(!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter(isRealContentFile);

}

export function ensureDir(dir:string){

  if(!fs.existsSync(dir)){

    fs.mkdirSync(dir,{
      recursive:true
    });

  }

}

export function slugFromFile(file: string) {
  return file.replace(/\.mdx?$/i, "");
}

export function titleFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function detectContentTypeBySlug(
  slug:string
):ContentType | null{

  const recipeMd=path.join(
    process.cwd(),
    "content",
    "recipes",
    `${slug}.md`
  );

  const recipeMdx=path.join(
    process.cwd(),
    "content",
    "recipes",
    `${slug}.mdx`
  );

  const guideMd=path.join(
    process.cwd(),
    "content",
    "guides",
    `${slug}.md`
  );

  const guideMdx=path.join(
    process.cwd(),
    "content",
    "guides",
    `${slug}.mdx`
  );

  if(
    fs.existsSync(recipeMd) ||
    fs.existsSync(recipeMdx)
  ) return "recipe";

  if(
    fs.existsSync(guideMd) ||
    fs.existsSync(guideMdx)
  ) return "guide";

  return null;

}

export function latestContent(){

  const recipesDir=path.join(
    process.cwd(),
    "content",
    "recipes"
  );

  const guidesDir=path.join(
    process.cwd(),
    "content",
    "guides"
  );

  const items:any[]=[];

  for(const file of listContentFiles(recipesDir)){

    items.push({

      file,
      type:"recipe",

      time:fs.statSync(
        path.join(recipesDir,file)
      ).mtime.getTime()

    });

  }

  for(const file of listContentFiles(guidesDir)){

    items.push({

      file,
      type:"guide",

      time:fs.statSync(
        path.join(guidesDir,file)
      ).mtime.getTime()

    });

  }

  if(!items.length) return null;

  items.sort((a,b)=>b.time-a.time);

  return items[0];

}

export function allContent(){

  const recipesDir=path.join(
    process.cwd(),
    "content",
    "recipes"
  );

  const guidesDir=path.join(
    process.cwd(),
    "content",
    "guides"
  );

  const items:any[]=[];

  for(const file of listContentFiles(recipesDir)){

    items.push({

      file,
      type:"recipe"

    });

  }

  for(const file of listContentFiles(guidesDir)){

    items.push({

      file,
      type:"guide"

    });

  }

  return items;

}