// @ts-ignore Deno npm specifier resolved during Supabase function bundling.
import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import { requireEnv } from "../../../lib/env.ts";

export function getSupabaseAdmin() {
  return createClient(
    requireEnv("ENV_SUPABASE_URL"),
    requireEnv("ENV_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
