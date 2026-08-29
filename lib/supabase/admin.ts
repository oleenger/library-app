// Server-side Supabase client using the service-role key. This bypasses RLS and
// must NEVER be imported into client code — it is the trusted data path for
// server components, route handlers and scripts in this single-owner app.
//
// The whole site is gated to the owner by middleware (see middleware.ts), so
// running data access under the service role is safe and keeps the queries
// simple. RLS stays enabled on every table as defence in depth.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

/**
 * Reused service-role client. Reads config from the environment at first call
 * so a missing key surfaces at request time (as a clear error) rather than at
 * module load.
 */
export function admin(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    throw new Error(`Supabase server config missing: ${missing.join(", ")}`);
  }

  client = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
