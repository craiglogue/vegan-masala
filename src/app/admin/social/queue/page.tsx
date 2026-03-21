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
const [queuePlatform,setQueuePlatform]=useState<QueuePlatform>("instagram");

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

setBoards([]);

const res=await fetch(
"/api/pinterest/boards",
{cache:"no-store"}
);

const data=await res.json();

if(!res.ok){

setLog(data.error||"Failed to load boards");

return;

}

if(!data.ok){

setLog("Pinterest not connected");

return;

}

setBoards(data.items||[]);

if(!data.items?.length){

setLog("No Pinterest boards found");

}

}
catch(err:any){

setLog(err?.message||"Board load failed");

}
finally{

setBoardsLoading(false);

}

}

async function refresh(){

await Promise.all([
loadQueue(),
loadSlugs()
]);

}

useEffect(()=>{

void refresh();

},[]);

/* LOAD BOARDS WHEN PINTEREST SELECTED */

useEffect(()=>{

if(queuePlatform==="pinterest"){

void loadBoards();

}else{

setBoard("");
setBoards([]);

}

},[queuePlatform]);

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

setLog("Select Pinterest board");

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
board:queuePlatform==="pinterest"?board:null

})

});

const data=await res.json();

if(!res.ok){

setLog(data.error||"Queue failed");

return;

}

setLog("Post queued");

setQueueSlug("");
setScheduledFor("");
setBoard("");

await loadQueue();

}
catch(err:any){

setLog(err?.message||"Queue failed");

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

setLog(data.error||"Run failed");

return;

}

setLog(`Processed ${data.count||0}`);

await loadQueue();

}
catch(err:any){

setLog(err?.message||"Run failed");

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

setLog("Clear failed");

}
finally{

setQueueLoading(false);

}

}

async function build30(){

if(!board){

setLog("Select board first");

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

setLog(`Created ${data.count||0}`);

await loadQueue();

}
catch{

setLog("Build failed");

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
{slugsLoading?"Loading...":"Select content"}
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
onChange={e=>setQueuePlatform(e.target.value as QueuePlatform)}

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
{queuePlatform!=="pinterest"
?"Select Pinterest first"
:boardsLoading
?"Loading boards..."
:"Select board"}
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
onClick={queuePost}
disabled={queueLoading}
className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-white font-bold"
>
Queue
</button>

<button
onClick={runQueue}
disabled={queueLoading}
className="rounded-xl border border-[var(--border)] px-6 py-3 text-[var(--brand-gold)] font-bold"
>
Run Queue
</button>

<button
onClick={build30}
disabled={queueLoading||!board}
className="rounded-xl bg-[var(--brand-gold)] px-6 py-3 text-black font-bold"
>
Build 30 days
</button>

<button
onClick={clearQueue}
disabled={queueLoading}
className="rounded-xl border border-red-500 px-6 py-3 text-red-400 font-bold"
>
Clear Queue
</button>

</div>

</section>

<section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-bold text-[var(--brand-gold)]">
Log
</h2>

<pre className="mt-4 min-h-[240px] bg-black/30 rounded-xl p-5 text-xs">

{log}

</pre>

</section>

</main>

);

}