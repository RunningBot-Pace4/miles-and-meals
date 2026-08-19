import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");
const forbidden = [
  'from "next/link"',
  "useRouter",
  "router.refresh(",
  "router.push(",
  "router.replace(",
];

const failures = [];

function visit(directory) {
  for (const entry of fs.readdirSync(
    directory,
    { withFileTypes: true },
  )) {
    const absolutePath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      visit(absolutePath);
      continue;
    }

    if (
      !entry.isFile() ||
      !/\.(ts|tsx)$/.test(entry.name)
    ) {
      continue;
    }

    const source = fs.readFileSync(
      absolutePath,
      "utf8",
    );

    for (const pattern of forbidden) {
      if (source.includes(pattern)) {
        failures.push(
          `${path.relative(process.cwd(), absolutePath)}: ${pattern}`,
        );
      }
    }
  }
}

visit(root);

if (failures.length > 0) {
  console.error(
    "Navigation reliability validation failed:",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "Navigation reliability validation passed.",
);
