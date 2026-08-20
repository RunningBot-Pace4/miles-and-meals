import { NotificationSettings } from "@/components/NotificationSettings";
import { requirePageSession } from "@/lib/session";

export default async function NotificationSettingsPage() {
  await requirePageSession();

  return (
    <div className="stack gap-lg settings-page">
      <div className="page-heading settings-heading">
        <div>
          <p className="eyebrow">PHASE 8 · NOTIFICATIONS</p>
          <h1>Notifications</h1>
          <p className="muted">
            Choose which Miles &amp; Meals updates can notify this device.
          </p>
        </div>
      </div>

      <NotificationSettings />
    </div>
  );
}
