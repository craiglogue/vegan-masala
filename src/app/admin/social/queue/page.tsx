"use client";

import { useEffect, useState } from "react";

type QueuePlatform = "instagram" | "pinterest" | "facebook";

type QueueItem = {
  id:string;
  slug:string;
  title:string;
  platform:QueuePlatform;
  caption:string;
  url:string;
  board?:string;
  scheduledFor:string;
  status:"queued"|"posted"|"failed";
  createdAt:string;
  postedAt?:string;
  error?:string;
};

type SlugOption = {
  slug:string;
  title:string;
  label:string;
};

type PinterestBoard={
  id:string;
  name:string;
};

export default function SocialQueuePage(){

const [queueSlug,setQueueSlug]=useState("");
const [queuePlatform,setQueuePlatform]=
useState<QueuePlatform>("instagram");

const [scheduledFor,setScheduledFor]=useState("");
const [board,setBoard]=useState("");

const [queueItems,setQueueItems]=useState<QueueItem[]>([]);
const [availableSlugs,setAvailableSlugs]=useState<SlugOption[]>([]);
const [boards,setBoards]=useState<PinterestBoard[]>([]);

const [queueLoading,setQueueLoading]=useState(false);
const [slugsLoading,setSlugsLoading]=useState(false);
const [boardsLoading,setBoardsLoading]=useState(false);

const [log,setLog]=useState("Waiting...");

async function loadQueue(){

try{

const res=await fetch(
"/api/admin/social/queue",
{cache:"no-store"}
);

const data=await res.json();

setQueueItems(data.items||[]);

}
catch{

setQueueItems([]);

}

}

async function loadSlugs(){

try{

setSlugsLoading(true);

const res=await fetch(
"/api/admin/social/slugs",
{cache:"no-store"}
);

const data=await res.json();

setAvailableSlugs(data.slugs||[]);

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

const res=await fetch(
"/api/pinterest/boards",
{cache:"no-store"}
);

const data=await res.json();

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

async function refresh(){

await Promise.all([
loadQueue(),
loadSlugs(),
loadBoards()
]);

}

useEffect(()=>{

void refresh();

},[]);

async function queuePost(){

if(!queueSlug){

setLog("Select content first");

return;

}

if(!scheduledFor){

setLog("Select schedule time");

return;

}

if(queuePlatform==="pinterest" && !board){

setLog("Select board");

return;

}

setQueueLoading(true);

try{

const res=await fetch(
"/api/admin/social/queue",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

slug:queueSlug,
platform:queuePlatform,
scheduledFor,

board:
queuePlatform==="pinterest"
?board
:null

})

});

const data=await res.json();

if(!res.ok){

setLog(data.error||"Failed");

return;

}

setLog("Queued");

setQueueSlug("");
setScheduledFor("");
setBoard("");

await loadQueue();

}
catch(err:any){

setLog(err?.message||"Failed");

}
finally{

setQueueLoading(false);

}

}

async function runQueue(){

setQueueLoading(true);

try{

const res=await fetch(
"/api/admin/social/queue/run",
{method:"POST"}
);

const data=await res.json();

if(!res.ok){

setLog(data.error||"Failed");

return;

}

setLog(
`Processed ${data.count||0}`
);

await loadQueue();

}
catch(err:any){

setLog(err?.message||"Failed");

}
finally{

setQueueLoading(false);

}

}

async function clearQueue(){

if(!confirm("Clear queue?")) return;

setQueueLoading(true);

try{

await fetch(
"/api/admin/social/queue",
{method:"DELETE"}
);

setLog("Queue cleared");

await loadQueue();

}
catch{

setLog("Failed");

}
finally{

setQueueLoading(false);

}

}

async function build30(){

if(!board){

setLog("Select board");

return;

}

setQueueLoading(true);

try{

const res=await fetch(
"/api/admin/social/auto",
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

days:30,
platform:"pinterest",
board

})

});

const data=await res.json();

setLog(
`Created ${data.count||0}`
);

await loadQueue();

}
catch{

setLog("Failed");

}
finally{

setQueueLoading(false);

}

}

function boardName(id?:string){

if(!id) return "";

return boards.find(
b=>b.id===id
)?.name||id;

}

return(

<main className="mx-auto max-w-6xl px-6 py-10">

<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
Admin
</div>

<h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)]">
Social Queue
</h1>

</div>


<section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">
Schedule Post
</h2>

<div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">
Content
</label>

<select
value={queueSlug}
onChange={e=>setQueueSlug(e.target.value)}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"
>

<option value="">
{slugsLoading?"Loading":"Select"}
</option>

{availableSlugs.map(item=>(

<option key={item.slug} value={item.slug}>
{item.label}
</option>

))}

</select>

</div>


<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">
Platform
</label>

<select
value={queuePlatform}
onChange={e=>
setQueuePlatform(
e.target.value as QueuePlatform
)
}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"
>

<option value="instagram">Instagram</option>
<option value="pinterest">Pinterest</option>
<option value="facebook">Facebook</option>

</select>

</div>


<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">
Board
</label>

<select

value={board}

onChange={e=>setBoard(e.target.value)}

disabled={queuePlatform!=="pinterest"}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"

>

<option value="">
{boardsLoading?"Loading":"Select"}
</option>

{boards.map(b=>(

<option key={b.id} value={b.id}>
{b.name}
</option>

))}

</select>

</div>


<div>

<label className="text-sm font-bold text-[var(--brand-gold)]">
Schedule
</label>

<input

type="datetime-local"

value={scheduledFor}

onChange={e=>setScheduledFor(e.target.value)}

className="mt-2 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 text-white"

/>

</div>

</div>


<div className="mt-6 flex flex-wrap gap-3">

<button

onClick={()=>queuePost()}

disabled={queueLoading}

className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-white font-bold"

>

Queue

</button>


<button

onClick={()=>runQueue()}

disabled={queueLoading}

className="rounded-xl border border-[var(--border)] px-6 py-3 text-[var(--brand-gold)] font-bold"

>

Run Queue

</button>


<button

onClick={()=>build30()}

disabled={queueLoading||!board}

className="rounded-xl bg-[var(--brand-gold)] px-6 py-3 text-black font-bold"

>

Build 30 days

</button>


<button

onClick={()=>clearQueue()}

disabled={queueLoading}

className="rounded-xl border border-red-500 px-6 py-3 text-red-400 font-bold"

>

Clear Queue

</button>


</div>

</section>


<section className="mt-8 grid gap-8 lg:grid-cols-2">

<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">
Log
</h2>

<pre className="mt-4 min-h-[240px] bg-black/30 rounded-xl p-5 text-xs">

{log}

</pre>

</div>


<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">
Queue
</h2>

<div className="mt-4 space-y-3">

{queueItems.map(item=>(

<div
key={item.id}

className="rounded-xl border border-[var(--border)] bg-black/20 p-4"
>

<div className="font-bold text-[var(--brand-gold)]">
{item.title||item.slug}
</div>

<div className="text-xs text-[var(--text-soft)]">
{item.slug}
</div>

<div className="mt-2 text-xs">
{item.platform}
{item.board?` • ${boardName(item.board)}`:""}
 • {item.status}
</div>

<div className="text-xs mt-1">
{new Date(item.scheduledFor).toLocaleString()}
</div>

{item.error&&(

<div className="text-red-400 text-xs mt-2">
{item.error}
</div>

)}

</div>

))}

</div>

</div>

</section>

</main>

);

}