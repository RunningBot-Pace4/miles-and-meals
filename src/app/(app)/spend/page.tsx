import ExpensesPage from "../expenses/page";
import SettlementsPage from "../settlements/page";
import BudgetsPage from "../settings/budgets/page";
import ReceiptReviewPage from "../receipts/page";
import { SectionTabs } from "@/components/SectionTabs";
export default async function SpendPage({ searchParams }: { searchParams: Promise<{ tab?: string; tripId?: string }> }) {
 const query = await searchParams;
 const tab = ["settlements", "budgets", "review"].includes(query.tab ?? "") ? query.tab! : "expenses";
 return <div className="stack gap-lg"><SectionTabs label="Trip money" selected={tab} items={[
 {key:"expenses",label:"Expenses",href:"/spend"}, {key:"settlements",label:"Settle Up",href:"/spend?tab=settlements"}, {key:"budgets",label:"Budgets",href:"/spend?tab=budgets"}, {key:"review",label:"Needs review",href:"/spend?tab=review"}
 ]}/>{tab === "settlements" ? <SettlementsPage searchParams={Promise.resolve(query)} /> : tab === "budgets" ? <BudgetsPage /> : tab === "review" ? <ReceiptReviewPage /> : <ExpensesPage />}</div>;
}
