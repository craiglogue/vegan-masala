import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const ROOT=process.cwd();

export async function GET(req:Request){

let {searchParams}=new URL(req.url);

let slug=searchParams.get("slug");
let platform=searchParams.get("platform");

let file=path.join(

ROOT,
"generated",
"captions",
platform!,
slug+".txt"

);

if(!fs.existsSync(file)){

return NextResponse.json({

ok:false,
text:""

});

}

return NextResponse.json({

ok:true,

text:fs.readFileSync(
file,
"utf8"
)

});

}