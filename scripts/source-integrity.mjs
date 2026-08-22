import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = ["src", "tests", "e2e"];
const extensions = [".ts", ".tsx"];
const files = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.includes(path.extname(entry.name))) files.push(full);
  }
}

for (const root of roots) walk(root);

const parseErrors = [];
const missingImports = [];

for (const file of files) {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  for (const diagnostic of source.parseDiagnostics) {
    parseErrors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    let base = null;

    if (specifier.startsWith("@/")) {
      base = path.join("src", specifier.slice(2));
    } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
      base = path.resolve(path.dirname(file), specifier);
    }

    if (!base) continue;

    const candidates = [
      base,
      ...extensions.map((extension) => `${base}${extension}`),
      ...extensions.map((extension) => path.join(base, `index${extension}`)),
    ];

    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      missingImports.push(`${file}: ${specifier}`);
    }
  }
}

if (parseErrors.length || missingImports.length) {
  if (parseErrors.length) {
    console.error("Parse errors:\n" + parseErrors.join("\n"));
  }
  if (missingImports.length) {
    console.error("Missing local imports:\n" + missingImports.join("\n"));
  }
  process.exit(1);
}

console.log(`Source integrity passed: ${files.length} TS/TSX files, 0 parse errors, 0 missing local imports.`);
