// Gera um Reel do dep.rural (1080x1920, 30 fps, H.264 + AAC) a partir de um roteiro JSON.
// Uso: node video.js roteiro.json saida.mp4
//
// Roteiro: { "cenas": [ {...}, ... ], "musica": true }  — tipos de cena (dur em segundos):
//   {"tipo":"frase",  "dur":3,   "tag":"...", "titulo":"...", "texto":"..."}
//   {"tipo":"lista",  "dur":5.5, "tag":"...", "titulo":"...", "itens":["...","..."]}        (até 5 itens)
//   {"tipo":"passos", "dur":7,   "titulo":"...", "passos":[{"t":"...","d":"..."}]}          (até 4 passos)
//   {"tipo":"marca",  "dur":4,   "titulo":"...", "botao":"Comenta RURAL"}                   (última cena)
// Nos textos: *palavra* fica em laranja e \n quebra a linha.
// Cada cena vira um arquivo .mp4; depois as cenas são juntadas sem recodificar e a música é somada.
const fs = require('fs'), path = require('path'), os = require('os');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const DIR = __dirname, FPS = 30, W = 1080, H = 1920;
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = s => esc(s).replace(/\*([^*]+)\*/g,'<span class="acc">$1</span>').replace(/\n/g,'<br>');

const CSS = `
.c{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:var(--bg);color:var(--fg);font-family:var(--body)}
.prog{position:absolute;left:0;top:0;height:14px;background:var(--accent)}
.track{position:absolute;left:0;top:0;right:0;height:14px;background:#3a3940}
.glow{position:absolute;width:1100px;height:1100px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,107,44,.20),rgba(255,107,44,0) 62%)}
/* área segura do Reels: o Instagram cobre o topo, a direita e a parte de baixo */
.head{position:absolute;left:96px;right:150px;top:236px;display:flex;justify-content:space-between;align-items:center}
.head .wm{font-size:52px}
.head .h{font-family:var(--mono);font-size:28px;color:var(--muted)}
.stage{position:absolute;left:96px;right:150px;top:400px;bottom:470px;display:flex;flex-direction:column;justify-content:center;gap:36px}
.tag{font-size:32px}
h1{font-family:var(--display);font-weight:800;font-size:112px;line-height:1.03;letter-spacing:-.025em;margin:0}
h2{font-family:var(--display);font-weight:800;font-size:84px;line-height:1.05;letter-spacing:-.02em;margin:0}
.txt{font-size:46px;line-height:1.35;color:var(--muted);margin:0}
.li{display:flex;gap:26px;align-items:center;background:var(--surface);border:2px solid var(--line);border-radius:24px;padding:28px 34px;font-size:46px;font-weight:600}
.li .ck{flex:none;width:54px;height:54px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800}
.ps{display:flex;gap:30px;align-items:flex-start;background:var(--surface);border:2px solid var(--line);border-radius:24px;padding:28px 34px}
.ps .n{font-family:var(--mono);font-weight:800;font-size:56px;color:var(--accent);line-height:1}
.ps .t{font-family:var(--display);font-weight:700;font-size:50px;line-height:1.1}
.ps .d{font-size:36px;color:var(--muted);margin-top:8px;line-height:1.3}
.btn{align-self:flex-start;background:var(--accent);color:var(--accent-fg);font-family:var(--display);font-weight:800;font-size:58px;border-radius:999px;padding:30px 64px}
.big .wm{font-size:120px}
.big .sub{font-family:var(--mono);font-size:34px;color:var(--muted);margin-top:-14px}
.a{opacity:0}
`;

function sceneHTML(c){
  let i = 0; const at = () => (0.15 + 0.5 * i++).toFixed(2);
  let b = '';
  if (c.tag) b += `<div class="tag a" data-at="${at()}">${fmt(c.tag)}</div>`;
  if (c.tipo === 'frase') {
    b += `<h1 class="a" data-at="${at()}">${fmt(c.titulo)}</h1>`;
    if (c.texto) b += `<p class="txt a" data-at="${(+at()+0.3).toFixed(2)}">${fmt(c.texto)}</p>`;
  } else if (c.tipo === 'lista') {
    b += `<h2 class="a" data-at="${at()}">${fmt(c.titulo)}</h2>`;
    const step = Math.min(0.75, (c.dur - 2.2) / Math.max(1, c.itens.length));
    c.itens.forEach((t, k) => { b += `<div class="li a" data-at="${(1.0 + k*step).toFixed(2)}"><span class="ck">✓</span><span>${fmt(t)}</span></div>`; });
  } else if (c.tipo === 'passos') {
    b += `<h2 class="a" data-at="${at()}">${fmt(c.titulo)}</h2>`;
    const step = Math.min(1.3, (c.dur - 2.2) / Math.max(1, c.passos.length));
    c.passos.forEach((p, k) => { b += `<div class="ps a" data-at="${(0.9 + k*step).toFixed(2)}"><div class="n">${String(k+1).padStart(2,'0')}</div><div><div class="t">${fmt(p.t)}</div>${p.d?`<div class="d">${fmt(p.d)}</div>`:''}</div></div>`; });
  } else if (c.tipo === 'marca') {
    b += `<div class="big a" data-at="0.15"><div class="wm">dep<b>.</b>rural</div><div class="sub">um produto dep.lab</div></div>`;
    b += `<h2 class="a" data-at="0.75">${fmt(c.titulo)}</h2>`;
    if (c.botao) b += `<div class="btn a" data-at="1.35">${fmt(c.botao)}</div>`;
  } else throw new Error('tipo de cena desconhecido: ' + c.tipo);
  const head = c.tipo === 'marca' ? '' : `<div class="head"><div class="wm">dep<b>.</b>rural</div><div class="h">@deplabsoft</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${DIR}/marca.css"><style>${CSS}</style></head><body>
<div class="c"><div class="glow"></div><div class="track"></div><div class="prog"></div>${head}<div class="stage">${b}</div></div>
<script>
const els=[...document.querySelectorAll('.a')].map(e=>({e,at:+e.dataset.at}));
const glow=document.querySelector('.glow'), prog=document.querySelector('.prog');
window.setT=(t,T,dur,total,last)=>{
  for(const {e,at} of els){const p=Math.min(1,Math.max(0,(t-at)/0.55));const k=1-Math.pow(1-p,3);
    e.style.opacity=k; e.style.transform='translateY('+((1-k)*56).toFixed(1)+'px)';}
  const out=last?1:Math.min(1,Math.max(0,(dur-t)/0.28));
  document.querySelector('.stage').style.opacity=out;
  glow.style.left=(380+Math.sin(T*0.35)*160)+'px'; glow.style.top=(1050+Math.cos(T*0.27)*220)+'px';
  prog.style.width=(100*Math.min(1,T/total)).toFixed(2)+'%';
};
</script></body></html>`;
}

function encodeScene(page, c, t0, total, last, out){
  return new Promise(async (resolve, reject) => {
    const tmp = out.replace(/\.mp4$/, '.tmp.mp4');
    const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-',
      '-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-r',String(FPS),'-g','60', tmp]);
    ff.stderr.on('data', d => process.stderr.write(d));
    ff.on('close', code => { if (code === 0) { fs.renameSync(tmp, out); resolve(out); } else reject(new Error('ffmpeg falhou na cena')); });
    const n = Math.round(c.dur * FPS);
    for (let f = 0; f < n; f++) {
      const t = f / FPS;
      await page.evaluate(([t,T,d,tot,l]) => window.setT(t,T,d,tot,l), [t, t0 + t, c.dur, total, last]);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
  });
}

(async () => {
  const [roteiro, saida] = process.argv.slice(2);
  if (!roteiro || !saida) { console.error('Uso: node video.js roteiro.json saida.mp4'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(roteiro, 'utf8'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
  const total = spec.cenas.reduce((s, c) => s + c.dur, 0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  if (process.argv[4] === '--quadros') {
    // Prévia: um quadro de cada cena no momento em que tudo já apareceu (saida = prefixo dos PNGs)
    let tq = 0;
    for (let i = 0; i < spec.cenas.length; i++) {
      const c = spec.cenas[i], f = path.join(tmp, `cena${i}.html`);
      fs.writeFileSync(f, sceneHTML(c));
      await page.goto('file://' + f); await page.evaluate(() => document.fonts.ready);
      const t = c.dur - 0.35;
      await page.evaluate(([t,T,d,tot,l]) => window.setT(t,T,d,tot,l), [t, tq + t, c.dur, total, i === spec.cenas.length - 1]);
      const stage = await page.evaluate(() => { const s = document.querySelector('.stage'); return s.scrollHeight <= s.clientHeight + 1; });
      if (!stage) console.warn(`AVISO: a cena ${i+1} tem texto demais para a área segura.`);
      await page.screenshot({ path: `${saida.replace(/\.mp4$/, '')}-quadro${i+1}.png` });
      tq += c.dur;
    }
    await browser.close(); console.log('quadros prontos'); return;
  }
  const parts = []; let t0 = 0;
  for (let i = 0; i < spec.cenas.length; i++) {
    const c = spec.cenas[i], f = path.join(tmp, `cena${i}.html`);
    fs.writeFileSync(f, sceneHTML(c));
    await page.goto('file://' + f); await page.evaluate(() => document.fonts.ready);
    const out = path.join(tmp, `cena${i}.mp4`);
    await encodeScene(page, c, t0, total, i === spec.cenas.length - 1, out);
    parts.push(out); t0 += c.dur;
    console.log(`cena ${i+1}/${spec.cenas.length} pronta`);
  }
  await browser.close();
  const list = path.join(tmp, 'lista.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  const mudo = path.join(tmp, 'mudo.mp4');
  execFileSync('ffmpeg', ['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy',mudo]);
  const wav = path.join(tmp, 'musica.wav');
  if (spec.musica === false) execFileSync('ffmpeg', ['-y','-loglevel','error','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',String(total),wav]);
  else execFileSync('python3', [path.join(DIR, 'musica.py'), String(total), wav]);
  const tmpOut = saida.replace(/\.mp4$/, '.tmp.mp4');
  execFileSync('ffmpeg', ['-y','-loglevel','error','-i',mudo,'-i',wav,'-map','0:v','-map','1:a','-c:v','copy',
    '-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-shortest','-movflags','+faststart',tmpOut]);
  fs.renameSync(tmpOut, saida);
  console.log(saida);
})();
