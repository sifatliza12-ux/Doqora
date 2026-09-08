import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { LinkedRecordNotFoundError, MissingEmailError, syncClerkWebhookEvent } from "@/server/webhooks/clerk";

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook signature verification failed", error);
    return new Response("Webhook verification failed", { status: 400 });
  }

  try {
    await syncClerkWebhookEvent(event);
  } catch (error) {
    if (error instanceof LinkedRecordNotFoundError) {
      console.error(error.message);
      return new Response(error.message, { status: 409 });
    }
    if (error instanceof MissingEmailError) {
      console.error(error.message);
      return new Response(error.message, { status: 400 });
    }
    throw error;
  }

  return new Response("OK", { status: 200 });
}
