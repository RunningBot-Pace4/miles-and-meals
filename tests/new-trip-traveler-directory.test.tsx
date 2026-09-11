import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const directory = vi.hoisted(()=>vi.fn(async()=>[{id:"friend",name:"Parent"}]));
vi.mock("@/lib/session",()=>({requirePageSession:async()=>({user:{id:"new-user",role:"user"}}),isSystemAdmin:()=>false}));
vi.mock("@/lib/access",()=>({repairOwnedTripAccess:async()=>{}}));
vi.mock("@/lib/trip-management",()=>({listManagedTrips:async()=>[],listJoinedTrips:async()=>[],listActiveUsersForTripManagement:directory}));
vi.mock("@/components/TripManager",()=>({TripManager:({users}:any)=><div>{users.map((user:any)=><span key={user.id}>{user.name}</span>)}</div>}));
import TripsPage from "@/app/(app)/trips/page";
it("loads the names-only assignment directory before a traveler owns any trips",async()=>{
  expect(renderToStaticMarkup(await TripsPage())).toContain("Parent");
  expect(directory).toHaveBeenCalledWith(false);
});
