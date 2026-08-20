export type StoredDraft<T> = {
  version: number;
  savedAt: string;
  data: T;
};

const DRAFT_VERSION = 1;

export function draftKey(
  area: "expense" | "planner",
  identity: string,
): string {
  return `mnm:draft:${area}:${identity}`;
}

export function readDraft<T>(
  key: string,
): StoredDraft<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        key,
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(
      raw,
    ) as StoredDraft<T>;

    if (
      parsed.version !==
        DRAFT_VERSION ||
      !parsed.savedAt ||
      parsed.data === undefined
    ) {
      window.localStorage.removeItem(
        key,
      );
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft<T>(
  key: string,
  data: T,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt:
          new Date().toISOString(),
        data,
      } satisfies StoredDraft<T>),
    );
  } catch {
    // Draft protection is best-effort when storage is unavailable.
  }
}

export function clearDraft(
  key: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      key,
    );
  } catch {
    // Storage is optional.
  }
}

export function formDataStrings(
  form: HTMLFormElement,
): Record<string, string> {
  const output: Record<string, string> =
    {};

  for (
    const [key, value]
    of new FormData(form).entries()
  ) {
    if (typeof value === "string") {
      output[key] = value;
    }
  }

  return output;
}

export function applyFormStrings(
  form: HTMLFormElement,
  values: Record<string, string>,
): void {
  for (
    const [name, value]
    of Object.entries(values)
  ) {
    const fields = form.elements.namedItem(
      name,
    );

    if (!fields) {
      continue;
    }

    const targets =
      fields instanceof RadioNodeList
        ? Array.from(fields)
        : [fields];

    for (const field of targets) {
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) {
        field.value = value;
        field.dispatchEvent(
          new Event("input", {
            bubbles: true,
          }),
        );
        field.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
      }
    }
  }
}
