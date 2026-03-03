import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert the host record so it stays in sync with auth
      const { user } = data;
      await supabase.from("hosts").upsert(
        {
          id: user.id,
          email: user.email!,
          name:
            user.user_metadata.full_name ||
            user.user_metadata.name ||
            user.email!,
          avatar_url: user.user_metadata.avatar_url,
          google_access_token: data.session?.provider_token,
          google_refresh_token: data.session?.provider_refresh_token,
        },
        { onConflict: "id" }
      );

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Auth code exchange failed — redirect to error page or home
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
