import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit("avail:" + clientIp, 30, 60);
  if (!rateCheck.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const hostId = searchParams.get("host_id");
  const meetingTypeId = searchParams.get("meeting_type_id");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  if (!hostId || !meetingTypeId || !dateStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get meeting type for duration + buffers
  const { data: meetingType } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("id", meetingTypeId)
    .single();

  if (!meetingType) {
    return NextResponse.json({ error: "Meeting type not found" }, { status: 404 });
  }

  // Get host timezone
  const { data: host } = await supabase
    .from("hosts")
    .select("timezone")
    .eq("id", hostId)
    .single();

  const timezone = host?.timezone || "America/Denver";

  // Get day of week for the requested date
  const date = new Date(dateStr + "T12:00:00"); // noon to avoid timezone issues
  const dayOfWeek = date.getDay();

  // Get availability rules for this day
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("host_id", hostId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  if (!rules || rules.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Check for date overrides
  const { data: overrides } = await supabase
    .from("availability_overrides")
    .select("*")
    .eq("host_id", hostId)
    .eq("date", dateStr);

  // If there's an override marking the day unavailable, return empty
  if (overrides?.some((o) => !o.is_available)) {
    return NextResponse.json({ slots: [] });
  }

  // Get existing bookings for this date
  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59`;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("starts_at, ends_at")
    .eq("host_id", hostId)
    .in("status", ["confirmed", "rescheduled"])
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd);

  // Generate slots from availability rules
  const duration = meetingType.duration_minutes;
  const bufferBefore = meetingType.buffer_before || 0;
  const bufferAfter = meetingType.buffer_after || 0;
  const totalBlock = bufferBefore + duration + bufferAfter;

  const slots: string[] = [];

  for (const rule of rules) {
    const [startH, startM] = rule.start_time.split(":").map(Number);
    const [endH, endM] = rule.end_time.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
      const slotStart = new Date(`${dateStr}T00:00:00`);
      slotStart.setMinutes(m);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check buffer zone (slot with buffers)
      const bufferedStart = new Date(slotStart);
      bufferedStart.setMinutes(bufferedStart.getMinutes() - bufferBefore);
      const bufferedEnd = new Date(slotEnd);
      bufferedEnd.setMinutes(bufferedEnd.getMinutes() + bufferAfter);

      // Check conflicts with existing bookings
      const hasConflict = bookings?.some((b) => {
        const bStart = new Date(b.starts_at);
        const bEnd = new Date(b.ends_at);
        return bufferedStart < bEnd && bufferedEnd > bStart;
      });

      if (!hasConflict) {
        // Don't show past slots for today
        const now = new Date();
        if (slotStart > now) {
          const hours = String(Math.floor(m / 60)).padStart(2, "0");
          const mins = String(m % 60).padStart(2, "0");
          slots.push(`${hours}:${mins}`);
        }
      }
    }
  }

  return NextResponse.json({
    slots,
    timezone,
    duration: meetingType.duration_minutes,
  });
}
