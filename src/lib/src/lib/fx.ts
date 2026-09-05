export type DailyFxRate = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateDate: string;
  provider: string;
};

type FrankfurterRateResponse = {
  date?: string;
  base?: string;
  quote?: string;
  rate?: number;
};

type ExchangeApiResponse = {
  date?: string;
  [currencyCode: string]: string | number | Record<string, number> | undefined;
};

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchFrankfurterRate(
  baseCurrency: string,
  quoteCurrency: string,
): Promise<DailyFxRate> {
  const url = new URL(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(baseCurrency)}/${encodeURIComponent(quoteCurrency)}`,
  );

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter returned ${response.status}.`);
  }

  const payload = (await response.json()) as FrankfurterRateResponse;
  const rate = Number(payload.rate);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Frankfurter returned an invalid FX rate.");
  }

  return {
    baseCurrency,
    quoteCurrency,
    rate,
    rateDate: payload.date ?? todayIsoDate(),
    provider: "Frankfurter",
  };
}

async function fetchExchangeApiRate(
  baseCurrency: string,
  quoteCurrency: string,
): Promise<DailyFxRate> {
  const base = baseCurrency.toLowerCase();
  const quote = quoteCurrency.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.min.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${base}.min.json`,
  ];

  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Exchange API returned ${response.status}.`);
      }

      const payload = (await response.json()) as ExchangeApiResponse;
      const rates = payload[base];

      if (
        !rates ||
        typeof rates !== "object" ||
        Array.isArray(rates)
      ) {
        throw new Error("Exchange API returned an invalid currency map.");
      }

      const rate = Number(rates[quote]);

      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Exchange API did not return the requested pair.");
      }

      return {
        baseCurrency,
        quoteCurrency,
        rate,
        rateDate:
          typeof payload.date === "string"
            ? payload.date
            : todayIsoDate(),
        provider: "Currency API",
      };
    } catch (caught) {
      lastError =
        caught instanceof Error
          ? caught
          : new Error("Unable to fetch FX rate.");
    }
  }

  throw lastError ?? new Error("Unable to fetch FX rate.");
}

export async function getDailyFxRate(
  baseCurrencyValue: string,
  quoteCurrencyValue: string,
): Promise<DailyFxRate> {
  const baseCurrency = normalizeCurrency(baseCurrencyValue);
  const quoteCurrency = normalizeCurrency(quoteCurrencyValue);

  if (
    !/^[A-Z]{3}$/.test(baseCurrency) ||
    !/^[A-Z]{3}$/.test(quoteCurrency)
  ) {
    throw new Error("Currency codes must use three letters.");
  }

  if (baseCurrency === quoteCurrency) {
    return {
      baseCurrency,
      quoteCurrency,
      rate: 1,
      rateDate: todayIsoDate(),
      provider: "Base currency",
    };
  }

  try {
    return await fetchFrankfurterRate(
      baseCurrency,
      quoteCurrency,
    );
  } catch {
    return fetchExchangeApiRate(
      baseCurrency,
      quoteCurrency,
    );
  }
}
