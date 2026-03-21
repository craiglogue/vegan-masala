import { NextResponse } from "next/server";

import {

allContent,
slugFromFile,
titleFromSlug

} from "@/lib/social/core/content";

export async function GET(){

try{

const slugs = allContent()

.map(item=>{

const slug =
slugFromFile(item.file);

return{

slug,

type:item.type,

title:
titleFromSlug(slug),

label:
`${titleFromSlug(slug)} — ${item.type}`

};

})

.sort((a,b)=>
a.title.localeCompare(b.title)
);

return NextResponse.json({

ok:true,

slugs

});

}catch(err:any){

return NextResponse.json({

ok:false,
error:err?.message,
slugs:[]

},{status:500});

}

}