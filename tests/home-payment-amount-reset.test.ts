import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { allocateHomePayment } from "../src/lib/home-payment-allocation";
import { formatMoney } from "../src/lib/money";

// Render the production card with a small hook harness. Network submission is
// represented by the action's success callback; allocation uses the real code.
function setup() {
  const slots: any[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: Array<() => void> = [];
  const react = {
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: any) => {
        const value = typeof next === "function" ? next(slots[index]) : next;
        if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
      }];
    },
    useRef(initial: any) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useEffect(fn: () => void, deps: any[]) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index][i]))) effects.push(fn);
      slots[index] = deps;
    },
  };
  const jsx = (type: any, props: any) => ({ type, props });
  const exports: Record<string, Function> = {};
  const output = ts.transpileModule(readFileSync("src/components/HomePaymentPanel.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(output, { exports, require: (name: string) => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (name.endsWith("/home-payment-allocation")) return { allocateHomePayment };
    if (name.endsWith("/money")) return { formatMoney };
    return { HomePaymentAmount: "Amount", SettlementActionButton: "Action", FullPageLink: "Link" };
  } });
  const bills = [20, 40].map((remainingAmount, i) => ({ expenseId: String(i), expenseDate: `2026-09-0${i + 1}`, description: `Receipt ${i + 1}`, remainingAmount }));
  const balance = { fromUserId: "me", toUserId: "jy", toName: "JY", directRemaining: 60, expenses: bills };
  const props = { choices: [{ plan: { tripId: "trip", countryId: "country", tripName: "Trip", currency: "MYR" }, balance }], currentUserId: "me", onRecord: vi.fn() };
  let tree: any;
  function render() {
    for (let i = 0; i < 10; i++) {
      cursor = 0; dirty = false; effects = [];
      tree = exports.HomePaymentRequestCard(props);
      effects.forEach(fn => fn());
      if (!dirty) return;
    }
    throw new Error("Card did not settle");
  }
  function find(type: string, node = tree): any {
    if (!node || typeof node !== "object") return;
    if (node.type === type) return node.props;
    return [node.props?.children].flat(Infinity).filter(Boolean).map(child => find(type, child)).find(Boolean);
  }
  render();
  return { balance, render, field: () => find("Amount"), action: () => find("Action"), enter(value: string) { find("Amount").onChange(value); render(); } };
}

describe("Home payment remainder", () => {
  it("allocates 45 across 20 and 40, then displays 15 immediately and after refresh", () => {
    const card = setup(); card.enter("45.00");
    expect(card.action().allocations).toEqual([{ expenseId: "0", amount: 20 }, { expenseId: "1", amount: 25 }]);
    card.action().onRecorded(); card.render();
    expect(card.field().amount).toBe("15.00");
    card.balance.directRemaining = 15;
    card.balance.expenses[0].remainingAmount = 0; card.balance.expenses[1].remainingAmount = 15;
    card.render();
    expect(card.field().amount).toBe("15.00");
    expect(card.action().allocations).toEqual([{ expenseId: "1", amount: 15 }]);
  });
  it("uses the authoritative refreshed remainder if another payment also arrived", () => {
    const card = setup(); card.enter("10.00"); card.action().onRecorded(); card.render();
    expect(card.field().amount).toBe("50.00");
    card.balance.directRemaining = 47; card.balance.expenses[0].remainingAmount = 7; card.render();
    expect(card.field().amount).toBe("47.00");
  });
  it("preserves an unsaved valid draft during a poll but replaces a now-excessive amount", () => {
    const card = setup(); card.enter("42.90"); card.render();
    expect(card.field().amount).toBe("42.90");
    card.balance.directRemaining = 5; card.balance.expenses[0].remainingAmount = 0; card.balance.expenses[1].remainingAmount = 5; card.render();
    expect(card.field().amount).toBe("5.00");
    expect(card.field().error).toBe("");
  });
  it("does not deduct merely when typing or when a save has not succeeded", () => {
    const card = setup(); card.enter("45.00"); card.render();
    expect(card.field().amount).toBe("45.00");
    expect(card.field().maximum).toBe(60);
  });
  it("leaves zero and no further payment action after a full successful payment", () => {
    const card = setup(); card.action().onRecorded(); card.render();
    expect(card.field().amount).toBe("0.00");
    expect(card.action()).toBeUndefined();
  });
});
