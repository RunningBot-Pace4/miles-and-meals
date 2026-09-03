import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

type BetterAuthSession = typeof auth.$Infer.Session;

export type AppSessionUser = BetterAuthSession["user"] & {
  role: string | null;
};

export type AppSession = Omit<BetterAuthSession, "user"> & {
  user: AppSessionUser;
};

const readSession = cache(async (): Promise<AppSession | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  /**
   * The Better Auth admin plugin persists and returns `user.role`, but some
   * server-side inference paths omit the plugin-added field from getSession().
   * Keep the assertion centralized so authorization callers stay type-safe.
   */
  return session as AppSession | null;
});

export async function getSession(): Promise<AppSession | null> {
  return readSession();
}

export async function requirePageSession(): Promise<AppSession> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export function isSystemAdmin(role: string | null | undefined): boolean {
  return (role ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes("admin");
}
