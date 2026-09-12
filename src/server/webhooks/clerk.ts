import { Prisma } from "@prisma/client";
import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/prisma";

export class MissingEmailError extends Error {}
export class LinkedRecordNotFoundError extends Error {}

// Clerk may redeliver an event (network retry, etc.) — a unique constraint
// violation on a create() means we've already applied it, which is a no-op,
// not an error.
function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function syncClerkWebhookEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, primary_email_address_id, first_name, last_name } = event.data;
      const primaryEmail =
        email_addresses.find((email) => email.id === primary_email_address_id)?.email_address ??
        email_addresses[0]?.email_address;

      if (!primaryEmail) {
        throw new MissingEmailError(`Clerk user ${id} has no email address`);
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await prisma.user.upsert({
        where: { clerkUserId: id },
        update: { email: primaryEmail, name },
        create: { clerkUserId: id, email: primaryEmail, name },
      });
      return;
    }

    case "organization.created": {
      const { id, name } = event.data;
      try {
        await prisma.business.create({
          data: { clerkOrgId: id, name },
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      return;
    }

    case "organizationMembership.created": {
      const { organization, public_user_data, role } = event.data;

      const [user, business] = await Promise.all([
        prisma.user.findUnique({ where: { clerkUserId: public_user_data.user_id } }),
        prisma.business.findUnique({ where: { clerkOrgId: organization.id } }),
      ]);

      if (!user || !business) {
        // Clerk doesn't guarantee event delivery order, so the linked
        // user.created / organization.created event may not have been
        // processed yet. Throwing (-> non-2xx response) makes Clerk retry.
        throw new LinkedRecordNotFoundError(
          `organizationMembership.created for org ${organization.id} / user ${public_user_data.user_id} arrived before its User or Business row existed`
        );
      }

      try {
        await prisma.businessMember.create({
          data: {
            userId: user.id,
            businessId: business.id,
            // Clerk's own assigned role at membership-creation time (default
            // roles "org:admin"/"org:member") — NOT "are you the org
            // creator", which is wrong the moment the creator invites someone
            // else in as an admin too. The live equivalent of this check
            // (auth().orgRole, see requireOwnerRole() in business.ts) is what
            // actually gates OWNER-only actions; this column is a
            // point-in-time snapshot for display purposes only.
            role: role === "org:admin" ? "OWNER" : "MEMBER",
          },
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      return;
    }

    default:
      return;
  }
}
