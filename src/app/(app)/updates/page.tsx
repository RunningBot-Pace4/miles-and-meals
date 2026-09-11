import NotificationsPage from "../notifications/page";
import ActivityPage from "../activity/page";
import { SectionTabs } from "@/components/SectionTabs";
export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ tab?: string; tripId?: string }> }) {
 const { tab, tripId } = await searchParams;
 return <div className="stack gap-lg"><SectionTabs label="Updates" tripId={tripId} selected={tab === "activity" ? "activity" : "notifications"} items={[{key:"notifications",label:"For me",href:"/updates"},{key:"activity",label:"Trip activity",href:"/updates?tab=activity"}]}/>{tab === "activity" ? <ActivityPage /> : <NotificationsPage />}</div>;
}
