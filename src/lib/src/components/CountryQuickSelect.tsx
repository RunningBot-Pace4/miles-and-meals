"use client";

import {
  useEffect,
  useState,
} from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { compactOptionText } from "@/lib/display-text";

type CountryOption = {
  id: string;
  tripName: string;
};

export function CountryQuickSelect({
  countries,
  selectedId,
}: {
  countries: CountryOption[];
  selectedId: string;
}) {
  const [value, setValue] = useState(selectedId);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setValue(selectedId);
    setSwitching(false);
  }, [selectedId]);

  function changeCountry(nextId: string) {
    if (nextId === selectedId) {
      setValue(nextId);
      return;
    }

    if (!navigator.onLine) {
      setValue(selectedId);
      setSwitching(false);
      window.location.assign("/offline.html");
      return;
    }

    setValue(nextId);
    setSwitching(true);

    window.location.assign(
      nextId
        ? `/dashboard?country=${encodeURIComponent(nextId)}`
        : "/dashboard",
    );
  }

  return (
    <>
      {switching ? (
        <SavingOverlay
          title="Switching trip"
          message="Your dashboard is changing to the selected trip."
        />
      ) : null}

      <label className="destination-switcher">
        <span className="destination-switcher-label">
          <span aria-hidden="true">⌖</span>
          Trip
        </span>

        <select
          aria-label="Change dashboard trip"
          value={value}
          onChange={(event) =>
            changeCountry(event.target.value)
          }
          disabled={switching}
        >
          <option value="">All trips</option>
          {countries.map((country) => (
            <option
              value={country.id}
              key={country.id}
              title={country.tripName}
            >
              {compactOptionText(country.tripName, 32)}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
