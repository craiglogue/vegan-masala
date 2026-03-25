import { NextResponse } from "next/server";

import {

allContent,
slugFromFile,
titleFromSlug

} from "@/lib/social/core/content";

<<<<<<< HEAD
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

=======
export async function GET() {
  try {
    const items = allContent()
      .map((item) => {
        const slug = slugFromFile(item.file);
        const title = titleFromSlug(slug);

        return {
          slug,
          title,
          type: item.type,
          label: title,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "recipe" ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });

    return NextResponse.json({
      ok: true,
      slugs: items,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load slugs",
        slugs: [],
      },
      { status: 500 }
    );
  }
>>>>>>> social-video-fix-from-clean-baseline
}