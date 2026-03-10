import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify HMAC signature from Apploi
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Webhook receiver for Apploi ATS events
 * 
 * Supported events:
 *   application.created    — New candidate applied, trigger scheduling link
 *   application.status_changed — Candidate moved to "Ready to Schedule" stage
 *   application.hired      — Interview complete, feed to Viventium onboarding
 * 
 * Apploi Partner API: https://integrate.apploi.com
 * Auth: x-api-key header for outbound, HMAC signature for inbound webhooks
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.APPLOI_WEBHOOK_SECRET;

  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify HMAC signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers.get("x-apploi-signature");
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Idempotency check — skip already-processed events
  const eventId = event.event_id || event.id;
  if (eventId) {
    const { data: existing } = await supabase
      .from("webhook_messages")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (existing) {
      return NextResponse.json({ status: "already_processed" });
    }

    // Store for idempotency + audit trail
    await supabase.from("webhook_messages").insert({
      event_id: eventId,
      source: "apploi",
      event_type: event.type || event.event,
      payload: event,
      processed: false,
    });
  }

  // Route by event type
  const eventType = event.type || event.event;

  switch (eventType) {
    case "application.created": {
      // New candidate applied — could auto-generate scheduling link
      // Data available: applicant_id, job_id, applicant_name, applicant_email
      console.log(`[Apploi Webhook] New application: ${event.data?.applicant_id}`);
      break;
    }

    case "application.status_changed": {
      // Candidate moved to new stage — check if "Ready to Schedule"
      // Could auto-send booking link via email
      const newStatus = event.data?.new_status;
      console.log(`[Apploi Webhook] Status changed to: ${newStatus} for applicant: ${event.data?.applicant_id}`);
      break;
    }

    case "application.hired": {
      // Interview complete, candidate hired — trigger Viventium onboarding
      console.log(`[Apploi Webhook] Hired: ${event.data?.applicant_id}`);
      break;
    }

    default:
      console.log(`[Apploi Webhook] Unknown event type: ${eventType}`);
  }

  // Mark as processed
  if (eventId) {
    await supabase
      .from("webhook_messages")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  }

  return NextResponse.json({ status: "received", event_type: eventType });
}
