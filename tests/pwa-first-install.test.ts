import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Exercise the actual production event handler without installing a browser.
function setup(controlled: boolean) {
  const effects: Array<() => void> = [];
  const refs: Array<{ current: unknown }> = [];
  const listeners = new Map<string, () => void>();
  const reload = vi.fn();
  const clearTimeout = vi.fn();
  const react = {
    useEffect: (fn: () => void) => effects.push(fn),
    useState: (value: unknown) => [value, vi.fn()],
    useRef: (value: unknown) => { const ref = { current: value }; refs.push(ref); return ref; },
  };
  const output = ts.transpileModule(readFileSync("src/components/PwaRegister.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, () => void> = {};
  runInNewContext(output, {
    exports,
    require: (name: string) => name === "react" ? react : {},
    process: { env: { NODE_ENV: "production" } },
    navigator: { serviceWorker: {
      controller: controlled ? {} : null,
      addEventListener: (event: string, fn: () => void) => listeners.set(event, fn),
      removeEventListener() {},
    } },
    window: { location: { reload }, clearTimeout, addEventListener() {}, removeEventListener() {} },
    document: { readyState: "loading", visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
  });
  exports.PwaRegister();
  effects.forEach(effect => effect());
  return { reload, clearTimeout, refs, change: () => listeners.get("controllerchange")!() };
}

describe("PWA activation", () => {
  it("keeps an uncontrolled page open when the first worker claims it", () => {
    const app = setup(false);
    app.change();
    expect(app.reload).not.toHaveBeenCalled();
  });
  it("still reloads once when replacing an existing controller", () => {
    const app = setup(true);
    app.change(); app.change();
    expect(app.reload).toHaveBeenCalledTimes(1);
  });
  it("honors an explicit update even on an initially uncontrolled page", () => {
    const app = setup(false);
    app.refs[1].current = 123;
    app.change();
    expect(app.reload).toHaveBeenCalledTimes(1);
    expect(app.clearTimeout).toHaveBeenCalledWith(123);
  });
});
