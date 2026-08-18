import { AccountMenu } from "@/components/AccountMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileNav } from "@/components/MobileNav";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePageSession();
  const admin = isSystemAdmin(session.user.role);

  return (
    <div className="app-shell">
      <header className="topbar">
        <BrandLogo />
        <AccountMenu
          name={session.user.name}
          email={session.user.email}
          isAdmin={admin}
        />
      </header>

      <MobileNav />

      <main className="page-container">{children}</main>
    </div>
  );
}
