import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les images Shopify sont redimensionnées par leur CDN (voir src/lib/image-loader.ts) : plus de délai d'attente de l'optimiseur de Next.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

export default nextConfig;
