import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { getSession } from "@/lib/session";

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="auth-showcase" aria-label="Miles & Meals">
          <BrandLogo href="" inverse />
          <div className="auth-showcase-copy">
            <p className="eyebrow eyebrow-light">ACCOUNT RECOVERY</p>
            <h1>Back on the road in a few taps.</h1>
            <p>
              Enter your account email and we will send a secure, time-limited
              reset link.
            </p>
          </div>
          <div className="auth-feature-strip">
            <span>✦ 30-minute reset link</span>
            <span>✦ Old sessions revoked</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-mobile-brand">
            <BrandLogo href="" />
          </div>
          <p className="eyebrow">FORGOT PASSWORD</p>
          <h2 className="auth-title">Reset your password</h2>
          <p className="muted auth-intro">
            Enter the email address used for your Miles & Meals account.
          </p>
          <ForgotPasswordForm />
          {process.env.NODE_ENV !== "production" ? (
            <p className="auth-dev-note">
              Local development: if Resend is not configured, the reset link
              will appear in the Visual Studio terminal.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
