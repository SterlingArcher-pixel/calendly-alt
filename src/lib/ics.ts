export function generateICS({
  title,
  description,
  startTime,
  endTime,
  location,
  organizerName,
  organizerEmail,
  attendeeName,
  attendeeEmail,
}: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
}): string {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const uid = crypto.randomUUID() + "@calendlyalt";
  const now = formatDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CalendlyAlt//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    "UID:" + uid,
    "DTSTAMP:" + now,
    "DTSTART:" + formatDate(startTime),
    "DTEND:" + formatDate(endTime),
    "SUMMARY:" + title,
  ];

  if (description) lines.push("DESCRIPTION:" + description.replace(/\n/g, "\\n"));
  if (location) lines.push("LOCATION:" + location);
  if (organizerName && organizerEmail) {
    lines.push("ORGANIZER;CN=" + organizerName + ":mailto:" + organizerEmail);
  }
  if (attendeeName && attendeeEmail) {
    lines.push(
      "ATTENDEE;CN=" + attendeeName + ";RSVP=TRUE:mailto:" + attendeeEmail
    );
  }
  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
