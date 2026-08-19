import { FullPageLink as Link } from "@/components/FullPageLink";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { requirePageSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/user-preferences";

export default async function ProfileSettingsPage() {
  const session = await requirePageSession();
  const preferences = await getUserPreferences(session.user.id);

  return (
    <div className="stack gap-lg settings-page">
      <div className="page-heading settings-heading">
        <div>
          <p className="eyebrow">YOUR PROFILE</p>
          <h1>Make it yours</h1>
          <p className="muted">
            Pick an avatar and color that are easy to spot during the trip.
          </p>
        </div>
        <Link className="button secondary" href="/dashboard">
          Back home
        </Link>
      </div>

      <section className="settings-card profile-settings-card">
        <div className="settings-card-art profile-art" aria-hidden="true">
          <span>✈</span>
          <div className="settings-lock">☺</div>
        </div>
        <div>
          <ProfileSettingsForm
            name={session.user.name}
            initialColor={preferences.avatarColor}
            initialIcon={preferences.avatarIcon}
          />
        </div>
      </section>
    </div>
  );
}
