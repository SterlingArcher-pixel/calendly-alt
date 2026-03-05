"use client";
import { generateICS, downloadICS } from "@/lib/ics";

import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from "react";

type MeetingType = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  color: string;
  host_id: string;
};

type Host = {
  id: string;
  name: string;
  avatar_url: string;
  timezone: string;
};

export default function BookingPage() {
  const params = useParams();
  const username = params.username as string;
  const slug = params.slug as string;

  const [host, setHost] = useState<Host | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [step, setStep] = useState<"calendar" | "form" | "confirmed">("calendar");

  // Guest form
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const bookingRef = React.useRef(false);
  const [meetLink, setMeetLink] = useState("");
  const [bookingId, setBookingId] = useState("");

  // Timezone detection
  const [guestTimezone, setGuestTimezone] = useState("");
  useEffect(() => {
    setGuestTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const handleDownloadICS = () => {
    if (!meetingType || !host || !selectedDate || !selectedTime) return;
    const startDate = new Date(selectedDate + "T" + selectedTime + ":00");
    const endDate = new Date(startDate.getTime() + meetingType.duration_minutes * 60000);
    const ics = generateICS({
      title: meetingType.title + " with " + host.name,
      description: "Booked via Apploi Scheduling" + (meetLink ? "\nGoogle Meet: " + meetLink : ""),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      location: meetLink || undefined,
      organizerName: host.name,
      organizerEmail: host.email || undefined,
      attendeeName: guestName,
      attendeeEmail: guestEmail,
    });
    downloadICS(ics, meetingType.title.replace(/\s+/g, "-").toLowerCase() + ".ics");
  };

  // Load host + meeting type
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: hosts } = await supabase
        .from("hosts")
        .select("*")
        .eq("booking_url_slug", username);

      if (!hosts || hosts.length === 0) {
        setError("Host not found");
        setLoading(false);
        return;
      }

      const foundHost = hosts[0];
      setHost(foundHost);

      const { data: mt } = await supabase
        .from("meeting_types")
        .select("*")
        .eq("host_id", foundHost.id)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!mt) {
        setError("Meeting type not found");
        setLoading(false);
        return;
      }

      setMeetingType(mt);
      setLoading(false);
    }
    load();
  }, [username, slug]);

  // Load slots when date changes
  const loadSlots = useCallback(async (date: string) => {
    if (!host || !meetingType) return;
    setLoadingSlots(true);
    setSelectedTime("");
    try {
      const res = await fetch(
        `/api/availability?host_id=${host.id}&meeting_type_id=${meetingType.id}&date=${date}`
      );
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    }
    setLoadingSlots(false);
  }, [host, meetingType]);

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  // Calendar helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateISO = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isDateInPast = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    return d < today;
  };

  const isToday = (year: number, month: number, day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const canGoBack = () => {
    return (
      currentMonth.getFullYear() > today.getFullYear() ||
      (currentMonth.getFullYear() === today.getFullYear() &&
        currentMonth.getMonth() > today.getMonth())
    );
  };

  const monthName = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (!canGoBack()) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const handleBook = async () => {
    if (bookingRef.current) return;
    bookingRef.current = true;
    if (!guestName || !guestEmail) return;
    setBooking(true);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_id: host!.id,
          meeting_type_id: meetingType!.id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_notes: guestNotes,
          date: selectedDate,
          time: selectedTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      bookingRef.current = false;
        setBooking(false);
        return;
      }
      if (data.meet_link) setMeetLink(data.meet_link);
      if (data.booking_id) setBookingId(data.booking_id);
      setStep("confirmed");
    } catch {
      alert("Something went wrong. Please try again.");
    bookingRef.current = false;
    }
    setBooking(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p className="text-lg font-medium text-gray-900">Page not found</p>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  // Confirmed
  if (step === "confirmed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h1>
          <p className="mt-2 text-gray-500">
            A calendar invitation has been sent to{" "}
            <span className="font-medium text-gray-700">{guestEmail}</span>
          </p>
          <div className="mt-6 rounded-xl bg-gray-50 p-5 text-left">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meetingType!.color }}></div>
              <p className="font-semibold text-gray-900">{meetingType!.title}</p>
            </div>
            <p className="mt-1 text-sm text-gray-500">with {host!.name}</p>
            <hr className="my-3 border-gray-200" />
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(selectedTime)} ({meetingType!.duration_minutes} min)</span>
              </div>
            </div>
          </div>
          {meetLink && (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
              Join with Google Meet
            </a>
          )}
          {bookingId && (
            <a
              href={`/booking/${bookingId}`}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Reschedule or Cancel
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-10 md:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border bg-white shadow-sm">
        {step === "calendar" ? (
          <div className="grid md:grid-cols-[260px_1fr]">
            {/* Left panel */}
            <div className="border-b p-6 md:border-b-0 md:border-r">
              <div className="flex items-center gap-3">
                {host?.avatar_url ? (
                  <img src={host.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
                    {host?.name?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{host?.name}</p>
                </div>
              </div>
              <div className="mt-6">
                <h1 className="text-xl font-bold" style={{ color: meetingType?.color }}>
                  {meetingType?.title}
                </h1>
                {meetingType?.description && (
                  <p className="mt-2 text-sm text-gray-500">{meetingType.description}</p>
                )}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {meetingType?.duration_minutes} minutes
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                    </svg>
                    {host?.timezone || "America/Denver"}
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel — calendar + slots */}
            <div className="p-6">
              {/* Month navigation */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">{monthName}</h2>
                <div className="flex gap-1">
                  <button
                    onClick={prevMonth}
                    disabled={!canGoBack()}
                    className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextMonth}
                    className="rounded-lg p-1.5 hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-6">
                {/* Calendar grid */}
                <div>
                  {/* Day headers */}
                  <div className="mb-2 grid grid-cols-7 text-center">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                      <div key={d} className="py-1 text-xs font-medium text-gray-400">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Day buttons */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateISO = formatDateISO(year, month, day);
                      const isPast = isDateInPast(year, month, day);
                      const isTodayDate = isToday(year, month, day);
                      const isSelected = selectedDate === dateISO;

                      return (
                        <button
                          key={day}
                          disabled={isPast}
                          onClick={() => setSelectedDate(dateISO)}
                          className={`aspect-square rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-sm"
                              : isPast
                              ? "cursor-not-allowed text-gray-300"
                              : isTodayDate
                              ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots panel */}
                <div className="w-36">
                  {!selectedDate ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-xs text-gray-400">Select a date to view times</p>
                    </div>
                  ) : loadingSlots ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-xs text-gray-400">No times available</p>
                    </div>
                  ) : (
                    <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </p>
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => {
                            setSelectedTime(slot);
                            setStep("form");
                          }}
                          className="w-full rounded-lg border border-blue-200 px-3 py-2 text-center text-sm font-medium text-teal-700 transition-all hover:border-teal-500 hover:bg-teal-50"
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Booking form step */
          <div className="grid md:grid-cols-[260px_1fr]">
            <div className="border-b p-6 md:border-b-0 md:border-r">
              <div className="flex items-center gap-3">
                {host?.avatar_url ? (
                  <img src={host.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
                    {host?.name?.[0]}
                  </div>
                )}
                <p className="font-semibold text-gray-900">{host?.name}</p>
              </div>
              <div className="mt-6">
                <h1 className="text-xl font-bold" style={{ color: meetingType?.color }}>
                  {meetingType?.title}
                </h1>
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {meetingType?.duration_minutes} minutes
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(selectedTime)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={() => { setStep("calendar"); setSelectedTime(""); }}
                className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h2 className="mb-5 text-lg font-semibold text-gray-900">Enter Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Additional notes <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={guestNotes}
                    onChange={(e) => setGuestNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Share anything that'll help prepare for our meeting"
                  />
                </div>
                <button
                  onClick={handleBook}
                  disabled={booking || !guestName || !guestEmail}
                  className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: meetingType?.color || "#3b82f6" }}
                >
                  {booking ? "Scheduling..." : "Schedule Event"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-3 text-center text-xs text-gray-400">
          {guestTimezone && (
            <span>Times shown in {guestTimezone.replace(/_/g, " ")} &middot; </span>
          )}
          Powered by Apploi
        </div>
      </div>
    </div>
  );
}
