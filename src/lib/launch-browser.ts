import "server-only";
import type { Browser } from "puppeteer-core";

// Dev/prod fork: @sparticuz/chromium ships a Linux-only headless_shell
// binary (it's built for the Lambda/Vercel serverless runtime), so it
// cannot launch on this Windows dev machine. `process.env.VERCEL` is set
// automatically in every Vercel environment (dev/preview/production) and
// nowhere else, so it's what actually distinguishes "the real deployed
// runtime" from "a local checkout" — NOT NODE_ENV, since `next build &&
// next start` run locally also set NODE_ENV=production but still can't
// run the Linux binary.
//
// Locally, we fall back to the full `puppeteer` package (a devDependency),
// which downloads its own platform-appropriate Chromium at install time
// (see `npx puppeteer browsers install` / the postinstall script) and is
// never bundled into the deployed app.
//
// If this ever needs revisiting: confirm which branch actually ran by
// checking for the `IS_LOCAL`-style split in @sparticuz/chromium's own
// README ("Running Locally & Headless/Headful Mode" section) — this
// mirrors their documented pattern.
export async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  // Local dev: puppeteer-core's `launch` works fine once pointed at a real
  // browser binary — only the sparticuz binary itself is Linux-only, not
  // puppeteer-core. Importing the full `puppeteer` package purely for its
  // `executablePath()` helper (which knows where its own downloaded
  // browser lives) avoids hardcoding a path that would break on other
  // machines/OSes.
  const fullPuppeteer = await import("puppeteer");
  return puppeteer.launch({
    executablePath: await fullPuppeteer.executablePath(),
    headless: true,
  });
}
