import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import sharp from "sharp";
import { put, list } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";
import opentype from "opentype.js";

import {
  detectContentTypeBySlug,
  titleFromSlug,
  type ContentType,
} from "@/lib/social/core/content";

import { BRAND } from "@/lib/social/core/brand";

const execFileAsync = promisify(execFile);

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();

const VIDEO_DIR = path.join(ROOT,"generated","video");
const TEMP_DIR = path.join(ROOT,"generated","video-temp");

const LOCAL_PUBLIC_VIDEO_DIR = path.join(
process.cwd(),
"public",
"generated",
"video"
);

const WIDTH=1080;
const HEIGHT=1920;
const FPS=30;

const INTRO_DURATION=4;
const MAIN_DURATION=9;
const OUTRO_DURATION=4;

function ensureDir(dir:string){

fs.mkdirSync(dir,{recursive:true});

}

function getBlobToken(){

return (
process.env.BLOB_READ_WRITE_TOKEN||
process.env.PUBLIC_VIDEO_BLOB_READ_WRITE_TOKEN||
""
);

}

function getFfmpegBinary(logs?:string[]){

const candidates=[

typeof ffmpegPath==="string"
?ffmpegPath
:null,

"/var/task/node_modules/ffmpeg-static/ffmpeg",

path.join(
process.cwd(),
"node_modules",
"ffmpeg-static",
"ffmpeg"
)

].filter(Boolean) as string[];

for(const c of candidates){

if(fs.existsSync(c)){

if(logs)
logs.push(`ffmpeg binary: ${c}`);

return c;

}

}

throw new Error("ffmpeg not found");

}

async function run(
args:string[],
logs?:string[]
){

const bin=getFfmpegBinary(logs);

await execFileAsync(
bin,
args
);

}

function wrap(text:string){

const words=text.split(" ");

const lines:string[]=[];

let current="";

for(const w of words){

const next=current
?`${current} ${w}`
:w;

if(next.length<=16){

current=next;

}
else{

if(current)
lines.push(current);

current=w;

}

}

if(current)
lines.push(current);

return lines.slice(0,3);

}

async function fetchBuffer(
url:string,
logs:string[]
){

logs.push(`Fetch: ${url}`);

const res=
await fetch(url);

if(!res.ok)
return null;

return Buffer.from(
await res.arrayBuffer()
);

}

async function resolveMainSlideImage(
slug:string,
baseUrl:string,
logs:string[]
){

const token=getBlobToken();

const candidates=[

`instagram/${slug}.jpg`,
`instagram/${slug}.png`

];

for(const file of candidates){

try{

const {blobs}=await list({

token,
prefix:file

});

const match=
blobs.find(
b=>b.pathname===file
);

if(match?.url){

logs.push(
`Using blob ${match.url}`
);

const buffer=
await fetchBuffer(
match.url,
logs
);

if(buffer){

const temp=
path.join(
TEMP_DIR,
`${slug}.png`
);

await sharp(buffer)
.png()
.toFile(temp);

return temp;

}

}

}catch{}

}

return null;

}

function loadFontOrThrow(
fontPath:string|null
){

if(!fontPath||
!fs.existsSync(fontPath)){

throw new Error(
"Font missing"
);

}

return opentype.loadSync(
fontPath
);

}

function makeTextPathSvg(

text:string,

font:opentype.Font,

fontSize:number,

fill:string,

centerX:number,

baselineY:number

){

let cursorX=0;

const glyphs=
font.stringToGlyphs(text);

const units=
font.unitsPerEm||1000;

const scale=
fontSize/units;

const parts:string[]=[];

let minX=Infinity;
let maxX=-Infinity;

for(const g of glyphs){

const p=
g.getPath(
cursorX,
baselineY,
fontSize
);

const box=
p.getBoundingBox();

minX=Math.min(
minX,
box.x1
);

maxX=Math.max(
maxX,
box.x2
);

parts.push(
p.toPathData(2)
);

cursorX+=
(g.advanceWidth||
units*0.5)*scale;

}

const width=
maxX-minX;

const tx=
centerX-(minX+width/2);

return`
<g transform="translate(${tx},0)">
<path d="${parts.join(" ")}"
fill="${fill}"/>
</g>
`;

}

async function renderCard(

title:string,

subtitle:string,

out:string,

logo:string|null,

fontPath:string|null

){

const font=
loadFontOrThrow(fontPath);

const lines=
wrap(title);

let logoSvg="";

if(logo){

const buf=
fs.readFileSync(logo);

logoSvg=
`<image href="data:image/png;base64,
${buf.toString("base64")}"
x="430"
y="300"
width="220"
height="220"/>`;

}

const titlePaths=
lines.map(

(l,i)=>
makeTextPathSvg(

l,

font,

82,

BRAND.gold,

540,

860+i*92

)

).join("");

const sub=
makeTextPathSvg(

subtitle,

font,

40,

BRAND.soft,

540,

1210

);

const svg=`

<svg
width="${WIDTH}"
height="${HEIGHT}"
xmlns="http://www.w3.org/2000/svg">

<rect
width="${WIDTH}"
height="${HEIGHT}"
fill="#000"/>

${logoSvg}

${titlePaths}

${sub}

</svg>

`;

await sharp(
Buffer.from(svg)
)
.png()
.toFile(out);

}

async function stillClip(

image:string,

out:string,

duration:number,

logs?:string[]

){

await run([

"-y",

"-loop","1",

"-i",image,

"-t",String(duration),

"-vf",

`scale=${WIDTH}:${HEIGHT},
fade=t=in:st=0:d=0.5,
fade=t=out:st=${duration-0.5}:d=0.5,
format=yuv420p`,

"-r",String(FPS),

"-c:v","libx264",

"-pix_fmt","yuv420p",

out

],logs);

}

async function mainClip(

image:string,

out:string,

logs?:string[]

){

const filter=[

`[0:v]
scale=1450:2578:
force_original_aspect_ratio=increase,

crop=1080:1920,

setsar=1,

boxblur=24:10,

zoompan=
z='min(zoom+0.0016,1.22)':
d=${MAIN_DURATION*FPS}:
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
s=1080x1920:fps=${FPS}
[outv]`

].join("");

await run([

"-y",

"-loop","1",

"-i",image,

"-filter_complex",
filter,

"-map","[outv]",

"-t",
String(MAIN_DURATION),

"-r",
String(FPS),

"-c:v",
"libx264",

"-pix_fmt",
"yuv420p",

out

],logs);

}

async function concat(

intro:string,

main:string,

outro:string,

final:string,

music:string|null,

logs?:string[]

){

const temp=
path.join(
TEMP_DIR,
"video.mp4"
);

await run([

"-y",

"-i",intro,

"-i",main,

"-i",outro,

"-filter_complex",

"[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]",

"-map","[outv]",

"-c:v","libx264",

temp

],logs);

if(!music){

fs.copyFileSync(
temp,
final
);

return;

}

await run([

"-y",

"-i",temp,

"-stream_loop","-1",

"-i",music,

"-shortest",

"-map","0:v",

"-map","1:a",

"-c:v","copy",

"-c:a","aac",

final

],logs);

}

export async function buildRecipeVideo(

slug:string,

baseUrl?:string

){

const logs:string[]=[];

ensureDir(VIDEO_DIR);
ensureDir(TEMP_DIR);

const base=
baseUrl||
(process.env.VERCEL_URL
?`https://${process.env.VERCEL_URL}`
:"");

const type=
detectContentTypeBySlug(slug)
||"recipe";

const image=
await resolveMainSlideImage(
slug,
base,
logs
);

if(!image){

throw new Error(
"No Instagram card"
);

}

const introPng=
path.join(
TEMP_DIR,
`${slug}-intro.png`
);

const outroPng=
path.join(
TEMP_DIR,
`${slug}-outro.png`
);

await renderCard(

titleFromSlug(slug),

"Vegan Indian Recipe",

introPng,

null,

null

);

await renderCard(

"Follow For More",

"vegan-masala.com",

outroPng,

null,

null

);

const introMp4=
path.join(
TEMP_DIR,
`${slug}-intro.mp4`
);

const mainMp4=
path.join(
TEMP_DIR,
`${slug}-main.mp4`
);

const outroMp4=
path.join(
TEMP_DIR,
`${slug}-outro.mp4`
);

const final=
path.join(
VIDEO_DIR,
`${slug}.mp4`
);

await stillClip(
introPng,
introMp4,
INTRO_DURATION
);

await mainClip(
image,
mainMp4
);

await stillClip(
outroPng,
outroMp4,
OUTRO_DURATION
);

await concat(
introMp4,
mainMp4,
outroMp4,
final,
null
);

const buffer=
fs.readFileSync(final);

const blob=
await put(

`videos/${slug}.mp4`,

buffer,

{

access:"public",

contentType:
"video/mp4",

allowOverwrite:true,

token:getBlobToken()

}

);

return{

success:true,

video:blob.url,

logs

};

}