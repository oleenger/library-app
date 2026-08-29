// Session refresh + owner gate, run from the root middleware on every request.
//
// Two jobs:
//   1. Refresh the Supabase auth cookies so server components always see a live
//      session (the @supabase/ssr canonical pattern).
//   2. Restrict the whole app to a single owner. Any request without the owner's
//      authenticated session is redirected to /login — except the login page and
//      the auth callback themselves, and Next internal/static assets.
//
// The owner is identified by OWNER_EMAIL. If it is unset the app fails closed
// (everyone is redirected to /login and no one can pass), which is the safe
// default for a personal, owner-only deployment (proposal §11).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Auth gate is opt-in. While AUTH_ENABLED !== "true" the whole site is public
  // (no login required). Flip the flag to re-enable the owner gate later.
  if (process.env.AUTH_ENABLED !== "true") {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const redirectToLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Supabase not configured yet (e.g. before .env.local is filled in): fail
  // closed but gracefully. Let public routes render so /login can show a setup
  // notice; bounce everything else there instead of throwing a 500 everywhere.
  if (!url || !anonKey) {
    return isPublic ? NextResponse.next({ request }) : redirectToLogin();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token with Supabase; do not trust
  // getSession() here. Keep this call directly after client creation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const isOwner = Boolean(user?.email && owner && user.email.toLowerCase() === owner);

  if (!isOwner && !isPublic) {
    return redirectToLogin();
  }

  // A signed-in owner visiting /login goes straight to the library.
  if (isOwner && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
