// Input sanitization for public-facing fields
// Strips HTML tags, trims whitespace, enforces length limits

/**
 * Sanitize a text input: strip HTML, trim, enforce max length
 */
export function sanitizeText(input: string | null | undefined, maxLength = 500): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")          // Strip HTML tags
    .replace(/[<>'"]/g, "")           // Remove dangerous chars
    .replace(/javascript:/gi, "")     // Block JS protocol
    .replace(/on\w+=/gi, "")          // Block event handlers
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize and validate an email address
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = input.trim().toLowerCase().substring(0, 254);
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) return "";
  return cleaned;
}

/**
 * Sanitize a phone number (digits, +, -, spaces only)
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[^\d+\-\s()]/g, "").trim().substring(0, 20);
}

/**
 * Sanitize notes/free text (allow more chars but still strip HTML)
 */
export function sanitizeNotes(input: string | null | undefined, maxLength = 2000): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .substring(0, maxLength);
}
