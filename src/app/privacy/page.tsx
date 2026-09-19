import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <main className="legal-page">
    <p className="eyebrow">MILES &amp; MEALS</p>
    <h1>Privacy Policy</h1>
    <p className="muted">Effective 18 September 2026</p>
    <section><h2>Information used by the app</h2><p>Miles &amp; Meals stores the account, trip, plan, budget, expense, payment and optional upload information that users provide so travelers can coordinate a shared trip. Access is limited according to account, trip membership and permissions.</p></section>
    <section><h2>Google Maps place matching</h2><p>When a traveler asks the app to match an accommodation or imports a Google Saved list, the place names and trip country are sent to Google Maps Platform to find the corresponding locations. Google&apos;s returned coordinates and addresses are used temporarily to display the review and calculate straight-line distances. Miles &amp; Meals stores the Google Place ID, which Google permits to be retained, along with the traveler&apos;s original name, link, category and chosen order. It does not permanently store the returned coordinates or formatted address.</p></section>
    <section><h2>Service providers</h2><p>Application and account data may be processed by the hosting, database and file-storage providers configured by the app administrator. Google Maps Platform processes place-match requests under the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p></section>
    <section><h2>Control and deletion</h2><p>Travelers can edit or remove plan items where their permissions allow. Account or trip administrators control membership and administrative data operations. Removing Google Maps access or deleting data from Google does not automatically delete copies that a traveler intentionally imported into Miles &amp; Meals.</p></section>
    <section><h2>Security and changes</h2><p>The app uses access controls and server-side credentials, but no internet service can guarantee absolute security. This policy may be updated when app features or providers change. The current version is published on this page.</p></section>
    <p><a href="/terms">Terms of Use</a> · <a href="/">Return to Miles &amp; Meals</a></p>
  </main>;
}
