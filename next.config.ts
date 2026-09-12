import type { NextConfig } from "next";

// Clerk's publishable key base64-encodes its own Frontend API domain (the
// origin Clerk's SDK actually loads its script/iframe from and calls for
// auth requests — confirmed by observing real network traffic across every
// page in this app, not assumed): "pk_test_<base64>$" or "pk_live_<base64>$"
// decodes to e.g. "good-husky-1099.clerk.accounts.dev". Deriving it here
// rather than hardcoding the literal domain means the CSP keeps working
// automatically if this Clerk instance is ever recreated/migrated (a new
// publishable key would decode to a new domain without needing a manual
// CSP edit) — see clerk.com/docs/references/nextjs/read-session-data for
// the same decoding Clerk's own docs describe for related use cases.
function clerkFrontendApiOrigin(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  const match = key.match(/^pk_(test|live)_(.+)$/);
  if (!match) return null;
  try {
    const domain = Buffer.from(match[2], "base64").toString("utf8").replace(/\$+$/, "");
    return domain ? `https://${domain}` : null;
  } catch {
    return null;
  }
}

// Report-Only pass — deliberately not enforcing yet (see the security pass
// this defers from). Built entirely from origins actually observed loading
// across every real flow (sign-in, sign-up, dashboard, customers, settings/
// Team's <OrganizationProfile />, invoice builder, PDF download): Clerk's
// own Frontend API domain for script/connect/frame, img.clerk.com for
// Clerk's own icon images (e.g. the "Continue with Google" button), and
// `data:` for the inline SVGs Clerk's UI renders directly. No Google Fonts
// origin needed — Inter and Noto Sans Arabic are both loaded via next/font,
// which self-hosts the actual font files at build time (see layout.tsx).
// Vercel Analytics/Speed Insights are not enabled and nothing in this
// codebase references them, so no origin needed for those either.
//
// worker-src (below) came from the FIRST deployed Report-Only pass, not
// this initial network-request survey — a blob: Worker isn't a normal
// `request` Puppeteer's Network domain attributes to Clerk's own origin
// (its embedded blob: URL resolves to whatever page created it, i.e. this
// app's own origin), so it never showed up as a "foreign" origin to spot by
// inspection. Report-Only mode caught it immediately once deployed: real
// securitypolicyviolation events fired on every single page. That's
// exactly the failure mode Report-Only exists to catch before enforcing.
//
// script-src/style-src use 'unsafe-inline' rather than a nonce: Next.js's
// own inline hydration scripts need one or the other, and a nonce-based CSP
// requires opting every single page into dynamic rendering app-wide (per
// Next's own CSP guide) — a much bigger, unrequested architectural change
// than "add a CSP header" for a first Report-Only pass. Worth reconsidering
// specifically if/when this moves to enforcing mode and the app's rendering
// model is being touched anyway; not introduced silently here.
function buildCspHeaderValue(): string {
  const clerkOrigin = clerkFrontendApiOrigin();
  const clerkPart = clerkOrigin ? ` ${clerkOrigin}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${clerkPart}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: https://img.clerk.com`,
    "font-src 'self'",
    `connect-src 'self'${clerkPart}`,
    `frame-src${clerkPart || " 'none'"}`,
    // Clerk's SDK spins up a Web Worker from a blob: URL on every single
    // page load (observed consistently, twice per page, across every flow
    // tested — sign-in/up included, before any interactive auth action) —
    // not covered by default-src 'self', since worker-src doesn't inherit
    // the blob: scheme from a same-origin default.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

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
  // Baseline hardening headers, plus a Report-Only CSP (see
  // buildCspHeaderValue() above) — Report-Only so nothing can actually break:
  // violations are only reported to the browser console, never blocked.
  // Switching to a real, enforcing Content-Security-Policy is a deliberate
  // separate follow-up once Report-Only has run clean across every flow.
  //
  // Set directly here (next.config.ts) rather than in proxy.ts (this
  // version's renamed middleware.ts — see AGENTS.md): the value needs no
  // per-request randomness (no nonce), so there's nothing a proxy would add
  // over a static header, and every other security header the app sets
  // already lives here too.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: buildCspHeaderValue() },
        ],
      },
    ];
  },
};

export default nextConfig;
