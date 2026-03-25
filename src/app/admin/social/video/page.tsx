"use client";

import { useEffect, useMemo, useState } from "react";

type SlugItem =
|string
|{
slug?:string;
type?:string;
title?:string;
label?:string;
};

type SlugResponse={
slugs?:SlugItem[];
};

type VideoApiResponse={
ok?:boolean;
error?:string;
slug?:string;
video?:string;
logs?:string[];
};

type LibraryResponse={
ok?:boolean;
items?:{
slug:string;
video:string;
}[];
};

type NormalizedSlug={
slug:string;
label:string;
type:"recipe"|"guide";
};

type GeneratedVideoItem={
slug:string;
type:"recipe"|"guide";
label:string;
video:string;
};

async function safeJson(res:Response){

const text=await res.text();

try{
return text?JSON.parse(text):{};
}
catch{

return{
ok:false,
error:"Invalid response"
};

}

}

function normalize(item:SlugItem):NormalizedSlug|null{

if(typeof item==="string"){

return{
slug:item,
label:item,
type:"recipe"
};

}

if(!item?.slug)return null;

const type=
item.type==="guide"
?"guide"
:"recipe";

const label=
item.title||
item.label||
item.slug;

return{

slug:item.slug,
label,
type

};

}

export default function AdminSocialVideoPage(){

const [slugs,setSlugs]=useState<NormalizedSlug[]>([]);

const [generated,setGenerated]=
useState<GeneratedVideoItem[]>([]);

const [selected,setSelected]=useState("");

const [logs,setLogs]=useState<string[]>([]);

const [status,setStatus]=useState("");

const [activeVideo,setActiveVideo]=useState("");

const [activeLabel,setActiveLabel]=useState("");

const [filter,setFilter]=
useState<"all"|"recipe"|"guide">("all");

const [loading,setLoading]=useState(true);

const [generating,setGenerating]=useState(false);

const [deleting,setDeleting]=useState("");

useEffect(()=>{

async function load(){

const res=
await fetch("/api/admin/social/slugs");

const data=
await safeJson(res) as SlugResponse;

const normalized=
(data.slugs||[])
.map(normalize)
.filter(Boolean) as NormalizedSlug[];

normalized.sort((a,b)=>{

if(a.type!==b.type)
return a.type==="recipe"?-1:1;

return a.label.localeCompare(b.label);

});

setSlugs(normalized);

if(normalized[0])
setSelected(normalized[0].slug);

setLoading(false);

}

load();

},[]);

useEffect(()=>{

async function loadLibrary(){

const res=
await fetch(
"/api/admin/social/video/library"
);

const data=
await safeJson(res) as LibraryResponse;

if(!data.items)return;

const mapped=
data.items.map(v=>{

const match=
slugs.find(
s=>s.slug===v.slug
);

return{

slug:v.slug,
video:v.video,

label:
match?.label||
v.slug,

type:
match?.type||
"recipe"

};

});

setGenerated(mapped);

if(mapped[0]){

setActiveVideo(
mapped[0].video
);

setActiveLabel(
mapped[0].label
);

}

}

if(slugs.length)
loadLibrary();

},[slugs]);

const filteredSlugs=
useMemo(()=>{

if(filter==="all")
return slugs;

return slugs.filter(
s=>s.type===filter
);

},[slugs,filter]);

const recipeSlugs=
filteredSlugs.filter(
s=>s.type==="recipe"
);

const guideSlugs=
filteredSlugs.filter(
s=>s.type==="guide"
);

const library=
filter==="all"
?generated
:generated.filter(
g=>g.type===filter
);

async function generateOne(slug:string){

const res=
await fetch(
"/api/admin/social/video",
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({slug})

});

const data=
await safeJson(res) as VideoApiResponse;

if(!data.ok)
throw new Error(data.error);

if(data.video){

const item=
slugs.find(
s=>s.slug===slug
);

const newVideo={

slug,

video:data.video,

label:
item?.label||
slug,

type:
item?.type||
"recipe"

};

setGenerated(prev=>[
newVideo,
...prev.filter(
v=>v.slug!==slug
)
]);

setActiveVideo(
data.video
);

setActiveLabel(
newVideo.label
);

}

setLogs(data.logs||[]);

}

async function deleteVideo(slug:string){

if(!confirm("Delete video?"))
return;

setDeleting(slug);

await fetch(
"/api/admin/social/video/delete",
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({slug})

});

setGenerated(prev=>
prev.filter(
v=>v.slug!==slug
)
);

setDeleting("");

}

return(

<main className="mx-auto max-w-7xl px-6 py-10 text-white">

<h1 className="text-3xl font-bold text-yellow-200 mb-6">
Video Generator
</h1>

<div className="grid gap-6 xl:grid-cols-[380px_1fr]">

<section className="rounded-2xl border border-yellow-700/40 bg-black/40 p-6">

<h2 className="mb-4 text-lg font-semibold text-yellow-200">
Controls
</h2>

<div className="flex gap-2 mb-4">

{["all","recipe","guide"].map(v=>(

<button

key={v}

onClick={()=>setFilter(v as any)}

className={`px-3 py-2 rounded ${
filter===v
?"bg-yellow-600 text-black"
:"bg-neutral-900"
}`}

>

{v==="all"
?"All"
:v==="recipe"
?"Recipes"
:"Guides"}

</button>

))}

</div>

<select

value={selected}

onChange={e=>setSelected(e.target.value)}

className="w-full bg-neutral-900 p-3 rounded"

>

<optgroup label="Recipes">

{recipeSlugs.map(s=>(

<option
key={s.slug}
value={s.slug}
>

{s.label}

</option>

))}

</optgroup>

<optgroup label="Guides">

{guideSlugs.map(s=>(

<option
key={s.slug}
value={s.slug}
>

{s.label}

</option>

))}

</optgroup>

</select>

<button

onClick={()=>generateOne(selected)}

disabled={generating}

className="mt-4 w-full bg-red-700 py-3 rounded"

>

Generate Video

</button>

</section>

<section>

<h2 className="text-xl text-yellow-200 mb-4">
Video Library
</h2>

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

{library.map(v=>(

<div

key={v.slug}

className="border border-yellow-700/30 rounded-xl overflow-hidden bg-neutral-950"

>

<video
src={v.video}
className="w-full"
muted
/>

<div className="p-3 space-y-2">

<p className="font-semibold">
{v.label}
</p>

<div className="flex gap-2">

<button

onClick={()=>{
setActiveVideo(v.video);
setActiveLabel(v.label);
}}

className="flex-1 bg-yellow-600 text-black py-1 rounded text-sm"

>

Preview

</button>

<button

onClick={()=>deleteVideo(v.slug)}

className="bg-red-700 px-3 rounded text-sm"

>

{deleting===v.slug
?"..."
:"Delete"}

</button>

</div>

</div>

</div>

))}

</div>

</section>

</div>

</main>

);

}