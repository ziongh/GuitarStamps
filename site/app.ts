// =============================================================================
//  app.ts — "Gerador de Carimbos" static site
// -----------------------------------------------------------------------------
//  Runs the engine (../src) ENTIRELY in the browser. A "pedido" here is the
//  SAME command language as the CLI — spec words + option flags — parsed by
//  the shared src/cliargs.ts via diagramFromCommand(), so everything the CLI
//  can do, the site can do:
//
//    Bb7(b9) pf jogo6543 --label note --tuning "D,A,D,G,B,E" --scale 1.2
//
//  The pure logic (splitPedidos/renderPedidos) and the example/reference data
//  (EXEMPLOS/REFERENCIA) are exported so test-exemplos.ts can verify every
//  clickable example against the engine at build time.
// =============================================================================
import { diagramFromCommand } from "../src/index";

export interface RenderItem {
  spec: string;
  svg?: string;
  error?: string;
  warnings: string[];
}

/** Split an input into pedidos on commas/newlines — but never inside quotes,
 *  so `--tuning "E,A,D,G,B,E"` stays whole. */
export function splitPedidos(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (const ch of input) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === "," || ch === "\n") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** One or more pedidos -> one diagram each (same semantics as the CLI). */
export function renderPedidos(input: string): RenderItem[] {
  return splitPedidos(input).map((raw) => {
    try {
      const r = diagramFromCommand(raw);
      return { spec: raw, svg: r.svg, warnings: r.warnings };
    } catch (e) {
      return { spec: raw, error: (e as Error).message, warnings: [] };
    }
  });
}

// ---- example gallery (every pedido here is tested by build.sh) --------------
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

// ---- the complete reference (every clickable example is tested too) ---------
export const REFERENCIA: { titulo: string; corpo: string; exemplos: string[] }[] = [
  {
    titulo: "A receita básica",
    corpo: `Um pedido tem a forma <code>ACORDE&nbsp;INVERSÃO&nbsp;JOGO</code>, e a
ordem das palavras depois do acorde não importa. A <b>inversão</b> diz qual nota
fica no baixo: <code>pf</code> (fundamental) · <code>1a</code> (terça) ·
<code>2a</code> (quinta) · <code>3a</code> (sétima) — também servem
<code>root</code>/<code>1st</code>/<code>2nd</code>/<code>3rd</code> e
<code>inv0</code>…<code>inv5</code>. O <b>jogo</b> diz em que cordas:
<code>jogo6543</code> (grave) · <code>jogo5432</code> (média) ·
<code>jogo4321</code> (aguda) — também servem <code>grupo5432</code>,
<code>group5432</code>, <code>row2</code> ou <code>str5</code> (a corda do
baixo). E <code>min7</code> empurra a pegada para a casa 7 ou acima.`,
    exemplos: [
      "C7M pf jogo5432",
      "C7M 3a str4",
      "Cm7 2a row1",
      "C7M pf jogo5432 min10",
    ],
  },
  {
    titulo: "Escrevendo (quase) qualquer acorde",
    corpo: `A cifra é montada por blocos, como você já escreve: qualidade
(<code>m</code>, <code>dim</code>, <code>aug</code>, <code>sus2</code>/<code>sus4</code>),
sexta/sétima (<code>6</code>, <code>7</code>, <code>7M</code>/<code>maj7</code>,
<code>m7</code>, <code>m7b5</code>, <code>dim7</code>, <code>m(maj7)</code>),
extensões (<code>9</code>, <code>11</code>, <code>13</code> — cada uma já inclui
as de baixo), alterações (<code>b5 #5 b9 #9 #11 b13</code>, ou <code>alt</code>
para o dominante alterado), <code>add9</code>/<code>no3</code>… e baixo com
barra: em <code>C/E</code> o baixo é nota do acorde (vira a inversão certa); em
<code>Dm7/G</code> é nota de fora (entra como pedal, abaixo do acorde). Acordes
com mais de 4 notas são reduzidos para as 4 vozes do Drop-2 (mantêm terça,
sétima e a tensão mais colorida). Parênteses são ignorados:
<code>Cm7(b5)</code> = <code>Cm7b5</code>.`,
    exemplos: [
      "Cmaj7#11 pf jogo5432",
      "Bb7alt pf jogo6543",
      "Cm(maj7) pf jogo5432",
      "C13 pf jogo5432",
      "C/E jogo5432",
      "Dm7/G pf jogo6543",
    ],
  },
  {
    titulo: "Os três modos — e trastes ditados na mão",
    corpo: `<code>drop2</code> (padrão para 4 notas) monta o voicing Drop-2 em 4
cordas adjacentes; <code>stacked</code> empilha uma nota por corda a partir da
corda do baixo (bom para muitas notas e para as cordas agudas);
<code>triad</code> desenha tríades em 3 cordas. E se você já sabe a pegada,
dite os trastes com <code>--frets "x x 9 9 9 9"</code> (do grave ao agudo,
<code>x</code> = corda abafada), com a cifra opcional só para os rótulos.`,
    exemplos: [
      "C pf jogo5432 triad",
      "Em 1a str4 triad",
      "Dmaj13 3a row1 stacked",
      '--frets "x x 9 9 9 9" C#m7',
      '--frets "3 x 2 0 1 0" C',
    ],
  },
  {
    titulo: "O que vai escrito nas bolinhas",
    corpo: `Por padrão, cada bolinha mostra o <b>grau</b> (1, 3-, 5, 7M…). Com
<code>--label note</code> mostra o <b>nome da nota</b>; com
<code>--label none</code>, nada. Junto de <code>note</code>, o
<code>--strict</code> mantém a grafia enarmônica rigorosa (E𝄫, C𝄪…) em vez de
simplificar. Também dá para pedir dentro da receita:
<code>labels:note</code>.`,
    exemplos: [
      "C7M pf jogo5432 --label note",
      "Eb7(b9) pf jogo6543 --label note --strict",
      "C7M pf jogo5432 --label none",
    ],
  },
  {
    titulo: "Afinações diferentes",
    corpo: `<code>--tuning "<i>6 notas</i>"</code>, do grave ao agudo. Serve
<code>"D,A,D,G,B,E"</code> (drop D), <code>"D,G,D,G,B,D"</code> (open G)… e,
se quiser fixar as oitavas, <code>"E2,A2,D3,G3,B3,E4"</code>.`,
    exemplos: [
      'C7M pf jogo6543 --tuning "D,A,D,G,B,E"',
      'G7 pf jogo6543 --tuning "D,G,D,G,B,D"',
    ],
  },
  {
    titulo: "Aparência: cores e tamanho",
    corpo: `<code>--accent</code> pinta o anel da nota do baixo;
<code>--ink</code> muda a cor de linhas e bolinhas; <code>--paper</code> pinta
o fundo; <code>--scale</code> multiplica o tamanho do desenho. As cores aceitam
qualquer valor CSS (<code>#1E3A5F</code>, <code>navy</code>…). Para o livro,
deixe as cores padrão — o miolo é impresso em preto.`,
    exemplos: [
      'C7M pf jogo5432 --accent "#C25B40"',
      'C7M pf jogo5432 --ink "#1E3A5F" --paper "#EEF2F7"',
      "C7M pf jogo5432 --scale 1.3",
    ],
  },
  {
    titulo: "Título e subtítulo",
    corpo: `<code>--title "<i>texto</i>"</code> troca o título automático (a
cifra) pelo seu; <code>--no-subtitle</code> esconde o subtítulo (PF, 1ª I…).`,
    exemplos: [
      'C7M pf jogo5432 --title "Meu acorde favorito"',
      "C7M pf jogo5432 --no-subtitle",
    ],
  },
  {
    titulo: "Sobrescrevendo campos da receita",
    corpo: `As opções <code>--inv&nbsp;&lt;n&gt;</code>,
<code>--start&nbsp;&lt;1-6&gt;</code> (corda do baixo),
<code>--mode&nbsp;&lt;drop2|stacked|triad&gt;</code> e
<code>--min&nbsp;&lt;casa&gt;</code> valem o mesmo que as palavras da receita —
úteis para variar um pedido sem reescrevê-lo.`,
    exemplos: [
      "C7M jogo5432 --inv 2 --min 8",
      "C7M pf jogo5432 --start 6",
    ],
  },
  {
    titulo: "No computador: lotes e arquivos (CLI)",
    corpo: `Tudo o que está nesta página funciona igual no terminal — é o mesmo
motor, publicado como o pacote <code>guitarstamps</code>
(<code>bun add github:ziongh/GuitarStamps</code>). Além disso o CLI grava
arquivos: <code>-o saida.svg</code> escolhe o nome;
<code>--batch lista.txt</code> gera um carimbo por linha do arquivo
("pedido&nbsp;=&gt;&nbsp;nome" define o nome de cada um);
<code>--outdir pasta</code> escolhe a pasta e <code>--gallery</code> cria uma
folha de contato <code>index.html</code> com todos. É assim que os carimbos do
livro são gerados em lote.`,
    exemplos: [],
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
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  }

  function render() {
    const items = renderPedidos(entrada.value);
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

  function usar(pedido: string) {
    entrada.value = pedido;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fichas(pedidos: string[]): HTMLElement {
    const lista = document.createElement("div");
    lista.className = "fichas";
    for (const pedido of pedidos) {
      const ficha = document.createElement("button");
      ficha.className = "ficha";
      ficha.textContent = pedido;
      ficha.onclick = () => usar(pedido);
      lista.appendChild(ficha);
    }
    return lista;
  }

  entrada.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 200);
  });

  wordBtn.addEventListener("click", () => {
    const pedidos = splitPedidos(entrada.value);
    const linha = `[[novos-carimbos: ${pedidos.join(", ")} | legenda: ESCREVA A LEGENDA AQUI.]]`;
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
    sec.appendChild(fichas(g.specs));
    galeria.appendChild(sec);
  }

  // ---- complete reference ---------------------------------------------------
  const referencia = $("referencia-corpo");
  for (const r of REFERENCIA) {
    const sec = document.createElement("section");
    sec.className = "grupo-exemplos";
    sec.innerHTML = `<h3>${r.titulo}</h3><p class="corpo-ref">${r.corpo}</p>`;
    if (r.exemplos.length) sec.appendChild(fichas(r.exemplos));
    referencia.appendChild(sec);
  }

  // ?r=Bb7(b9)%20pf%20jogo6543 pre-fills the input (shareable/bookmarkable link)
  entrada.value = new URLSearchParams(location.search).get("r") ?? "C7M pf jogo5432";
  render();
}
