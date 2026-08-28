// =============================================================================
//  app.ts — "Gerador de Carimbos" static site (CLAUDE.md §14)
// -----------------------------------------------------------------------------
//  Runs the book's carimbos engine ENTIRELY in the browser (the engine src is
//  dependency-free TypeScript). No backend: the same dist/ works from a local
//  `site.sh` server or from any static host (Azure Blob + Cloudflare).
//
//  The pure logic (renderSpecs + EXEMPLOS) is exported so it can be tested with
//  bun outside a browser; the DOM glue is guarded behind `typeof document`.
// =============================================================================
import { diagramFromSpec } from "../src/index";

export interface RenderItem {
  spec: string;          // as the author typed it (may say "jogo5432")
  svg?: string;
  error?: string;
  warnings: string[];
}

/** "jogo5432" is the author-friendly spelling of the engine token "group5432"
 *  (same convenience as tools/manuscrito/carimbo.sh). */
export function traduz(spec: string): string {
  return spec.replace(/\bjogo(\d{3,4})\b/gi, "group$1");
}

/** One or more specs, separated by commas or newlines -> one diagram each. */
export function renderSpecs(input: string): RenderItem[] {
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      try {
        const r = diagramFromSpec(traduz(raw));
        return { spec: raw, svg: r.svg, warnings: r.warnings };
      } catch (e) {
        return { spec: raw, error: (e as Error).message, warnings: [] };
      }
    });
}

// ---- example gallery (every spec here is tested by build.sh) ----------------
export const EXEMPLOS: { grupo: string; nota: string; specs: string[] }[] = [
  {
    grupo: "As oito tétrades do método",
    nota: "Em posição fundamental, no jogo 5432.",
    specs: [
      "C7M pf jogo5432", "C7 pf jogo5432", "Cm7 pf jogo5432",
      "Cm7(b5) pf jogo5432", "Cdim pf jogo5432", "C6 pf jogo5432",
      "Cm6 pf jogo5432", "C7(b9) pf jogo5432",
    ],
  },
  {
    grupo: "As quatro inversões",
    nota: "pf = fundamental no baixo · 1a = terça · 2a = quinta · 3a = sétima.",
    specs: [
      "C7M pf jogo5432", "C7M 1a jogo5432", "C7M 2a jogo5432", "C7M 3a jogo5432",
    ],
  },
  {
    grupo: "Os três jogos de cordas",
    nota: "O mesmo acorde na região grave, média e aguda.",
    specs: [
      "C7M pf jogo6543", "C7M pf jogo5432", "C7M pf jogo4321",
    ],
  },
  {
    grupo: "Cifras com sustenido e bemol",
    nota: "Escreva # e b colados na letra, sem espaços.",
    specs: [
      "Bb7M pf jogo5432", "F#m7 pf jogo5432", "Eb7(b9) pf jogo6543", "Abm6 2a jogo5432",
    ],
  },
  {
    grupo: "Subindo no braço (min)",
    nota: "Acrescente min + o número da casa para gerar o desenho mais agudo.",
    specs: [
      "C7M pf jogo5432", "C7M pf jogo5432 min7", "C7M pf jogo5432 min10",
    ],
  },
  {
    grupo: "Uma progressão inteira de uma vez",
    nota: "Separe as receitas por vírgula — um 251 em C, Forma 1:",
    specs: [
      "Dm7 pf jogo5432, G7 2a jogo5432, C7M pf jogo5432, C6 2a jogo5432",
    ],
  },
];

// ============================== DOM glue =====================================
declare const navigator: any;
if (typeof document !== "undefined") {
  const $ = (id: string) => document.getElementById(id)!;
  const entrada = $("entrada") as HTMLTextAreaElement;
  const saida = $("saida");
  const wordBtn = $("copiar-word") as HTMLButtonElement;
  const avisoCopia = $("aviso-copia");

  let timer: ReturnType<typeof setTimeout> | undefined;

  function baixarSvg(svg: string, nome: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${nome}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function render() {
    const items = renderSpecs(entrada.value);
    saida.innerHTML = "";
    wordBtn.disabled = !items.some((i) => i.svg);
    if (!items.length) {
      saida.innerHTML =
        '<p class="dica-vazia">Digite uma receita acima — por exemplo <code>C7M pf jogo5432</code> — ou clique num exemplo abaixo.</p>';
      return;
    }
    for (const item of items) {
      const card = document.createElement("div");
      card.className = "carta" + (item.error ? " carta-erro" : "");
      if (item.svg) {
        const fig = document.createElement("div");
        fig.className = "desenho";
        fig.innerHTML = item.svg;
        card.appendChild(fig);
        for (const w of item.warnings) {
          const p = document.createElement("p");
          p.className = "aviso";
          p.textContent = w;
          card.appendChild(p);
        }
        const bar = document.createElement("div");
        bar.className = "carta-acoes";
        const b = document.createElement("button");
        b.textContent = "Baixar SVG";
        b.onclick = () => baixarSvg(item.svg!, slug(item.spec));
        bar.appendChild(b);
        card.appendChild(bar);
      } else {
        card.innerHTML =
          `<p class="erro-titulo">Não entendi “${item.spec}”</p>` +
          `<p class="erro-msg">${(item.error ?? "").replace(/</g, "&lt;")}</p>`;
      }
      saida.appendChild(card);
    }
  }

  entrada.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 200);
  });

  wordBtn.addEventListener("click", () => {
    const specs = entrada.value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const linha = `[[novos-carimbos: ${specs.join(", ")} | legenda: ESCREVA A LEGENDA AQUI.]]`;
    navigator.clipboard?.writeText(linha).then(() => {
      avisoCopia.textContent = "Linha copiada! Cole no Word, complete a legenda e rode /atualizar.";
      setTimeout(() => (avisoCopia.textContent = ""), 6000);
    });
  });

  // ---- example gallery ------------------------------------------------------
  const galeria = $("galeria");
  for (const g of EXEMPLOS) {
    const sec = document.createElement("section");
    sec.className = "grupo-exemplos";
    sec.innerHTML = `<h3>${g.grupo}</h3><p class="grupo-nota">${g.nota}</p>`;
    const lista = document.createElement("div");
    lista.className = "fichas";
    for (const spec of g.specs) {
      const ficha = document.createElement("button");
      ficha.className = "ficha";
      ficha.textContent = spec;
      ficha.onclick = () => {
        entrada.value = spec;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      lista.appendChild(ficha);
    }
    sec.appendChild(lista);
    galeria.appendChild(sec);
  }

  // ?r=Bb7(b9)%20pf%20jogo6543 pre-fills the input (shareable/bookmarkable link)
  entrada.value = new URLSearchParams(location.search).get("r") ?? "C7M pf jogo5432";
  render();
}
