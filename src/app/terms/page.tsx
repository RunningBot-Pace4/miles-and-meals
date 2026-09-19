import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return <main className="legal-page">
    <p className="eyebrow">MILES &amp; MEALS</p>
    <h1>Terms of Use</h1>
    <p className="muted">Effective 18 September 2026</p>
    <section><h2>Using Miles &amp; Meals</h2><p>The app helps groups plan trips, record shared expenses and organize settlements. Users are responsible for the accuracy of information they enter, the people they invite and the payments they make outside the app. Displayed balances and route suggestions should be reviewed before action.</p></section>
    <section><h2>Location matching</h2><p>Location matching uses Geoapify and open map data. Coverage differs from Google Maps. Review the name and address before saving, especially for businesses with multiple branches. Google saved links remain available to open separately.</p></section>
    <section><h2>Availability and acceptable use</h2><p>Features may depend on network connectivity and third-party services. Users must not abuse the service, attempt unauthorized access, upload unlawful material or use another person&apos;s account. The administrator may restrict access to protect users and the service.</p></section>
    <section><h2>Limitations</h2><p>Distances are straight-line estimates unless the interface expressly says otherwise. Miles &amp; Meals does not execute bank transfers, guarantee vendor information, or replace financial, legal, safety or travel advice. Third-party services remain responsible for their own content and availability.</p></section>
    <p><a href="/privacy">Privacy Policy</a> · <a href="/">Return to Miles &amp; Meals</a></p>
  </main>;
}
