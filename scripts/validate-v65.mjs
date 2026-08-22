import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function mustNot(source, needle, message) {
  if (source.includes(needle)) {
    throw new Error(message);
  }
}

const expenseForm = read("src/components/ExpenseForm.tsx");
const css = read("src/app/globals.css");

must(expenseForm, "noValidate", "v65 form must bypass silent native constraint validation");
must(expenseForm, "function failSubmit", "v65 unified submit failure helper missing");
must(expenseForm, "function revealSubmitProblem", "v65 first-problem reveal helper missing");
must(expenseForm, 'name="transactionAmount"', "v65 named amount field missing");
must(expenseForm, 'name="transactionCurrency"', "v65 named currency field missing");
must(expenseForm, 'name="exchangeRate"', "v65 named FX field missing");
must(expenseForm, "submitInFlightRef", "v65 double-submit guard missing");
must(expenseForm, "20_000", "v65 network save timeout missing");
must(expenseForm, "duplicateWarningRef.current?.scrollIntoView", "v65 duplicate auto-reveal missing");
must(expenseForm, "sticky-save-feedback", "v65 sticky save error feedback missing");
must(expenseForm, "setDraftDirty(false)", "v65 success draft-state cleanup missing");
must(expenseForm, "busy ||\n      offlineQueued ||\n      receiptScanning", "v65 draft autosave must stop after offline queueing");
mustNot(expenseForm, "onClickCapture={() =>\n          setDraftDirty(true)", "v65 must not create drafts from generic clicks");
must(css, ".sticky-save.has-feedback", "v65 sticky error styling missing");
must(css, ".sticky-save-feedback", "v65 sticky feedback styling missing");

console.log("v65 Add Expense save reliability validation passed.");
