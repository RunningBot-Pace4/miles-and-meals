// Offline visual fixture: real shared components and the complete CSS cascade.
// No account, database or payment request is used by this preview.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "node:fs";
import { SettlementActionButton } from "../src/components/SettlementActionButton";
import { BillSettlementAllocator } from "../src/components/BillSettlementAllocator";
import { SectionTabs } from "../src/components/SectionTabs";

const css = ["globals", "living-journey", "v92-living-journey", "bill-history"].map(name => readFileSync(`src/app/${name}.css`, "utf8")).join("\n");
const markup = renderToStaticMarkup(<div className="app-shell pwa-polished">
  <header className="topbar"><strong>Miles &amp; Meals</strong><span>JY</span></header>
  <main className="page-container">
    <div className="stack gap-lg dashboard-page">
      <section className="dashboard-welcome home-postcard"><div className="dashboard-welcome-copy"><p className="eyebrow">YOUR TRIP</p><h1 className="dashboard-welcome-title">Good trips.<br/><em>Great company.</em></h1><p>Penang weekend · 12–14 September</p></div><button className="button primary">Add expense</button></section>
      <details className="home-trip-overview"><summary><span><strong>Trip overview</strong><small>Penang weekend · Plan, budget and people</small></span><span>⌄</span></summary><p>Trip details</p></details>
      <SectionTabs label="Trip money" selected="expenses" items={[{key:"expenses",label:"Bills",href:"/spend"},{key:"payments",label:"Payments",href:"/spend?tab=settlements"},{key:"budget",label:"Budgets",href:"/spend?tab=budgets"}]}/>
      <section className="panel"><h2>Record payment</h2><BillSettlementAllocator countryId="preview" currentUserId="jy" fromUserId="parent" fromName="Parent" toUserId="jy" toName="JY" currency="MYR" directRemaining={30} hasPendingPayment={false} expenses={[{expenseId:"example",expenseDate:"2026-09-12",description:"Breakfast at the market with everyone",category:"Food",payerUserId:"jy",payerName:"JY",participantUserId:"parent",participantName:"Parent",shareAmount:30,allocatedPaid:0,remainingAmount:30,paymentStatus:"UNPAID",expenseTotal:60,currency:"MYR"}]}/>
      <div className="bill-payment-allocator"><div className="bill-payment-allocator-footer"><span className="bill-payment-total"><small>Payment total</small><strong>RM 20.00</strong><small>1 bill selected</small></span><SettlementActionButton countryId="preview" counterpartyUserId="parent" action="MARK_RECEIVED" label="Confirm RM 20.00 received" maximumAmount={20} fixedAmount currency="MYR"/></div></div></section>
      <section className="panel menu-list more-hub-page"><h2>Your travel essentials</h2><a className="menu-row" href="#">Create &amp; manage trips <span>›</span></a><a className="menu-row" href="#">Documents &amp; emergency info <span>›</span></a></section>
    </div>
  </main>
</div>);
writeFileSync("/tmp/mnm-pwa-preview.html", `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${markup}</body></html>`);
console.log("/tmp/mnm-pwa-preview.html");
