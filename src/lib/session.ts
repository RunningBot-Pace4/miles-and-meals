import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requirePageSession() {
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
