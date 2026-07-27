"use client";

import Link from "next/link";

type ToolCard = {
  title:string;
  href:string;
  description:string;
  cta:string;
};

const tools:ToolCard[]=[

{
title:"Health Dashboard",

href:"/admin/social/health",

description:
"Inspect queue status, platform readiness, recent failures and publishing activity without exposing tokens or secrets.",

cta:"Open health dashboard"
},

{
title:"Content Generator",

href:"/admin/social/generate",

description:
"Generate Instagram posts and Pinterest pins for single slugs, latest content, or your full recipe library.",

cta:"Open generator"
},

{
title:"Queue Manager",

href:"/admin/social/queue",

description:
"Schedule posts, build your 30 day publishing queue, run due posts and manage failures.",

cta:"Open queue"
},

{
title:"Video Generator",

href:"/admin/social/video",

description:
"Generate branded short-form recipe videos with intro, outro, music and animation.",

cta:"Open video tools"
},

{
title:"SEO Health",

href:"/admin/seo/health",

description:
"Monitor recipe, guide, hub and sitemap SEO structure health using local repository data.",

cta:"Open SEO health"
}

];

export default function AdminSocialHubPage(){

return(

<main className="mx-auto max-w-7xl px-6 py-10">

<section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]/70">
Admin
</div>

<h1 className="mt-2 text-3xl font-extrabold text-[var(--brand-gold)]">
Social Publishing Hub
</h1>

<p className="mt-4 max-w-3xl text-sm text-[var(--text-soft)]">

Manage Vegan Masala social automation from one place.
Generate assets, build videos and schedule your publishing pipeline.

</p>


<div className="mt-6 flex flex-wrap gap-3">

<Link

href="/admin/social/generate"

className="rounded-xl bg-[var(--brand-red)] px-6 py-3 text-sm font-bold text-white"

>

Generate content

</Link>


<Link

href="/admin/social/queue"

className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-bold text-[var(--brand-gold)]"

>

Open queue

</Link>


<Link

href="/admin/social/video"

className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-bold text-[var(--brand-gold)]"

>

Generate videos

</Link>


<Link

href="/admin/seo/health"

className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-bold text-[var(--brand-gold)]"

>

SEO health

</Link>

</div>

</section>



<section className="mt-8 grid gap-6 lg:grid-cols-3">

{tools.map(tool=>(

<Link

key={tool.href}

href={tool.href}

className="group rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-black/20 transition"

>

<div className="text-xs uppercase tracking-[0.16em] text-[var(--brand-gold)]/70">
Tool
</div>


<h2 className="mt-2 text-2xl font-extrabold text-[var(--brand-gold)]">
{tool.title}
</h2>


<p className="mt-4 text-sm text-[var(--text-soft)] min-h-[80px]">

{tool.description}

</p>


<div className="mt-6 inline-flex rounded-xl bg-black/30 px-4 py-2 text-sm font-bold text-white group-hover:bg-[var(--brand-red)] transition">

{tool.cta}

</div>

</Link>

))}

</section>



<section className="mt-8 grid gap-6 lg:grid-cols-2">

<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-extrabold text-[var(--brand-gold)]">

Recommended workflow

</h2>


<div className="mt-5 space-y-4 text-sm text-[var(--text-soft)]">

<div className="rounded-2xl bg-black/20 p-4">

<b className="text-[var(--brand-gold)]">1.</b>
 Generate images in Content Generator

</div>


<div className="rounded-2xl bg-black/20 p-4">

<b className="text-[var(--brand-gold)]">2.</b>
 Generate recipe videos

</div>


<div className="rounded-2xl bg-black/20 p-4">

<b className="text-[var(--brand-gold)]">3.</b>
 Queue 30 days of content

</div>

</div>

</div>



<div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">

<h2 className="text-xl font-extrabold text-[var(--brand-gold)]">

Why this structure works

</h2>


<div className="mt-5 space-y-4 text-sm text-[var(--text-soft)]">

<div className="rounded-2xl bg-black/20 p-4">
Pages load faster
</div>

<div className="rounded-2xl bg-black/20 p-4">
Easier debugging
</div>

<div className="rounded-2xl bg-black/20 p-4">
Ready for Meta / TikTok / YouTube expansion
</div>

</div>

</div>

</section>


</main>

);

}