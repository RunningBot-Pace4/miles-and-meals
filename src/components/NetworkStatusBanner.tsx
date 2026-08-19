"use client";

import { useEffect, useState } from "react";

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);

    function goOnline() {
      setOnline(true);
    }

    function goOffline() {
      setOnline(false);
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!mounted || online) {
    return null;
  }

  return (
    <div
      className="network-offline-banner"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">⌁</span>
      <strong>You’re offline</strong>
      <small>
        Current screen stays visible. New trip data and changes
        need a connection.
      </small>
    </div>
  );
}
