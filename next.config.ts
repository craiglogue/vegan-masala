import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "sharp", "@vercel/blob"],

  outputFileTracingIncludes: {
    "/api/admin/social/video": ["./node_modules/ffmpeg-static/**"],
    "/api/admin/social/automation": ["./node_modules/ffmpeg-static/**"],
    "/api/admin/social/automation/growth": ["./node_modules/ffmpeg-static/**"],
  },

  outputFileTracingExcludes: {
    "*": [
      "./public/images/**/*",
      "./public/generated/**/*",
      "./public/audio/**/*",
    ],
  },
};

export default nextConfig;