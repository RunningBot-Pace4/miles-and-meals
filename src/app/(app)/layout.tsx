import { AccountMenu } from "@/components/AccountMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { BudgetAccessGate } from "@/components/BudgetAccessGate";
import { MobileNav } from "@/components/MobileNav";
import { NotificationBell } from "@/components/NotificationBell";
import { PasswordChangeGate } from "@/components/PasswordChangeGate";
import {
  loadUnreadNotificationCount,
} from "@/lib/notification-count";
import {
  isSystemAdmin,
  requirePageSession,
} from "@/lib/session";
import {
  listMissingTripBudgets,
} from "@/lib/trip-budget";
import {
  getUserPreferences,
} from "@/lib/user-preferences";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session =
    await requirePageSession();
  const admin =
    isSystemAdmin(
      session.user.role,
    );

  const [
    preferences,
    unreadNotificationCount,
    missingBudgets,
  ] = await Promise.all([
    getUserPreferences(
      session.user.id,
    ),
    loadUnreadNotificationCount(
      session.user.id,
    ),
    listMissingTripBudgets(
      session.user.id,
    ),
  ]);

  return (
    <PasswordChangeGate
      required={
        preferences.mustChangePassword
      }
    >
      <BudgetAccessGate
        missingBudgetCount={
          missingBudgets.length
        }
        missingTripId={
          missingBudgets[0]?.tripId ?? ""
        }
      >
        <div className="app-shell">
          <header className="topbar">
            <BrandLogo />

            <div className="topbar-actions">
              <NotificationBell
                initialUnreadCount={
                  unreadNotificationCount
                }
              />

              <AccountMenu
                name={
                  session.user.name
                }
                email={
                  session.user.email
                }
                isAdmin={admin}
                avatarColor={
                  preferences.avatarColor
                }
                avatarIcon={
                  preferences.avatarIcon
                }
              />
            </div>
          </header>

          <MobileNav />

          <main className="page-container">
            {children}
          </main>
        </div>
      </BudgetAccessGate>
    </PasswordChangeGate>
  );
}
