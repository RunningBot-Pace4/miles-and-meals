type AdminUserOverview = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  activeSession: boolean;
  countries: Array<{
    id: string;
    name: string;
    tripName: string;
  }>;
};

type AdminCountryOverview = {
  id: string;
  name: string;
  tripName: string;
  code: string;
  currencyCode: string;
  baseCurrency: string;
  defaultExchangeRate: string;
  fxRateDate: string | null;
  fxRateProvider: string | null;
  assignedCount: number;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "No recorded login";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatFx(value: string): string {
  const rate = Number(value);

  if (!Number.isFinite(rate)) {
    return value;
  }

  if (rate >= 1) {
    return rate.toLocaleString("en-MY", {
      maximumFractionDigits: 6,
    });
  }

  return rate.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 10,
  });
}

export function AdminOverview({
  users,
  countries,
}: {
  users: AdminUserOverview[];
  countries: AdminCountryOverview[];
}) {
  return (
    <div className="stack gap-lg">
      <section className="panel admin-overview-section">
        <div className="admin-overview-heading">
          <div>
            <p className="eyebrow">USERS</p>
            <h2>User access & login activity</h2>
          </div>
          <span className="admin-count-pill">
            {users.length} {users.length === 1 ? "user" : "users"}
          </span>
        </div>

        <div className="admin-user-list">
          {users.map((member) => (
            <article className="admin-user-card" key={member.id}>
              <div className="admin-user-main">
                <div className="admin-user-avatar" aria-hidden="true">
                  {member.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "U"}
                </div>

                <div>
                  <div className="admin-user-name-row">
                    <strong>{member.name}</strong>
                    <span
                      className={
                        member.activeSession
                          ? "admin-status-pill active"
                          : "admin-status-pill"
                      }
                    >
                      {member.activeSession ? "Online session" : "Signed out"}
                    </span>
                    {member.banned ? (
                      <span className="admin-status-pill banned">
                        Banned
                      </span>
                    ) : null}
                  </div>
                  <small>{member.email}</small>
                </div>
              </div>

              <div className="admin-user-meta">
                <div>
                  <small>Role</small>
                  <strong>{member.role}</strong>
                </div>
                <div>
                  <small>Login stamp</small>
                  <strong>{formatDateTime(member.lastLoginAt)}</strong>
                </div>
                <div>
                  <small>Account created</small>
                  <strong>{formatDateTime(member.createdAt)}</strong>
                </div>
              </div>

              <div className="admin-assignment-block">
                <small>Country access</small>
                <div className="admin-assignment-chips">
                  {member.countries.length > 0 ? (
                    member.countries.map((country) => (
                      <span key={`${member.id}-${country.id}`}>
                        {country.tripName} · {country.name}
                      </span>
                    ))
                  ) : (
                    <span className="empty">No country assigned</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel admin-overview-section">
        <div className="admin-overview-heading">
          <div>
            <p className="eyebrow">COUNTRIES</p>
            <h2>Configured countries</h2>
          </div>
          <span className="admin-count-pill">
            {countries.length} {countries.length === 1 ? "country" : "countries"}
          </span>
        </div>

        {countries.length > 0 ? (
          <div className="admin-country-list">
            {countries.map((country) => (
              <article className="admin-country-card" key={country.id}>
                <div className="admin-country-title">
                  <div>
                    <strong>{country.name}</strong>
                    <small>{country.tripName}</small>
                  </div>
                  <span>{country.code}</span>
                </div>

                <div className="admin-country-metrics">
                  <div>
                    <small>Currency</small>
                    <strong>{country.currencyCode}</strong>
                  </div>
                  <div>
                    <small>Trip base</small>
                    <strong>{country.baseCurrency}</strong>
                  </div>
                  <div>
                    <small>Default FX</small>
                    <strong>{formatFx(country.defaultExchangeRate)}</strong>
                  </div>
                  <div>
                    <small>Assigned</small>
                    <strong>{country.assignedCount}</strong>
                  </div>
                </div>

                <div className="admin-fx-stamp">
                  <span>FX rate stamp</span>
                  <strong>
                    {country.fxRateProvider ?? "Legacy / manual"}
                    {country.fxRateDate
                      ? ` · ${formatDate(country.fxRateDate)}`
                      : ""}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <h3>No countries yet</h3>
            <p>Add the first country below.</p>
          </div>
        )}
      </section>
    </div>
  );
}
