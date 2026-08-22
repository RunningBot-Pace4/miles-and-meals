import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const expenseForm = read("src/components/ExpenseForm.tsx");
const css = read("src/app/globals.css");

must(expenseForm, 'className="advanced-money-card"', "v64 advanced money card missing");
must(expenseForm, "Amount paid", "v64 amount-first heading missing");
must(expenseForm, 'className="advanced-amount-shell"', "v64 large amount input shell missing");
must(expenseForm, 'className="advanced-currency-control"', "v64 full currency selector missing");
must(expenseForm, "Trip default", "v64 trip default currency indicator missing");
must(expenseForm, "Estimated trip amount", "v64 conversion preview missing");
must(expenseForm, "{option.code} — {option.label}", "v64 currency code + label options missing");
must(css, ".advanced-money-card", "v64 money card CSS missing");
must(css, ".advanced-amount-shell:focus-within", "v64 amount focus treatment missing");
must(css, "font-size: clamp(1.8rem, 5vw, 2.35rem)", "v64 large amount typography missing");
must(css, "@media (max-width: 360px)", "v64 small-screen fallback missing");

console.log("v64 advanced money input validation passed.");
