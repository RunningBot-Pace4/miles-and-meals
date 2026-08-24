import { OfflinePackWorkspace } from "@/components/OfflinePackWorkspace";
import { requirePageSession } from "@/lib/session";

export default async function OfflinePackPage() {
  await requirePageSession();
  return (
    <div className="stack gap-lg">
      <div className="page-heading"><div><p className="eyebrow">TRAVEL ANYWHERE</p><h1>Offline pack</h1><p className="muted">Keep the essentials available when airport Wi-Fi, roaming or underground connections disappear.</p></div></div>
      <OfflinePackWorkspace />
    </div>
  );
}
