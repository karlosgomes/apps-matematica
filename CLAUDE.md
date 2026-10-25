# Apps de Matemática

Pequenas aplicações interativas para as aulas de Matemática A (secundário, currículo português), usadas pelos alunos e projetadas na sala de aula. Texto da interface e respostas sempre em português europeu.

## Stack
- HTML + JavaScript simples, sem build: cada app é **um único `index.html`** numa pasta própria.
- p5.js **local** (`p5.min.js` na pasta da app) nas apps com animação; KaTeX 0.16.9 via CDN (cdnjs) para o texto matemático.
- Fontes: Atkinson Hyperlegible (texto) e IBM Plex Mono (valores), via Google Fonts; tokens de cor em CSS com modo escuro.

## Estrutura
- `index.html` (raiz) — página inicial: menu e faixa iguais aos do weblog + grelha de cartões (um `a.card` por app, com `<b>` título e `<span>` descrição). As fórmulas dos cartões (título e descrição) escrevem-se em LaTeX entre `$…$` (KaTeX auto-render, só dentro de `.grelha`); cada fórmula fica numa só linha. O CSS dos cartões usa `a.card > span` (não `a.card span`, que estragaria os spans do KaTeX).
- `README.md` — uma linha por app, com link e descrição.
- `img/logo.png` — logótipo.
- Uma pasta por app:
  - `funcao-enrolamento/`, `ondas-sonoras/`, `oscilador-harmonico/`, `funcao-sinusoidal-completa/`, `funcao-sinusoidal-simples/` — layout de duas colunas, com «Modo projeção»;
  - `python/` — editor de Python (CodeMirror 5 via cdnjs + Pyodide 0.26.4 via jsdelivr): programas no `localStorage` (chave `apps-mat-python`); o exemplo é fixo (`atual = -1`), sempre no topo da lista e só de leitura (o `beforeChange` cancela as alterações e mostra um aviso), abrir/descarregar .py, link `#codigo=<base64>&nome=…` que cria uma cópia do programa; `plt.show()` desenha PNG na saída. Erros: depois do traceback (limpo por `limparErro`), uma caixa `.ajuda` explica-o em PT-PT (tabela `REGRAS`: tipo, padrão da mensagem, título, explicação) e a linha fica marcada no editor (`.linha-erro`) até se mudar o código. Autocompletar só com Ctrl+Espaço (addon `show-hint`, função `sugestoes`): nomes do programa + `PALAVRAS` do Python; depois de `math.`, `np.`, `plt.`, `random.` usa as listas fixas de `MODULOS`. O Python corre num **worker** (código no `<script id="worker">`) para se poder parar (botão «■ Parar» ou Esc). O `sw.js` (service worker, só da pasta `python/`) põe os cabeçalhos COOP/COEP que o GitHub Pages não deixa pôr; da primeira vez a página recarrega-se sozinha. Com isolamento há SharedArrayBuffer: «Parar» lança KeyboardInterrupt (se o Python não responder em 1,5 s, o worker é deitado fora e recriado) e o `input()` pede o valor num campo na saída (Atomics.wait). Sem isolamento (p. ex. `file://`), «Parar» recria sempre o worker e o `input()` não funciona. Testar com `python3 -m http.server` (o service worker não funciona em `file://`). Botão de modo claro/escuro (☾/☀): `data-theme` no `<html>`, com a mesma chave do weblog (`quarto-color-scheme`); sem escolha, segue o sistema. As cores do editor usam `.cm-s-default .cm-…` (senão o tema do CodeMirror sobrepõe-se).
  - `parametros-k-a/`, `reducao-primeiro-quadrante/` — pensadas para smartphone e projeção: só modo projeção, controlos desenhados dentro da figura (estilo GeoGebra).

## Página inicial e menu do weblog
- A página inicial usa o CSS/JS do próprio weblog (`https://karlosgomes.github.io/weblog/site_libs/bootstrap/...`) e tem uma cópia do menu do weblog (`<header id="quarto-header">`), com «Apps de Matemática» ativo. Sem pesquisa (precisa do Quarto). Tem botão de modo escuro próprio (`alternarModo()`), com a mesma chave do weblog no `localStorage` (`quarto-color-scheme` = `alternate`): liga o `bootstrap-dark.min.css` do weblog e a classe `escuro` no `<html>`.
- **Se o menu do weblog mudar, atualizar aqui à mão** (e também em `~/site/matematica-a-z/index.html`).

## Convenções de design (pedidas pelo utilizador)
- Ecrãs largos: controlos numa coluna estreita e compacta à esquerda; a figura à direita, fixa (`position: sticky`) e com a altura limitada ao ecrã, para estar sempre toda visível. A figura deve ter o máximo de espaço.
- Valores escritos diretamente na figura (ex.: (t; sin t) junto do ponto do gráfico), em vez de um cartão de valores à parte. Evitar blocos de texto explicativo que não foram pedidos.
- O referencial fica **estático** quando os parâmetros mudam, para se ver o efeito da mudança; oferecer a opção de manter os traços anteriores.
- Estado inicial mínimo (ex.: só a primeira onda selecionada).
- Preferir acrescentar uma variante a uma app existente (opção/alternador) em vez de criar uma app nova.
- Texto matemático em LaTeX (KaTeX), incluindo as marcas dos eixos; valores dos parâmetros em decimal com vírgula (1,5 e não 3/2); valores exatos com π em LaTeX.
- Trigonometria: argumento ct + d (a sinusoidal completa tem também a opção c(t − d)); ângulo θ; ponto fixo A no ângulo 0; ponto Q da função de base.

## Modo projeção
- As cinco apps de duas colunas têm «Modo projeção» (chave `apps-mat-projecao` no `localStorage`, fator K = 1,5 aplicado envolvendo `textSize`/`strokeWeight` do p5). Manter as novas apps coerentes com isto.
- No modo projeção, a `funcao-sinusoidal-simples` e a `funcao-enrolamento` têm uma faixa `.ovl` por baixo da figura, dentro do cartão do desenho, com cópias compactas dos controlos principais (`buildOverlay`/`syncOverlay`: as cópias passam o valor ao controlo original e disparam o seu evento). A altura da figura desconta a altura da faixa. Na enrolamento: t, ◀/▶, t = 0 e cos, sin, tan, reta, gráficos. O ponto P na circunferência mostra só o nome (sem coordenadas), a pedido do utilizador.

## Armadilhas do p5
- O p5 guarda as cores de `stroke`/`fill` em cache: **nunca** envolver chamadas de cor do p5 em `drawingContext.save()/restore()` (as cores deixam de se aplicar sem erro).
- `textFont` recebe um único nome de família, não uma lista CSS.

## Acrescentar uma app
1. Criar a pasta `<nome-da-app>/` com `index.html` (e `p5.min.js`, se usar p5).
2. Acrescentar um cartão em `index.html` (raiz), com as fórmulas em LaTeX entre `$…$`, e uma linha no `README.md` (aí em texto simples).

## Verificação
Screenshots headless antes de publicar, por exemplo:
`google-chrome --headless=new --window-size=1300,800 --virtual-time-budget=5000 --screenshot=out.png "file://$PWD/<app>/index.html"`
Testar também numa largura de telemóvel (ex.: 420 px).

## Publicação
- Repositório público https://github.com/karlosgomes/apps-matematica (ramo `main`, raiz) → GitHub Pages: https://karlosgomes.github.io/apps-matematica/
- Publicar = `git commit` + `git push`; o site atualiza em ~1 min. **Perguntar sempre antes de fazer push** («commit e push?»); depois do push, confirmar online com `curl` e lembrar Ctrl+Shift+R.
- Só as apps são públicas (fichas e soluções não).
