import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://calendly-alt.vercel.app";
const ALLOWED_ORIGINS = [APP_URL, "http://localhost:3000"];

// Routes that must verify Origin (state-changing, auth-protected)
const CSRF_PROTECTED = [
  "/api/bookings",
  "/api/team/invite",
  "/api/team/accept",
  "/api/workflows",
  "/api/facilities",
  "/api/meeting-types",
  "/api/availability",
];

// Public POST routes — no CSRF check (no session required)
const CSRF_EXEMPT = [
  "/api/book",       // Public booking form
  "/api/cron",       // Bearer token protected
  "/api/ping",       // Health check
  "/api/auth",       // OAuth flows
];

function isCsrfProtected(pathname: string): boolean {
  if (CSRF_EXEMPT.some(p => pathname.startsWith(p))) return false;
  return CSRF_PROTECTED.some(p => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const reqMethod = request.method;

  // CSRF: check Origin on state-changing requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(reqMethod) && isCsrfProtected(pathname)) {
    const origin = request.headers.get("origin");
    if (!origin || !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Public routes — no auth needed
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/availability") ||
    pathname.startsWith("/api/book") ||
    pathname.startsWith("/api/booking") ||
    pathname.startsWith("/api/ping") ||
    pathname.startsWith("/booking/") ||
    pathname.startsWith("/invite/") ||
    (pathname.split("/").length === 3 && !pathname.startsWith("/dashboard"))
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
