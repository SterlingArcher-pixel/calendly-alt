// Simple in-memory rate limiter for serverless functions
// Resets when the function cold-starts (acceptable for demo/low-traffic)

const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Check rate limit for a given key (usually IP address)
 * @param key - Unique identifier (IP, user ID, etc.)
 * @param limit - Max requests per window
 * @param windowSeconds - Time window in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // Clean up expired entries periodically
  if (store.size > 10000) {
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1, resetIn: windowSeconds };
  }

  if (entry.count >= limit) {
    // Rate limited
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, remaining: 0, resetIn };
  }

  // Increment
  entry.count++;
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);
  return { success: true, remaining: limit - entry.count, resetIn };
}
