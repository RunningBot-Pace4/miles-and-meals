import { PersonalGallery } from "@/components/PersonalGallery";
import { requirePageSession } from "@/lib/session";
export default async function MyGalleryPage() {
  await requirePageSession();
  return <PersonalGallery />;
}
