import { NextResponse } from "next/server";
import { getPinterestAccessToken } from "@/lib/social/core/pinterestToken";

export async function GET(){

try{

const token =
await getPinterestAccessToken();

if(!token){

return NextResponse.json({

ok:false,
items:[]

});

}

const res = await fetch(

"https://api.pinterest.com/v5/boards",

{

headers:{

Authorization:`Bearer ${token}`

}

}

);

const data =
await res.json();

if(!res.ok){

return NextResponse.json({

ok:false,
items:[]

});

}

const boards =
(data?.items || []).map(

(b:any)=>({

id:b.id,

name:b.name

})

);

return NextResponse.json({

ok:true,

items:boards

});

}catch{

return NextResponse.json({

ok:false,

items:[]

});

}

}