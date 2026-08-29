import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Gate every request through the Supabase session refresh + owner check, except
// static assets, image files, Next internals, and the PWA entry points (the
// service worker and manifest must stay publicly reachable so install/offline
// work even when the owner gate is enabled).
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|swe-worker.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
