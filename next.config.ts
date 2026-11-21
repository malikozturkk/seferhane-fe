import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Tenant subdomains in development (alpcengiz.localhost:3000, admin.localhost:3000).
  allowedDevOrigins: ["*.localhost"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        // CSS Modules (design system components) keep Next's built-in
        // module handling; Tailwind only processes global stylesheets.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
