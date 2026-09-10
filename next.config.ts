import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core and @sparticuz/chromium resolve their binary via
  // relative paths on disk at runtime — bundling them (Next's default for
  // server code) breaks that resolution. Keeping them external makes Next
  // require() them normally from node_modules instead.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // serverExternalPackages only stops webpack from bundling the package's
  // JS — it does NOT guarantee Vercel's separate file-tracer (@vercel/nft)
  // includes @sparticuz/chromium's compressed binary (bin/*.br), since
  // chromium.executablePath() reads it dynamically at runtime rather than
  // via a statically-traceable require(). Without this, the PDF route's
  // deployed function is missing the actual Chromium binary even though
  // the code that references it deploys fine.
  outputFileTracingIncludes: {
    // Route keys are picomatch globs, so the dynamic segment's literal
    // brackets must be escaped — otherwise "[id]" is parsed as a glob
    // character class and silently never matches this route.
    "/api/invoices/\\[id\\]/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
