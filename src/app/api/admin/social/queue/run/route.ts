import { NextResponse } from "next/server";

import {

dueQueueItems,
markQueueItemFailed,
markQueueItemPosted

} from "@/lib/social/core/queue";

import {

generatePinterestBySlug

} from "@/lib/social/generatePinterest";

import {

postPinterestPin

} from "@/lib/social/core/pinterestPost";

import {

publishInstagram

} from "@/lib/social/publishers/publishInstagram";

import {

publishFacebook

} from "@/lib/social/publishers/publishFacebook";

export async function POST(){

try{

const due=
dueQueueItems();

let count=0;

for(const item of due){

try{

if(item.platform==="pinterest"){

if(!item.board){

throw new Error(
"Board missing"
);

}

const generated=
await generatePinterestBySlug(
item.slug
);

await postPinterestPin({

title:
item.title || item.slug,

description:
item.caption || "",

link:
item.url || "",

imageUrl:
generated.imageUrl,

boardId:
item.board

});

markQueueItemPosted(
item.id
);

count++;

continue;

}

if(item.platform==="instagram"){

await publishInstagram({

slug:item.slug,

caption:
item.caption||""

});

markQueueItemPosted(
item.id);

count++;

continue;

}

if(item.platform==="facebook"){

await publishFacebook({

slug:item.slug,

caption:
item.caption||""

});

markQueueItemPosted(
item.id);

count++;

continue;

}

markQueueItemFailed(

item.id,

"Unsupported platform"

);

}catch(err:any){

markQueueItemFailed(

item.id,

err?.message||
"Queue failed"

);

}

}

return NextResponse.json({

ok:true,
count

});

}catch(err:any){

return NextResponse.json({

ok:false,
error:err?.message

},{status:500});

}

}