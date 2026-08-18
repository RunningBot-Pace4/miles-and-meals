import { AccountMenu } from "@/components/AccountMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileNav } from "@/components/MobileNav";
import { PasswordChangeGate } from "@/components/PasswordChangeGate";
import { isSystemAdmin, requirePageSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/user-preferences";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePageSession();
  const admin = isSystemAdmin(session.user.role);
  const preferences = await getUserPreferences(session.user.id);

  return (
    <PasswordChangeGate required={preferences.mustChangePassword}>
      <div className="app-shell">
      <header className="topbar">
        <BrandLogo />
        <AccountMenu
          name={session.user.name}
          email={session.user.email}
          isAdmin={admin}
          avatarColor={preferences.avatarColor}
          avatarIcon={preferences.avatarIcon}
        />
      </header>

      <MobileNav />

      <main className="page-container">{children}</main>
      </div>
    </PasswordChangeGate>
  );
}
