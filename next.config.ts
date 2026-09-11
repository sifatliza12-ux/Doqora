import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework in responses (X-Powered-By: Next.js) —
  // no functional benefit to leaking this, trivial to turn off.
  poweredByHeader: false,
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
  // Baseline hardening headers with no app-specific tuning required. A
  // Content-Security-Policy is deliberately NOT included here — this app
  // loads Clerk's hosted script/frame origins and Next dev/Turbopack needs
  // its own relaxed rules, so a real CSP needs to be built and tested
  // against every page (sign-in, invoice builder, print pipeline) rather
  // than guessed at; getting it wrong silently breaks auth or rendering
  // instead of failing loudly.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
