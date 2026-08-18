import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
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
            <p className="eyebrow eyebrow-light">YOUR TRIP, IN ONE PLACE</p>
            <h1>
              Every mile.
              <br />
              Every meal.
              <br />
              One shared trip.
            </h1>
            <p>
              Plan the day, split expenses, keep the right exchange rate and
              find your travel crew when plans change.
            </p>
          </div>
          <div className="auth-feature-strip">
            <span>✦ Shared expenses</span>
            <span>✦ Country access</span>
            <span>✦ Live location</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-mobile-brand">
            <BrandLogo href="" />
          </div>
          <p className="eyebrow">WELCOME BACK</p>
          <h2 className="auth-title">Ready for the next stop?</h2>
          <p className="muted auth-intro">
            Sign in to continue to your Miles & Meals trip.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
