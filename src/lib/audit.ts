import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  facilityId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an action to the audit trail
 * Use for actions not covered by DB triggers (API calls, logins, exports, etc.)
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      actor_id: entry.actorId || null,
      actor_email: entry.actorEmail || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      facility_id: entry.facilityId || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch (e) {
    console.error("Audit log error:", e);
    // Never throw — audit logging should never break the main flow
  }
}
