import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import satori from "satori";

import { BRAND, getBrandFont } from "./core/brand";
import {
  allContent,
  detectContentTypeBySlug,
  ensureDir,
  latestContent,
  slugFromFile,
  titleFromSlug,
  type ContentType,
} from "./core/content";

import {
  backgroundBuffer,
  findContentImage,
  logoBuffer,
} from "./core/images";

import {
  buildInstagramCaption,
  saveCaption,
} from "./core/captions";

import { updateManifest } from "./core/manifest";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();

const OUTPUT = path.join(
  ROOT,
  "generated",
  "instagram"
);

const PUBLIC_OUTPUT =
  process.env.VERCEL
    ? null
    : path.join(
        ROOT,
        "public",
        "generated",
        "instagram"
      );

const WIDTH = 1080;
const HEIGHT = 1080;

const FONT = getBrandFont();

async function topGradient(){

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.94"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.76"/>
            <stop offset="40%" stop-color="black" stop-opacity="0.38"/>
            <stop offset="68%" stop-color="black" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>

      </svg>
    `)
  )
  .png()
  .toBuffer();

}

async function vignetteOverlay(){

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">

        <defs>
          <radialGradient id="v" cx="50%" cy="50%" r="75%">
            <stop offset="58%" stop-color="black" stop-opacity="0"/>
            <stop offset="100%" stop-color="black" stop-opacity="0.24"/>
          </radialGradient>
        </defs>

        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#v)"/>

      </svg>
    `)
  )
  .png()
  .toBuffer();

}

async function frameOverlay(){

  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">

        <rect
          x="14"
          y="14"
          width="${WIDTH-28}"
          height="${HEIGHT-28}"
          rx="34"
          ry="34"
          fill="none"
          stroke="${BRAND.border}"
          stroke-opacity="0.9"
          stroke-width="2"
        />

      </svg>
    `)
  )
  .png()
  .toBuffer();

}

function titleLines(text:string){

  const words=text.split(/\s+/).filter(Boolean);

  const lines:string[]=[];

  let current="";

  for(const word of words){

    const next=current
      ? `${current} ${word}`
      : word;

    if(next.length<=16){

      current=next;

    }else{

      if(current) lines.push(current);

      current=word;

      if(lines.length>=1) break;

    }

  }

  if(current && lines.length<2){

    lines.push(current);

  }

  return lines;

}

function buildBadge(type:ContentType){

  return type==="recipe"
    ? "RECIPE"
    : "GUIDE";

}

function buildSubtitle(type:ContentType){

  return type==="recipe"
    ? "Vegan Indian Recipe"
    : "Beginner Guide";

}

async function textOverlay(
  title:string,
  subtitle:string,
  badge:string
){

  const lines=titleLines(title);

  const element={

    type:"div",

    props:{

      style:{
        width:WIDTH,
        height:HEIGHT,
        display:"flex",
        flexDirection:"column",
        position:"relative",
        fontFamily:"Rajdhani",
      },

      children:[

        {
          type:"div",

          props:{

            style:{
              position:"absolute",
              top:42,
              left:52,
              width:690,
              color:BRAND.gold,
              fontSize:82,
              fontWeight:700,
            },

            children:lines

          }

        },

        {
          type:"div",

          props:{

            style:{
              position:"absolute",
              top:214,
              left:52,
              color:BRAND.soft,
              fontSize:50,
              fontWeight:600,
            },

            children:subtitle

          }

        },

        {
          type:"div",

          props:{

            style:{
              position:"absolute",
              top:52,
              right:52,
              backgroundColor:BRAND.red,
              color:"#fff",
              borderRadius:18,
              padding:12,
              fontSize:28,
              fontWeight:700,
            },

            children:badge

          }

        }

      ]

    }

  };

  const svg=await satori(
    element as any,
    {
      width:WIDTH,
      height:HEIGHT,
      fonts:[
        {
          name:"Rajdhani",
          data:FONT,
          weight:700,
          style:"normal"
        }
      ]
    }
  );

  return sharp(
    Buffer.from(svg)
  ).png().toBuffer();

}

async function createPost(
  slug:string,
  title:string,
  type:ContentType
){

  ensureDir(OUTPUT);

  if(PUBLIC_OUTPUT){

    ensureDir(PUBLIC_OUTPUT);

  }

  const img=findContentImage(slug,type);

  const bg=await backgroundBuffer(
    WIDTH,
    HEIGHT,
    img,
    BRAND.bg
  );

  const grad=await topGradient();

  const vignette=await vignetteOverlay();

  const frame=await frameOverlay();

  const text=await textOverlay(
    title,
    buildSubtitle(type),
    buildBadge(type)
  );

  const logo=await logoBuffer(250);

  const out=path.join(
    OUTPUT,
    `${slug}.png`
  );

  const comps:sharp.OverlayOptions[]=[

    {input:bg,left:0,top:0},

    {input:grad,left:0,top:0},

    {input:vignette,left:0,top:0},

    {input:text,left:0,top:0},

    {input:frame,left:0,top:0},

  ];

  if(logo){

    comps.push({

      input:logo,

      top:HEIGHT-290,

      left:WIDTH-290

    });

  }

  await sharp({

    create:{
      width:WIDTH,
      height:HEIGHT,
      channels:4,
      background:BRAND.bg
    }

  })
  .composite(comps)
  .png()
  .toFile(out);

  if(PUBLIC_OUTPUT){

    const publicOut=path.join(
      PUBLIC_OUTPUT,
      `${slug}.png`
    );

    fs.copyFileSync(
      out,
      publicOut
    );

  }

  const caption=buildInstagramCaption(
    slug,
    type
  );

  saveCaption(
    "instagram",
    slug,
    caption
  );

  updateManifest(
    slug,
    "instagram"
  );

  return out;

}

export async function generateInstagramBySlug(slug:string){

  const type=detectContentTypeBySlug(slug);

  if(!type){

    throw new Error("Slug not found");

  }

  await createPost(
    slug,
    titleFromSlug(slug),
    type
  );

  return{

    success:true,

    count:1,

    message:`Instagram generated for ${slug}`

  };

}

export async function generateLatestInstagram(){

  const chosen=latestContent();

  if(!chosen){

    return{
      success:false,
      count:0,
      message:"No content"
    };

  }

  const slug=slugFromFile(
    chosen.file
  );

  await createPost(
    slug,
    titleFromSlug(slug),
    chosen.type
  );

  return{

    success:true,

    count:1,

    message:"Instagram generated"

  };

}

export async function generateAllInstagram(){

  const items=allContent();

  let count=0;

  for(const item of items){

    const slug=slugFromFile(
      item.file
    );

    await createPost(
      slug,
      titleFromSlug(slug),
      item.type
    );

    count++;

  }

  return{

    success:true,

    count,

    message:"All generated"

  };

}