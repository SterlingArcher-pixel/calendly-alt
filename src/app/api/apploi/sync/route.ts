import { NextRequest, NextResponse } from "next/server";

/**
 * Outbound sync: Push interview data to Apploi ATS
 * 
 * Called after a booking is created/updated/cancelled in our system.
 * Uses Apploi Partner API: PUT /applicants/{applicant_id}/interviews
 * 
 * Base URL: https://partners.apploi.com
 * Auth: x-api-key header
 * Docs: https://integrate.apploi.com/reference/put_applicants-interviews
 * 
 * Also updates applicant pipeline status via PUT /applicants/status
 * to move candidates to "Interview Scheduled" stage automatically.
 */

const APPLOI_API_KEY = process.env.APPLOI_API_KEY;
const APPLOI_BASE_URL = "https://partners.apploi.com";

interface ApploiInterviewSync {
  applicant_id: string;
  booking_id: string;
  action: "scheduled" | "rescheduled" | "cancelled" | "completed";
  interview_date?: string;
  interview_time?: string;
  interview_type?: string;
  interviewer_name?: string;
  meeting_link?: string;
  facility_name?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APPLOI_API_KEY) {
    return NextResponse.json({
      error: "Apploi API key not configured",
      note: "Add APPLOI_API_KEY to environment variables. Request a partner API key from api@apploi.com",
    }, { status: 503 });
  }

  const body: ApploiInterviewSync = await req.json();

  try {
    // 1. Sync interview data to Apploi
    const interviewRes = await fetch(
      `${APPLOI_BASE_URL}/applicants/${body.applicant_id}/interviews`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APPLOI_API_KEY,
        },
        body: JSON.stringify({
          interview_date: body.interview_date,
          interview_time: body.interview_time,
          interview_type: body.interview_type,
          interviewer: body.interviewer_name,
          location: body.meeting_link || body.facility_name,
          status: body.action,
          notes: body.notes,
          external_booking_id: body.booking_id,
        }),
      }
    );

    // 2. Update applicant pipeline status
    const statusMap: Record<string, string> = {
      scheduled: "interview_scheduled",
      rescheduled: "interview_rescheduled",
      cancelled: "interview_cancelled",
      completed: "interview_completed",
    };

    const statusRes = await fetch(
      `${APPLOI_BASE_URL}/applicants/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APPLOI_API_KEY,
        },
        body: JSON.stringify({
          applicant_id: body.applicant_id,
          status: statusMap[body.action] || body.action,
        }),
      }
    );

    return NextResponse.json({
      synced: true,
      interview_status: interviewRes.status,
      pipeline_status: statusRes.status,
      applicant_id: body.applicant_id,
      action: body.action,
    });
  } catch (error: any) {
    console.error("[Apploi Sync] Error:", error);
    return NextResponse.json({
      synced: false,
      error: error.message,
    }, { status: 500 });
  }
}
