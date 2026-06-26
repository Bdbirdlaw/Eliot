/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Photos are written to public/uploads in mock mode. Keep server actions
  // body limits generous enough for a single phone photo.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
