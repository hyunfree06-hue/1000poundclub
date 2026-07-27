import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Storage public bucket domain is added by the user at deploy time
  // via NEXT_PUBLIC_SUPABASE_URL; images are served from <project>.supabase.co
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
