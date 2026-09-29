const BACKEND_URL = process.env.BACKEND_URL || "https://6320-223-233-82-16.ngrok-free.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: "./",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/:path*` },
    ];
  },
};

export default nextConfig;

