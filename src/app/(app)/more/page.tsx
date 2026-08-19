import { FullPageLink as Link } from "@/components/FullPageLink";
import { InstallAppCard } from "@/components/InstallAppCard";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

export default async function MorePage() {
  const session = await requirePageSession();
  const admin = isSystemAdmin(session.user.role);

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>More</h1>
        </div>
      </div>

      <section className="panel menu-list">
        <div className="menu-row">
          <span>Signed in as</span>
          <strong>{session.user.name}</strong>
        </div>
        <div className="menu-row">
          <span>Email</span>
          <strong>{session.user.email}</strong>
        </div>
        {admin ? (
          <Link className="menu-row link-row" href="/admin">
            <span>Admin: people, trips & countries</span>
            <span>›</span>
          </Link>
        ) : null}
        <Link className="menu-row link-row" href="/settings/profile">
          <span>Profile & avatar</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settings/password">
          <span>Change password</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/planner">
          <span>Planner sections</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/expenses">
          <span>All trip expenses</span>
          <span>›</span>
        </Link>
        <Link className="menu-row link-row" href="/settlements">
          <span>Settle Up · paid & received</span>
          <span>›</span>
        </Link>
      </section>

      <InstallAppCard />
    </div>
  );
}
