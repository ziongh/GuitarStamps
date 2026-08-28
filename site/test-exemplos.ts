// Verifies that EVERY clickable pedido on the site — gallery groups AND the
// reference section — renders clean through the shared engine. Run by
// site/build.sh before bundling: a broken example fails the build, not a
// visitor. Exits 1 on any error.
import { renderPedidos, EXEMPLOS, REFERENCIA } from "./app";

let bad = 0;
let total = 0;
const grupos = [
  ...EXEMPLOS.map((g) => ({ nome: g.grupo, pedidos: g.specs })),
  ...REFERENCIA.map((r) => ({ nome: `ref: ${r.titulo}`, pedidos: r.exemplos })),
];
for (const g of grupos) {
  for (const pedido of g.pedidos) {
    for (const item of renderPedidos(pedido)) {
      total++;
      if (item.error) {
        bad++;
        console.log(`✗ [${g.nome}] ${item.spec}: ${item.error}`);
      } else if (item.warnings.length) {
        console.log(`⚠ [${g.nome}] ${item.spec}: ${item.warnings.join("; ")}`);
      }
    }
  }
}
console.log(`${total - bad}/${total} exemplos ok`);
if (bad) process.exit(1);
