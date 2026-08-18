import Link from "next/link";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { requirePageSession } from "@/lib/session";

export default async function ChangePasswordPage() {
  const session = await requirePageSession();

  return (
    <div className="stack gap-lg settings-page">
      <div className="page-heading settings-heading">
        <div>
          <p className="eyebrow">ACCOUNT SECURITY</p>
          <h1>Change password</h1>
          <p className="muted">
            Update the password for {session.user.email}.
          </p>
        </div>
        <Link className="button secondary" href="/dashboard">
          Back home
        </Link>
      </div>

      <section className="settings-card">
        <div className="settings-card-art" aria-hidden="true">
          <span>✦</span>
          <div className="settings-lock">⌾</div>
        </div>
        <div>
          <h2>Keep your trip private</h2>
          <p className="muted">
            Enter your current password, then choose a new password with at
            least 12 characters.
          </p>
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
