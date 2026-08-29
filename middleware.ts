import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Gate every request through the Supabase session refresh + owner check, except
// static assets, image files and the Next internals (which never carry data).
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
