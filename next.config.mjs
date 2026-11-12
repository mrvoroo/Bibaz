// Static export so the site can be hosted on GitHub Pages.
// For a project page (user.github.io/repo) set NEXT_PUBLIC_BASE_PATH=/repo at build time.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
