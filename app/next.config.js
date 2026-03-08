/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@bondit/sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dexscreener.com",
        pathname: "/tokens/**",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias["pino-pretty"] = false;
    return config;
  },
};

module.exports = nextConfig;
