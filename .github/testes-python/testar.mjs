// Bateria de testes da app Python (Pyodide e MicroPython) num Chrome headless.
// Uso (na raiz do repositório): node .github/testes-python/testar.mjs [relatorio.md]
// Arranca um servidor local (python3 -m http.server) e o Chrome; sai com código 1 se algum teste falhar.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORTA_HTTP = 8770, PORTA_CDP = 9370;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const relatorio = process.argv[2] || "relatorio-testes.md";

// [nome, modo («py» ou «mp»), código, respostas ao input(), verificação (recebe { saida, estado, ajuda, imgs, telas })]
const TESTES = [
  ["Python: print e input", "py", 'n = input("Nome: ")\nx = int(input("x? "))\nprint("ola", n, x * 2)\n', ["Ana", "21"], r => r.saida.includes("ola Ana 42")],
  ["Python: NameError explicado", "py", "print(y)\n", [], r => /Nome desconhecido/.test(r.ajuda)],
  ["Python: falta o : explicado", "py", "for k in range(3)\n    print(k)\n", [], r => /Falta o sinal :/.test(r.ajuda)],
  ["Python: texto + número explicado", "py", 'print("idade " + 15)\n', [], r => /Texto \+ número/.test(r.ajuda)],
  ["Python: divisão por zero explicada", "py", "print(1 / 0)\n", [], r => /Divisão por zero/.test(r.ajuda)],
  ["Python: int com vírgula explicado", "py", 'int("3.5")\n', [], r => /Não é um número inteiro/.test(r.ajuda)],
  ["Python: time.sleep", "py", "import time\ntime.sleep(0.3)\nprint('acordou')\n", [], r => r.saida.includes("acordou")],
  ["Python: numpy", "py", "import numpy as np\nprint(np.array([1, 2, 3]).sum())\n", [], r => /\b6\b/.test(r.saida)],
  ["Python: matplotlib", "py", "import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9])\nplt.show()\n", [], r => r.imgs >= 1],
  ["Python: Parar um ciclo infinito", "py", "while True:\n    pass\n", ["PARAR"], r => /interrompido/i.test(r.saida)],
  ["MicroPython: print e input", "mp", 'n = input("Nome: ")\nprint("ola", n)\n', ["Ana"], r => r.saida.includes("ola Ana")],
  ["MicroPython: f-string recusada", "mp", 'x = 1\nprint(f"{x}")\n', [], r => /f-strings/.test(r.ajuda)],
  ["MicroPython: módulo que a calculadora não tem", "mp", "import time\n", [], r => /não tem o módulo time/.test(r.ajuda)],
  ["MicroPython: NameError explicado", "mp", "print(y)\n", [], r => /Nome desconhecido/.test(r.ajuda)],
  ["MicroPython: casioplot", "mp", "from casioplot import *\nset_pixel(10, 10, (255, 0, 0))\nshow_screen()\n", [], r => r.telas >= 1],
  ["MicroPython: turtle", "mp", "from turtle import *\nspeed(0)\nforward(50)\n", [], r => r.telas >= 1],
  ["MicroPython: matplotlib", "mp", "import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9])\nplt.show()\n", [], r => r.telas >= 1],
  ["MicroPython: Parar um ciclo infinito", "mp", "while True:\n    pass\n", ["PARAR"], r => /interrompido/i.test(r.saida)],
];

const servidor = spawn("python3", ["-m", "http.server", String(PORTA_HTTP), "--bind", "127.0.0.1"], { stdio: "ignore" });
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-testes-"));
const chrome = spawn(process.env.CHROME || "google-chrome", ["--headless=new", `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const fim = code => { try { chrome.kill(); } catch (e) {} try { servidor.kill(); } catch (e) {} process.exit(code); };

let tabs;
for (let i = 0; i < 60 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`)).json(); } catch { await sleep(500); } }
if (!tabs) { console.error("O Chrome não arrancou."); fim(2); }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const errosJS = [], consola = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; }
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consola.push(m.params.args.map(x => x.value ?? x.description).join(" "));
  else if (m.method === "Runtime.exceptionThrown") errosJS.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise(r => { setTimeout(() => r({}), 20000); const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
await send("Runtime.enable");

// abre a app uma vez (o service worker põe o isolamento e recarrega a página)
// (com um programa no link, para o editor não ficar no exemplo, que é só de leitura)
await send("Page.navigate", { url: `http://127.0.0.1:${PORTA_HTTP}/python/index.html#codigo=${Buffer.from("print(1)\n").toString("base64")}&nome=testes.py` });
const pronta = async (seg = 180) => { for (let k = 0; k < seg; k++) { await sleep(1000); if (await ev(`!document.getElementById('executar').disabled`)) return true; } return false; };
if (!(await pronta())) {
  const estado = await ev(`document.getElementById('estado').textContent`);
  const md = `## Testes da app Python\n\n❌ **A app não ficou pronta: o Python não carregou.**\n\nMensagem da app: «${estado}»\n\n` +
    (errosJS.length ? `Erros de JavaScript: ${errosJS.slice(0, 5).map(e => "`" + e.split("\n")[0] + "`").join(", ")}\n` : "") +
    (consola.length ? `\nConsola: ${consola.slice(0, 5).map(e => "`" + e.slice(0, 300) + "`").join(", ")}\n` : "");
  fs.writeFileSync(relatorio, md); console.log(md); fim(1);
}
const isolada = await ev("crossOriginIsolated");

const resultados = [];
for (const [nome, modo, codigo, respostas, ok] of TESTES) {
  let r = {};
  try {
    const botao = modo === "mp" ? "motor-casio" : "motor-py";
    if (!(await ev(`document.getElementById('${botao}').getAttribute('aria-checked') === 'true'`))) {
      await ev(`document.getElementById('${botao}').click()`);
      if (!(await pronta())) throw new Error("o motor não carregou");
    }
    if (!(await pronta(60))) throw new Error("a app não ficou pronta");
    await ev(`document.getElementById('limpar').click()`);
    await sleep(300);
    await ev(`(() => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setValue(${JSON.stringify(codigo)}); })()`);
    await ev(`document.getElementById('executar').click()`);
    const fila = [...respostas];
    for (let k = 0; k < 120; k++) {
      await sleep(250);
      if (fila[0] === "PARAR" && k === 8) { fila.shift(); await ev(`document.getElementById('parar').click()`); continue; }
      if (fila.length && fila[0] !== "PARAR" && await ev(`!!document.querySelector('#saida input.entrada')`)) {
        const v = fila.shift();
        await ev(`(() => { const i = document.querySelector('#saida input.entrada'); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); })()`);
        continue;
      }
      if (k > 2 && !(await ev(`document.getElementById('executar').hidden`))) break;
    }
    await sleep(500);
    r = await ev(`({ saida: document.getElementById('saida').innerText, estado: document.getElementById('estado').textContent,
      ajuda: [...document.querySelectorAll('#saida .ajuda')].map(a => a.innerText).join(' | '),
      imgs: document.querySelectorAll('#saida img').length, telas: document.querySelectorAll('#saida canvas').length })`) || {};
    resultados.push([nome, !!ok(r), r]);
  } catch (e) { resultados.push([nome, false, { erro: String(e.message || e) }]); }
}
const versoes = await ev(`[...document.querySelectorAll('script')].map(s => s.textContent).join(' ').match(/pyodide\\/v[\\d.]+|micropython-webassembly-pyscript@[\\w.-]+/g)`);
ws.close();

const falhas = resultados.filter(r => !r[1]).length;
let md = `## Testes da app Python\n\nVersões: ${[...new Set(versoes || [])].join(", ")}\n\nIsolamento (SharedArrayBuffer): ${isolada ? "sim" : "não"}\n\n| teste | resultado |\n|---|---|\n`;
for (const [nome, passou, r] of resultados) {
  const det = passou ? "" : ` — ${String(r.erro || (r.ajuda ? "ajuda: " + r.ajuda : "") || ("saída: " + (r.saida || "").slice(-200))).replace(/\n/g, " ").replace(/\|/g, "/")}`;
  md += `| ${nome} | ${passou ? "✅" : "❌" + det} |\n`;
}
md += `\n${falhas ? `**${falhas} teste(s) falharam.**` : "**Todos os testes passaram.**"}\n`;
if (errosJS.length) md += `\nErros de JavaScript na página: ${errosJS.slice(0, 5).map(e => "`" + e.split("\n")[0] + "`").join(", ")}\n`;
fs.writeFileSync(relatorio, md);
console.log(md);
fim(falhas ? 1 : 0);
