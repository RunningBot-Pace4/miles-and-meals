import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <main className="legal-page">
    <p className="eyebrow">MILES &amp; MEALS</p>
    <h1>Privacy Policy</h1>
    <p className="muted">Effective 19 October 2026</p>
    <section><h2>Information used by the app</h2><p>Miles &amp; Meals stores the account, trip, plan, budget, expense, payment and optional upload information that users provide so travelers can coordinate a shared trip. Access is limited according to account, trip membership and permissions.</p></section>
    <section><h2>Optional shared gallery</h2><p>Choosing files in your phone picker does not automatically upload them. If you explicitly confirm the sharing notice and upload selected photos or videos, their originals and filenames are stored with your account and can be viewed by you and current or future system admins. Other travelers cannot view these uploads. Originals may include location metadata. You can remove sharing in the Shared gallery screen; this stops future access in the app and requests deletion from storage. It cannot recall files already loaded or copies someone previously saved. The app does not scan or remotely access the rest of your phone gallery. Sharing records retain the notice, confirmation time and revocation status.</p></section>
    <section><h2>Place matching</h2><p>When a traveler asks the app to match an accommodation or imports a Google Saved list, the place names and trip country are sent to Geoapify to find the corresponding locations. The provider&apos;s returned coordinates and addresses are used temporarily to display the review and calculate straight-line distances. Miles &amp; Meals stores the Geoapify Place ID, along with the traveler&apos;s original name, link, category and chosen order. When a traveler confirms a stay location, the confirmed coordinates are stored with that stay to keep distance calculations consistent.</p></section>
    <section><h2>Service providers</h2><p>Application and account data may be processed by the hosting, database and file-storage providers configured by the app administrator. Geoapify processes place-match requests under the <a href="https://www.geoapify.com/privacy-policy/" target="_blank" rel="noreferrer">Geoapify Privacy Policy</a>.</p></section>
    <section><h2>Control and deletion</h2><p>Travelers can edit or remove plan items where their permissions allow. Account or trip administrators control membership and administrative data operations. Removing Google Maps access or deleting data from Google does not automatically delete copies that a traveler intentionally imported into Miles &amp; Meals.</p></section>
    <section><h2>Security and changes</h2><p>The app uses access controls and server-side credentials, but no internet service can guarantee absolute security. This policy may be updated when app features or providers change. The current version is published on this page.</p></section>
    <p><a href="/terms">Terms of Use</a> · <a href="/">Return to Miles &amp; Meals</a></p>
  </main>;
}
