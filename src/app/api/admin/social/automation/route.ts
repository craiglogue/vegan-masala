import { NextResponse } from "next/server";

import { generateInstagramBySlug } 
from "@/lib/social/generateInstagram";

import { generatePinterestBySlug } 
from "@/lib/social/generatePinterest";

import { buildRecipeVideo } 
from "@/lib/social/video/buildRecipeVideo";

import {
detectContentTypeBySlug,
titleFromSlug
}
from "@/lib/social/core/content";

import {
buildInstagramCaption,
buildPinterestCaption
}
from "@/lib/social/core/captions";

import { contentUrl }
from "@/lib/social/core/urls";

import { addQueueItem }
from "@/lib/social/core/queue";

function defaultSchedule(){

const d=new Date();

d.setMinutes(
d.getMinutes()+10
);

d.setSeconds(0);

return d.toISOString();

}

export async function POST(req:Request){

try{

const body=
await req.json();

const slug=
(body.slug||"").trim();

const board=
(body.board||"").trim();

const scheduledFor=
body.scheduledFor
?new Date(body.scheduledFor).toISOString()
:defaultSchedule();

if(!slug){

return NextResponse.json(

{ok:false,error:"Slug required"},

{status:400}

);

}

const type=
detectContentTypeBySlug(slug);

if(!type){

return NextResponse.json(

{ok:false,error:"Slug not found"},

{status:400}

);

}

const title=
titleFromSlug(slug);

const url=
contentUrl(slug,type);

const steps:string[]=[];


/* GENERATE IMAGES */

if(body.includeImages){

await generateInstagramBySlug(slug);

await generatePinterestBySlug(slug);

steps.push("Images generated");

}


/* GENERATE VIDEO */

if(body.includeVideo){

await buildRecipeVideo(slug);

steps.push("Video generated");

}


/* QUEUE PINTEREST */

if(body.queuePinterest){

if(!board){

return NextResponse.json(

{ok:false,error:"Board required"},

{status:400}

);

}

addQueueItem({

slug,

title,

platform:"pinterest",

caption:
buildPinterestCaption(slug,type),

url,

board,

scheduledFor

});

steps.push("Pinterest queued");

}


/* QUEUE INSTAGRAM */

if(body.queueInstagram){

addQueueItem({

slug,

title,

platform:"instagram",

caption:
buildInstagramCaption(slug,type),

url,

board:null,

scheduledFor

});

steps.push("Instagram queued");

}


/* QUEUE FACEBOOK */

if(body.queueFacebook){

addQueueItem({

slug,

title,

platform:"facebook",

caption:
buildInstagramCaption(slug,type),

url,

board:null,

scheduledFor

});

steps.push("Facebook queued");

}


return NextResponse.json({

ok:true,

slug,

scheduledFor,

steps,

message:"Automation complete"

});

}
catch(err:any){

return NextResponse.json(

{

ok:false,

error:
err?.message||
"Automation failed"

},

{status:500}

);

}

}