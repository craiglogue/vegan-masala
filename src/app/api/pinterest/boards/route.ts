import { NextResponse } from "next/server";
import { getPinterestAccessToken } from "@/lib/social/core/pinterestToken";

export async function GET(){

try{

const token =
await getPinterestAccessToken();

if(!token){

<<<<<<< HEAD
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

=======
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data?.message ||
            data?.error ||
            "Failed to fetch Pinterest boards",
          details: data,
          items: [],
        },
        { status: 500 }
      );
    }

    const items = Array.isArray(data?.items)
      ? data.items.map((board: any) => ({
          id: board.id,
          name: board.name,
        }))
      : [];

    return NextResponse.json({
      ok: true,
      items,
      raw: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Boards request failed",
        items: [],
      },
      { status: 500 }
    );
  }
>>>>>>> social-video-fix-from-clean-baseline
}