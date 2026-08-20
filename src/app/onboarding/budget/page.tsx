import { redirect } from "next/navigation";
import {
  getActiveTripContext,
} from "@/lib/active-trip";
import { BrandLogo } from "@/components/BrandLogo";
import { TripBudgetForm } from "@/components/TripBudgetForm";
import { requirePageSession } from "@/lib/session";
import {
  listMissingTripBudgets,
} from "@/lib/trip-budget";
import {
  getUserPreferences,
} from "@/lib/user-preferences";

export default async function BudgetOnboardingPage() {
  const session =
    await requirePageSession();
  const preferences =
    await getUserPreferences(
      session.user.id,
    );

  if (
    preferences.mustChangePassword
  ) {
    redirect(
      "/settings/password",
    );
  }

  const activeTrip =
    await getActiveTripContext(
      session.user,
    );
  const missing =
    await listMissingTripBudgets(
      session.user.id,
      activeTrip.tripId,
    );

  if (
    missing.length === 0
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="budget-onboarding-page">
      <div className="budget-onboarding-shell">
        <header className="budget-onboarding-brand">
          <BrandLogo />
        </header>

        <section className="budget-onboarding-card">
          <div className="budget-onboarding-heading">
            <span
              className="budget-onboarding-icon"
              aria-hidden="true"
            >
              ◈
            </span>

            <div>
              <p className="eyebrow">
                YOUR TRAVEL WALLET
              </p>
              <h1>
                Set your trip budget
              </h1>
              <p>
                You&apos;ve been added to a trip. Set your own spending target before opening the travel workspace.
              </p>
            </div>
          </div>

          <TripBudgetForm
            onboarding
            trips={missing.map(
              (trip) => ({
                ...trip,
                amount: null,
              }),
            )}
          />
        </section>
      </div>
    </main>
  );
}
