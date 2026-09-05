import { FullPageLink as Link } from "@/components/FullPageLink";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { requirePageSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/user-preferences";

export default async function ChangePasswordPage() {
  const session = await requirePageSession();
  const preferences = await getUserPreferences(session.user.id);
  const required = preferences.mustChangePassword;

  return (
    <div className="stack gap-lg settings-page">
      <div className="page-heading settings-heading">
        <div>
          <p className="eyebrow">
            {required ? "REQUIRED SECURITY STEP" : "ACCOUNT SECURITY"}
          </p>
          <h1>
            {required ? "Create your own private password" : "Change password"}
          </h1>
          <p className="muted">
            {required
              ? "Your administrator issued a temporary password. Replace it now with a password only you know."
              : `Update the password for ${session.user.email}.`}
          </p>
        </div>
        {!required ? (
          <Link className="button secondary" href="/dashboard">
            Back home
          </Link>
        ) : null}
      </div>

      <section className={required ? "settings-card required-password-card" : "settings-card"}>
        <div className="settings-card-art" aria-hidden="true">
          <span>✦</span>
          <div className="settings-lock">⌾</div>
        </div>
        <div>
          <h2>{required ? "Temporary password detected" : "Keep your trip private"}</h2>
          <p className="muted">
            Enter the temporary/current password, then choose a new password
            with at least 12 characters.
          </p>
          <ChangePasswordForm forceChange={required} />
        </div>
      </section>
    </div>
  );
}
