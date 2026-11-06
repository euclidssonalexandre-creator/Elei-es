// Gera as imagens de um carrossel do dep.rural (1080x1350, PNG) a partir de um roteiro JSON.
// Uso: node carrossel.js roteiro.json pasta-de-saida
//
// Roteiro: { "slides": [ {...}, ... ] }  — tipos de slide:
//   {"tipo":"capa",  "tag":"...", "titulo":"...", "texto":"..."}
//   {"tipo":"itens", "tag":"...", "titulo":"...", "itens":[{"t":"...","d":"..."}]}   (até 3 itens)
//   {"tipo":"texto", "tag":"...", "titulo":"...", "texto":"...", "destaque":"..."}
//   {"tipo":"cta",   "titulo":"...", "texto":"...", "botao":"Comenta RURAL"}
// Nos textos: *palavra* fica em laranja e \n quebra a linha.
// Story (1080x1920, uma imagem por slide): ponha "formato":"story" no roteiro. Use 1 slide do tipo capa, texto ou cta.
// Post leve (imagem única 1080x1350): roteiro com 1 slide; sai slide-01.png sem a numeração "1/1".
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const DIR = __dirname;
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = s => esc(s).replace(/\*([^*]+)\*/g,'<span class="acc">$1</span>').replace(/\n/g,'<br>');

const CSS = `
.c{width:1080px;height:1350px;position:relative;overflow:hidden;background:var(--bg);color:var(--fg);
  font-family:var(--body);padding:84px 84px 64px;display:flex;flex-direction:column}
.glow{position:absolute;right:-260px;bottom:-260px;width:760px;height:760px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,107,44,.16),rgba(255,107,44,0) 65%)}
.top{display:flex;justify-content:space-between;align-items:center;position:relative}
.top .wm{font-size:46px}
.top .pg{font-family:var(--mono);font-size:26px;color:var(--muted)}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:30px;position:relative;min-height:0;overflow:hidden}
.tag{font-size:26px}
h1{font-family:var(--display);font-weight:800;line-height:1.04;letter-spacing:-.025em;margin:0}
.capa h1{font-size:104px}
h2{font-family:var(--display);font-weight:800;font-size:72px;line-height:1.06;letter-spacing:-.02em;margin:0}
.txt{font-size:38px;line-height:1.38;color:var(--muted);margin:0}
.txt b{color:var(--fg);font-weight:600}
.itens{display:flex;flex-direction:column;gap:20px;margin-top:10px}
.it{display:flex;gap:28px;align-items:flex-start;background:var(--surface);border:2px solid var(--line);border-radius:22px;padding:30px 34px}
.it .n{font-family:var(--mono);font-weight:800;font-size:44px;color:var(--accent);line-height:1;min-width:64px}
.it .t{font-family:var(--display);font-weight:700;font-size:40px;line-height:1.12}
.it .d{font-size:30px;line-height:1.35;color:var(--muted);margin-top:8px}
.dest{border-left:8px solid var(--accent);background:var(--accent-soft);border-radius:0 18px 18px 0;padding:28px 34px;font-size:36px;line-height:1.35;font-weight:600}
.cta .btn{align-self:flex-start;background:var(--accent);color:var(--accent-fg);font-family:var(--display);font-weight:800;font-size:46px;border-radius:999px;padding:26px 54px;margin-top:14px}
.foot{display:flex;justify-content:space-between;align-items:center;border-top:2px solid var(--line);padding-top:26px;
  font-family:var(--mono);font-size:24px;color:var(--muted);position:relative}
.foot b{color:var(--fg)}
.next{font-family:var(--mono);color:var(--accent);font-weight:700}
.c.st{height:1920px;padding:250px 96px 380px}
.c.st .top .wm{font-size:56px}
.c.st .capa h1{font-size:118px}
.c.st h2{font-size:88px}
.c.st .txt{font-size:46px}
.c.st .dest{font-size:42px}
`;

function slideHTML(s, i, n, story){
  const pg = (story || n === 1) ? '' : `${i+1}/${n}`;
  let body = '';
  if (s.tipo === 'capa') body = `<div class="tag">${fmt(s.tag)}</div><h1 data-fit>${fmt(s.titulo)}</h1>${s.texto?`<p class="txt">${fmt(s.texto)}</p>`:''}`;
  else if (s.tipo === 'itens') body = `${s.tag?`<div class="tag">${fmt(s.tag)}</div>`:''}<h2 data-fit>${fmt(s.titulo)}</h2>
     <div class="itens">${(s.itens||[]).map((it,k)=>`<div class="it"><div class="n">${esc(it.n ?? String(k+1).padStart(2,'0'))}</div><div><div class="t">${fmt(it.t)}</div>${it.d?`<div class="d">${fmt(it.d)}</div>`:''}</div></div>`).join('')}</div>`;
  else if (s.tipo === 'texto') body = `${s.tag?`<div class="tag">${fmt(s.tag)}</div>`:''}<h2 data-fit>${fmt(s.titulo)}</h2>${s.texto?`<p class="txt">${fmt(s.texto)}</p>`:''}${s.destaque?`<div class="dest">${fmt(s.destaque)}</div>`:''}`;
  else if (s.tipo === 'cta') body = `${s.tag?`<div class="tag">${fmt(s.tag)}</div>`:''}<h2 data-fit>${fmt(s.titulo)}</h2>${s.texto?`<p class="txt">${fmt(s.texto)}</p>`:''}<div class="btn">${fmt(s.botao||'Comenta RURAL')}</div>`;
  else throw new Error('tipo de slide desconhecido: '+s.tipo);
  const last = story || i === n-1;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${DIR}/marca.css"><style>${CSS}</style></head><body>
<div class="c ${s.tipo}${story?' st':''}"><div class="bar"></div><div class="glow"></div>
<div class="top"><div class="wm">dep<b>.</b>rural</div><div class="pg">${pg}</div></div>
<div class="body">${body}</div>
<div class="foot"><span>um produto <b>dep.lab</b></span>${last?'<span>@deplabsoft</span>':'<span class="next">arrasta →</span>'}</div>
</div></body></html>`;
}

(async () => {
  const [roteiro, saida] = process.argv.slice(2);
  if (!roteiro || !saida) { console.error('Uso: node carrossel.js roteiro.json pasta-de-saida'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(roteiro, 'utf8'));
  fs.mkdirSync(saida, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carrossel-'));
  const browser = await chromium.launch();
  const story = spec.formato === 'story';
  const page = await browser.newPage({ viewport: { width: 1080, height: story ? 1920 : 1350 } });
  const n = spec.slides.length, files = [];
  for (let i = 0; i < n; i++) {
    const f = path.join(tmp, `s${i}.html`);
    fs.writeFileSync(f, slideHTML(spec.slides[i], i, n, story));
    await page.goto('file://' + f);
    await page.evaluate(() => document.fonts.ready);
    // Diminui o título até tudo caber no slide
    const ok = await page.evaluate(() => {
      const body = document.querySelector('.body'), h = document.querySelector('[data-fit]');
      let size = parseFloat(getComputedStyle(h).fontSize);
      while (body.scrollHeight > body.clientHeight + 1 && size > 40) { size -= 2; h.style.fontSize = size + 'px'; }
      return body.scrollHeight <= body.clientHeight + 1;
    });
    if (!ok) console.warn(`AVISO: o slide ${i+1} tem texto demais e pode estar cortado.`);
    const out = path.join(saida, `${story?'story':'slide'}-${String(i+1).padStart(2,'0')}.png`);
    await page.screenshot({ path: out });
    files.push(out);
  }
  await browser.close();
  console.log(files.join('\n'));
})();
