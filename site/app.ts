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

/** Split an input into pedidos on commas/newlines — but never inside quotes
 *  (`--tuning "E,A,D,G,B,E"`) nor inside parentheses (`C7(9,13)`). */
export function splitPedidos(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let paren = 0;
  for (const ch of input) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === "(") {
      paren++;
      cur += ch;
    } else if (ch === ")") {
      paren = Math.max(0, paren - 1);
      cur += ch;
    } else if ((ch === "," && paren === 0) || ch === "\n") {
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
    nota: "Acrescente min + o número da casa para gerar o desenho dali para cima.",
    specs: [
      "C7M pf jogo5432", "C7M pf jogo5432 min8", "C7M 2a jogo5432 min5",
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

// ---- the complete guide (every clickable example is tested at build time) ---
export const REFERENCIA: { titulo: string; corpo: string; exemplos: string[] }[] = [
  {
    titulo: "Como pedir um carimbo — a receita",
    corpo: `Você escreve um pedido em três partes, separadas por espaço:
<b>o acorde</b>, <b>a inversão</b> e <b>o jogo de cordas</b> — por exemplo,
<code>C7M pf jogo5432</code> quer dizer "o acorde C7M, com a fundamental no
baixo, nas cordas 5-4-3-2". A ordem das palavras depois do acorde não importa,
e só o acorde é obrigatório. Cada parte está explicada com calma nas seções
abaixo — e tudo o que começa com <code>--</code> é um ajuste fino opcional.`,
    exemplos: [
      "C7M pf jogo5432",
      "Bb7(b9) 2a jogo6543",
      "F#m7 1a jogo4321",
    ],
  },
  {
    titulo: "O acorde: escreva a cifra como você já escreve",
    corpo: `A primeira palavra é a cifra, <b>sem espaços dentro dela</b>.
Sustenido é <code>#</code> e bemol é <code>b</code>, colados na letra:
<code>F#m7</code>, <code>Bb7M</code>. Parênteses são opcionais —
<code>Cm7(b5)</code> e <code>Cm7b5</code> são o mesmo acorde.
<br><br>
Funcionam as oito tétrades do método (<code>C7M</code>, <code>C7</code>,
<code>Cm7</code>, <code>Cm7(b5)</code>, <code>Cdim</code>, <code>C6</code>,
<code>Cm6</code>, <code>C7(b9)</code>) e muito mais: tríades
(<code>C</code>, <code>Cm</code>, <code>Cdim</code>, <code>Caug</code>),
acordes suspensos — sem a terça — (<code>Csus4</code>, <code>C7sus4</code>),
o "power chord" (<code>C5</code>), acordes com nona
(<code>C9</code>, <code>Cadd9</code>), com sexta e nona (<code>C6/9</code>),
menor com sétima maior (<code>Cm(maj7)</code>), alterações
(<code>C7#5</code>, <code>C7b13</code>, <code>C7#9</code>,
<code>Bb7alt</code>)…
<br><br>
As grafias tradicionais dos songbooks brasileiros também valem:
<code>C7(9,13)</code> com vírgula dentro dos parênteses,
<code>C7/9</code> com a barra indicando extensão, <code>C4</code> e
<code>C4/7</code> (suspensos), <code>C2</code> (= add9),
<code>C7(b10)</code> (= 7♯9), os acidentes depois do número —
<code>C7/5-</code>, <code>C7/9+</code> —, <code>C7(#4)</code> (= ♯11),
<code>Cmi7</code>/<code>Cma7</code>, e os símbolos <code>Cº</code>,
<code>Cø</code>, <code>C∆</code> e <code>C^</code>. Detalhe fino:
<code>C(9)</code>, só com a tensão entre parênteses, é o acorde <i>com nona
acrescentada e sem sétima</i> — diferente de <code>C9</code>, que é o
dominante.
<br><br>
<b>Acorde com mais de 4 notas?</b> O desenho Drop-2 escolhe as 4 vozes mais
importantes (fica com a terça, a sétima e a tensão mais colorida). Se quiser
ver o acorde inteiro, nota por nota, use o modo empilhado — veja a seção
"Os três modos".
<br><br>
<b>Baixo com barra:</b> em <code>C/E</code> o baixo (E) é nota do acorde,
então o desenho vira a inversão certa; em <code>Dm7/G</code> o baixo (G) é
nota de fora, então ele entra como uma nota a mais, embaixo de tudo — o
famoso baixo pedal.`,
    exemplos: [
      "C7(9,13) pf jogo5432",
      "C7/9 pf jogo5432",
      "C4/7 pf jogo5432",
      "C2 pf jogo5432",
      "C7(b10) pf jogo6543",
      "C7/5- pf jogo5432",
      "C(9) pf jogo5432",
      "Cmi7 pf jogo5432",
      "Csus4 pf jogo5432",
      "C7sus4 pf jogo5432",
      "Cadd9 pf jogo5432",
      "C6/9 pf jogo5432",
      "Cm(maj7) pf jogo5432",
      "C7#5 pf jogo5432",
      "Bb7alt pf jogo6543",
      "C/E jogo5432",
      "Dm7/G pf jogo6543",
    ],
  },
  {
    titulo: "A inversão: qual nota fica no baixo",
    corpo: `É a segunda palavra da receita. <code>pf</code> deixa a
<b>fundamental</b> no baixo (posição fundamental); <code>1a</code> deixa a
<b>terça</b>; <code>2a</code>, a <b>quinta</b>; <code>3a</code>, a
<b>sétima</b>. Quem preferir pode escrever <code>root</code>,
<code>1st</code>, <code>2nd</code>, <code>3rd</code> — ou
<code>inv0</code> a <code>inv5</code> (os números altos servem para acordes
empilhados de cinco ou mais notas).
<br><br>
<b>Para que serve?</b> É o coração do método: clique nos quatro exemplos
abaixo, um por um, e veja o mesmo C7M mudar de desenho conforme a nota do
baixo — são as quatro posições que o livro encadeia nas Formas 1 a 4.`,
    exemplos: [
      "C7M pf jogo5432",
      "C7M 1a jogo5432",
      "C7M 2a jogo5432",
      "C7M 3a jogo5432",
      "C13 inv4 str6 stacked",
    ],
  },
  {
    titulo: "O jogo de cordas: em que região do braço",
    corpo: `A terceira palavra escolhe as quatro cordas do Drop-2 — ou seja,
a região do instrumento: <code>jogo6543</code> é a região <b>grave</b> (baixo
na 6ª corda), <code>jogo5432</code> a <b>média</b> (baixo na 5ª) e
<code>jogo4321</code> a <b>aguda</b> (baixo na 4ª). Também servem
<code>grupo5432</code>, <code>row2</code> (fileira 2 = mesmo jogo) e
<code>str5</code> (a corda do baixo, diretamente).
<br><br>
<b>Repare:</b> o Drop-2 precisa de 4 cordas vizinhas, então o baixo só pode
estar na 6ª, 5ª ou 4ª corda. Quer um acorde só nas cordas mais agudas, ou
começando da 3ª corda? Use o modo empilhado (seção "Os três modos").
Clique nos três exemplos e veja o mesmo acorde caminhar do grave ao agudo.`,
    exemplos: [
      "C7M pf jogo6543",
      "C7M pf jogo5432",
      "C7M pf jogo4321",
    ],
  },
  {
    titulo: "min: subir a pegada pelo braço",
    corpo: `Todo desenho sai, por padrão, na posição mais grave possível.
Acrescente <code>min</code> + o número de qualquer casa — <code>min5</code>,
<code>min8</code>, <code>min12</code>… — para pedir "desta casa para cima".
<br><br>
<b>Um detalhe de braço:</b> a mesma pegada só se repete 12 casas acima. Então
o gerador entrega a primeira ocorrência <i>da pegada pedida</i> na casa que
você indicou ou acima dela — C7M pf no jogo 5432 mora na casa 3 e de novo na
15; <code>min8</code> te leva direto à 15. Quer uma posição <i>entre</i> as
duas? É outra inversão que mora lá: no mesmo jogo, as posições de C7M são
pf na casa 3, 1ª na 5, 2ª na 9 e 3ª na 12. (E se pedir uma casa além da
última possível, o gerador devolve a mais alta que existe.)`,
    exemplos: [
      "C7M pf jogo5432",
      "C7M pf jogo5432 min8",
      "C7M 2a jogo5432 min5",
      "C7M 1a jogo5432, C7M 2a jogo5432, C7M 3a jogo5432",
    ],
  },
  {
    titulo: "Os modos de montar o acorde",
    corpo: `<b><code>drop2</code></b> (o padrão para acordes de 4 notas) é a
distribuição do método: as quatro vozes em quatro cordas vizinhas, boa de
pegar e de ouvir.
<br><br>
<b><code>stacked</code></b> (empilhado) põe <b>uma nota por corda</b>, subindo
a partir da corda do baixo. Serve para três situações: acordes de cinco ou
mais notas (um C13 inteiro, por exemplo), acordes nas cordas agudas (o
Drop-2 não alcança), e para simplesmente ver todas as notas do acorde no
braço.
<br><br>
<b><code>drop3</code></b> é o outro voicing clássico da guitarra: o baixo fica
na 6ª ou na 5ª corda, <b>uma corda é pulada</b> (fica abafada), e as três vozes
de cima vêm nas cordas seguintes — os conjuntos <code>jogo6432</code> e
<code>jogo5321</code>. Sonoridade mais aberta que o Drop-2, muito usada em
comping de jazz.
<br><br>
<b><code>triad</code></b> desenha tríades — três notas em três cordas. Se a
cifra já é uma tríade (<code>C</code>, <code>Em</code>…), esse modo entra
sozinho.`,
    exemplos: [
      "C7M pf jogo6432 drop3",
      "G7 pf jogo6432 drop3",
      "C7M 1a jogo5321 drop3",
      "Dmaj13 3a row1 stacked",
      "Cmaj9 pf str5 stacked",
      "Dm11 pf str6 stacked",
      "C pf jogo5432 triad",
      "Em pf jogo4321 triad",
      "C5 pf str6",
    ],
  },
  {
    titulo: "Cordas soltas: a palavra soltas",
    corpo: `Por padrão, toda pegada sai <b>totalmente pisada</b> — sem cordas
soltas — porque assim ela é transponível para as 12 tonalidades, que é a
filosofia do método. Mas às vezes você quer justamente o acorde aberto da
primeira posição: acrescente a palavra <code>soltas</code> (ou a opção
<code>--open</code>) e o gerador usa cordas soltas quando elas deixam a
pegada mais grave. No desenho, a corda solta aparece como bolinha
<b>vazada</b> acima da pestana; as pisadas continuam cheias.
<br><br>
Compare o E7: com <code>soltas</code> sai o clássico da primeira posição;
sem, a mesma harmonia totalmente pisada, na casa 12. (Pegadas folclóricas
que reorganizam as vozes — o Dó aberto, por exemplo — não são Drop-2: para
essas, dite os trastes com <code>--frets</code>, na seção seguinte.)`,
    exemplos: [
      "E7 pf jogo6543 soltas",
      "A7 pf jogo5432 soltas",
      "D7 pf jogo4321 soltas",
      "E7 pf jogo6543",
    ],
  },
  {
    titulo: "--frets: você dita a pegada, casa por casa",
    corpo: `Já tem a pegada na mão e só quer o desenho bonito dela? Dite os
trastes com <code>--frets "…"</code>: <b>seis valores, da corda mais grave
para a mais aguda</b>, entre aspas. Número = casa; <code>0</code> = corda
solta; <code>x</code> = corda que não toca. A cifra é opcional — se você a
escrever, o desenho ganha título e os números dos graus nas bolinhas.
<br><br>
<b>Para que serve?</b> Pegadas clássicas que não são Drop-2 (o Dó aberto da
primeira posição), um voicing seu que o gerador não montaria sozinho, ou
qualquer diagrama avulso para uma apostila.`,
    exemplos: [
      '--frets "x 3 2 0 1 0" C --title "Dó aberto"',
      '--frets "x x 9 9 9 9" C#m7',
      '--frets "3 x 2 0 1 0" C',
    ],
  },
  {
    titulo: "--label e --strict: o que está escrito nas bolinhas",
    corpo: `Por padrão cada bolinha mostra o <b>grau</b> — 1, 3-, 5, 7M… — que
é como o método pensa (você enxerga a <i>função</i> de cada dedo).
<br><br>
<b><code>--label note</code></b> troca pelos <b>nomes das notas</b> (C, E♭,
G…): ótimo para o estudo de localização das notas no braço.
<b><code>--label none</code></b> deixa as bolinhas vazias — imprima e deixe
o aluno preencher, ou use quando o desenho já diz tudo.
<br><br>
Junto de <code>note</code>, o <b><code>--strict</code></b> mantém a grafia
enarmônica <i>teórica</i>: o Abm7 mostra C♭ (a terça menor de A♭ de
verdade), em vez de simplificar para B. Perfeito para a parte do livro que
ensina enarmonia. Também dá para pedir dentro da receita, com
<code>labels:note</code>.`,
    exemplos: [
      "C7M pf jogo5432 --label note",
      "Abm7 pf jogo5432 --label note --strict",
      "Abm7 pf jogo5432 --label note",
      "C7M pf jogo5432 --label none",
      "Eb7(b9) pf jogo6543 labels:note",
    ],
  },
  {
    titulo: "--tuning: violão em outra afinação",
    corpo: `<code>--tuning "…"</code> muda a afinação do instrumento: seis
notas, <b>da corda mais grave para a mais aguda</b>, entre aspas e separadas
por vírgula. O gerador recalcula as casas sozinho.
<br><br>
Casos clássicos: <b>drop D</b> (<code>"D,A,D,G,B,E"</code>), <b>open G</b>
(<code>"D,G,D,G,B,D"</code>), <b>DADGAD</b> (<code>"D,A,D,G,A,D"</code>).
Se precisar fixar as oitavas exatas de cada corda, escreva-as junto:
<code>"E2,A2,D3,G3,B3,E4"</code>.`,
    exemplos: [
      'C7M pf jogo6543 --tuning "D,A,D,G,B,E"',
      'G7 pf jogo6543 --tuning "D,G,D,G,B,D"',
      'C7M pf jogo6543 --tuning "D,A,D,G,A,D"',
    ],
  },
  {
    titulo: "--title e --no-subtitle: o texto em cima do desenho",
    corpo: `O título automático é a cifra, e o subtítulo é a inversão (PF,
1ª I…). <code>--title "…"</code> troca o título pelo seu texto — o nome de
uma forma, o número de um exercício, um apelido do acorde.
<code>--no-subtitle</code> esconde o subtítulo, para uma prancha mais limpa
ou quando a informação seria repetida na legenda do livro.`,
    exemplos: [
      'C7M pf jogo5432 --title "Forma 1 — primeiro acorde"',
      "C7M pf jogo5432 --no-subtitle",
      'Eb7M pf jogo4321 --title "Upper Structure de Cm7"',
    ],
  },
  {
    titulo: "--inv, --start, --mode, --min: variar sem reescrever",
    corpo: `Tudo o que as palavras da receita dizem também pode ser dito por
opção: <code>--inv 2</code> (inversão), <code>--start 6</code> (corda do
baixo), <code>--mode stacked</code> e <code>--min 8</code>. O resultado é o
mesmo — a graça é a comodidade: repita a receita e mude só um número para
comparar variações rapidamente.`,
    exemplos: [
      "C7M jogo5432 --inv 0, C7M jogo5432 --inv 1, C7M jogo5432 --inv 2, C7M jogo5432 --inv 3",
      "C7M pf jogo5432 --start 6",
      "C7M pf jogo5432 --min 8",
    ],
  },
  {
    titulo: "Cores e tamanho: --accent, --ink, --paper, --scale",
    corpo: `<b>Para o livro, deixe as cores padrão</b> — o miolo é impresso em
preto, e os carimbos já nascem perfeitos para isso. Mas para um slide, um
post ou uma apostila colorida: <code>--accent</code> pinta o anel que marca a
nota do baixo; <code>--ink</code> muda a cor de linhas e bolinhas;
<code>--paper</code> pinta o fundo; e <code>--scale</code> aumenta ou diminui
o desenho inteiro (<code>1</code> é o tamanho normal). As cores aceitam
qualquer valor de cor da web: <code>#1E3A5F</code>, <code>navy</code>,
<code>white</code>…`,
    exemplos: [
      'C7M pf jogo5432 --accent "#C25B40"',
      'C7M pf jogo5432 --ink "#1E3A5F" --paper "#EEF2F7"',
      "C7M pf jogo5432 --scale 1.3",
    ],
  },
  {
    titulo: "Várias receitas de uma vez",
    corpo: `Separe receitas por <b>vírgula</b> (ou uma por linha) e os
desenhos saem lado a lado — perfeito para comparar e para montar progressões.
Experimente: um 251 em Dó completo, as quatro inversões em fila, o mesmo
acorde nos três jogos. E o botão <b>"Copiar linha para o Word"</b> leva a
fila inteira de uma vez para o livro.`,
    exemplos: [
      "Dm7 pf jogo5432, G7 2a jogo5432, C7M pf jogo5432, C6 2a jogo5432",
      "C7M pf jogo5432, C7M 1a jogo5432, C7M 2a jogo5432, C7M 3a jogo5432",
      "C7M pf jogo6543, C7M pf jogo5432, C7M pf jogo4321",
    ],
  },
  {
    titulo: "No computador: gerar em lote (para quem cuida do livro)",
    corpo: `Tudo desta página funciona igual no terminal — é o mesmo motor,
publicado no npm como o pacote <code>guitarstamps</code>. Sem instalar nada:
<code>bunx guitarstamps "C7M pf jogo5432"</code> gera o arquivo SVG na pasta
atual; para instalar de vez, <code>bun add guitarstamps</code> (ou
<code>npm i guitarstamps</code>). No terminal ele também
grava arquivos: <code>-o nome.svg</code> escolhe o nome do arquivo;
<code>--batch lista.txt</code> lê um pedido por linha (opções valem por
linha; escreva <code>pedido =&gt; nome</code> para nomear cada arquivo);
<code>--outdir pasta</code> escolhe a pasta; e <code>--gallery</code> cria
uma folha de contato com todos os desenhos. No livro, quem faz esse trabalho
é o Claude, no <code>/atualizar</code> — você só precisa da linha
<code>[[novos-carimbos: …]]</code> no Word.`,
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
