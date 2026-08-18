"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function PasswordChangeGate({
  required,
  children,
}: {
  required: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const passwordPath = "/settings/password";

  useEffect(() => {
    if (required && pathname !== passwordPath) {
      router.replace(`${passwordPath}?required=1`);
    }
  }, [pathname, required, router]);

  if (required && pathname !== passwordPath) {
    return (
      <main className="forced-password-screen" role="status" aria-live="polite">
        <div className="loading-brand-mark">M&amp;M</div>
        <div className="button-spinner dark" aria-hidden="true" />
        <h1>Secure your account first</h1>
        <p>Taking you to create your own private password…</p>
      </main>
    );
  }

  return <>{children}</>;
}
