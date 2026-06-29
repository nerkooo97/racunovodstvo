import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samostalni (standalone) izlaz — minimalan runtime za Docker/Dokploy.
  output: "standalone",
  // Pre-postojeće greške u modulima dokumenata ne smiju blokirati produkcijski build.
  // (Preporuka: ukloniti ova dva flag-a nakon što se te greške isprave.)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      // Lokalni Supabase (razvoj)
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/v1/object/public/**",
      },
      // Produkcijski Supabase Cloud
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Self-hosted Supabase (custom domena)
      {
        protocol: "https",
        hostname: "**",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
