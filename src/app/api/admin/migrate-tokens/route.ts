import { NextRequest, NextResponse } from "next/server";
import { migrateTokens } from "@/lib/encrypt";

// One-time route to encrypt existing plaintext tokens
// Call: POST /api/admin/migrate-tokens with Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const migrated = await migrateTokens();
  return NextResponse.json({ migrated, message: `Encrypted tokens for ${migrated} hosts` });
}
