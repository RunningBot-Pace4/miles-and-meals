import { redirect } from "next/navigation";

/** Legacy bookmark: trip checks now live on Home. */
export default function CompanionPage() {
  redirect("/dashboard#attention");
}
