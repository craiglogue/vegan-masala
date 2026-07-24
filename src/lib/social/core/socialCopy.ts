import { detectContentTypeBySlug } from "@/lib/social/core/content";
import { generateSocialCopyForSlug } from "@/lib/social/ai/generateSocialCopy";
import {
  buildInstagramCaption,
  buildInstagramCaptionVariants,
  buildFacebookCaption,
  buildFacebookCaptionVariants,
  buildPinterestCaption,
  buildPinterestCaptionVariants,
} from "@/lib/social/core/captions";

type ContentType = "recipe" | "guide";


function ensureHashtags(
  text: string,
  fallbackTags: string[]
) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return fallbackTags.join("\n");

  if (/#\w+/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}\n\n${fallbackTags.join("\n")}`;
}

function instagramFallbackTags(slug: string) {
  const slugTags = slug
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => `#${part.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`)
    .filter(Boolean);

  return [
    ...slugTags,
    "#veganrecipes",
    "#veganindian",
    "#indianfood",
    "#plantbased",
    "#vegancooking",
    "#homecooking",
    "#veganuk",
    "#veganmasala",
  ].filter((tag, i, arr) => arr.indexOf(tag) === i);
}

function facebookFallbackTags() {
  return ["#veganmasala", "#plantbased", "#indianfood"];
}

function pinterestFallbackTags() {
  return [
    "#veganrecipes",
    "#veganindian",
    "#indianfood",
    "#plantbased",
    "#vegancooking",
    "#veganmasala",
  ];
}

export async function getSocialCopyForSlug(slug: string) {
  const detected = detectContentTypeBySlug(slug);
  const type = (detected || "recipe") as ContentType;

  try {
    const ai = await generateSocialCopyForSlug(slug, type);

    if (ai) {
      return {
        type,
        instagramCaption: ensureHashtags(
          ai.instagramCaptionVariants[0] || buildInstagramCaption(slug, type),
          instagramFallbackTags(slug)
        ),
        instagramCaptionVariants:
          (ai.instagramCaptionVariants.length > 0
            ? ai.instagramCaptionVariants
            : buildInstagramCaptionVariants(slug, type)
          ).map((variant) => ensureHashtags(variant, instagramFallbackTags(slug))),

        facebookCaption: ensureHashtags(
          ai.facebookCaptionVariants[0] || buildFacebookCaption(slug, type),
          facebookFallbackTags()
        ),
        facebookCaptionVariants:
          (ai.facebookCaptionVariants.length > 0
            ? ai.facebookCaptionVariants
            : buildFacebookCaptionVariants(slug, type)
          ).map((variant) => ensureHashtags(variant, facebookFallbackTags())),

        pinterestCaption: ensureHashtags(
          ai.pinterestCaptionVariants[0] || buildPinterestCaption(slug, type),
          pinterestFallbackTags()
        ),
        pinterestCaptionVariants:
          (ai.pinterestCaptionVariants.length > 0
            ? ai.pinterestCaptionVariants
            : buildPinterestCaptionVariants(slug, type)
          ).map((variant) => ensureHashtags(variant, pinterestFallbackTags())),

        instagramImageHook: ai.instagramImageHook || "",
        instagramImageSubtitle: ai.instagramImageSubtitle || "",
        pinterestImageHook: ai.pinterestImageHook || "",
        pinterestImageSubtitle: ai.pinterestImageSubtitle || "",
      };
    }
  } catch (err) {
    console.error("AI social copy failed for slug:", slug, err);
  }

  return {
    type,
    instagramCaption: ensureHashtags(
      buildInstagramCaption(slug, type),
      instagramFallbackTags(slug)
    ),
    instagramCaptionVariants: buildInstagramCaptionVariants(slug, type).map((variant) =>
      ensureHashtags(variant, instagramFallbackTags(slug))
    ),
    facebookCaption: ensureHashtags(
      buildFacebookCaption(slug, type),
      facebookFallbackTags()
    ),
    facebookCaptionVariants: buildFacebookCaptionVariants(slug, type).map((variant) =>
      ensureHashtags(variant, facebookFallbackTags())
    ),
    pinterestCaption: ensureHashtags(
      buildPinterestCaption(slug, type),
      pinterestFallbackTags()
    ),
    pinterestCaptionVariants: buildPinterestCaptionVariants(slug, type).map((variant) =>
      ensureHashtags(variant, pinterestFallbackTags())
    ),

    instagramImageHook: "",
    instagramImageSubtitle: "",
    pinterestImageHook: "",
    pinterestImageSubtitle: "",
  };
}