import { getPinterestAccessToken } from "@/lib/social/core/pinterestToken";

type PostPinterestPinInput={

title:string;
description:string;
link:string;
imageUrl:string;
boardId:string;

};

export async function postPinterestPin(

input:PostPinterestPinInput

){

const accessToken=
await getPinterestAccessToken();

if(!accessToken){

throw new Error(
"Pinterest not connected"
);

}

const res=await fetch(

"https://api.pinterest.com/v5/pins",

{

method:"POST",

headers:{

Authorization:
`Bearer ${accessToken}`,

"Content-Type":
"application/json"

},

body:JSON.stringify({

board_id:input.boardId,

title:input.title,

description:input.description,

link:input.link,

media_source:{

source_type:"image_url",

url:input.imageUrl

}

})

}

);

const data=
await res.json();

if(!res.ok){

throw new Error(

data?.message ||
data?.error ||
"Pinterest post failed"

);

}

return data;

}