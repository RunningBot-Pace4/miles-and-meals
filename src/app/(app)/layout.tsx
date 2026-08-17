import { BrandLogo } from "@/components/BrandLogo";
import { MobileNav } from "@/components/MobileNav";
import { SignOutButton } from "@/components/SignOutButton";
import { requirePageSession, isSystemAdmin } from "@/lib/session";

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
        <div className="topbar-user">
          <div className="topbar-profile">
            <span className="profile-dot">
              {session.user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="desktop-only">
              {session.user.name}
              {admin ? " · Admin" : ""}
            </span>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="page-container">{children}</main>
      <MobileNav />
    </div>
  );
}
