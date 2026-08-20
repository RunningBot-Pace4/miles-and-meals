import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminForms } from "@/components/AdminForms";
import { AdminOverview } from "@/components/AdminOverview";
import { db } from "@/db";
import {
  countries,
  countryMembers,
  loginAudits,
  session,
  trips,
  user,
} from "@/db/schema";
import { isSystemAdmin, requirePageSession } from "@/lib/session";

export default async function AdminPage() {
  const currentSession = await requirePageSession();

  if (!isSystemAdmin(currentSession.user.role)) {
    redirect("/dashboard");
  }

  const [
    rawTripRows,
    countryRows,
    users,
    latestLoginRows,
    activeSessionRows,
    assignmentRows,
  ] = await Promise.all([
    db
      .select({
        id: trips.id,
        name: trips.name,
        baseCurrency: trips.baseCurrency,
        budget: trips.budget,
        startDate: trips.startDate,
        endDate: trips.endDate,
      })
      .from(trips)
      .orderBy(trips.name),

    db
      .select({
        id: countries.id,
        name: countries.name,
        code: countries.code,
        currencyCode: countries.currencyCode,
        defaultExchangeRate: countries.defaultExchangeRate,
        fxRateDate: countries.fxRateDate,
        fxRateProvider: countries.fxRateProvider,
        tripName: trips.name,
        baseCurrency: trips.baseCurrency,
      })
      .from(countries)
      .innerJoin(trips, eq(countries.tripId, trips.id))
      .orderBy(trips.name, countries.name),

    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.name),

    db
      .selectDistinctOn([loginAudits.userId], {
        userId: loginAudits.userId,
        signedInAt: loginAudits.signedInAt,
      })
      .from(loginAudits)
      .orderBy(
        loginAudits.userId,
        desc(loginAudits.signedInAt),
      ),

    db
      .select({
        userId: session.userId,
        createdAt: session.createdAt,
      })
      .from(session),

    db
      .select({
        userId: countryMembers.userId,
        countryId: countries.id,
        countryName: countries.name,
        tripName: trips.name,
      })
      .from(countryMembers)
      .innerJoin(
        countries,
        eq(countryMembers.countryId, countries.id),
      )
      .innerJoin(trips, eq(countries.tripId, trips.id))
      .orderBy(trips.name, countries.name),
  ]);

  const tripRows =
    rawTripRows;

  const loginByUser =
    new Map<string, Date>(
      latestLoginRows.map(
        (row) => [
          row.userId,
          row.signedInAt,
        ],
      ),
    );

  const activeSessionByUser =
    new Map<string, Date>(
      activeSessionRows.map(
        (row) => [
          row.userId,
          row.createdAt,
        ],
      ),
    );

  const assignmentsByUser = new Map<
    string,
    Array<{
      id: string;
      name: string;
      tripName: string;
    }>
  >();

  const assignedCountByCountry = new Map<string, number>();

  for (const assignment of assignmentRows) {
    const existing =
      assignmentsByUser.get(assignment.userId) ?? [];

    existing.push({
      id: assignment.countryId,
      name: assignment.countryName,
      tripName: assignment.tripName,
    });

    assignmentsByUser.set(
      assignment.userId,
      existing,
    );

    assignedCountByCountry.set(
      assignment.countryId,
      (assignedCountByCountry.get(
        assignment.countryId,
      ) ?? 0) + 1,
    );
  }

  const userOverview = users.map((member) => {
    const recordedLogin =
      loginByUser.get(member.id) ??
      activeSessionByUser.get(member.id) ??
      null;

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role ?? "user",
      banned: member.banned ?? false,
      createdAt: member.createdAt.toISOString(),
      lastLoginAt: recordedLogin?.toISOString() ?? null,
      activeSession: activeSessionByUser.has(member.id),
      countries:
        assignmentsByUser.get(member.id) ?? [],
    };
  });

  const countryOverview = countryRows.map(
    (country) => ({
      id: country.id,
      name: country.name,
      tripName: country.tripName,
      code: country.code,
      currencyCode: country.currencyCode,
      baseCurrency: country.baseCurrency,
      defaultExchangeRate:
        country.defaultExchangeRate,
      fxRateDate: country.fxRateDate,
      fxRateProvider: country.fxRateProvider,
      assignedCount:
        assignedCountByCountry.get(country.id) ?? 0,
    }),
  );

  return (
    <div className="stack gap-lg">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Trip access & setup</h1>
          <p className="muted">
            Review users, login activity, country access and trip setup.
          </p>
        </div>
      </div>

      <AdminOverview
        users={userOverview}
        countries={countryOverview}
        trips={tripRows}
        currentUserId={currentSession.user.id}
      />

      <AdminForms
        trips={tripRows}
        users={users.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
        }))}
      />
    </div>
  );
}
