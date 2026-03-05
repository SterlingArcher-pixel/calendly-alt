import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?calendar=error`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/api/auth/google-calendar/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?calendar=error`);
  }

  // Save tokens to this user's host record
  await supabase.from("hosts").update({
    google_refresh_token: tokens.refresh_token,
    google_access_token: tokens.access_token,
  }).eq("id", userId);

  return NextResponse.redirect(`${APP_URL}/dashboard/settings?calendar=connected`);
}
