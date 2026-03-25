import { generateInstagramBySlug } from "@/lib/social/generateInstagram";
import { buildFacebookCaption } from "@/lib/social/core/captions";

const GRAPH_BASE = "https://graph.facebook.com/v23.0";

type PublishFacebookInput = {
  slug: string;
  caption?: string;
  videoUrl?: string;
  imageUrl?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} missing`);
  }

  return value;
}

async function metaPostForm(
  endpoint: string,
  body: Record<string,string>
){
  const accessToken=getRequiredEnv("META_ACCESS_TOKEN");

  const form=new URLSearchParams();

  Object.entries(body).forEach(([k,v])=>{
    form.set(k,v);
  });

  form.set("access_token",accessToken);

  const res=await fetch(
    `${GRAPH_BASE}${endpoint}`,
    {
      method:"POST",
      headers:{
        "Content-Type":
        "application/x-www-form-urlencoded"
      },
      body:form.toString()
    }
  );

  const data=await res.json().catch(()=>({}));

  if(!res.ok){

    throw new Error(
      data?.error?.message ||
      "Facebook publish failed"
    );

  }

  return data;
}

async function publishPhoto(
  pageId:string,
  imageUrl:string,
  caption:string
){

  return metaPostForm(
    `/${pageId}/photos`,
    {
      url:imageUrl,
      caption,
      published:"true"
    }
  );

}

async function publishVideo(
  pageId:string,
  videoUrl:string,
  caption:string
){

  return metaPostForm(
    `/${pageId}/videos`,
    {
      file_url:videoUrl,
      description:caption,
      published:"true"
    }
  );

}

export async function publishFacebook(
input:PublishFacebookInput
){

  const slug=input.slug.trim();

  if(!slug){

    throw new Error(
      "Facebook publish slug missing"
    );

  }

  const pageId=
  getRequiredEnv("META_PAGE_ID");

  const generated=
  await generateInstagramBySlug(slug);

  const imageUrl=
  input.imageUrl ||
  generated.image;

  const videoUrl=
  input.videoUrl || null;

  const caption=
  input.caption ||
  buildFacebookCaption(
    slug,
    "recipe"
  );

  // Prefer video if exists
  if(videoUrl){

    const published=
    await publishVideo(
      pageId,
      videoUrl,
      caption
    );

    return{

      ok:true,

      type:"video",

      pageId,

      videoUrl,

      id:published?.id||null,

      published

    };

  }

  // Fallback image
  if(!imageUrl){

    throw new Error(
      "Facebook image missing"
    );

  }

  const published=
  await publishPhoto(
    pageId,
    imageUrl,
    caption
  );

  return{

    ok:true,

    type:"image",

    pageId,

    imageUrl,

    id:published?.id||null,

    postId:
    published?.post_id||null,

    published

  };

}