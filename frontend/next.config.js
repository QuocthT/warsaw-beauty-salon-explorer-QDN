/** @type {import('next').NextConfig} */
const nextConfig = {
  // FIX: required for Docker standalone build
  // Without this, .next/standalone doesn't exist and the Dockerfile COPY fails
  output: "standalone",

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  },
}

module.exports = nextConfig
