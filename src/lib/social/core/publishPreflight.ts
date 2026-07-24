type PreflightStage = "queue" | "publish";

type QueuePlatform = "instagram" | "pinterest" | "facebook";
type QueueAssetType = "image" | "video";

type PublishPreflightInput = {
  platform: string;
  slug: string;
  stage: PreflightStage;
  assetType: string;
  imageUrl?: string | null;
  publishImageUrl?: string | null;
  videoUrl?: string | null;
  board?: string | null;
  baseUrl?: string;
  allowMissingImageUrl?: boolean;
};

type PublishPreflightSuccess = {
  ok: true;
  normalized: {
    imageUrl: string;
    publishImageUrl: string;
    videoUrl: string;
    board: string;
  };
};

type PublishPreflightFailure = {
  ok: false;
  reason: string;
};

export type PublishPreflightResult =
  | PublishPreflightSuccess
  | PublishPreflightFailure;

const ALLOWED_PLATFORMS: QueuePlatform[] = ["instagram", "pinterest", "facebook"];
const ALLOWED_ASSET_TYPES: QueueAssetType[] = ["image", "video"];

function normalizePlatform(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAssetType(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizeBoard(value?: string | null) {
  return String(value || "").trim();
}

function normalizeUrl(url?: string | null, baseUrl?: string) {
  const value = String(url || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    if (value.startsWith("/") && baseUrl) {
      try {
        const parsed = new URL(value, baseUrl);
        parsed.hash = "";
        return parsed.toString();
      } catch {
        return value;
      }
    }

    return value;
  }
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isPrivateIPv4(hostname: string) {
  const parts = hostname.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isPubliclyReachableFormat(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    const host = (url.hostname || "").toLowerCase();
    if (!host) return false;

    if (host === "localhost" || host === "0.0.0.0" || host === "::1") {
      return false;
    }

    if (host.endsWith(".local")) {
      return false;
    }

    if (isPrivateIPv4(host)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function logPublishPreflightFailure(params: {
  platform: string;
  slug: string;
  stage: PreflightStage;
  reason: string;
}) {
  console.error("SOCIAL_PUBLISH_PREFLIGHT_FAILED", {
    platform: params.platform,
    slug: params.slug,
    stage: params.stage,
    reason: params.reason,
  });
}

function fail(input: PublishPreflightInput, reason: string): PublishPreflightFailure {
  logPublishPreflightFailure({
    platform: normalizePlatform(input.platform),
    slug: String(input.slug || "").trim(),
    stage: input.stage,
    reason,
  });

  return {
    ok: false,
    reason,
  };
}

export function validateSocialPublishPreflight(
  input: PublishPreflightInput
): PublishPreflightResult {
  const platform = normalizePlatform(input.platform);
  const slug = String(input.slug || "").trim();
  const stage = input.stage;
  const assetType = normalizeAssetType(input.assetType);

  if (!ALLOWED_PLATFORMS.includes(platform as QueuePlatform)) {
    return fail(input, "Platform invalid or missing");
  }

  if (!ALLOWED_ASSET_TYPES.includes(assetType as QueueAssetType)) {
    return fail(input, "Asset type invalid or missing");
  }

  if (platform === "pinterest") {
    const board = normalizeBoard(input.board);
    if (!board) {
      return fail(input, "Pinterest board required");
    }

    if (assetType === "video") {
      return fail(input, "Pinterest only supports image posts");
    }
  }

  const normalizedImageUrl = normalizeUrl(input.imageUrl, input.baseUrl);
  const normalizedPublishImageUrl = normalizeUrl(input.publishImageUrl, input.baseUrl);
  const normalizedVideoUrl = normalizeUrl(input.videoUrl, input.baseUrl);
  const normalizedBoard = normalizeBoard(input.board);

  const effectiveImageUrl = normalizedPublishImageUrl || normalizedImageUrl;

  if (assetType === "video") {
    if (!normalizedVideoUrl) {
      return fail(input, "Video URL missing");
    }

    if (!isAbsoluteHttpUrl(normalizedVideoUrl)) {
      return fail(input, "Video URL must be absolute");
    }

    if (!isPubliclyReachableFormat(normalizedVideoUrl)) {
      return fail(input, "Video URL must be publicly reachable format");
    }
  }

  if (assetType === "image") {
    if (!effectiveImageUrl && !input.allowMissingImageUrl) {
      return fail(input, "Image URL missing");
    }

    if (platform === "instagram" && !effectiveImageUrl) {
      return fail(input, "Instagram image posts require image URL");
    }

    if (effectiveImageUrl) {
      if (!isAbsoluteHttpUrl(effectiveImageUrl)) {
        return fail(input, "Publish image URL must be absolute");
      }

      if (!isPubliclyReachableFormat(effectiveImageUrl)) {
        return fail(input, "Publish image URL must be publicly reachable format");
      }
    }
  }

  return {
    ok: true,
    normalized: {
      imageUrl: normalizedImageUrl,
      publishImageUrl: normalizedPublishImageUrl,
      videoUrl: normalizedVideoUrl,
      board: normalizedBoard,
    },
  };
}

export function assertSocialPublishPreflight(input: PublishPreflightInput) {
  const result = validateSocialPublishPreflight(input);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result;
}
