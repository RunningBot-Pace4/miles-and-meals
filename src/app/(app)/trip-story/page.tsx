import MemoriesPage from "../memories/page";
import WrappedPage from "../wrapped/page";
import { SectionTabs } from "@/components/SectionTabs";
export default async function TripStoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; tripId?: string }> }) {
 const query = await searchParams;
 return <div className="stack gap-lg"><SectionTabs label="Trip story" selected={query.tab === "highlights" ? "highlights" : "memories"} items={[{key:"memories",label:"Memories",href:"/trip-story"},{key:"highlights",label:"Highlights",href:"/trip-story?tab=highlights"}]}/>{query.tab === "highlights" ? <WrappedPage searchParams={Promise.resolve(query)} /> : <MemoriesPage />}</div>;
}
