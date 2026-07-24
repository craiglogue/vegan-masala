"use client";

import { useEffect,useState } from "react";

type SlugOption={
slug:string;
title:string;
label:string;
};

type PinterestBoard={
id:string;
name:string;
};

type AutomationMode=
"selected"|
"latest";

export default function SocialAutomationPage(){

const [availableSlugs,setAvailableSlugs]=
useState<SlugOption[]>([]);

const [boards,setBoards]=
useState<PinterestBoard[]>([]);

const [mode,setMode]=
useState<AutomationMode>("selected");

const [slug,setSlug]=
useState("");

const [board,setBoard]=
useState("");

const [scheduledFor,setScheduledFor]=
useState("");

const [includeImages,setIncludeImages]=
useState(true);

const [includeVideo,setIncludeVideo]=
useState(true);

const [queuePinterest,setQueuePinterest]=
useState(true);

const [queueInstagram,setQueueInstagram]=
useState(false);

const [queueFacebook,setQueueFacebook]=
useState(false);

const [loading,setLoading]=
useState(false);

const [log,setLog]=
useState("Waiting...");

const [slugsLoading,setSlugsLoading]=
useState(false);

const [boardsLoading,setBoardsLoading]=
useState(false);



async function loadSlugs(){

try{

setSlugsLoading(true);

const res=
await fetch(
"/api/admin/social/slugs",
{cache:"no-store"}
);

const data=
await res.json();

setAvailableSlugs(
data.slugs||[]
);

}
catch{

setAvailableSlugs([]);

}
finally{

setSlugsLoading(false);

}

}



async function loadBoards(){

try{

setBoardsLoading(true);

const res=
await fetch(
"/api/pinterest/boards",
{cache:"no-store"}
);

const data=
await res.json();

if(data.ok){

setBoards(data.items||[]);

}else{

setBoards([]);

}

}
catch{

setBoards([]);

}
finally{

setBoardsLoading(false);

}

}



useEffect(()=>{

void loadSlugs();

void loadBoards();

},[]);



async function runAutomation(){

if(
mode==="selected" &&
!slug
){

setLog("Select slug");

return;

}

if(
queuePinterest &&
!board
){

setLog(
"Select Pinterest board"
);

return;

}
async function runGrowthAutomation(){

  if(!board){
    setLog("Select Pinterest board");
    return;
  }

  setLoading(true);

  try{

    const res = await fetch(
      "/api/admin/social/automation/growth",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          board,
          days:30
        })
      }
    );

    const data = await res.json();

    if(!res.ok){

      setLog(
        "FAILED\n\n"+
        (data.error || "Error")
      );

      return;

    }

    setLog(`Auto-growth complete

Slug: ${data.slug}

Posts created: ${data.created}

${(data.steps||[]).join("\n")}
`);

  }
  catch(err:any){

    setLog(
      "FAILED\n\n"+
      (err?.message || "Error")
    );

  }
  finally{

    setLoading(false);

  }

}

setLoading(true);

try{

const endpoint=

mode==="latest"
?"/api/admin/social/automation/latest"
:"/api/admin/social/automation";


const res=
await fetch(
endpoint,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

slug,

board,

scheduledFor,

includeImages,

includeVideo,

queuePinterest,

queueInstagram,

queueFacebook

})

}

);

const data=
await res.json();

if(!res.ok){

setLog(

"FAILED\n\n"+
(
data.error||
"Error"
)

);

return;

}

setLog(

`Automation complete

Mode: ${mode}

Slug: ${data.slug}

${(data.steps||[]).join("\n")}

`

);

}
catch(err:any){

setLog(

"FAILED\n\n"+
(
err?.message||
"Error"
)

);

}
finally{

setLoading(false);

}

}



return(

<main className="mx-auto max-w-6xl px-6 py-10">

<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
Admin
</div>

<h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)]">
Automation Engine
</h1>

<p className="mt-3 text-sm text-[var(--text-soft)]">
Generate images, generate video and queue posts automatically.
</p>

</div>



<section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">
Automation
</h2>



<div className="mt-6 grid gap-6 md:grid-cols-2">

<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">
Mode
</label>

<select

value={mode}

onChange={e=>
setMode(
e.target.value as AutomationMode
)
}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"

>

<option value="selected">
Selected slug
</option>

<option value="latest">
Latest recipe
</option>

</select>

</div>



<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">
Schedule
</label>

<input

type="datetime-local"

value={scheduledFor}

onChange={e=>
setScheduledFor(e.target.value)
}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"

/>

</div>

</div>



<div className="mt-6">

<label className="text-sm font-bold text-[var(--brand-gold)]">
Content
</label>

<select

value={slug}

onChange={e=>
setSlug(e.target.value)
}

disabled={mode!=="selected"}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white disabled:opacity-40"

>

<option value="">

{mode!=="selected"
?"Latest mode"
:slugsLoading
?"Loading"
:"Select"}

</option>

{availableSlugs.map(item=>(

<option
key={item.slug}
value={item.slug}
>

{item.label}

</option>

))}

</select>

</div>



<div className="mt-6 space-y-3">

<label className="flex gap-3 text-white">

<input
type="checkbox"
checked={includeImages}
onChange={e=>
setIncludeImages(
e.target.checked
)
}
/>

Generate images

</label>


<label className="flex gap-3 text-white">

<input
type="checkbox"
checked={includeVideo}
onChange={e=>
setIncludeVideo(
e.target.checked
)
}
/>

Generate video

</label>


<label className="flex gap-3 text-white">

<input
type="checkbox"
checked={queuePinterest}
onChange={e=>
setQueuePinterest(
e.target.checked
)
}
/>

Queue Pinterest

</label>


<label className="flex gap-3 text-white">

<input
type="checkbox"
checked={queueInstagram}
onChange={e=>
setQueueInstagram(
e.target.checked
)
}
/>

Queue Instagram

</label>


<label className="flex gap-3 text-white">

<input
type="checkbox"
checked={queueFacebook}
onChange={e=>
setQueueFacebook(
e.target.checked
)
}
/>

Queue Facebook

</label>

</div>



<div className="mt-6">

<label className="text-sm font-bold text-[var(--brand-gold)]">
Pinterest board
</label>

<select

value={board}

onChange={e=>
setBoard(e.target.value)
}

disabled={!queuePinterest}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white disabled:opacity-40"

>

<option value="">

{boardsLoading
?"Loading"
:"Select board"}

</option>

{boards.map(b=>(

<option
key={b.id}
value={b.id}
>

{b.name}

</option>

))}

</select>

</div>



<div className="mt-6">

<button

onClick={()=>runAutomation()}

disabled={loading}

className="rounded-xl bg-[var(--brand-red)] px-8 py-3 text-white font-bold"

>

{loading
?"Running..."
:"Run automation"}

</button>

</div>

</section>



<section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">
Log
</h2>

<pre className="mt-4 min-h-[240px] bg-black/30 rounded-xl p-5 text-xs whitespace-pre-wrap">

{log}

</pre>

</section>


</main>

);

}