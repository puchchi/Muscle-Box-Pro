import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/protein-vending-machine/:city",
        destination: "/protein-vending-machine-:city",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/protein-vending-machine-:city",
        destination: "/protein-vending-machine/:city",
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "client/src");
    config.resolve.alias["@shared"] = path.resolve(__dirname, "shared");
    return config;
  },
};

export default nextConfig;
