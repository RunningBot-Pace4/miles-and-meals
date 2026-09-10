// Remove only exact duplicate rules inside the same CSS parent. Keep the
// final occurrence so cascade order and conditional rules are preserved.
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";

const files = ["globals", "living-journey", "v92-living-journey", "bill-history"];
for (const name of files) {
  const file = `src/app/${name}.css`;
  const before = readFileSync(file, "utf8");
  const root = postcss.parse(before, { from: file });
  let removed = 0;
  function clean(parent) {
    const seen = new Set();
    for (const node of [...(parent.nodes ?? [])].reverse()) {
      if (node.type === "rule" && node.nodes.every(child => child.type === "decl" || child.type === "comment")) {
        const key = JSON.stringify([node.selector, node.nodes.filter(child => child.type === "decl").map(child => [child.prop, child.value, Boolean(child.important)])]);
        if (seen.has(key)) { node.remove(); removed++; }
        else seen.add(key);
      } else if (node.nodes) clean(node);
    }
  }
  clean(root);
  const after = root.toString();
  if (process.argv.includes("--write")) writeFileSync(file, after);
  console.log(`${file}: ${removed} duplicate rules; ${Buffer.byteLength(before) - Buffer.byteLength(after)} bytes saved`);
}
