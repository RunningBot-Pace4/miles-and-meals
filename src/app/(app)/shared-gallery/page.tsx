import { SharedGallery } from "@/components/SharedGallery";
import { isSystemAdmin, requirePageSession } from "@/lib/session";
export default async function SharedGalleryPage() {
  const session = await requirePageSession();
  return <SharedGallery admin={isSystemAdmin(session.user.role)} />;
}
