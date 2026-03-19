export function contentUrl(
slug:string,
type:"recipe"|"guide"
){

const base=
process.env.NEXT_PUBLIC_SITE_URL ||
"https://vegan-masala.com";

if(type==="recipe"){

return `${base}/recipes/${slug}`;

}

return `${base}/guides/${slug}`;

}