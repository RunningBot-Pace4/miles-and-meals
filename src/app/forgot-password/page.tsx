import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
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
            <p className="eyebrow eyebrow-light">PASSWORD HELP</p>
            <h1>Simple recovery, managed by your trip Admin.</h1>
            <p>
              We do not allow password resets using only an email address,
              because anyone who knows your email could otherwise take over
              your account.
            </p>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-mobile-brand">
            <BrandLogo href="" />
          </div>
          <p className="eyebrow">FORGOT PASSWORD</p>
          <h2 className="auth-title">Ask your Admin to reset it</h2>
          <p className="muted auth-intro">
            Tell your Miles & Meals Admin which account email you use. The
            Admin can set a new temporary password from Admin → Users.
          </p>

          <div className="stack">
            <Link className="button primary full" href="/login">
              Back to sign in
            </Link>
            <Link className="auth-link auth-link-center" href="/register">
              Need a new account? Register
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
