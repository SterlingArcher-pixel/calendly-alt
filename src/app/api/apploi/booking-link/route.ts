import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/apploi/booking-link
 *
 * Generates a per-recruiter booking URL for a candidate.
 * Solves the Calendly limitation where Apploi merge fields only support
 * the job owner's link, not the assigned recruiter's link.
 *
 * Query params:
 *   recruiter_id  — UUID of the recruiter (host) [required]
 *   applicant_id  — Apploi applicant ID [required]
 *   meeting_type_id — UUID of specific meeting type [optional, defaults to first active]
 *
 * Auth: Bearer token matching CRON_SECRET
 */
export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const recruiterId = params.get("recruiter_id");
  const applicantId = params.get("applicant_id");
  const meetingTypeId = params.get("meeting_type_id");

  if (!recruiterId || !applicantId) {
    return NextResponse.json(
      { error: "recruiter_id and applicant_id are required" },
      { status: 400 }
    );
  }

  // Look up recruiter
  const { data: host, error: hostError } = await supabase
    .from("hosts")
    .select("booking_url_slug, name")
    .eq("id", recruiterId)
    .single();

  if (hostError || !host?.booking_url_slug) {
    return NextResponse.json(
      { error: "Recruiter not found or missing booking_url_slug" },
      { status: 404 }
    );
  }

  // Look up meeting type — specific ID or first active for host
  let meetingType: { slug: string; title: string } | null = null;

  if (meetingTypeId) {
    const { data } = await supabase
      .from("meeting_types")
      .select("slug, title")
      .eq("id", meetingTypeId)
      .eq("is_active", true)
      .single();
    meetingType = data;
  }

  if (!meetingType) {
    const { data } = await supabase
      .from("meeting_types")
      .select("slug, title")
      .eq("host_id", recruiterId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();
    meetingType = data;
  }

  if (!meetingType) {
    return NextResponse.json(
      { error: "No active meeting type found for this recruiter" },
      { status: 404 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://calendly-alt.vercel.app";
  const url = `${baseUrl}/${host.booking_url_slug}/${meetingType.slug}?applicant_id=${applicantId}`;

  return NextResponse.json({
    url,
    recruiter_name: host.name,
    meeting_type: meetingType.title,
  });
}
