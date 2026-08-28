import { renderSpecs, EXEMPLOS } from "./app";
let bad = 0, total = 0;
for (const g of EXEMPLOS) for (const spec of g.specs) {
  for (const item of renderSpecs(spec)) {
    total++;
    if (item.error) { bad++; console.log(`✗ [${g.grupo}] ${item.spec}: ${item.error}`); }
    else if (item.warnings.length) console.log(`⚠ [${g.grupo}] ${item.spec}: ${item.warnings.join("; ")}`);
  }
}
console.log(`${total - bad}/${total} exemplos ok`);
if (bad) process.exit(1);
