import { BrandLogo } from "@/components/BrandLogo";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="auth-showcase" aria-label="Miles & Meals">
          <BrandLogo href="" inverse />
          <div className="auth-showcase-copy">
            <p className="eyebrow eyebrow-light">NEW PASSWORD</p>
            <h1>Secure your next adventure.</h1>
            <p>
              Choose a new password. After the reset, existing sessions are
              revoked so the account starts cleanly.
            </p>
          </div>
          <div className="auth-feature-strip">
            <span>✦ 12+ characters</span>
            <span>✦ Session revocation</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-mobile-brand">
            <BrandLogo href="" />
          </div>
          <p className="eyebrow">PASSWORD RESET</p>
          <h2 className="auth-title">Choose a new password</h2>
          <p className="muted auth-intro">
            Use a password that you do not reuse on another website.
          </p>
          <ResetPasswordForm
            token={params.token ?? null}
            tokenError={params.error ?? null}
          />
        </section>
      </div>
    </main>
  );
}
