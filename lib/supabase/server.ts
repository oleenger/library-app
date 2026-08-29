// Cookie-bound Supabase client for auth/session in server components and route
// handlers. Uses the public anon key (safe in the browser-adjacent flow); it is
// only used to read/refresh the owner's session, never for privileged data
// access — that goes through admin() in ./admin.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll called from a Server Component — safe to ignore, the session
          // is refreshed by middleware instead.
        }
      },
    },
  });
}
