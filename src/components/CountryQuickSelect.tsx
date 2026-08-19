"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { SavingOverlay } from "@/components/SavingOverlay";

type CountryOption = {
  id: string;
  name: string;
  tripName: string;
};

export function CountryQuickSelect({
  countries,
  selectedId,
}: {
  countries: CountryOption[];
  selectedId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(selectedId);
  const [pending, startTransition] = useTransition();

  function changeCountry(nextId: string) {
    setValue(nextId);

    startTransition(() => {
      router.push(
        nextId
          ? `/dashboard?country=${encodeURIComponent(nextId)}`
          : "/dashboard",
      );
    });
  }

  return (
    <>
      {pending ? (
        <SavingOverlay
          title="Switching destination"
          message="Loading the selected country, budget and trip activity."
        />
      ) : null}

      <label className="destination-switcher">
        <span className="destination-switcher-label">
          <span aria-hidden="true">⌖</span>
          Destination
        </span>

        <select
          aria-label="Change dashboard country"
          value={value}
          onChange={(event) =>
            changeCountry(event.target.value)
          }
          disabled={pending}
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option
              value={country.id}
              key={country.id}
            >
              {country.name} · {country.tripName}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
