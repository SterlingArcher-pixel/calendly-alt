"use client";
import { generateICS, downloadICS } from "@/lib/ics";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Booking = {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_notes: string;
  starts_at: string;
  ends_at: string;
  status: string;
  google_meet_link: string | null;
  cancelled_at: string | null;
  meeting_types: {
    title: string;
    color: string;
    duration_minutes: number;
    slug: string;
  };
  hosts: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
};

export default function BookingManagePage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleDownloadICS = () => {
    if (!booking) return;
    const ics = generateICS({
      title: booking.meeting_types.title + " with " + booking.hosts.name,
      description: "Booked via CalendlyAlt" + (booking.google_meet_link ? "\nGoogle Meet: " + booking.google_meet_link : ""),
      startTime: booking.starts_at,
      endTime: booking.ends_at,
      location: booking.google_meet_link || undefined,
      organizerName: booking.hosts.name,
      organizerEmail: booking.hosts.email,
      attendeeName: booking.guest_name,
      attendeeEmail: booking.guest_email,
    });
    downloadICS(ics, booking.meeting_types.title.replace(/\s+/g, "-").toLowerCase() + ".ics");
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  async function fetchBooking() {
    const res = await fetch(`/api/booking?id=${bookingId}`);
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setBooking(data.booking);
    }
    setLoading(false);
  }

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch("/api/booking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, action: "cancel" }),
    });
    const data = await res.json();
    if (data.success) {
      fetchBooking();
      setShowCancelConfirm(false);
    }
    setCancelling(false);
  }

  async function fetchSlots(dateStr: string) {
    if (!booking) return;
    setLoadingSlots(true);
    setSelectedDate(dateStr);
    setSelectedTime(null);

    const hostEmail = booking.hosts.email.split("@")[0];
    const res = await fetch(
      `/api/availability?username=${hostEmail}&slug=${booking.meeting_types.slug}&date=${dateStr}`
    );
    const data = await res.json();
    setAvailableSlots(data.slots || []);
    setLoadingSlots(false);
  }

  async function handleReschedule() {
    if (!selectedTime || !booking) return;
    setRescheduling(true);

    const startDate = new Date(`${selectedDate}T${selectedTime}`);
    const endDate = new Date(startDate.getTime() + booking.meeting_types.duration_minutes * 60000);

    const res = await fetch("/api/booking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: bookingId,
        action: "reschedule",
        new_starts_at: startDate.toISOString(),
        new_ends_at: endDate.toISOString(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setShowReschedule(false);
      fetchBooking();
    }
    setRescheduling(false);
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const formatSlotTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="text-lg text-gray-600">Booking not found</p>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled";
  const isPast = new Date(booking.starts_at) < new Date();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <span className="text-lg font-bold text-blue-600">CA</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Manage Your Booking</h1>
        </div>

        {/* Booking card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {/* Status banner */}
          {isCancelled && (
            <div className="mb-5 rounded-xl bg-red-50 p-4 text-center">
              <p className="text-sm font-semibold text-red-700">This booking has been cancelled</p>
            </div>
          )}

          {booking.status === "rescheduled" && (
            <div className="mb-5 rounded-xl bg-yellow-50 p-4 text-center">
              <p className="text-sm font-semibold text-yellow-700">This booking has been rescheduled</p>
            </div>
          )}

          {/* Meeting info */}
          <div className="mb-5 flex items-start gap-4">
            <div
              className="mt-1 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: booking.meeting_types.color }}
            />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{booking.meeting_types.title}</h2>
              <p className="text-sm text-gray-500">with {booking.hosts.name}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              isCancelled ? "bg-red-50 text-red-700" :
              booking.status === "rescheduled" ? "bg-yellow-50 text-yellow-700" :
              "bg-green-50 text-green-700"
            }`}>
              {booking.status}
            </span>
          </div>

          {/* Details */}
          <div className="mb-5 space-y-3 rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className={`text-sm ${isCancelled ? "text-gray-400 line-through" : "text-gray-700"}`}>
                {formatDate(booking.starts_at)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-sm ${isCancelled ? "text-gray-400 line-through" : "text-gray-700"}`}>
                {formatTime(booking.starts_at)} - {formatTime(booking.ends_at)} ({booking.meeting_types.duration_minutes} min)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-sm text-gray-700">
                {booking.guest_name} ({booking.guest_email})
              </span>
            </div>
          </div>

          {/* Meet link */}
          {booking.google_meet_link && !isCancelled && (
            <a
              href={booking.google_meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
              Join with Google Meet
            </a>
          )}

          {/* Add to Calendar */}
            {!isCancelled && (
              <button
                onClick={handleDownloadICS}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Add to Calendar (.ics)
              </button>
            )}

            {/* Actions */}
          {!isCancelled && !isPast && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowReschedule(true)}
                className="flex-1 rounded-xl border-2 border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
              >
                Reschedule
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Cancel Booking
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-gray-400">Powered by CalendlyAlt</p>

        {/* Cancel confirmation modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cancel this booking?</h3>
              <p className="mt-2 text-sm text-gray-500">
                This will cancel your {booking.meeting_types.title} on{" "}
                {formatDate(booking.starts_at)} at {formatTime(booking.starts_at)}.
                The calendar event will be removed and {booking.hosts.name} will be notified.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Keep it
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Yes, cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule modal */}
        {showReschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Pick a new time</h3>
                <button
                  onClick={() => setShowReschedule(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-5">
                {/* Mini calendar */}
                <div className="flex-1">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="rounded-lg p-1 hover:bg-gray-100"
                    >
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="text-sm font-semibold text-gray-900">
                      {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="rounded-lg p-1 hover:bg-gray-100"
                    >
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div key={d} className="py-1 font-medium text-gray-400">{d}</div>
                    ))}
                    {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                      <div key={`e-${i}`} />
                    ))}
                    {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isPastDay = date < today;
                      const isSelected = selectedDate === dateStr;
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <button
                          key={day}
                          disabled={isPastDay || isWeekend}
                          onClick={() => fetchSlots(dateStr)}
                          className={`rounded-lg py-1.5 text-xs transition-all ${
                            isSelected
                              ? "bg-blue-600 font-bold text-white"
                              : isPastDay || isWeekend
                              ? "text-gray-300"
                              : "text-gray-700 hover:bg-blue-50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div className="w-44">
                  {!selectedDate ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-xs text-gray-400">Select a date</p>
                    </div>
                  ) : loadingSlots ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-xs text-gray-400">No slots available</p>
                    </div>
                  ) : (
                    <div className="max-h-64 space-y-1.5 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                            selectedTime === slot
                              ? "bg-blue-600 text-white"
                              : "border text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          {formatSlotTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm reschedule */}
              {selectedTime && (
                <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedDate!).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">{formatSlotTime(selectedTime)}</p>
                  </div>
                  <button
                    onClick={handleReschedule}
                    disabled={rescheduling}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {rescheduling ? "Rescheduling..." : "Confirm new time"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
