import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core and @sparticuz/chromium resolve their binary via
  // relative paths on disk at runtime — bundling them (Next's default for
  // server code) breaks that resolution. Keeping them external makes Next
  // require() them normally from node_modules instead.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
