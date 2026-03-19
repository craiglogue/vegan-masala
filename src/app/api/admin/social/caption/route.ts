import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const ROOT = process.cwd();

function captionPath(slug:string,platform:string){

return path.join(

ROOT,
"generated",
"captions",
platform,
slug + ".txt"

);

}

export async function GET(req:Request){

try{

const {searchParams} =
new URL(req.url);

const slug =
searchParams.get("slug");

const platform =
searchParams.get("platform");

if(!slug || !platform){

return NextResponse.json({

ok:false,
text:"",
error:"Missing slug or platform"

});

}

if(
platform!=="instagram" &&
platform!=="pinterest"
){

return NextResponse.json({

ok:false,
text:"",
error:"Invalid platform"

});

}

const file =
captionPath(slug,platform);

if(!fs.existsSync(file)){

return NextResponse.json({

ok:false,
text:"",
message:"Caption not generated yet"

});

}

const text =
fs.readFileSync(
file,
"utf8"
);

return NextResponse.json({

ok:true,
text

});

}catch(err:any){

return NextResponse.json({

ok:false,
text:"",
error:
err?.message||
"Caption read failed"

});

}

}