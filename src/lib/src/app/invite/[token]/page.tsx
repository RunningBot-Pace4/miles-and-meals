import { FullPageLink as Link } from "@/components/FullPageLink";
import { BrandLogo } from "@/components/BrandLogo";
import { JoinTripInviteButton } from "@/components/JoinTripInviteButton";
import { getTripInvitePreview } from "@/lib/trip-invites";
import { getSession } from "@/lib/session";

function dates(start: string | null, end: string | null) {
  if (!start && !end) return "Dates not set";
  return [start, end].filter(Boolean).join(" → ");
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, session] = await Promise.all([getTripInvitePreview(token), getSession()]);

  if (!invite) {
    return (
      <main className="auth-shell invite-shell">
        <section className="auth-card invite-card">
          <BrandLogo href="/" />
          <p className="eyebrow">TRIP INVITE</p>
          <h1>This invite is no longer available</h1>
          <p className="muted">Ask the Trip Owner to create a new invite link.</p>
          <Link className="button secondary full" href="/login">Go to sign in</Link>
        </section>
      </main>
    );
  }

  const next = `/invite/${token}`;
  return (
    <main className="auth-shell invite-shell">
      <section className="auth-card invite-card">
        <BrandLogo href="/" />
        <p className="eyebrow">YOU'RE INVITED</p>
        <h1>{invite.tripName}</h1>
        <div className="invite-trip-preview">
          <strong>{invite.destinationName}</strong>
          <span>{dates(invite.startDate, invite.endDate)}</span>
          <small>Invited by {invite.ownerName}</small>
        </div>
        {session ? (
          <JoinTripInviteButton token={token} />
        ) : (
          <div className="stack">
            <Link className="button primary full" href={`/register?next=${encodeURIComponent(next)}`}>Create account & join</Link>
            <Link className="button secondary full" href={`/login?next=${encodeURIComponent(next)}`}>I already have an account</Link>
          </div>
        )}
        <small className="muted">Joining only gives you access to this trip. It does not expose other travelers' private account details.</small>
      </section>
    </main>
  );
}
