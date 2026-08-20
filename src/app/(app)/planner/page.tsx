import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { travelItems, user } from "@/db/schema";
import { PlannerClient } from "@/components/PlannerClient";
import { SettlementLiveRefresh } from "@/components/SettlementLiveRefresh";
import { listAccessibleCountries } from "@/lib/access";
import { requirePageSession } from "@/lib/session";

export default async function PlannerPage() {
  const session = await requirePageSession();
  const countries = await listAccessibleCountries(session.user);
  const ids = countries.map((country) => country.id);

  const items =
    ids.length === 0
      ? []
      : await db
          .select({
            id: travelItems.id,
            countryId: travelItems.countryId,
            itemType: travelItems.itemType,
            title: travelItems.title,
            itemDate: travelItems.itemDate,
            itemTime: travelItems.itemTime,
            area: travelItems.area,
            subtype: travelItems.subtype,
            priority: travelItems.priority,
            status: travelItems.status,
            ownerUserId: travelItems.ownerUserId,
            estimatedCost: travelItems.estimatedCost,
            quantity: travelItems.quantity,
            provider: travelItems.provider,
            confirmationNo: travelItems.confirmationNo,
            linkUrl: travelItems.linkUrl,
            notes: travelItems.notes,
            createdBy: travelItems.createdBy,
            proposedByName: user.name,
          })
          .from(travelItems)
          .leftJoin(user, eq(travelItems.createdBy, user.id))
          .where(inArray(travelItems.countryId, ids))
          .orderBy(desc(travelItems.itemDate), desc(travelItems.createdAt));

  return (
    <div className="stack gap-lg">
      <SettlementLiveRefresh
        intervalMs={8000}
        showBadge={false}
        channels={["planner"]}
      />
      <div className="page-heading planner-page-heading">
        <div>
          <p className="eyebrow">MILES & MEALS</p>
          <h1>Plan the good stuff</h1>
          <p className="muted">
            Build the trip together — plans can be proposed, refined and
            updated by travelers who have access to the country.
          </p>
        </div>
      </div>

      <PlannerClient countries={countries} items={items} />
    </div>
  );
}
