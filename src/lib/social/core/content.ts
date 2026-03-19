import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();

export type ContentType = "recipe" | "guide";

export function ensureDir(dir: string) {

  if (!fs.existsSync(dir)) {

    fs.mkdirSync(dir,{
      recursive:true
    });

  }

}

export function slugFromFile(file:string){

  return file
    .replace(".md","")
    .replace(".mdx","");

}

export function titleFromSlug(slug:string){

  return slug
    .replace(/-/g," ")
    .replace(/\b\w/g,c=>c.toUpperCase());

}

export function detectContentTypeBySlug(slug:string):ContentType | null{

  const recipePath=path.join(process.cwd(),"content","recipes",`${slug}.md`);
  const guidePath=path.join(process.cwd(),"content","guides",`${slug}.md`);

  if(fs.existsSync(recipePath)) return "recipe";

  if(fs.existsSync(guidePath)) return "guide";

  return null;

}

export function latestContent(){

  const recipesDir=path.join(process.cwd(),"content","recipes");
  const guidesDir=path.join(process.cwd(),"content","guides");

  const items:any[]=[];

  if(fs.existsSync(recipesDir)){

    for(const file of fs.readdirSync(recipesDir)){

      items.push({

        file,
        type:"recipe",
        time:fs.statSync(
          path.join(recipesDir,file)
        ).mtime.getTime()

      });

    }

  }

  if(fs.existsSync(guidesDir)){

    for(const file of fs.readdirSync(guidesDir)){

      items.push({

        file,
        type:"guide",
        time:fs.statSync(
          path.join(guidesDir,file)
        ).mtime.getTime()

      });

    }

  }

  if(!items.length) return null;

  items.sort((a,b)=>b.time-a.time);

  return items[0];

}

export function allContent(){

  const recipesDir=path.join(process.cwd(),"content","recipes");
  const guidesDir=path.join(process.cwd(),"content","guides");

  const items:any[]=[];

  if(fs.existsSync(recipesDir)){

    for(const file of fs.readdirSync(recipesDir)){

      items.push({

        file,
        type:"recipe"

      });

    }

  }

  if(fs.existsSync(guidesDir)){

    for(const file of fs.readdirSync(guidesDir)){

      items.push({

        file,
        type:"guide"

      });

    }

  }

  return items;

}