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
export const REFERENCIA: { parte?: string; titulo: string; corpo: string; exemplos: string[] }[] = [
  {
    parte: "Parte 1 · A receita, palavra por palavra",
    titulo: "Como pedir um carimbo — a receita",
    corpo: `Um pedido tem três partes, separadas por espaço — e cada uma é
pura música:
<table>
<tr><th><code>C7M</code></th><th><code>pf</code></th><th><code>jogo5432</code></th></tr>
<tr><td><b>o acorde</b><br>a cifra, como você já escreve</td>
<td><b>a inversão</b><br>qual nota fica no baixo</td>
<td><b>o jogo de cordas</b><br>a região do braço</td></tr>
</table>
<code>C7M pf jogo5432</code> quer dizer "o acorde C7M, com a fundamental no
baixo, nas cordas 5-4-3-2". Só o acorde é obrigatório, e a ordem das palavras
depois dele não importa. Cada parte está explicada com calma nas seções
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
A cifra não sai de uma lista fixa: o gerador monta as notas por teoria, então
quase tudo funciona —
<table>
<tr><th>família</th><th>exemplos</th></tr>
<tr><td>as oito tétrades do método</td><td><code>C7M</code> <code>C7</code> <code>Cm7</code> <code>Cm7(b5)</code> <code>Cdim</code> <code>C6</code> <code>Cm6</code> <code>C7(b9)</code></td></tr>
<tr><td>tríades</td><td><code>C</code> <code>Cm</code> <code>Cdim</code> <code>Caug</code></td></tr>
<tr><td>suspensos (sem a terça) e "power chord"</td><td><code>Csus4</code> <code>C7sus4</code> <code>C5</code></td></tr>
<tr><td>nonas e notas acrescentadas</td><td><code>C9</code> <code>Cadd9</code> <code>C6/9</code></td></tr>
<tr><td>menor com sétima maior</td><td><code>Cm(maj7)</code></td></tr>
<tr><td>alterações, à vontade e em qualquer ordem</td><td><code>C7#5</code> <code>C7b13</code> <code>C7#9</code> <code>Bb7alt</code></td></tr>
</table>
As grafias tradicionais dos songbooks brasileiros também valem, todas:
<table>
<tr><th>você escreve</th><th>o gerador entende</th></tr>
<tr><td><code>C7(9,13)</code></td><td>tensões separadas por vírgula dentro dos parênteses</td></tr>
<tr><td><code>C7/9</code></td><td>barra + número = extensão (C9), não baixo</td></tr>
<tr><td><code>C4</code> · <code>C4/7</code></td><td>suspenso: o 4 no lugar da terça</td></tr>
<tr><td><code>C2</code></td><td>= <code>Cadd9</code></td></tr>
<tr><td><code>C7(b10)</code></td><td>= <code>C7(#9)</code></td></tr>
<tr><td><code>C7/5-</code> · <code>C7/9+</code></td><td>acidente depois do número: 7(♭5), 7(♯9)</td></tr>
<tr><td><code>C7(#4)</code></td><td>= <code>C7(#11)</code></td></tr>
<tr><td><code>Cmi7</code> · <code>Cma7</code></td><td><code>mi</code> = menor, <code>ma</code> = maior</td></tr>
<tr><td><code>Cº</code> · <code>Cø</code> · <code>C∆</code> · <code>C^</code></td><td>os símbolos: dim, m7(♭5), 7M, 7M</td></tr>
<tr><td><code>C(9)</code></td><td>detalhe fino: só a tensão nos parênteses = nona acrescentada <i>sem sétima</i> — diferente de <code>C9</code>, o dominante</td></tr>
</table>
<b>Acorde com mais de 4 notas?</b> O desenho Drop-2 escolhe as 4 vozes mais
importantes (fica com a terça, a sétima e a tensão mais colorida). Se quiser
ver o acorde inteiro, nota por nota, use o modo empilhado — veja a seção
"Os modos de montar o acorde". E com <code>vozes:</code> quem escolhe as
notas é você.
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
    corpo: `É a segunda palavra da receita:
<table>
<tr><th>você escreve</th><th>também vale</th><th>o baixo é a…</th></tr>
<tr><td><code>pf</code></td><td><code>root</code> · <code>inv0</code></td><td><b>fundamental</b> (posição fundamental)</td></tr>
<tr><td><code>1a</code></td><td><code>1st</code> · <code>inv1</code></td><td><b>terça</b></td></tr>
<tr><td><code>2a</code></td><td><code>2nd</code> · <code>inv2</code></td><td><b>quinta</b></td></tr>
<tr><td><code>3a</code></td><td><code>3rd</code> · <code>inv3</code></td><td><b>sétima</b></td></tr>
</table>
(Existem também <code>inv4</code> e <code>inv5</code>, para acordes
empilhados de cinco ou mais notas.)
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
    corpo: `A terceira palavra escolhe as cordas — ou seja, a região do
instrumento:
<table>
<tr><th>jogo</th><th>região</th><th>baixo na…</th><th>também se escreve</th></tr>
<tr><td><code>jogo6543</code></td><td><b>grave</b></td><td>6ª corda</td><td><code>row1</code> · <code>str6</code> · <code>grupo6543</code></td></tr>
<tr><td><code>jogo5432</code></td><td><b>média</b></td><td>5ª corda</td><td><code>row2</code> · <code>str5</code> · <code>grupo5432</code></td></tr>
<tr><td><code>jogo4321</code></td><td><b>aguda</b></td><td>4ª corda</td><td><code>row3</code> · <code>str4</code> · <code>grupo4321</code></td></tr>
</table>
<b>Repare:</b> o Drop-2 precisa de 4 cordas vizinhas, então o baixo só pode
estar na 6ª, 5ª ou 4ª corda. Quer um acorde só nas cordas mais agudas, ou
começando da 3ª corda? Use o modo empilhado (seção "Os modos de montar o
acorde").
<br><br>
<b>E um jogo com salto de corda já diz qual é o voicing</b> — não precisa
escrever o modo:
<table>
<tr><th>jogo com salto</th><th>voicing que ele pede</th></tr>
<tr><td><code>jogo6432</code> · <code>jogo5321</code></td><td><code>drop3</code></td></tr>
<tr><td><code>jogo6421</code></td><td><code>drop24</code> (Drop 2&4)</td></tr>
<tr><td><code>jogo643</code> · <code>jogo532</code> · <code>jogo421</code></td><td><code>aberta</code> (tríade aberta)</td></tr>
</table>
O jogo vale ao pé da letra — as cordas do desenho são exatamente as que você
escreveu. Clique nos exemplos e veja o mesmo acorde caminhar do grave ao
agudo.`,
    exemplos: [
      "C7M pf jogo6543",
      "C7M pf jogo5432",
      "C7M pf jogo4321",
      "C7M pf jogo6432",
      "C7 pf jogo6421",
      "C pf jogo643",
    ],
  },
  {
    parte: "Parte 2 · Esculpindo a pegada",
    titulo: "Os modos de montar o acorde",
    corpo: `O <b>modo</b> é o desenho do voicing — como as vozes se
distribuem pelas cordas. Um mapa rápido, e depois cada um com calma:
<table>
<tr><th>modo</th><th>notas</th><th>cordas</th><th>caráter</th></tr>
<tr><td><code>drop2</code> (padrão)</td><td>4</td><td>4 vizinhas</td><td>a pegada compacta do método</td></tr>
<tr><td><code>drop3</code></td><td>4</td><td>um salto depois do baixo</td><td>mais aberto, comping de jazz</td></tr>
<tr><td><code>drop24</code></td><td>4</td><td>dois saltos (6-4-2-1)</td><td>bem aberto, quase pianístico</td></tr>
<tr><td><code>aberta</code></td><td>3</td><td>um salto depois do baixo</td><td>tríade aberta (spread)</td></tr>
<tr><td><code>triad</code></td><td>3</td><td>3 vizinhas</td><td>tríade fechada</td></tr>
<tr><td><code>stacked</code></td><td>qualquer</td><td>uma nota por corda</td><td>acordes grandes, upper structures</td></tr>
</table>
<b><code>drop2</code></b> (o padrão para acordes de 4 notas) é a
distribuição do método: as quatro vozes em quatro cordas vizinhas, boa de
pegar e de ouvir.
<br><br>
<b><code>drop3</code></b> é o outro voicing clássico da guitarra: o baixo fica
na 6ª ou na 5ª corda, <b>uma corda é pulada</b> (fica abafada), e as três vozes
de cima vêm nas cordas seguintes — os conjuntos <code>jogo6432</code> e
<code>jogo5321</code>.
<br><br>
<b><code>drop24</code></b> (Drop 2&4) é a terceira família clássica: <b>duas
cordas puladas</b> — baixo na 6ª, vozes de cima na 4-2-1, o conjunto
<code>jogo6421</code>.
<br><br>
<b><code>aberta</code></b> desenha a <b>tríade aberta</b> (spread): a voz do
meio sobe uma oitava — o som aberto que todo método de tríades ensina. Jogos
com um salto depois do baixo: <code>jogo643</code>, <code>jogo532</code>,
<code>jogo421</code> (um jogo explícito pode escolher outro espaçamento,
ex.: <code>jogo642</code>).
<br><br>
<b><code>triad</code></b> desenha tríades <i>fechadas</i> — três notas em três
cordas vizinhas. Se a cifra já é uma tríade (<code>C</code>, <code>Em</code>…),
esse modo entra sozinho.
<br><br>
<b><code>stacked</code></b> (empilhado) põe <b>uma nota por corda</b>, subindo
a partir da corda do baixo. Serve para três situações: acordes de cinco ou
mais notas (um C13 inteiro, por exemplo), acordes nas cordas agudas (o
Drop-2 não alcança), e para simplesmente ver todas as notas do acorde no
braço.
<br><br>
<b>Atalho:</b> um jogo com salto já diz o modo (a tabela da seção "O jogo de
cordas") — <code>C7 pf jogo6421</code> já sai em Drop 2&4, sem escrever a
palavra.`,
    exemplos: [
      "C7M pf jogo6432 drop3",
      "G7 pf jogo6432 drop3",
      "C7M 1a jogo5321 drop3",
      "C7 pf jogo6421",
      "C7M 1a jogo6421",
      "C pf jogo643 aberta",
      "D pf jogo532",
      "Em 2a jogo421",
      "Dmaj13 3a row1 stacked",
      "Cmaj9 pf str5 stacked",
      "Dm11 pf str6 stacked",
      "C pf jogo5432 triad",
      "Em pf jogo4321 triad",
      "C5 pf str6",
    ],
  },
  {
    titulo: "vozes: você escolhe os graus",
    corpo: `Por padrão, quem decide quais graus entram no desenho é o
dicionário de acordes (num <code>C9</code>, por exemplo, a quinta fica de
fora do Drop-2). Com <code>vozes:</code> quem decide é <b>você</b>: liste os
graus, separados por vírgula ou ponto (<code>vozes:3,5,b7,9</code> =
<code>vozes:3.5.b7.9</code>).
<br><br>
Serve para o voicing <b>sem fundamental</b> (<code>vozes:3,5,b7,9</code> — o
título ganha PF*, como nos acordes com ♭9), para o <b>shell de jazz</b>
(<code>vozes:1,3,b7</code> em três cordas) e para qualquer redução que o seu
arranjo pedir. Quantos graus com cada modo:
<table>
<tr><th>graus escolhidos</th><th>modos que combinam</th></tr>
<tr><td>3</td><td><code>aberta</code> · <code>triad</code></td></tr>
<tr><td>4</td><td><code>drop2</code> · <code>drop3</code> · <code>drop24</code></td></tr>
<tr><td>qualquer quantidade</td><td><code>stacked</code></td></tr>
</table>
As inversões de um acorde com <code>vozes:</code> seguem a ordem dos graus
empilhados — num voicing sem fundamental, a "PF*" é o empilhamento a partir
do grau mais grave.`,
    exemplos: [
      "C7 pf jogo5432 vozes:3.5.b7.9",
      "C7 pf jogo643 vozes:1.3.b7",
      "C7M pf jogo5432 vozes:1.3.7",
      "C7M pf jogo5432 min5 max10",
    ],
  },
  {
    titulo: "min, max e span: a região do braço e a mão",
    corpo: `Todo desenho sai, por padrão, na posição mais grave possível.
Três palavras mudam isso:
<table>
<tr><th>palavra</th><th>o que faz</th></tr>
<tr><td><code>min7</code></td><td>a <b>mão</b> da casa 7 para cima</td></tr>
<tr><td><code>max10</code></td><td>a mão até a casa 10 (o teto); com <code>min</code>, delimita uma região — <code>min5 max10</code></td></tr>
<tr><td><code>span4</code></td><td><b>abertura máxima da mão</b>: 4 trastes (padrão 6) — para preferir pegadas compactas</td></tr>
</table>
O <code>min</code> e o <code>max</code> valem para os <b>dedos</b>: cordas
soltas (seção seguinte) ficam de fora da conta.
<br><br>
<b>Um detalhe de braço:</b> a mesma pegada só se repete 12 casas acima. Então
o gerador entrega a primeira ocorrência <i>da pegada pedida</i> na casa que
você indicou ou acima dela — C7M pf no jogo 5432 mora na casa 3 e de novo na
15; <code>min8</code> te leva direto à 15. Quer uma posição <i>entre</i> as
duas? É outra inversão que mora lá: no mesmo jogo, as posições de C7M são
pf na casa 3, 1ª na 5, 2ª na 9 e 3ª na 12. (E se pedir uma casa além da
última possível — ou um <code>min</code>+<code>max</code> impossíveis —, o
gerador devolve a pegada mais próxima que existe.)`,
    exemplos: [
      "C7M pf jogo5432",
      "C7M pf jogo5432 min8",
      "C7M 2a jogo5432 min5",
      "C7M pf jogo5432 min12 max20",
      "C7M 1a jogo5432, C7M 2a jogo5432, C7M 3a jogo5432",
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
sem, a mesma harmonia totalmente pisada, na casa 12. E combinar com
<code>min</code>? Pode — o <code>min</code> vale só para os <b>dedos</b>: a
corda solta não conta como posição da mão. <code>E7 pf jogo6543 min7
soltas</code> dá o baixo Mi solto soando grave com a mão lá em cima
(<code>0 14 12 13</code>, a primeira ocorrência na casa 7 ou acima); a janela
do desenho acompanha os dedos, com a solta vazada por cima. (Pegadas
folclóricas que reorganizam as vozes — o Dó aberto, por exemplo — não são
Drop-2: para essas, dite os trastes com <code>--frets</code>, na seção
seguinte.)`,
    exemplos: [
      "E7 pf jogo6543 soltas",
      "A7 pf jogo5432 soltas",
      "D7 pf jogo4321 soltas",
      "E7 pf jogo6543",
      "E7 pf jogo6543 min7 soltas",
      "D7 pf jogo4321 min3 soltas",
    ],
  },
  {
    titulo: "Tudo combina",
    corpo: `As palavras da receita não são gavetas separadas — <b>elas
compõem</b>. Cada modo tem seu número de vozes e seus jogos; todo o resto —
<code>min</code>, <code>max</code>, <code>span</code>, <code>vozes:</code>,
<code>soltas</code>, <code>--janela</code> — funciona com <b>qualquer</b>
modo:
<table>
<tr><th>modo</th><th>vozes</th><th>jogos válidos</th><th>o jogo sozinho já pede o modo?</th></tr>
<tr><td><code>drop2</code> (padrão)</td><td>4</td><td><code>6543</code> <code>5432</code> <code>4321</code></td><td>— (é o padrão)</td></tr>
<tr><td><code>drop3</code></td><td>4</td><td><code>6432</code> <code>5321</code></td><td><b>sim</b></td></tr>
<tr><td><code>drop24</code></td><td>4</td><td><code>6421</code></td><td><b>sim</b></td></tr>
<tr><td><code>aberta</code></td><td>3</td><td><code>643</code> <code>532</code> <code>421</code> (ou outro espaçamento: <code>642</code>, <code>531</code>…)</td><td><b>sim</b></td></tr>
<tr><td><code>triad</code></td><td>3</td><td>3 cordas vizinhas</td><td>—</td></tr>
<tr><td><code>stacked</code></td><td>qualquer</td><td>qualquer jogo</td><td>4 cordas com salto fora dos padrões acima</td></tr>
</table>
E os pratos completos que valem conhecer (clique em cada um):
<table>
<tr><th>combinação</th><th>o que sai</th></tr>
<tr><td><code>min7 soltas</code></td><td>corda solta grave com a mão lá em cima</td></tr>
<tr><td><code>min12 max20</code></td><td>a pegada dentro de uma região delimitada do braço</td></tr>
<tr><td><code>vozes:1.3.b7</code> + jogo de 3 cordas com salto</td><td>o shell de jazz</td></tr>
<tr><td><code>aberta soltas</code></td><td>tríade aberta com corda solta</td></tr>
<tr><td><code>vozes:3.5.b7.9 min7</code></td><td>dominante sem fundamental, subido pelo braço</td></tr>
</table>
Se um pedido for impossível ao pé da letra, o gerador entrega a pegada mais
próxima que existe — nunca um braço vazio.`,
    exemplos: [
      "E7 pf jogo6543 min7 soltas",
      "C7M pf jogo5432 min12 max20",
      "C7 pf jogo643 vozes:1.3.b7",
      "C pf jogo532 aberta soltas",
      "C7 pf jogo5432 vozes:3.5.b7.9 min7",
    ],
  },
  {
    parte: "Parte 3 · Ajustes finos (as opções com --)",
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
    corpo: `<table>
<tr><th>opção</th><th>as bolinhas mostram</th></tr>
<tr><td>(padrão)</td><td>o <b>grau</b> — 1, 3-, 5, 7M… — como o método pensa: você enxerga a <i>função</i> de cada dedo</td></tr>
<tr><td><code>--label note</code></td><td>os <b>nomes das notas</b> (C, E♭, G…): ótimo para o estudo de localização das notas no braço</td></tr>
<tr><td><code>--label none</code></td><td><b>nada</b> — imprima e deixe o aluno preencher, ou use quando o desenho já diz tudo</td></tr>
</table>
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
por vírgula. O gerador recalcula as casas sozinho. Os casos clássicos:
<table>
<tr><th>afinação</th><th>você escreve</th></tr>
<tr><td>drop D</td><td><code>--tuning "D,A,D,G,B,E"</code></td></tr>
<tr><td>open G</td><td><code>--tuning "D,G,D,G,B,D"</code></td></tr>
<tr><td>DADGAD</td><td><code>--tuning "D,A,D,G,A,D"</code></td></tr>
</table>
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
    titulo: "--inv, --start, --mode…: variar sem reescrever",
    corpo: `Tudo o que as palavras da receita dizem também pode ser dito por
opção: <code>--inv 2</code> (inversão), <code>--start 6</code> (corda do
baixo), <code>--mode stacked</code>, <code>--min 8</code>, <code>--max
12</code>, <code>--span 4</code>, <code>--vozes "1,3,b7"</code> e
<code>--open</code> (= <code>soltas</code>). O resultado é o mesmo — a graça
é a comodidade: repita a receita e mude só um número para comparar variações
rapidamente.
<br><br>
Uma opção que só existe como <code>--</code>: <code>--janela 5</code> fixa o
número mínimo de casas desenhadas — dê o mesmo valor a uma fileira de
carimbos e todos saem com a janela da mesma altura, alinhados na página.`,
    exemplos: [
      "C7M jogo5432 --inv 0, C7M jogo5432 --inv 1, C7M jogo5432 --inv 2, C7M jogo5432 --inv 3",
      "C7M pf jogo5432 --start 6",
      "C7M pf jogo5432 --min 8",
      "C7M pf jogo5432 --janela 5",
    ],
  },
  {
    titulo: "Cores e tamanho: --accent, --ink, --paper, --scale",
    corpo: `<b>Para o livro, deixe as cores padrão</b> — o miolo é impresso em
preto, e os carimbos já nascem perfeitos para isso. Mas para um slide, um
post ou uma apostila colorida:
<table>
<tr><th>chave</th><th>muda</th></tr>
<tr><td><code>--accent</code></td><td>a cor do anel que marca a nota do baixo</td></tr>
<tr><td><code>--ink</code></td><td>a cor de linhas e bolinhas</td></tr>
<tr><td><code>--paper</code></td><td>a cor do fundo</td></tr>
<tr><td><code>--scale</code></td><td>o tamanho do desenho inteiro (<code>1</code> = normal)</td></tr>
</table>
As cores aceitam qualquer valor de cor da web: <code>#1E3A5F</code>,
<code>navy</code>, <code>white</code>…`,
    exemplos: [
      'C7M pf jogo5432 --accent "#C25B40"',
      'C7M pf jogo5432 --ink "#1E3A5F" --paper "#EEF2F7"',
      "C7M pf jogo5432 --scale 1.3",
    ],
  },
  {
    parte: "Parte 4 · Do rascunho ao livro",
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
    if (r.parte) {
      const h = document.createElement("p");
      h.className = "parte-ref";
      h.textContent = r.parte;
      referencia.appendChild(h);
    }
    const sec = document.createElement("section");
    sec.className = "grupo-exemplos";
    // corpo may contain <table>, which is not valid inside <p> — use a <div>
    sec.innerHTML = `<h3>${r.titulo}</h3><div class="corpo-ref">${r.corpo}</div>`;
    if (r.exemplos.length) sec.appendChild(fichas(r.exemplos));
    referencia.appendChild(sec);
  }

  // ?r=Bb7(b9)%20pf%20jogo6543 pre-fills the input (shareable/bookmarkable link)
  entrada.value = new URLSearchParams(location.search).get("r") ?? "C7M pf jogo5432";
  render();
}
