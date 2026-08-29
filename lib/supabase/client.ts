// Browser-side Supabase client for the login flow. Uses the public anon key
// (safe to expose). Only used to start the magic-link sign-in; all privileged
// data access happens server-side through admin().

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
