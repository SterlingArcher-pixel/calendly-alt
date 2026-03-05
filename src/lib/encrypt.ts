// Token encryption/decryption helpers
// Uses the Supabase pgcrypto functions we created
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key";

export async function encryptToken(token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("encrypt_token", {
    token,
    secret: ENCRYPTION_KEY,
  });
  if (error) { console.error("Encrypt error:", error); return null; }
  return data;
}

export async function decryptToken(encrypted: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("decrypt_token", {
    encrypted,
    secret: ENCRYPTION_KEY,
  });
  if (error) { console.error("Decrypt error:", error); return null; }
  return data;
}

// One-time migration: encrypt all existing plaintext tokens
export async function migrateTokens(): Promise<number> {
  const { data, error } = await supabase.rpc("encrypt_existing_tokens", {
    secret: ENCRYPTION_KEY,
  });
  if (error) { console.error("Migration error:", error); return 0; }
  return data || 0;
}
