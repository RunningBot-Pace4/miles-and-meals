import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it, vi } from "vitest";

it("runs another wallet read when a save arrives during an existing read", async () => {
  let refresh!: () => Promise<void>;
  let resolveFirst!: (response: Response) => void;
  const fetched = vi.fn()
    .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveFirst = resolve; }))
    .mockResolvedValue(new Response(JSON.stringify({ total: 45 })));
  const updated = vi.fn();
  const exports: Record<string, Function> = {};
  const output = ts.transpileModule(readFileSync("src/components/LiveDashboardFinance.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, { exports, navigator: { onLine: true }, document: { visibilityState: "visible" }, require: (name: string) => {
    if (name === "react") return {
      useState: (value: unknown) => [value, updated], useRef: (value: unknown) => ({ current: value }),
      useEffect() {}, useMemo: (fn: Function) => fn(), useCallback: (fn: () => Promise<void>) => { refresh = fn; return fn; },
    };
    if (name === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
    if (name.endsWith("fetch-with-timeout")) return { fetchWithTimeout: fetched };
    return { formatMoney: String, FullPageLink: "a" };
  } });
  exports.LiveDashboardFinance({ initialData: { categories: [], baseCurrency: "MYR" }, tripId: "trip" });
  const first = refresh();
  await refresh();
  expect(fetched).toHaveBeenCalledTimes(1);
  resolveFirst(new Response(JSON.stringify({ total: 60 })));
  await first;
  await vi.waitFor(() => expect(updated).toHaveBeenCalledWith({ total: 45 }));
  expect(fetched).toHaveBeenCalledTimes(2);
});
