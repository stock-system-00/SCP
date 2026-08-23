import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Aponta para o arquivo que criamos
  swSrc: "app/sw.ts",
  // Onde o arquivo final será gerado
  swDest: "public/sw.js",
  // Desabilita em desenvolvimento para não atrapalhar o debug (opcional)
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suas configurações existentes
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Permite imagens externas (se já não estiver configurado)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  reactStrictMode: true,
};

export default nextConfig;
