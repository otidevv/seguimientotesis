import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aumentar límite de tamaño para carga de archivos grandes
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
};

export default nextConfig;
