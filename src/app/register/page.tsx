import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/session";
import { safeInternalPath } from "@/lib/navigation-safety";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const query = await searchParams;
  const nextPath = safeInternalPath(query.next);
  const session = await getSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="auth-showcase" aria-label="Miles & Meals">
          <BrandLogo href="" inverse />
          <div className="auth-showcase-copy">
            <p className="eyebrow eyebrow-light">JOIN THE TRIP</p>
            <h1>
              One account.
              <br />
              Your assigned trips.
            </h1>
            <p>
              Create your account, then join a trip from a secure invite link or create your own trip.
            </p>
          </div>
          <div className="auth-feature-strip">
            <span>✦ Private country access</span>
            <span>✦ Shared expenses</span>
            <span>✦ Live trip tools</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-mobile-brand">
            <BrandLogo href="" />
          </div>
          <p className="eyebrow">REGISTER</p>
          <h2 className="auth-title">Create your account</h2>
          <p className="muted auth-intro">
            After registration you can join a shared trip immediately from its invite link.
          </p>
          <RegisterForm nextPath={nextPath} />
        </section>
      </div>
    </main>
  );
}
