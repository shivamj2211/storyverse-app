/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_API_URL;
    return base
      ? [{ source: "/api/:path*", destination: `${base}/api/:path*` }]
      : [];
  },
};

module.exports = nextConfig;
