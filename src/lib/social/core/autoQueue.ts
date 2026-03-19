import { addQueueItem } from "./queue";
import {
  allContent,
  slugFromFile,
  titleFromSlug,
  detectContentTypeBySlug
} from "./content";

import {
  buildPinterestCaption,
  buildInstagramCaption
} from "./captions";

import { contentUrl } from "./urls";

function randomTime(hour:number){
  const minute=Math.floor(Math.random()*40)+10;

  return new Date(
    Date.now() +
    (hour*60*60*1000)
  );
}

function buildScheduleDate(day:number){

  const base=new Date();

  base.setDate(
    base.getDate()+day
  );

  base.setHours(18);
  base.setMinutes(
    Math.floor(Math.random()*40)+10
  );

  return base.toISOString();
}

export function buildAutoQueue(
  days:number,
  platform:"pinterest"|"instagram"|"all",
  board?:string
){

  const items=allContent();

  let count=0;

  for(let i=0;i<days;i++){

    const item=
    items[
      i % items.length
    ];

    const slug=
    slugFromFile(
      item.file
    );

    const type=
    detectContentTypeBySlug(slug);

    if(!type) continue;

    const title=
    titleFromSlug(slug);

    const url=
    contentUrl(slug,type);

    if(
      platform==="pinterest"||
      platform==="all"
    ){

      addQueueItem({

        slug,
        title,

        platform:"pinterest",

        caption:
        buildPinterestCaption(
          slug,
          type
        ),

        url,

        board,

        scheduledFor:
        buildScheduleDate(i)

      });

      count++;

    }

    if(
      platform==="instagram"||
      platform==="all"
    ){

      addQueueItem({

        slug,
        title,

        platform:"instagram",

        caption:
        buildInstagramCaption(
          slug,
          type
        ),

        url,

        scheduledFor:
        buildScheduleDate(i)

      });

      count++;

    }

  }

  return count;

}