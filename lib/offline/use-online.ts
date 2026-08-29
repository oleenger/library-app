"use client";

import { useEffect, useState } from "react";

// Tracks connectivity from the browser's online/offline events. Starts
// optimistic (true) so server and first client render agree, then corrects on
// mount — avoids a hydration mismatch.
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
