import ExpensesPage from "../expenses/page";
import SettlementsPage from "../settlements/page";
import BudgetsPage from "../settings/budgets/page";
import ReceiptReviewPage from "../receipts/page";
import { SectionTabs } from "@/components/SectionTabs";
export default async function SpendPage({ searchParams }: { searchParams: Promise<{ tab?: string; tripId?: string }> }) {
 const query = await searchParams;
 const tab = ["settlements", "budgets", "review"].includes(query.tab ?? "") ? query.tab! : "expenses";
 return <div className="stack gap-lg"><SectionTabs label="Trip money" tripId={query.tripId} selected={tab === "review" ? "expenses" : tab} items={[
 {key:"expenses",label:"Bills",href:"/spend"}, {key:"settlements",label:"Payments",href:"/spend?tab=settlements"}, {key:"budgets",label:"Budgets",href:"/spend?tab=budgets"}
 ]}/>{(tab === "expenses" || tab === "review") ? <SectionTabs label="Bill filter" selected={tab} tripId={query.tripId} items={[{key:"expenses",label:"All bills",href:"/spend"},{key:"review",label:"Needs review",href:"/spend?tab=review"}]} /> : null}{tab === "settlements" ? <SettlementsPage searchParams={Promise.resolve(query)} /> : tab === "budgets" ? <BudgetsPage searchParams={Promise.resolve(query)} /> : tab === "review" ? <ReceiptReviewPage searchParams={Promise.resolve(query)} /> : <ExpensesPage searchParams={Promise.resolve(query)} />}</div>;
}
