import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.VERCEL ? "/tmp" : process.cwd();

const QUEUE_FILE = path.join(
ROOT,
"generated",
"social-queue.json"
);

function readQueue(){

if(!fs.existsSync(QUEUE_FILE))
return [];

return JSON.parse(
fs.readFileSync(
QUEUE_FILE,
"utf8"
)
);

}

function writeQueue(items:any[]){

fs.mkdirSync(
path.dirname(QUEUE_FILE),
{recursive:true}
);

fs.writeFileSync(
QUEUE_FILE,
JSON.stringify(items,null,2)
);

}

export async function POST(req:Request){

try{

const body=await req.json();

const {id,action}=body;

if(!id)
return NextResponse.json(
{error:"id required"},
{status:400}
);

let items=readQueue();

let item=items.find(
(i:any)=>i.id===id
);

if(!item)
return NextResponse.json(
{error:"Item not found"},
{status:404}
);

if(action==="delete"){

items=items.filter(
(i:any)=>i.id!==id
);

writeQueue(items);

return NextResponse.json({
ok:true,
message:"Item deleted"
});

}

if(action==="retry"){

item.status="queued";

item.error=null;

writeQueue(items);

return NextResponse.json({
ok:true,
message:"Item moved to queue"
});

}

if(action==="post-now"){

item.scheduledFor=new Date().toISOString();

item.status="queued";

writeQueue(items);

return NextResponse.json({
ok:true,
message:"Item scheduled for immediate posting"
});

}

return NextResponse.json(
{error:"Unknown action"},
{status:400}
);

}catch(e:any){

return NextResponse.json({
error:e.message
},{status:500});

}

}