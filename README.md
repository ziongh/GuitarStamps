# carimbos

Uma pequena ferramenta que **desenha carimbos de acordes** (aqueles diagramas de
braço que vão no seu método) **a partir da teoria** — não na mão, um por um.

Você pede em linguagem de músico — *"a 3ª inversão de C♯m7 com o baixo na 4ª
corda"* — e a ferramenta calcula o **Drop-2** correto e devolve um diagrama
limpo, em alta qualidade, pronto para o livro.

> **Para quem é este manual.** Ele parte do princípio de que você domina
> harmonia e o violão/guitarra (Drop-2, inversões, tensões, encordoamento — esse
> vocabulário é seu). O que ele **não** pressupõe é qualquer familiaridade com
> computador "por dentro": terminal, comandos, instalação de programas. Tudo
> isso está explicado aqui do zero, com paciência. Se uma seção falar de algo que
> você já sabe, pule sem dó.

---

## Índice

1. [O que esta ferramenta faz](#1-o-que-esta-ferramenta-faz)
2. [Três palavras de "informática" antes de começar](#2-três-palavras-de-informática-antes-de-começar)
3. [Instalação (uma única vez)](#3-instalação-uma-única-vez)
4. [Abrindo o terminal na pasta certa](#4-abrindo-o-terminal-na-pasta-certa)
5. [Seu primeiro carimbo](#5-seu-primeiro-carimbo)
6. [A linguagem do pedido (a parte musical)](#6-a-linguagem-do-pedido-a-parte-musical)
7. [Escrevendo (quase) qualquer acorde](#7-escrevendo-quase-qualquer-acorde)
8. [Como a ferramenta monta as vozes](#8-como-a-ferramenta-monta-as-vozes)
9. [Gerando o método inteiro de uma vez](#9-gerando-o-método-inteiro-de-uma-vez)
10. [O estilo de desenho (pt-BR)](#10-o-estilo-de-desenho-pt-br)
11. [Transformando os SVGs em PDF/PNG para imprimir](#11-transformando-os-svgs-em-pdfpng-para-imprimir)
12. [Tabela de todas as opções](#12-tabela-de-todas-as-opções)
13. [Quando algo dá errado](#13-quando-algo-dá-errado)

---

## 1. O que esta ferramenta faz

Pense nela como uma **máquina de carimbos**. Você diz o acorde, a inversão e em
que corda quer o baixo; ela responde com o diagrama do braço — as bolinhas nos
trastes certos, os números dos dedos/graus, o nome do acorde por cima.

- **Motor de vozes** — transforma *cifra + inversão + corda do baixo* em
  posições reais no braço. Faz **Drop-2** (o padrão), além de modos
  *empilhado*, *tríade* e *manual*.
- **Estilo de desenho em pt-BR** — o estilo **método** (cifragem brasileira:
  braço cinza, número do traste, notação `7M`/`7`/`3-`, legenda das vozes). Por
  ora a ferramenta gera **só em português** — nada de notação ou texto em inglês.
- **Sem complicação de instalação** — depende de um único programa gratuito
  (o [Bun](https://bun.sh)). Nada de "instalar mil coisas".

O resultado sai como **arquivo SVG** — um formato de imagem que **não perde
qualidade por mais que você amplie**, ideal para diagramação e impressão (entra
direto no InDesign, Affinity, Inkscape, LaTeX). Na [seção 11](#11-transformando-os-svgs-em-pdfpng-para-imprimir)
explico como virar PDF ou PNG, se você preferir.

---

## 2. Três palavras de "informática" antes de começar

Só três conceitos, e você já navega o resto do manual sem se perder.

**Terminal** (ou "prompt de comando"). É uma janelinha onde, em vez de clicar em
botões, você **digita uma ordem e aperta Enter**. Parece antiquado, mas é só
isso: uma linha onde você escreve o que quer e o computador obedece. Toda esta
ferramenta funciona dentro do terminal.

**Pasta** (ou "diretório"). É a mesma pasta que você já conhece do Finder (Mac)
ou do Explorador de Arquivos (Windows) — um lugar onde ficam arquivos. A
ferramenta mora numa pasta chamada `carimbos`, e é **de dentro dela** que você
vai dar os comandos.

**Comando**. É a frase que você digita no terminal. Os comandos desta ferramenta
quase sempre começam com `bun run cli.ts` e terminam com seu pedido entre aspas.
Por exemplo:

```
bun run cli.ts "C7M pf row2"
```

Lê-se: *"Bun, rode o arquivo `cli.ts` com o pedido: C maior com sétima maior, na
posição fundamental, com o baixo na 5ª corda."* Você aperta Enter e o diagrama é
gerado. Só isso. O resto deste manual é, em essência, aprender a escrever a parte
entre aspas — e essa parte é pura música.

> **Dica de leitura.** Sempre que você vir um bloco assim, em fonte de máquina de
> escrever, é **algo para digitar no terminal**. Digite exatamente como está (as
> aspas fazem parte) e aperte Enter.

---

## 3. Instalação (uma única vez)

A ferramenta precisa de **um** programa gratuito chamado **Bun**. Você instala
uma vez e nunca mais pensa nisso. Bun é quem entende e executa os comandos —
como um motor que você liga uma vez.

### Passo 1 — abra o terminal

- **No Mac:** abra o aplicativo **Terminal** (está em *Aplicativos → Utilitários*,
  ou aperte `Cmd + Espaço`, digite "Terminal" e dê Enter).
- **No Windows:** aperte a tecla do Windows, digite **PowerShell**, e abra o
  *Windows PowerShell*.

### Passo 2 — cole o comando de instalação

- **No Mac:** digite (ou cole) a linha abaixo e aperte Enter:

  ```
  curl -fsSL https://bun.sh/install | bash
  ```

- **No Windows:** digite (ou cole) a linha abaixo e aperte Enter:

  ```
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```

O terminal vai mostrar várias linhas de texto enquanto instala. Isso é normal —
espere terminar.

### Passo 3 — feche e reabra o terminal

Feche a janela do terminal e abra de novo (isso faz o computador "perceber" que o
Bun chegou). Para confirmar que deu certo, digite:

```
bun --version
```

Se aparecer um número (algo como `1.3.1`), está tudo pronto. 🎉
(Esta ferramenta foi testada no Bun 1.3.)

---

## 4. Abrindo o terminal na pasta certa

Todo comando precisa ser dado **de dentro da pasta `carimbos`** — senão o
computador não acha o arquivo `cli.ts`. Há um jeito fácil de garantir isso:

- **No Mac:** abra a pasta `carimbos` no Finder, **clique com o botão direito**
  sobre ela e escolha **"Novo Terminal na pasta"**. (Se essa opção não aparecer,
  abra o Terminal, digite `cd ` — com um espaço depois — e então **arraste a
  pasta `carimbos` para dentro da janela do terminal** e aperte Enter.)

- **No Windows:** abra a pasta `carimbos` no Explorador de Arquivos, **clique com
  o botão direito** num espaço vazio e escolha **"Abrir no Terminal"**.

Pronto: a partir daí, a janela do terminal já está "dentro" da pasta certa, e
todos os comandos das próximas seções vão funcionar.

> **Como saber se estou na pasta certa?** Digite `ls` (Mac) ou `dir` (Windows) e
> aperte Enter: deve aparecer uma lista com `cli.ts`, `README.md`, `src`, etc.
> Se aparecer, você está no lugar certo.

---

## 5. Seu primeiro carimbo

Com o terminal aberto na pasta `carimbos`, digite:

```
bun run cli.ts "C#m7 3rd str4"
```

Tradução do pedido: *C♯ menor com sétima, **3ª inversão** (baixo na 7ª), com esse
baixo na **4ª corda**.* A ferramenta responde algo como:

```
✓ gravado: csharpm7_3rd_str4.svg
```

Esse `✓ gravado: ...` quer dizer: **"pronto, gravei o arquivo de imagem"**. O nome
do arquivo (`csharpm7_3rd_str4.svg`) foi montado a partir do seu pedido, e ele
foi salvo **dentro da própria pasta `carimbos`**.

### Onde está o arquivo, e como vejo a imagem?

Abra a pasta `carimbos` no Finder/Explorador. O arquivo `.svg` estará lá. Para
**ver** o desenho, clique duas vezes nele — ele abre no navegador (Chrome,
Safari, Edge), que mostra imagens SVG nativamente.

### Escolhendo o nome / o lugar do arquivo

Você pode mandar a ferramenta salvar com o nome e na pasta que quiser, com a
opção `-o` ("output", saída):

```
bun run cli.ts "Gmaj7 2nd str5" -o figuras/gmaj7_2a.svg
```

Isso salva o diagrama como `gmaj7_2a.svg` dentro de uma pasta `figuras` (ela é
criada sozinha se não existir). Organizar os arquivos em pastas assim ajuda
bastante quando o método cresce.

---

## 6. A linguagem do pedido (a parte musical)

Aqui mora o coração da ferramenta. Tudo o que vai **entre as aspas** é um pedido
escrito numa pequena "linguagem". A ordem dos pedaços é flexível; separe-os por
espaço:

```
"<acorde> [inversão] [corda do baixo] [modo] [traste mínimo] [rótulos] [estilo]"
```

Só o **acorde** é obrigatório. Os demais campos têm padrões sensatos.

| campo            | exemplos                                   | o que significa |
|------------------|--------------------------------------------|-----------------|
| **acorde**       | `C7M` · `Cm7b5` · `C13#11` · `Bb7alt` · `C/G` | a cifra, sem espaços (veja a [seção 7](#7-escrevendo-quase-qualquer-acorde)) |
| **inversão**     | `pf` · `1a` · `2a` · `3a` | qual nota do acorde fica no baixo (`pf` = posição fundamental) |
| **corda do baixo** | `str5` · `row2` · `group5432` | em que corda mora o **baixo** |
| **modo**         | `drop2` (padrão) · `stacked` · `triad` | como as vozes são distribuídas (veja [seção 8](#8-como-a-ferramenta-monta-as-vozes)) |
| **traste mínimo** | `min7` | empurra a pegada para cima, a partir do 7º traste |
| **rótulos**      | `labels:degree` (padrão) · `labels:note` · `labels:none` | o que vai escrito dentro das bolinhas |
| **estilo**       | `method` (padrão) | o visual do desenho — por ora só o pt-BR (veja [seção 10](#10-o-estilo-de-desenho-pt-br)) |

### Inversão — qual nota está no baixo

| você escreve            | baixo é a... |
|-------------------------|--------------|
| `pf` (ou `root`, `inv0`) | fundamental |
| `1a` (ou `1st`, `inv1`)  | 3ª |
| `2a` (ou `2nd`, `inv2`)  | 5ª |
| `3a` (ou `3rd`, `inv3`)  | 7ª |

### Corda do baixo — três formas de dizer a mesma coisa

Um Drop-2 ocupa **4 cordas adjacentes**. Você pode indicar onde ele fica de três
jeitos equivalentes — use o que for mais natural para você:

| "fileira" | grupo de cordas | baixo na corda |
|-----------|-----------------|----------------|
| `row1`    | `group6543`     | 6ª |
| `row2`    | `group5432`     | 5ª |
| `row3`    | `group4321`     | 4ª |

Ou seja, `row2`, `group5432` e `str5` apontam todos para o mesmo conjunto (baixo
na 5ª corda). Como o Drop-2 precisa de mais três cordas **acima** do baixo, as
cordas de baixo válidas são a **6ª, 5ª ou 4ª**.

### Exemplos para você experimentar

```
bun run cli.ts "C7M pf row2"        # C7M na fundamental, baixo na 5ª corda
bun run cli.ts "C7M 1a row2"        # C7M, 1ª inversão  ->  x 7 9 5 8 x
bun run cli.ts "Bb7 1a row2"        # B♭7, 1ª inversão
bun run cli.ts "Em7b5 2a row1"      # Em7(♭5), 2ª inversão, baixo na 6ª corda
bun run cli.ts "Bb7b9 pf row3"      # B♭7(♭9), baixo na 4ª corda (PF sem fundamental)
bun run cli.ts "C6 3a group5432"    # C6, 3ª inversão
```

---

## 7. Escrevendo (quase) qualquer acorde

A cifra **não** sai de uma lista fixa: ela é interpretada **por composição**. Ou
seja, você junta os blocos abaixo na ordem que quiser, e a ferramenta calcula as
notas a partir dos primeiros princípios. Funciona para jazz, clássico, popular —
qualquer harmonia.

**Fundamental** — A a G com qualquer alteração: `C` `F#` `Bb` `G##` `Dbb`.

**Qualidade básica**

| escreve | acorde |
|---|---|
| `C` | tríade maior |
| `Cm` `Cmin` `C-` | menor |
| `Cdim` `C°` · `Caug` `C+` | diminuto · aumentado |
| `Csus2` `Csus4` `Csus` | suspenso (`sus` = sus4) |
| `C5` | *power chord* (fundamental + 5ª, sem 3ª) |

**Sextas e sétimas**

| escreve | acorde |
|---|---|
| `C6` `Cm6` | com sexta |
| `C7` | dominante · `Cmaj7` `CM7` `C7M` `CΔ` sétima maior |
| `Cm7` · `Cm7b5` `Cø` · `Cdim7` `C°7` | menor c/ 7ª · meio-diminuto · diminuto c/ 7ª |
| `CmMaj7` `Cm(maj7)` | menor com sétima maior |

**Extensões** (cada uma já implica a 7ª e as extensões ímpares abaixo dela):
`C9` `C11` `C13` · `Cmaj9` `Cmaj13` · `Cm9` `Cm11` `Cm13` · `C6/9` `Cm6/9`

**Alterações** — empilhe quantas quiser, em qualquer ordem: `b5 #5 b9 #9 #11 b13`
→ `C7b9` · `C7#5` · `C13#11` · `C7#5#9` · `Cmaj7#11`. Já `Calt` / `C7alt` é o
dominante totalmente alterado (♭9 ♯9 ♯11 ♭13).

**Notas a acrescentar / omitir**: `add9 add11 add13 add2 add4 add6` e
`no3 no5 omit3 omit5` → `Cadd9`, `Cmaj7add13`, `C7no5`. Parênteses são ignorados,
então `Cm(maj7)` e `C7(b9)` funcionam.

**Acordes com baixo (barra)** — escreva `/nota` no fim:

- baixo que **é nota do acorde** → vira aquela **inversão**: `C/E` `Cmaj7/B` `G/B`
- baixo que **não é nota do acorde** (pedal) → entra como a **nota mais grave**:
  `C/D` `Dm7/G` `F/G`

> **Algumas convenções, para o resultado ser previsível:** uma extensão implica
> tudo abaixo dela (`13` ⇒ 7, 9, 13); a 11 natural é omitida de acordes com 3ª
> maior (porque ela bate com a 3ª), a menos que você escreva o próprio acorde de
> 11 ou peça `#11`; o dominante alterado abre mão da 5ª natural. Quando um acorde
> tem **mais de 4 notas**, o Drop-2 mantém a 3ª, a 7ª e a tensão de cima (a regra
> de redução é editável — veja [Personalização](#personalização)); o modo
> *stacked* distribui mais notas por mais cordas.

---

## 8. Como a ferramenta monta as vozes

### Drop-2 (o padrão)

Um Drop-2 é a pegada compacta de 4 notas em 4 cordas adjacentes que você já usa
todo dia. A **inversão** diz qual nota está no baixo; a **corda do baixo** diz
onde essa nota mora. A ferramenta então procura a forma mais compacta e mais
grave que seja tocável (e `min<n>` empurra tudo neck acima, se você quiser a
pegada numa região mais aguda).

```
C#m7 3rd str4   ->   x x 9 9 9 9     (baixo ♭7 = B na 4ª corda)
G7   pf  str6   ->   3 5 3 4 x x     (baixo 1  = G na 6ª corda)
```

### Acordes estendidos (9 / 11 / 13 / alterados)

Drop-2 é uma técnica de 4 vozes, então esses acordes são **reduzidos a quatro
notas** (regra padrão: tira a 5ª, depois a fundamental se ainda precisar; mantém
a 3ª, a 7ª e a tensão de cima). Você pode reescrever essa redução — veja
[Personalização](#personalização).

```
Bb13 pf str5   ->   x 1 5 1 3 x      (1, 13, ♭7, 3)
G9   pf str5   ->   x 10 9 10 10 x   (1, 3, ♭7, 9)
```

### Modo `stacked` (empilhado)

Empilha as notas do acorde **uma por corda**, subindo a partir da corda do baixo.
É o modo para acordes grandes e para *upper structures* nas cordas agudas. Funciona
a partir de qualquer corda:

```
Dmaj13 inv3 str3 stacked  ->  x x x 6 5 7   (C#, E, B = a estrutura 7-9-13 no topo)
```

(Se o acorde tiver mais notas do que cordas disponíveis acima do baixo, ela voz
o que couber e avisa.)

### Modo `triad` (tríade)

Voicing de 3 notas em 3 cordas adjacentes, para tríades simples e suas inversões.

### Modo manual (`--frets`) — a saída de emergência

Se você quiser desenhar **uma pegada exata** que tem na cabeça, dite os trastes
diretamente, da corda mais grave (6ª) para a mais aguda (1ª), usando `x` para
corda abafada:

```
bun run cli.ts --frets "x x 9 9 9 9" "C#m7" -o personalizado.svg
```

O nome do acorde no fim (`"C#m7"`) é opcional — serve só para a ferramenta saber
os graus e escrever o título.

---

## 9. Gerando o método inteiro de uma vez

Gerar carimbo por carimbo é ótimo para um diagrama avulso. Para um **livro
inteiro**, há um jeito muito melhor: uma **lista** num arquivo de texto.

### O jeito da lista (recomendado para você)

Crie um arquivo de texto simples — pode ser no próprio bloco de notas (TextEdit
no Mac, Bloco de Notas no Windows) — com **um pedido por linha**. Há um exemplo
pronto na pasta, chamado `chords.example.txt`:

```
# tudo depois de "#" é comentário e é ignorado
C7M pf row2    => c7m_pf_5432
C7M 1a row2    => c7m_1a_5432
Bb7 1a row2    => bb7_1a_5432
Em7b5 2a row1  => em7b5_2a_6543
Bb7b9 pf row3  => bb7b9_pf_4321
C6 3a  row2    => c6_3a_5432
```

A seta `=>` diz **o nome do arquivo** daquele carimbo (a parte antes da seta é o
pedido normal; a parte depois é o nome). Se você não puser a seta, a ferramenta
inventa um nome a partir do pedido.

Depois, num só comando, ela gera **todos** de uma vez:

```
bun run cli.ts --batch chords.example.txt --outdir diagramas --gallery
```

- `--batch chords.example.txt` → "use esta lista"
- `--outdir diagramas` → "salve tudo na pasta `diagramas`"
- `--gallery` → "faça também uma página de contato"

Esse último, `--gallery`, cria um arquivo `index.html` dentro de `diagramas`.
**Clique duas vezes nele** para abrir no navegador e ver **todos os carimbos numa
tela só** — perfeito para revisar o capítulo inteiro de uma vez.

Para fazer sua própria lista, copie o `chords.example.txt`, renomeie (por exemplo
`capitulo1.txt`), edite as linhas e troque o nome no comando.

### O jeito do programador (opcional)

Se um dia você quiser gerar centenas de figuras seguindo um padrão (todos os
acordes × todas as inversões × todos os grupos de cordas), há um pequeno
*script* de exemplo, o `book.example.ts`, que faz exatamente isso num laço. Você
roda com:

```
bun run book.example.ts
```

Não é preciso saber programar para usá-lo: abra o arquivo, troque a lista de
acordes lá no começo e rode. Mas o jeito da lista acima já cobre quase tudo o que
um método precisa.

---

## 10. O estilo de desenho (pt-BR)

Por enquanto a ferramenta desenha em **um único estilo, todo em português** — sem
nenhuma notação ou texto em inglês na imagem gerada. É o estilo **`method`**, o
formato do seu método:

- braço cinza-claro, número do traste à esquerda, trastes grossos;
- **cifragem brasileira** nas bolinhas (`7M` = sétima maior, `7` = sétima
  dominante/menor, `3-` = terça menor, `b5`, `#11`…);
- subtítulo da inversão em português (`PF`, `1ª I`, `2ª I`, `3ª I`, e `PF*` para o
  `7b9` sem fundamental);
- uma **legenda das vozes** (`› 1ª voz`, `› 2ª voz`… do agudo para o grave);
- pegadas sempre **totalmente pisadas** (sem cordas soltas).

Para o resultado ficar idêntico à sua referência, instale a fonte gratuita
**Inter** (sem ela, o desenho usa uma fonte do sistema parecida).

> **E o estilo "plain"?** O código tem um segundo estilo, mais parecido com um
> *chart* de jazz americano — mas ele escreve em **inglês** (graus `1 b3 5 b7`,
> rótulos como `3fr`). Como combinamos **só pt-BR por enquanto**, esse estilo está
> **desativado**: se você pedir `plain`, a ferramenta avisa e gera no estilo
> método mesmo. Quando quiser ativá-lo (já traduzido), é só pedir.

---

## 11. Transformando os SVGs em PDF/PNG para imprimir

O SVG entra direto em InDesign, Affinity, Inkscape e LaTeX (pacote `svg`) **sem
perder qualidade**. Se você precisar de uma imagem comum (PNG) ou de um PDF, dá
para converter com ferramentas que você provavelmente já tem. Por exemplo, para
gerar um PNG em alta resolução:

```
chromium --headless --screenshot=saida.png --force-device-scale-factor=3 arquivo.svg
```

ou, se tiver o ImageMagick ou o librsvg instalados:

```
convert -density 300 arquivo.svg saida.png
rsvg-convert -f pdf -o arquivo.pdf arquivo.svg
```

Na prática, porém, o melhor para um livro costuma ser **importar o SVG direto** no
programa de diagramação — assim ele permanece vetorial até a impressão final.

---

## 12. Tabela de todas as opções

Estas são "chaves" extras que você adiciona ao comando, depois do pedido. Você só
vai usar as que precisar — o padrão já é o que você quer na maioria das vezes.

| opção | o que faz |
|-------|-----------|
| `-o`, `--out <arquivo>` | nome/lugar do arquivo de saída (padrão: `./<nome-automático>.svg`) |
| `--stdout` | mostra o SVG na tela em vez de gravar arquivo (uso avançado) |
| `--batch <arquivo>` | gera a partir de uma lista (um pedido por linha) — veja [seção 9](#9-gerando-o-método-inteiro-de-uma-vez) |
| `--outdir <pasta>` | pasta de saída do `--batch` (padrão: `./diagrams`) |
| `--gallery` | cria também uma página `index.html` com todos os carimbos |
| `--frets "<6 trastes>"` | dita os trastes na mão, do grave ao agudo (`x` = abafada) |
| `--inv <n>` `--start <1-6>` `--mode <m>` `--min <n>` | sobrescrevem campos do pedido |
| `--label <degree\|note\|none>` | o que vai escrito nas bolinhas (grau, nota ou nada) |
| `--title "<texto>"` | título personalizado · `--no-subtitle` esconde o subtítulo |
| `--tuning "<6 notas>"` | afinação, ex.: `"E,A,D,G,B,E"`, `"D,A,D,G,B,E"` ou `"E2,A2,D3,G3,B3,E4"` |
| `--strict` | mantém a grafia enarmônica rigorosa (E𝄫 etc.) nos rótulos de nota |
| `--accent "<cor>"` | cor do anel do baixo · `--ink`/`--paper "<cor>"` cor do traço / do fundo |
| `--scale <fator>` | tamanho do desenho (padrão: 1) |
| `-h`, `--help` | mostra a ajuda resumida no terminal |

Para ver essa lista a qualquer momento dentro do terminal, digite:

```
bun run cli.ts --help
```

### Personalização

- **Dicionário de acordes / redução dos acordes grandes** — fica no arquivo
  `src/theory.ts`, na lista `QUALITIES`. É lá que você ajusta exatamente quais
  vozes cada acorde grande mantém no Drop-2 — ou seja, *as vozes que o seu método
  ensina*.
- **Visual** (cores, tamanhos, anel do baixo, rótulos) — fica em `src/svg.ts`, e
  também responde às chaves `--ink` / `--paper` / `--accent` / `--scale`.
- **Afinação** — use `--tuning`.
- **Rótulos** — `degree` (ótimo para ensinar a estrutura do voicing), `note` ou
  `none`. Os rótulos de nota simplificam dupla-alteração feia por padrão
  (A♭dim7 → A♭ C♭ D F); use `--strict` para a grafia teórica rigorosa
  (A♭ C♭ E𝄫 G𝄫).

> Mexer nesses arquivos já é território de programação. Se você quiser uma
> mudança e não se sentir à vontade para editá-los, anote o que deseja — quem deu
> manutenção na ferramenta consegue fazer rapidinho.

---

## 13. Quando algo dá errado

**Digitei o comando e apareceu `command not found: bun` (ou "bun não é
reconhecido").** O Bun não foi encontrado. Confirme que você concluiu a
[instalação](#3-instalação-uma-única-vez) e, principalmente, que **fechou e
reabriu o terminal** depois de instalar.

**Apareceu `Cannot find module ... cli.ts` ou parecido.** Você não está dentro da
pasta `carimbos`. Refaça o passo da [seção 4](#4-abrindo-o-terminal-na-pasta-certa)
para abrir o terminal na pasta certa.

**Apareceu `Termo(s) não reconhecido(s) no pedido: ...`** A ferramenta não
entendeu uma das palavras do seu pedido (talvez um campo escrito com grafia
diferente). Confira a tabela da [seção 6](#6-a-linguagem-do-pedido-a-parte-musical).
A cifra precisa ser **uma palavra só, sem espaços** (`C13#11`, não `C13 #11`).

**Gerei o arquivo mas não acho a imagem.** Por padrão ela é salva **dentro da
pasta `carimbos`** (ou na pasta que você indicou com `-o`/`--outdir`). O terminal
sempre te diz o caminho exato na linha `✓ gravado: ...`.

**O acorde saiu com a fonte "errada".** O estilo `method` fica idêntico à
referência com a fonte **Inter** instalada; sem ela, usa uma fonte parecida do
sistema. Veja a [seção 10](#10-o-estilo-de-desenho-pt-br).

---

### Verificando que tudo funciona (para quem mexeu nos arquivos)

Se você (ou alguém) editou os arquivos internos, dá para conferir que nada
quebrou rodando os testes automáticos:

```
bun test
```

---

> **Resumo de bolso.** Abra o terminal na pasta `carimbos` e digite
> `bun run cli.ts "<seu pedido>"`. O pedido é música: acorde, inversão, corda do
> baixo. O arquivo `.svg` aparece na pasta. Para o método inteiro, faça uma lista
> e use `--batch ... --gallery`. O resto é refinamento.
