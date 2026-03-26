import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "sharp", "@vercel/blob"],

  images: {
    localPatterns: [
      {
        pathname: "/images/recipes/**",
        search: "?v=*",
      },
      {
        pathname: "/images/guides/**",
      },
      {
        pathname: "/images/**",
      },
      {
        pathname: "/brand/**",
      },
    ],
  },

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