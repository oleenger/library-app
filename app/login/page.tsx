"use client";

// Owner-only sign-in. Sends a Supabase magic link with shouldCreateUser:false so
// only the pre-existing owner account can ever receive one — an unknown address
// simply gets no email. There is no password and no self-service signup.

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink font-serif text-lg italic text-canvas shadow-sm">
            L
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">
            The Library
          </span>
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl border border-paper-edge bg-white p-6 shadow-card">
            <h1 className="font-serif text-2xl">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              If <span className="font-medium text-ink">{email}</span> is the
              owner account, a sign-in link is on its way. Open it on this device
              to enter the library.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-paper-edge bg-white p-6 shadow-card"
          >
            <h1 className="font-serif text-2xl">Sign in</h1>
            <p className="mt-2 text-sm text-ink-soft">
              This library is private. Enter the owner email to receive a sign-in
              link.
            </p>
            <label className="mt-6 block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-paper-edge bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {status === "error" && (
              <p className="mt-3 text-sm text-red-600">{message}</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
