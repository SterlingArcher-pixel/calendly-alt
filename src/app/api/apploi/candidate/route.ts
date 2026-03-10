import { NextRequest, NextResponse } from "next/server";

/**
 * Mock endpoint simulating Apploi's GET /applicants/basic-info
 * In production, this would call: GET https://partners.apploi.com/applicants/basic-info
 * with x-api-key header
 * 
 * Returns candidate data that pre-fills the booking form
 */

// Demo candidates (would come from Apploi's API in production)
const mockCandidates: Record<string, any> = {
  "APL-1001": {
    applicant_id: "APL-1001",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "+1 (555) 234-5678",
    job_title: "Registered Nurse - ICU",
    facility: "Sunrise Harbor View",
    status: "ready_to_schedule",
    source: "apploi_ats",
  },
  "APL-1002": {
    applicant_id: "APL-1002",
    name: "James Thompson",
    email: "james.t@email.com",
    phone: "+1 (555) 876-5432",
    job_title: "CNA - Night Shift",
    facility: "Sunrise Lakewood",
    status: "ready_to_schedule",
    source: "apploi_ats",
  },
  "APL-1003": {
    applicant_id: "APL-1003",
    name: "Aisha Williams",
    email: "aisha.w@email.com",
    phone: "+1 (555) 345-6789",
    job_title: "LPN - Memory Care",
    facility: "Sunrise Maple Grove",
    status: "ready_to_schedule",
    source: "apploi_ats",
  },
};

export async function GET(req: NextRequest) {
  const applicantId = req.nextUrl.searchParams.get("applicant_id");
  
  if (applicantId && mockCandidates[applicantId]) {
    return NextResponse.json(mockCandidates[applicantId]);
  }

  // Return all candidates ready to schedule
  return NextResponse.json({
    candidates: Object.values(mockCandidates),
    source: "apploi_partner_api",
    note: "In production, calls GET https://partners.apploi.com/applicants/basic-info with x-api-key",
  });
}
