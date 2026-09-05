import { redirect } from "next/navigation";
import { AdminBackupRestore } from "@/components/AdminBackupRestore";
import {
  isSystemAdmin,
  requirePageSession,
} from "@/lib/session";

export default async function AdminBackupPage() {
  const session =
    await requirePageSession();

  if (
    !isSystemAdmin(
      session.user.role,
    )
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            ADMIN · DATA SAFETY
          </p>
          <h1>
            Backup &amp; restore
          </h1>
          <p className="muted">
            Protect travel data without touching Better Auth login accounts.
          </p>
        </div>
      </div>

      <AdminBackupRestore />
    </div>
  );
}
