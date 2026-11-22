// Verifica se há versões novas do Pyodide e do MicroPython (npm, «latest») e, se houver, troca-as em python/index.html.
// Escreve para o GITHUB_OUTPUT: mudou=true|false, sufixo=…, descricao=…
import fs from "node:fs";
const F = "python/index.html";
let s = fs.readFileSync(F, "utf8");
const ultima = async pkg => (await (await fetch(`https://registry.npmjs.org/${pkg}`)).json())["dist-tags"].latest;
const mudancas = [];

const py = s.match(/pyodide\/v([\w.-]+)\/full\//);
const pyNova = await ultima("pyodide");
if (py && py[1] !== pyNova) {
  s = s.split(`pyodide/v${py[1]}/full/`).join(`pyodide/v${pyNova}/full/`);
  mudancas.push(`Pyodide ${py[1]} → ${pyNova}`);
}
const mp = s.match(/micropython-webassembly-pyscript@([\w.-]+)\//);
const mpNova = await ultima("@micropython/micropython-webassembly-pyscript");
if (mp && mp[1] !== mpNova) {
  s = s.split(`micropython-webassembly-pyscript@${mp[1]}/`).join(`micropython-webassembly-pyscript@${mpNova}/`);
  mudancas.push(`MicroPython ${mp[1]} → ${mpNova}`);
}
if (mudancas.length) fs.writeFileSync(F, s);
console.log(`mudou=${mudancas.length ? "true" : "false"}`);
console.log(`sufixo=pyodide-${pyNova}-mp-${mpNova}`);
console.log(`descricao=${mudancas.join("; ") || "sem versões novas"}`);
