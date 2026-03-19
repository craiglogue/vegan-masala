"use client";

import { useEffect,useState } from "react";

type Platform =
"instagram"|
"pinterest"|
"all";

type Mode =
"all"|
"single"|
"latest";

type ApiResponse={
success?:boolean;
error?:string;
details?:string;
message?:string;
platform?:string;
mode?:string;
slug?:string|null;
count?:number;
};

type SlugOption={
slug:string;
title:string;
label:string;
type?:string;
};

export default function SocialGeneratePage(){

const [platform,setPlatform]=
useState<Platform>("instagram");

const [mode,setMode]=
useState<Mode>("latest");

const [slug,setSlug]=
useState("");

const [availableSlugs,setAvailableSlugs]=
useState<SlugOption[]>([]);

const [slugsLoading,setSlugsLoading]=
useState(false);

const [loading,setLoading]=
useState(false);

const [result,setResult]=
useState<ApiResponse|null>(null);

const [log,setLog]=
useState("Waiting...");


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


useEffect(()=>{

void loadSlugs();

},[]);


async function run(
nextPlatform=platform,
nextMode=mode
){

if(
nextMode==="single"
&& !slug.trim()
){

setResult({

error:"Slug required",

details:
"Select content first"

});

return;

}

setLoading(true);

setResult(null);

setLog(

`Running generator

Platform: ${nextPlatform}
Mode: ${nextMode}

${
nextMode==="single"
?`Slug: ${slug}`
:""
}`

);

try{

const res=
await fetch(
"/api/admin/social",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

platform:nextPlatform,
mode:nextMode,

slug:
nextMode==="single"
?slug.trim()
:null

})

}

);

const data:
ApiResponse=
await res.json();

setResult(data);

if(!res.ok){

setLog(
prev=>prev+
"\n\nFailed"
);

return;

}

setLog(

prev=>
prev+
"\n\nSuccess\n"+
(
data.message||
"Generation complete"
)

);

if(
nextMode==="single"
){

setSlug("");

}

await loadSlugs();

}
catch(err:any){

setResult({

error:"Request failed",

details:
err?.message||
"Unknown error"

});

setLog(
prev=>prev+
"\n\nRequest failed"
);

}
finally{

setLoading(false);

}

}


return(

<main className="mx-auto max-w-6xl px-6 py-10">

<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
Admin
</div>

<h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)]">
Content Generator
</h1>

<p className="mt-3 text-sm text-[var(--text-soft)] max-w-xl">

Generate Instagram posts and Pinterest pins automatically.
Use latest for daily publishing or all when rebuilding assets.

</p>

</div>



{/* QUICK */}

<section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">

Quick generate

</h2>


<div className="mt-6 flex flex-wrap gap-3">

<button

onClick={()=>
run("instagram","latest")
}

disabled={loading}

className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-bold text-white"

>

Latest Instagram

</button>


<button

onClick={()=>
run("pinterest","latest")
}

disabled={loading}

className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-bold text-white"

>

Latest Pinterest

</button>


<button

onClick={()=>
run("all","latest")
}

disabled={loading}

className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-bold text-white"

>

Latest Both

</button>


<button

onClick={()=>
run("all","all")
}

disabled={loading}

className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-bold text-[var(--brand-gold)]"

>

Generate Everything

</button>

</div>

</section>




{/* MANUAL */}

<section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">

Manual run

</h2>


<div className="mt-6 grid gap-6 md:grid-cols-3">


<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">

Platform

</label>


<select

value={platform}

onChange={(e)=>
setPlatform(
e.target.value as Platform
)
}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"

>

<option value="instagram">
Instagram
</option>

<option value="pinterest">
Pinterest
</option>

<option value="all">
Both
</option>

</select>

</div>



<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">

Mode

</label>


<select

value={mode}

onChange={(e)=>
setMode(
e.target.value as Mode
)
}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"

>

<option value="all">
Generate all
</option>

<option value="single">
Generate single
</option>

<option value="latest">
Latest
</option>

</select>

</div>



<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">

Slug

</label>


<select

value={slug}

onChange={(e)=>
setSlug(e.target.value)
}

disabled={mode!=="single"}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white disabled:opacity-40"

>

<option value="">

{mode!=="single"
?"Single mode not selected"
:slugsLoading
?"Loading..."
:"Select content"}

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


</div>



<div className="mt-6">

<button

onClick={()=>run()}

disabled={loading}

className="rounded-xl bg-[var(--brand-red)] px-8 py-3 font-bold text-white"

>

{loading
?"Running"
:"Run generator"}

</button>

</div>

</section>



{/* RESULT */}

<section className="mt-8 grid gap-8 lg:grid-cols-2">


<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">

Result

</h2>


<div className="mt-4 rounded-xl bg-black/30 p-5 text-sm">

{result?(

<>

<p>

{result.success
?"Success"
:"Failed"}

</p>

{result.message&&(

<p className="mt-2">

{result.message}

</p>

)}

{result.error&&(

<p className="mt-2 text-red-400">

{result.error}

</p>

)}

{result.count!==undefined&&(

<p className="mt-2">

Generated:
{result.count}

</p>

)}

</>

):(

<p>No run yet</p>

)}

</div>

</div>



<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">

Log

</h2>


<pre className="mt-4 min-h-[240px] rounded-xl bg-black/30 p-5 text-xs">

{log}

</pre>

</div>

</section>


</main>

);

}