"use client";

import { useMemo, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";

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

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

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

type UserType = "user" | "admin";

function normalizeUserType(
  role: string,
): UserType {
  return role
    .split(",")
    .map((value) =>
      value.trim().toLowerCase(),
    )
    .includes("admin")
    ? "admin"
    : "user";
}

export function AdminOverview({
  users,
  countries,
  currentUserId,
}: {
  users: AdminUserOverview[];
  countries: AdminCountryOverview[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [showCountries, setShowCountries] = useState(true);
  const [roleBusyUserId, setRoleBusyUserId] =
    useState<string | null>(null);
  const [roleError, setRoleError] =
    useState("");
  const [roleDrafts, setRoleDrafts] =
    useState<Record<string, UserType>>(
      () =>
        Object.fromEntries(
          users.map((member) => [
            member.id,
            normalizeUserType(
              member.role,
            ),
          ]),
        ),
    );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users
      .filter((member) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          member.name,
          member.email,
          member.role,
          ...member.countries.flatMap((country) => [
            country.name,
            country.tripName,
          ]),
        ].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort((left, right) => {
        if (left.activeSession !== right.activeSession) {
          return left.activeSession ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      });
  }, [normalizedQuery, users]);

  const activeUsers = users.filter(
    (member) => member.activeSession,
  ).length;

  const assignedUsers = users.filter(
    (member) => member.countries.length > 0,
  ).length;

  async function saveUserType(
    member: AdminUserOverview,
  ) {
    const role =
      roleDrafts[member.id] ??
      normalizeUserType(member.role);

    if (
      member.id === currentUserId &&
      role !== "admin"
    ) {
      setRoleError(
        "You cannot remove your own Admin access.",
      );
      return;
    }

    setRoleError("");
    setRoleBusyUserId(member.id);

    try {
      const response = await fetch(
        "/api/admin/users/role",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            userId: member.id,
            role,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to update user type.",
        );
      }

      window.location.reload();
    } catch (caught) {
      setRoleError(
        caught instanceof Error
          ? caught.message
          : "Unable to update user type.",
      );
      setRoleBusyUserId(null);
    }
  }

  return (
    <div className="stack gap-lg">
      {roleBusyUserId ? (
        <SavingOverlay
          title="Updating user type"
          message="Applying the new access level securely."
        />
      ) : null}

      {roleError ? (
        <div
          className="form-notice error-text"
          role="alert"
        >
          <span>!</span>
          {roleError}
        </div>
      ) : null}

      <section className="panel admin-traveler-hub">
        <div className="admin-traveler-hero">
          <div className="admin-traveler-hero-copy">
            <p className="eyebrow">TRAVEL CREW</p>
            <h2>User access &amp; login activity</h2>
            <p>
              Find a traveler quickly, check their last login,
              and see exactly which destinations they can access.
            </p>
          </div>

          <div
            className="admin-travel-stamp"
            aria-hidden="true"
          >
            <span>CREW</span>
            <strong>{users.length}</strong>
          </div>
        </div>

        <div className="admin-summary-strip">
          <article>
            <span className="admin-summary-icon">◎</span>
            <div>
              <small>Users</small>
              <strong>{users.length}</strong>
            </div>
          </article>
          <article>
            <span className="admin-summary-icon live">●</span>
            <div>
              <small>Active session</small>
              <strong>{activeUsers}</strong>
            </div>
          </article>
          <article>
            <span className="admin-summary-icon amber">⌖</span>
            <div>
              <small>With country access</small>
              <strong>{assignedUsers}</strong>
            </div>
          </article>
        </div>

        <label className="admin-user-search">
          <span className="admin-user-search-icon">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search name, email, role, trip or country"
            aria-label="Search users"
          />
        </label>

        <div className="admin-user-list compact">
          {filteredUsers.map((member) => (
            <details
              className="admin-user-row"
              key={member.id}
            >
              <summary>
                <div className="admin-user-row-main">
                  <div className="admin-user-avatar">
                    {initials(member.name)}
                  </div>

                  <div className="admin-user-identity">
                    <div className="admin-user-name-row">
                      <strong>{member.name}</strong>

                      <span
                        className={
                          member.activeSession
                            ? "admin-status-pill active"
                            : "admin-status-pill"
                        }
                      >
                        {member.activeSession
                          ? "Active"
                          : "Signed out"}
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

                <div className="admin-user-row-glance">
                  <div>
                    <small>Last login</small>
                    <strong>
                      {formatDateTime(member.lastLoginAt)}
                    </strong>
                  </div>

                  <span className="admin-country-count">
                    {member.countries.length}{" "}
                    {member.countries.length === 1
                      ? "country"
                      : "countries"}
                  </span>

                  <span
                    className="admin-row-chevron"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </div>
              </summary>

              <div className="admin-user-expanded">
                <div className="admin-user-meta simplified">
                  <div>
                    <small>User type</small>
                    <strong>
                      {normalizeUserType(
                        member.role,
                      ) === "admin"
                        ? "Admin"
                        : "Traveler"}
                    </strong>
                  </div>
                  <div>
                    <small>Account created</small>
                    <strong>
                      {formatDateTime(member.createdAt)}
                    </strong>
                  </div>
                </div>

                <div className="admin-user-type-control">
                  <label>
                    <span>Change user type</span>
                    <select
                      value={
                        roleDrafts[member.id] ??
                        normalizeUserType(
                          member.role,
                        )
                      }
                      disabled={
                        member.id ===
                        currentUserId
                      }
                      onChange={(event) =>
                        setRoleDrafts(
                          (current) => ({
                            ...current,
                            [member.id]:
                              event.target
                                .value as UserType,
                          }),
                        )
                      }
                    >
                      <option value="user">
                        Traveler
                      </option>
                      <option value="admin">
                        Admin
                      </option>
                    </select>
                  </label>

                  <button
                    className="button secondary"
                    type="button"
                    data-requires-online="true"
                    disabled={
                      roleBusyUserId !== null ||
                      member.id ===
                        currentUserId ||
                      (
                        roleDrafts[member.id] ??
                        normalizeUserType(
                          member.role,
                        )
                      ) ===
                        normalizeUserType(
                          member.role,
                        )
                    }
                    onClick={() =>
                      void saveUserType(
                        member,
                      )
                    }
                  >
                    Save type
                  </button>

                  <p className="admin-user-type-note">
                    {member.id ===
                    currentUserId
                      ? "Your own Admin type is locked here to prevent accidental loss of Admin access."
                      : "Traveler access follows assigned countries. Admin can access all Admin tools and destinations."}
                  </p>
                </div>

                <div className="admin-assignment-block">
                  <div className="admin-access-heading">
                    <small>Country access</small>
                    <span>
                      {member.countries.length
                        ? "Traveler can see these destinations"
                        : "No access assigned"}
                    </span>
                  </div>

                  <div className="admin-assignment-chips">
                    {member.countries.length > 0 ? (
                      member.countries.map((country) => (
                        <span
                          key={`${member.id}-${country.id}`}
                        >
                          <b>⌖</b>
                          {country.name}
                          <small>{country.tripName}</small>
                        </span>
                      ))
                    ) : (
                      <span className="empty">
                        No country assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </details>
          ))}

          {filteredUsers.length === 0 ? (
            <div className="admin-user-empty">
              <span>⌕</span>
              <strong>No traveler found</strong>
              <small>
                Try a different name, email, trip or country.
              </small>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel admin-overview-section">
        <button
          className="admin-overview-toggle"
          type="button"
          aria-expanded={showCountries}
          onClick={() =>
            setShowCountries((current) => !current)
          }
        >
          <div>
            <p className="eyebrow">DESTINATIONS</p>
            <h2>Configured countries</h2>
          </div>

          <span>
            {countries.length}{" "}
            {countries.length === 1
              ? "country"
              : "countries"}{" "}
            · {showCountries ? "Hide" : "Show"}
          </span>
        </button>

        {showCountries ? (
          countries.length > 0 ? (
            <div className="admin-country-list travel">
              {countries.map((country) => (
                <article
                  className="admin-country-card travel-ticket"
                  key={country.id}
                >
                  <div className="admin-country-title">
                    <div>
                      <span className="admin-destination-pin">
                        ⌖
                      </span>
                      <div>
                        <strong>{country.name}</strong>
                        <small>{country.tripName}</small>
                      </div>
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
                      <strong>
                        {formatFx(
                          country.defaultExchangeRate,
                        )}
                      </strong>
                    </div>
                    <div>
                      <small>Travelers</small>
                      <strong>{country.assignedCount}</strong>
                    </div>
                  </div>

                  <div className="admin-fx-stamp">
                    <span>Rate stamp</span>
                    <strong>
                      {country.fxRateProvider ??
                        "Legacy / manual"}
                      {country.fxRateDate
                        ? ` · ${formatDate(
                            country.fxRateDate,
                          )}`
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
          )
        ) : null}
      </section>
    </div>
  );
}
