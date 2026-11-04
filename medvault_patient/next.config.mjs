/** @type {import('next').NextConfig} */
const nextConfig = {
  // Support static export for Capacitor when explicitly requested via environment variable,
  // while allowing secure server-side Node.js API routes during standard Next.js execution.
  ...(process.env.OUTPUT_EXPORT === 'true' || process.env.CAPACITOR_BUILD === 'true'
    ? { output: 'export' }
    : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
