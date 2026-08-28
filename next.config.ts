import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
