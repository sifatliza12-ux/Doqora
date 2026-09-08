This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Testing the Clerk webhook locally

`src/app/api/webhooks/clerk/route.ts` handles `user.created`,
`organization.created`, and `organizationMembership.created`, verifying each
request's signature via `verifyWebhook` (`CLERK_WEBHOOK_SIGNING_SECRET`).
Clerk's webhooks need a publicly reachable URL, so local testing requires
tunneling `next dev`:

1. Install [ngrok](https://ngrok.com/download) and run `ngrok http 3000`
   (or whatever port `next dev` is bound to).
2. In the Clerk Dashboard, go to **Webhooks → Add Endpoint** and set the URL
   to `https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/clerk`.
   Subscribe to `user.created`, `organization.created`, and
   `organizationMembership.created`.
3. Copy the endpoint's **Signing Secret** (`whsec_...`) into
   `CLERK_WEBHOOK_SIGNING_SECRET` in `.env`.
4. Trigger real events against the tunneled app (sign up a user, create an
   organization) — or use the Dashboard's **Testing** tab on the endpoint
   page to send a sample payload — and watch `next dev`'s console output.

This has **not** been exercised in this environment: `.env` currently has
placeholder Clerk keys (no real publishable/secret key, no webhook signing
secret), so there is nothing to verify against yet, and no ngrok/Clerk
account is set up here. The handler was implemented directly from Clerk's
documented webhook payload shapes (`@clerk/backend`'s `UserJSON`,
`OrganizationJSON`, `OrganizationMembershipJSON` types) rather than guessed —
but it is untested against a live webhook delivery. Once real keys exist,
run through the steps above before relying on it.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
