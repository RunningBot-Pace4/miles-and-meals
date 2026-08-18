import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/session";

export default async function RegisterPage() {
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
            <p className="eyebrow eyebrow-light">JOIN THE TRIP</p>
            <h1>
              One account.
              <br />
              Your assigned trips.
            </h1>
            <p>
              Create your account first. An Admin will assign the countries
              and trips you are allowed to see.
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
            After registration, ask your trip Admin to assign you to the
            correct country.
          </p>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
