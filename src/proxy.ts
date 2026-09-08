import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under src/app/(app)/ (dashboard, customers, invoices, settings,
// dev) requires auth. Sign-in/up and the Clerk webhook (verified separately
// via its own signature check) stay public.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/(api|trpc)(.*)",
  ],
};
