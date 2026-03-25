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

<<<<<<< HEAD
const res=await fetch(
=======
function describePinterestError(data: any, fallback: string) {
  if (!data) return fallback;

  return (
    data?.message ||
    data?.error ||
    data?.details?.message ||
    JSON.stringify(data)
  );
}

export async function postPinterestPin(input: PostPinterestPinInput) {
  const accessToken = await getPinterestAccessToken();
>>>>>>> social-video-fix-from-clean-baseline

"https://api.pinterest.com/v5/pins",

<<<<<<< HEAD
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

=======
  ensureFileExists(input.imagePath);

  const imageBase64 = fs.readFileSync(input.imagePath).toString("base64");

  const payload = {
    board_id: input.boardId,
    title: input.title,
    description: input.description,
    link: input.link,
    media_source: {
      source_type: "image_base64",
      content_type: "image/png",
      data: imageBase64,
    },
  };

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("PINTEREST PIN ERROR:", {
      status: res.status,
      payload: {
        ...payload,
        media_source: {
          ...payload.media_source,
          data: "[base64 omitted]",
        },
      },
      data,
    });

    throw new Error(
      describePinterestError(data, "Pinterest pin creation failed")
    );
  }

  console.log("PINTEREST PIN RESULT:", data);

  return data;
>>>>>>> social-video-fix-from-clean-baseline
}