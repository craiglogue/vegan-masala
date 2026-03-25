import path from "node:path";
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
type ContentType
} from "./core/content";

import {
backgroundBuffer,
findContentImage,
logoBuffer
} from "./core/images";

import {
buildPinterestCaption,
saveCaption
} from "./core/captions";

import { updateManifest } from "./core/manifest";
import { saveGeneratedPinterestImage } from "./core/generatedAssets";

const ROOT =
process.env.VERCEL
? "/tmp"
: process.cwd();

const OUTPUT =
path.join(
ROOT,
"generated",
"pinterest"
);

const WIDTH=1000;
const HEIGHT=1500;

const FONT=getBrandFont();

async function topGradient(){

return sharp(

Buffer.from(`

<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">

<defs>

<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">

<stop offset="0%" stop-color="black" stop-opacity="0.95"/>

<stop offset="30%" stop-color="black" stop-opacity="0.65"/>

<stop offset="60%" stop-color="black" stop-opacity="0.25"/>

<stop offset="100%" stop-color="black" stop-opacity="0"/>

</linearGradient>

</defs>

<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>

</svg>

`)

).png().toBuffer();

<<<<<<< HEAD
=======
function getBaseUrl() {
  return (
    process.env.SOCIAL_ASSET_BASE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.vegan-masala.com"
  ).replace(/\/+$/, "");
}

async function fetchBuffer(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function resolveSourceImage(
  slug: string,
  type: ContentType
): Promise<string | Buffer | null> {
  if (!process.env.VERCEL) {
    return findContentImage(slug, type);
  }

  const folder = type === "recipe" ? "recipes" : "guides";
  const baseUrl = getBaseUrl();
  const exts = ["png", "jpg", "jpeg", "webp"];

  for (const ext of exts) {
    const url = `${baseUrl}/images/${folder}/${slug}.${ext}`;
    const buffer = await fetchBuffer(url);
    if (buffer) return buffer;
  }

  return null;
}

async function topGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.95"/>
            <stop offset="28%" stop-color="black" stop-opacity="0.64"/>
            <stop offset="58%" stop-color="black" stop-opacity="0.24"/>
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

async function bottomGradient() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="black" stop-opacity="0.72"/>
            <stop offset="18%" stop-color="black" stop-opacity="0.42"/>
            <stop offset="34%" stop-color="black" stop-opacity="0.16"/>
            <stop offset="100%" stop-color="black" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
      </svg>
    `)
  )
    .png()
    .toBuffer();
>>>>>>> social-video-fix-from-clean-baseline
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
rx="40"
ry="40"
fill="none"
stroke="${BRAND.border}"
stroke-width="2"
/>

</svg>

`)

).png().toBuffer();

}

<<<<<<< HEAD
function titleLines(text:string){
=======
async function imageFrameOverlay() {
  return sharp(
    Buffer.from(`
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="84"
          y="274"
          width="832"
          height="704"
          rx="34"
          ry="34"
          fill="none"
          stroke="${BRAND.border}"
          stroke-opacity="0.95"
          stroke-width="3"
        />
      </svg>
    `)
  )
    .png()
    .toBuffer();
}

function titleLines(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let maxLen = 17;
>>>>>>> social-video-fix-from-clean-baseline

const words=text.split(/\s+/).filter(Boolean);

<<<<<<< HEAD
const lines:string[]=[];
=======
    if (next.length <= maxLen) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;

      if (lines.length === 1) maxLen = 20;
      if (lines.length === 2) maxLen = 24;
    }
  }
>>>>>>> social-video-fix-from-clean-baseline

let current="";

for(const word of words){

const next=current
? `${current} ${word}`
: word;

if(next.length<20){

current=next;

}else{

if(current) lines.push(current);

current=word;

<<<<<<< HEAD
}

=======
  if (lines.length <= 3) return lines;

  return [lines[0], lines[1], lines.slice(2).join(" ")];
}

function pickFromSeed(slug: string, options: string[]) {
  const sum = slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return options[sum % options.length];
}

function buildSubtitle(type: ContentType, slug: string) {
  if (type === "recipe") {
    return pickFromSeed(slug, [
      "Rich, cosy and full of flavour",
      "Easy vegan comfort food",
      "A hearty homemade dinner idea",
      "Simple ingredients, big flavour",
      "Warm, satisfying and comforting",
      "A flavour-packed vegan favourite",
      "Cosy food worth saving",
      "Homemade comfort, made simple",
    ]);
  }

  return pickFromSeed(slug, [
    "A simple beginner-friendly guide",
    "Cook with more confidence",
    "Make vegan Indian cooking easier",
    "Learn the essentials clearly",
    "Practical tips for better flavour",
    "A clearer way to understand it",
    "Simple guidance you can use",
    "Easy help for home cooks",
  ]);
>>>>>>> social-video-fix-from-clean-baseline
}

if(current) lines.push(current);

return lines.slice(0,3);

}

function buildSubtitle(type:ContentType){

return type==="recipe"
? "Vegan Indian Recipe"
: "Indian Cooking Guide";

}

function buildBadge(type:ContentType){

return type==="recipe"
? "RECIPE"
: "GUIDE";

}

function buildHookLine(title: string, type: ContentType, slug: string) {
  const lower = title.toLowerCase();

  if (type === "guide") {
    if (lower.includes("beginner")) return "Start Here";
    if (lower.includes("spice")) return "Better Flavour Starts Here";
    if (lower.includes("dairy")) return "Simple Everyday Swaps";
    return pickFromSeed(slug, [
      "Cook With Confidence",
      "Learn It Simply",
      "Make Cooking Easier",
      "Understand The Essentials",
      "Practical Kitchen Help",
    ]);
  }

  if (lower.includes("30 minute") || lower.includes("30-minute")) {
    return "Quick Weeknight Favourite";
  }

  if (lower.includes("easy")) {
    return "Easy Comfort Food";
  }

  if (lower.includes("restaurant") || lower.includes("hotel style")) {
    return "Restaurant Style At Home";
  }

  if (lower.includes("creamy")) {
    return "Creamy Vegan Favourite";
  }

  if (lower.includes("spicy")) {
    return "Bold, Warming Flavour";
  }

  if (lower.includes("naan")) {
    return "Homemade Favourite";
  }

  if (lower.includes("pakora")) {
    return "Crisp, Golden And Moreish";
  }

  if (lower.includes("curry")) {
    return "A Cosy Curry Night Idea";
  }

  return pickFromSeed(slug, [
    "Comfort Food Made Simple",
    "Big Flavour, Easy To Love",
    "Cosy Vegan Indian Cooking",
    "Save This Dinner Idea",
    "Warm, Hearty And Satisfying",
  ]);
}

async function textOverlay(
<<<<<<< HEAD

title:string,
subtitle:string,
badge:string
=======
  title: string,
  subtitle: string,
  badge: string,
  hook: string
) {
  const titleLinesOut = titleLines(title);
  let titleFontSize = 84;

  if (title.length > 28) titleFontSize = 76;
  if (title.length > 40) titleFontSize = 68;
  if (title.length > 56) titleFontSize = 60;

  const element = {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "Rajdhani",
        backgroundColor: "transparent",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 64,
              left: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: BRAND.red,
              color: "#fff",
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 22,
              paddingRight: 22,
              borderRadius: 20,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 1,
            },
            children: badge,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 122,
              left: 60,
              width: 880,
              display: "flex",
              flexDirection: "column",
              color: BRAND.gold,
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 0.94,
              textShadow: "0 3px 12px rgba(0,0,0,0.55)",
            },
            children: titleLinesOut.map((line) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  marginBottom: 6,
                },
                children: line,
              },
            })),
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 164,
              left: 60,
              width: 420,
              color: BRAND.gold,
              fontSize: 44,
              fontWeight: 700,
              display: "flex",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            },
            children: hook,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 108,
              left: 60,
              width: 420,
              color: BRAND.soft,
              fontSize: 28,
              fontWeight: 500,
              display: "flex",
              textShadow: "0 2px 10px rgba(0,0,0,0.45)",
            },
            children: subtitle,
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 60,
              left: 60,
              color: "#ffffff",
              fontSize: 26,
              fontWeight: 600,
              display: "flex",
              textShadow: "0 2px 10px rgba(0,0,0,0.45)",
            },
            children: "vegan-masala.com",
          },
        },
      ],
    },
  };
>>>>>>> social-video-fix-from-clean-baseline

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
fontFamily:"Rajdhani"
},

children:[

{

type:"div",

props:{

style:{
position:"absolute",
top:70,
left:60,
width:760,
display:"flex",
flexDirection:"column",
color:BRAND.gold,
fontSize:90,
fontWeight:700,
lineHeight:0.94
},

children:lines

}

},

<<<<<<< HEAD
{

type:"div",

props:{

style:{display:"flex",
position:"absolute",
top:320,
left:60,
color:BRAND.soft,
fontSize:48,
fontWeight:600
,

children:subtitle

=======
  const img = await resolveSourceImage(slug, type);
  const bg = await backgroundBuffer(WIDTH, HEIGHT, null, BRAND.bg);

  let contentImage: Buffer | null = null;
  let contentImageShadow: Buffer | null = null;

  if (img) {
    const roundedMask = Buffer.from(`
      <svg width="832" height="704" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="832" height="704" rx="30" ry="30" fill="white"/>
      </svg>
    `);

    contentImage = await sharp(img)
      .resize(832, 704, {
        fit: "cover",
      })
      .composite([
        {
          input: roundedMask,
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();

    contentImageShadow = await sharp(
      Buffer.from(`
        <svg width="860" height="732" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="black" flood-opacity="0.35"/>
            </filter>
          </defs>
          <rect
            x="14"
            y="14"
            width="832"
            height="704"
            rx="30"
            ry="30"
            fill="black"
            opacity="0.22"
            filter="url(#shadow)"
          />
        </svg>
      `)
    )
      .png()
      .toBuffer();
  }

  const gradTop = await topGradient();
  const gradBottom = await bottomGradient();
  const frame = await frameOverlay();
  const imageFrame = await imageFrameOverlay();
  const text = await textOverlay(
    title,
    buildSubtitle(type, slug),
    buildBadge(type),
    buildHookLine(title, type, slug)
  );
  const logo = await logoBuffer(220);

  const comp: sharp.OverlayOptions[] = [
    { input: bg, left: 0, top: 0 },

    ...(contentImageShadow
      ? [
          {
            input: contentImageShadow,
            left: 70,
            top: 260,
          } as sharp.OverlayOptions,
        ]
      : []),

    ...(contentImage
      ? [
          {
            input: contentImage,
            left: 84,
            top: 274,
          } as sharp.OverlayOptions,
        ]
      : []),

    { input: gradTop, left: 0, top: 0 },
    { input: gradBottom, left: 0, top: 0 },
    { input: text, left: 0, top: 0 },
    { input: imageFrame, left: 0, top: 0 },
    { input: frame, left: 0, top: 0 },
  ];

  if (logo) {
    comp.push({
      input: logo,
      top: HEIGHT - 220 - 56,
      left: WIDTH - 220 - 56,
    });
  }

  const finalPngBuffer = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BRAND.bg,
    },
  })
    .composite(comp)
    .png()
    .toBuffer();

  const out = path.join(OUTPUT, `${slug}.png`);
  await sharp(finalPngBuffer).toFile(out);

  const saved = await saveGeneratedPinterestImage(slug, finalPngBuffer);

  const caption = buildPinterestCaption(slug, type);
  saveCaption("pinterest", slug, caption);
  updateManifest(slug, "pinterest");

  return {
    slug,
    localPath: out,
    image: saved.url,
    storage: saved.storage,
    path: saved.path,
    caption,
  };
>>>>>>> social-video-fix-from-clean-baseline
}

},

<<<<<<< HEAD
{

type:"div",

props:{

style:{display:"flex",
position:"absolute",
top:400,
left:60,
background:BRAND.red,
color:"#fff",
padding:12,
borderRadius:20,
fontSize:30,
fontWeight:700
,

children:badge

=======
  if (!chosen) {
    return {
      success: false,
      count: 0,
      message: "No content found",
    };
  }

  const slug = slugFromFile(chosen.file);
  const result = await createPost(slug, titleFromSlug(slug), chosen.type);

  return {
    success: true,
    count: 1,
    slug,
    image: result.image,
    storage: result.storage,
    path: result.path,
    message: "Pinterest asset generated",
  };
>>>>>>> social-video-fix-from-clean-baseline
}

},

{

<<<<<<< HEAD
type:"div",

props:{

style:{display:"flex",
position:"absolute",
bottom:60,
left:60,
color:BRAND.soft,
fontSize:30,
fontWeight:600
,

children:"vegan-masala.com"

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

fonts:[{

name:"Rajdhani",
data:FONT,
weight:700,
style:"normal"

}]

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

const img=
findContentImage(slug,type);

const bg=
await backgroundBuffer(
WIDTH,
HEIGHT,
img,
BRAND.bg
);

const grad=
await topGradient();

const frame=
await frameOverlay();

const text=
await textOverlay(

title,
buildSubtitle(type),
buildBadge(type)

);

const logo=
await logoBuffer(260);

const out=
path.join(
OUTPUT,
`${slug}.png`
);

const comp=[

{input:bg,left:0,top:0},

{input:grad,left:0,top:0},

{input:text,left:0,top:0},

{input:frame,left:0,top:0}

];

if(logo){

comp.push({

input:logo,

top:HEIGHT-320,

left:WIDTH-320

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

.composite(comp)
.png()
.toFile(out);

const caption=
buildPinterestCaption(
slug,
type
);

saveCaption(
"pinterest",
slug,
caption
);

updateManifest(
slug,
"pinterest"
);

return{

path:out,

imageUrl:
`https://vegan-masala.com/generated/pinterest/${slug}.png`

};

}

export async function generatePinterestBySlug(slug:string){

const type=
detectContentTypeBySlug(slug);

if(!type){

throw new Error(
"Slug not found"
);

}

const result=
await createPost(

slug,
titleFromSlug(slug),
type

);

return{

success:true,
count:1,
imageUrl:result.imageUrl

};

}

export async function generateLatestPinterest(){

const chosen=
latestContent();

if(!chosen){

return{

success:false,
count:0

};

}

const slug=
slugFromFile(
chosen.file
);

await createPost(

slug,
titleFromSlug(slug),
chosen.type

);

return{

success:true,
count:1

};

}

export async function generateAllPinterest(){

const items=
allContent();

let count=0;

for(const item of items){

const slug=
slugFromFile(item.file);

await createPost(

slug,
titleFromSlug(slug),
item.type

);

count++;

}

return{

success:true,
count

};

=======
  const result = await createPost(slug, titleFromSlug(slug), type);

  return {
    success: true,
    count: 1,
    slug,
    image: result.image,
    storage: result.storage,
    path: result.path,
    message: `Pinterest asset generated for ${slug}`,
  };
}

export async function generateAllPinterest() {
  const items = allContent();
  let count = 0;

  const generated: Array<{
    slug: string;
    image: string;
    storage: "blob" | "local";
    path: string;
  }> = [];

  for (const item of items) {
    const slug = slugFromFile(item.file);
    const result = await createPost(slug, titleFromSlug(slug), item.type);

    generated.push({
      slug,
      image: result.image,
      storage: result.storage,
      path: result.path,
    });

    count++;
  }

  return {
    success: true,
    count,
    generated,
    message: "Pinterest assets generated",
  };
>>>>>>> social-video-fix-from-clean-baseline
}