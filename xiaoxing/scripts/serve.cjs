#!/usr/bin/env node
const { loadXiaoxingEnv } = require("../lib/voice/loadEnv.cjs");
loadXiaoxingEnv();
const http = require("http");
const { ask, askAsync } = require("../lib/ask/index.cjs");
const { llmStatus } = require("../lib/llm/resolve.cjs");
const { llmAskEnabled } = require("../lib/ask/llmFallback.cjs");
const { readLatestBriefing, buildDailyBriefing } = require("../lib/briefing/daily.cjs");
const { boardColumns, setInboxStatus, STATUSES } = require("../lib/knowledge/inbox.cjs");
const followupBoard = require("../lib/followup/board.cjs");
const market = require("../lib/market/index.cjs");
const { debugLog } = require("../lib/platform/debugLog.cjs");
const { parseQuery, handleWechatHttp, publicConfig } = require("../lib/channels/wechat.cjs");
const { handleWebhookAsk } = require("../lib/channels/webhook.cjs");
const { voiceTurn } = require("../lib/voice/turn.cjs");
const { ttsConfigured } = require("../lib/voice/tts.cjs");

const port = Number(process.env.XIAOXING_PORT || 3780);
const host = process.env.XIAOXING_HOST || "127.0.0.1";

const ASK_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>小星 · 农业助手</title>
  <style>
    :root { --bg:#0f1c14; --panel:#173323; --ink:#e8f5e9; --muted:#9ccc9c; --accent:#7cb342; }
    *{box-sizing:border-box} body{margin:0;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1b4332,var(--bg));color:var(--ink);min-height:100vh}
    main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
    nav a{color:var(--accent);margin-right:14px;text-decoration:none}
    h1{font-size:1.6rem;margin:12px 0 4px;letter-spacing:.04em}
    p.lead{color:var(--muted);margin:0 0 24px}
    .row{display:flex;gap:8px}
    input{flex:1;border:1px solid #2e5a3c;background:#0c160f;color:var(--ink);border-radius:10px;padding:12px 14px;font-size:1rem}
    button{border:0;background:var(--accent);color:#08210f;font-weight:700;border-radius:10px;padding:0 18px;cursor:pointer}
    #log{margin-top:20px;display:flex;flex-direction:column;gap:12px}
    .bubble{background:var(--panel);border:1px solid #2a5238;border-radius:12px;padding:12px 14px;line-height:1.55}
    .meta{font-size:.75rem;color:var(--muted);margin-top:6px}
    .more{margin-top:10px}.more .lab{font-size:.75rem;color:var(--muted);margin-bottom:6px}
    .mq{display:block;width:100%;text-align:left;margin:4px 0;border:1px solid #2e5a3c;background:#0c160f;color:#c8e6c9;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:.85rem}
    .mq:hover{border-color:var(--accent);color:var(--accent)}
  </style>
</head>
<body>
<main>
  <nav><a href="/">问答</a><a href="/voice">语音</a><a href="/board">复盘看板</a><a href="/follow">农服跟进</a><a href="/market">行情</a></nav>
  <h1>小星</h1>
  <p class="lead">草莓品种 · 育苗 · 栽培历 · 上海产区公开口径 · 语音/Webhook/微信/跟进/行情已接</p>
  <div class="row">
    <input id="q" placeholder="例如：宁玉有什么特点" autofocus />
    <button id="go">提问</button>
  </div>
  <div id="log"></div>
</main>
<script>
const log = document.getElementById('log');
async function run(){
  const q = document.getElementById('q').value.trim();
  if(!q) return;
  log.insertAdjacentHTML('afterbegin', '<div class="bubble"><b>你</b><div>'+q.replace(/</g,'&lt;')+'</div></div>');
  const res = await fetch('/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});
  const data = await res.json();
  const more = (data.moreQuestions||[]).slice(0,5).map(q=>'<button type="button" class="mq" data-q="'+String(q).replace(/"/g,'&quot;')+'">'+String(q).replace(/</g,'&lt;')+'</button>').join('');
  log.insertAdjacentHTML('afterbegin', '<div class="bubble"><b>小星</b><div>'+(data.reply||'').replace(/</g,'&lt;')+'</div>'+(more?'<div class="more"><div class="lab">还可以问</div>'+more+'</div>':'')+'<div class="meta">'+[data.layer,data.score, (data.sources||[]).slice(0,2).join(' · ')].filter(Boolean).join(' · ')+'</div></div>');
  log.querySelectorAll('.mq').forEach(btn=>{ btn.onclick=()=>{ document.getElementById('q').value=btn.dataset.q; run(); }; });
}
document.getElementById('go').onclick = run;
document.getElementById('q').addEventListener('keydown', e => { if(e.key==='Enter') run(); });
</script>
</body>
</html>`;

const BOARD_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>小星 · 复盘看板</title>
  <style>
    :root { --bg:#0f1c14; --panel:#173323; --ink:#e8f5e9; --muted:#9ccc9c; --accent:#7cb342; }
    *{box-sizing:border-box} body{margin:0;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1b4332,var(--bg));color:var(--ink);min-height:100vh}
    main{max-width:1100px;margin:0 auto;padding:28px 16px 64px}
    nav a{color:var(--accent);margin-right:14px;text-decoration:none}
    h1{font-size:1.45rem;margin:12px 0 6px}
    p.lead{color:var(--muted);margin:0 0 18px}
    .board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    @media (max-width:960px){.board{grid-template-columns:1fr 1fr}}
    .col{background:rgba(23,51,35,.85);border:1px solid #2a5238;border-radius:12px;padding:10px;min-height:280px}
    .col h2{font-size:.95rem;margin:0 0 10px;color:var(--accent)}
    .card{background:#0c160f;border:1px solid #2e5a3c;border-radius:10px;padding:10px;margin-bottom:8px}
    .card .q{font-size:.92rem;line-height:1.45}
    .card .meta{font-size:.72rem;color:var(--muted);margin-top:6px}
    .card select{margin-top:8px;width:100%;background:#122218;color:var(--ink);border:1px solid #2e5a3c;border-radius:8px;padding:6px}
  </style>
</head>
<body>
<main>
  <nav><a href="/">问答</a><a href="/voice">语音</a><a href="/board">复盘看板</a><a href="/follow">农服跟进</a><a href="/market">行情</a></nav>
  <h1>复盘看板</h1>
  <p class="lead">待复盘 → 复盘中 → 待入库 → 已上线（对应 inbox 状态；跟进见 /follow）</p>
  <div class="board" id="board"></div>
</main>
<script>
const labels = {pending:'待复盘', reviewing:'复盘中', ready:'待入库', done:'已上线'};
async function load(){
  const res = await fetch('/api/board');
  const data = await res.json();
  const root = document.getElementById('board');
  root.innerHTML = '';
  for (const st of ['pending','reviewing','ready','done']) {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = '<h2>'+labels[st]+' ('+(data[st]||[]).length+')</h2>';
    for (const item of (data[st]||[])) {
      const card = document.createElement('div');
      card.className = 'card';
      const opts = ['pending','reviewing','ready','done'].map(s => '<option value="'+s+'"'+(s===item.status?' selected':'')+'>'+labels[s]+'</option>').join('');
      card.innerHTML = '<div class="q">'+(item.query||'').replace(/</g,'&lt;')+'</div>'+
        '<div class="meta">'+(item.reason||'')+' · '+(item.at||'').slice(0,19)+'</div>'+
        '<select data-id="'+item.id+'">'+opts+'</select>';
      col.appendChild(card);
    }
    root.appendChild(col);
  }
  root.querySelectorAll('select').forEach(sel => {
    sel.onchange = async () => {
      await fetch('/api/board/'+sel.dataset.id, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status: sel.value})});
      load();
    };
  });
}
load();
</script>
</body>
</html>`;

const FOLLOW_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>小星 · 农服跟进</title>
  <style>
    :root { --bg:#0f1c14; --panel:#173323; --ink:#e8f5e9; --muted:#9ccc9c; --accent:#7cb342; }
    *{box-sizing:border-box} body{margin:0;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1b4332,var(--bg));color:var(--ink);min-height:100vh}
    main{max-width:1100px;margin:0 auto;padding:28px 16px 64px}
    nav a{color:var(--accent);margin-right:14px;text-decoration:none}
    h1{font-size:1.45rem;margin:12px 0 6px}
    p.lead{color:var(--muted);margin:0 0 18px}
    .board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    @media (max-width:960px){.board{grid-template-columns:1fr 1fr}}
    .col{background:rgba(23,51,35,.85);border:1px solid #2a5238;border-radius:12px;padding:10px;min-height:280px}
    .col h2{font-size:.95rem;margin:0 0 10px;color:var(--accent)}
    .card{background:#0c160f;border:1px solid #2e5a3c;border-radius:10px;padding:10px;margin-bottom:8px}
    .card .q{font-size:.92rem;line-height:1.45}
    .card .meta{font-size:.72rem;color:var(--muted);margin-top:6px}
    .card select{margin-top:8px;width:100%;background:#122218;color:var(--ink);border:1px solid #2e5a3c;border-radius:8px;padding:6px}
  </style>
</head>
<body>
<main>
  <nav><a href="/">问答</a><a href="/voice">语音</a><a href="/board">复盘看板</a><a href="/follow">农服跟进</a><a href="/market">行情</a></nav>
  <h1>农服跟进</h1>
  <p class="lead">待办 → 进行中 → 待验收 → 完成（Kaiban 列语义 · 本地 JSON）</p>
  <div class="board" id="board"></div>
</main>
<script>
async function load(){
  const res = await fetch('/api/followup');
  const data = await res.json();
  const labels = data.labels || {};
  const cols = data.columns || {};
  const root = document.getElementById('board');
  root.innerHTML = '';
  for (const st of ['todo','doing','review','done']) {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = '<h2>'+(labels[st]||st)+' ('+(cols[st]||[]).length+')</h2>';
    for (const item of (cols[st]||[])) {
      const card = document.createElement('div');
      card.className = 'card';
      const opts = ['todo','doing','review','done'].map(s => '<option value="'+s+'"'+(s===item.status?' selected':'')+'>'+(labels[s]||s)+'</option>').join('');
      card.innerHTML = '<div class="q">'+(item.title||'').replace(/</g,'&lt;')+'</div>'+
        '<div class="meta">'+(item.kind_label||item.kind||'')+' · '+(item.at||'').slice(0,19)+'</div>'+
        '<select data-id="'+item.id+'">'+opts+'</select>';
      col.appendChild(card);
    }
    root.appendChild(col);
  }
  root.querySelectorAll('select').forEach(sel => {
    sel.onchange = async () => {
      await fetch('/api/followup/'+sel.dataset.id, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status: sel.value})});
      load();
    };
  });
}
load();
</script>
</body>
</html>`;

const MARKET_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>小星 · 行情</title>
  <style>
    :root { --bg:#0f1c14; --panel:#173323; --ink:#e8f5e9; --muted:#9ccc9c; --accent:#7cb342; }
    *{box-sizing:border-box} body{margin:0;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1b4332,var(--bg));color:var(--ink);min-height:100vh}
    main{max-width:900px;margin:0 auto;padding:28px 16px 64px}
    nav a{color:var(--accent);margin-right:14px;text-decoration:none}
    h1{font-size:1.45rem;margin:12px 0 6px}
    p.lead{color:var(--muted);margin:0 0 18px}
    .spark{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
    @media (max-width:800px){.spark{grid-template-columns:1fr}}
    .box{background:rgba(23,51,35,.9);border:1px solid #2a5238;border-radius:12px;padding:12px}
    .lab{font-size:.8rem;color:var(--muted);margin-bottom:8px}
    .bars{display:flex;align-items:flex-end;gap:4px;height:56px}
    .bar{flex:1;background:linear-gradient(180deg,#aed581,#558b2f);border-radius:3px 3px 0 0}
    .bar.empty{background:#1a2e20;height:4px!important}
    .alerts{margin-bottom:14px}
    .alert{font-size:.8rem;color:#ffcc80;background:#1a1510;border:1px solid #5d4037;border-radius:8px;padding:8px;margin-bottom:6px}
    .card{background:#0c160f;border:1px solid #2e5a3c;border-radius:10px;padding:10px;margin-bottom:8px}
    .tag{font-size:.72rem;color:var(--accent)}
    .badge{display:inline-block;padding:1px 6px;border-radius:6px;font-size:.65rem;margin-right:4px}
    .whole{background:#1b4332;color:#c8e6c9}.farm{background:#3e2723;color:#ffcc80}
  </style>
</head>
<body>
<main>
  <nav><a href="/">问答</a><a href="/voice">语音</a><a href="/board">复盘看板</a><a href="/follow">农服跟进</a><a href="/market">行情</a></nav>
  <h1>行情看板</h1>
  <p class="lead">库内批发 / 地头只读 · 近 7 日均价条 · 价差跟进摘要</p>
  <div class="spark" id="spark"></div>
  <div class="alerts" id="alerts"></div>
  <div id="list"></div>
</main>
<script>
function esc(s){return String(s||'').replace(/</g,'&lt;')}
async function load(){
  const res = await fetch('/api/market');
  const data = await res.json();
  const spark = document.getElementById('spark');
  spark.innerHTML = '';
  for (const sp of (data.sparklines||[])) {
    const box = document.createElement('div');
    box.className = 'box';
    const bars = (sp.series||[]).map((s,i)=>{
      const h = sp.points&&sp.points[i]!=null ? Math.max(8,sp.points[i]) : 0;
      return '<span class="bar'+(s.avg==null?' empty':'')+'" style="height:'+h+'%" title="'+(s.date+' '+(s.avg??'—'))+'"></span>';
    }).join('');
    box.innerHTML = '<div class="lab">'+esc(sp.product)+' · 近'+esc(sp.days)+'日批发</div><div class="bars">'+bars+'</div>';
    spark.appendChild(box);
  }
  const alerts = document.getElementById('alerts');
  alerts.innerHTML = '';
  for (const a of (data.alerts&&data.alerts.cross_market)||[]) {
    alerts.innerHTML += '<div class="alert">跨市 '+esc(a.product)+' '+esc(a.a)+' vs '+esc(a.b)+' 差 '+esc(a.spread)+'</div>';
  }
  for (const a of (data.alerts&&data.alerts.farmgate)||[]) {
    alerts.innerHTML += '<div class="alert">地头 '+esc(a.product)+' '+esc(a.farmgate)+' vs '+esc(a.wholesale)+' 差 '+esc(a.spread)+'</div>';
  }
  const list = document.getElementById('list');
  list.innerHTML = '';
  for (const q of (data.quotes||[])) {
    const badge = q.badge==='地头'?'farm':'whole';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<div class="tag"><span class="badge '+badge+'">'+esc(q.badge||'')+'</span>'+esc(q.publish_date)+' · '+esc(q.market_or_region)+'</div>'+
      '<div><strong>'+esc(q.product_name)+'</strong> '+esc(q.specification||'')+'</div>'+
      '<div class="lab">'+(q.kind_label||'均价')+' '+(q.price_avg??'—')+' 元/斤</div>';
    list.appendChild(card);
  }
  if (!(data.quotes||[]).length) list.textContent = '暂无行情，请先 npm run market:seed';
}
load();
</script>
</body>
</html>`;

const VOICE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>小星 · 语音问答</title>
  <style>
    :root { --bg:#0f1c14; --panel:#173323; --ink:#e8f5e9; --muted:#9ccc9c; --accent:#7cb342; --warn:#c9a227; }
    *{box-sizing:border-box} body{margin:0;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1b4332,var(--bg));color:var(--ink);min-height:100vh}
    main{max-width:760px;margin:0 auto;padding:28px 16px 64px}
    nav a{color:var(--accent);margin-right:14px;text-decoration:none}
    h1{font-size:1.5rem;margin:12px 0 4px}
    p.lead{color:var(--muted);margin:0 0 16px}
    .status{display:inline-block;padding:4px 10px;border-radius:999px;background:#122218;border:1px solid #2e5a3c;font-size:.8rem;margin-bottom:14px}
    .row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    input{flex:1;min-width:200px;border:1px solid #2e5a3c;background:#0c160f;color:var(--ink);border-radius:10px;padding:12px 14px;font-size:1rem}
    button{border:0;background:var(--accent);color:#08210f;font-weight:700;border-radius:10px;padding:12px 18px;cursor:pointer}
    button.mic{background:#1b5e20;min-width:140px}
    button.mic.hot{background:#c62828;color:#fff}
    button:disabled{opacity:.5;cursor:not-allowed}
    #log{margin-top:16px;display:flex;flex-direction:column;gap:12px}
    .bubble{background:var(--panel);border:1px solid #2a5238;border-radius:12px;padding:12px 14px;line-height:1.55}
    .meta{font-size:.75rem;color:var(--muted);margin-top:6px}
    .hint{font-size:.85rem;color:var(--muted)}
  </style>
</head>
<body>
<main>
  <nav><a href="/">问答</a><a href="/voice">语音</a><a href="/board">复盘看板</a><a href="/follow">农服跟进</a><a href="/market">行情</a></nav>
  <h1>小星 · 语音问答</h1>
  <p class="lead">V1：按住说话（Web Speech）→ 口径问答 → TTS / 浏览器朗读</p>
  <div class="status" id="st">待命</div>
  <div class="row">
    <button class="mic" id="mic">按住说话</button>
    <input id="q" placeholder="或直接输入：宁玉有什么特点" />
    <button id="go">提问并播报</button>
  </div>
  <p class="hint" id="hint">提示：Chrome/Edge 支持语音识别；无豆包 TTS 密钥时自动用浏览器朗读。</p>
  <div id="log"></div>
</main>
<script>
const log = document.getElementById('log');
const st = document.getElementById('st');
const mic = document.getElementById('mic');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let speaking = false;

function setStatus(t){ st.textContent = t; }
function esc(s){ return String(s||'').replace(/</g,'&lt;'); }

async function playReply(data){
  if (data.tts && data.tts.ok && data.tts.audioBase64) {
    const bin = atob(data.tts.audioBase64);
    const arr = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    const blob = new Blob([arr], {type: data.tts.mime || 'audio/mpeg'});
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    speaking = true; setStatus('播报中');
    await new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });
    speaking = false; setStatus('待命');
    URL.revokeObjectURL(url);
    return;
  }
  if ('speechSynthesis' in window && data.reply) {
    speaking = true; setStatus('浏览器朗读中');
    await new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(data.reply);
      u.lang = 'zh-CN';
      u.onend = resolve;
      u.onerror = resolve;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
    speaking = false; setStatus('待命');
  }
}

async function runQuery(q){
  if(!q || speaking) return;
  setStatus('思考中');
  log.insertAdjacentHTML('afterbegin', '<div class="bubble"><b>你</b><div>'+esc(q)+'</div></div>');
  const res = await fetch('/voice/turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,speak:true})});
  const data = await res.json();
  const ttsMeta = data.tts ? (data.tts.ok ? 'tts' : (data.tts.skipped ? 'browser-tts' : 'tts-fail')) : '';
  log.insertAdjacentHTML('afterbegin', '<div class="bubble"><b>小星</b><div>'+esc(data.reply)+'</div><div class="meta">'+[data.layer,data.score,ttsMeta].filter(Boolean).join(' · ')+'</div></div>');
  await playReply(data);
}

document.getElementById('go').onclick = () => runQuery(document.getElementById('q').value.trim());
document.getElementById('q').addEventListener('keydown', e => { if(e.key==='Enter') runQuery(document.getElementById('q').value.trim()); });

if (!SR) {
  document.getElementById('hint').textContent = '当前浏览器不支持 SpeechRecognition，请用输入框提问。';
  mic.disabled = true;
} else {
  recog = new SR();
  recog.lang = 'zh-CN';
  recog.interimResults = true;
  recog.continuous = false;
  let finalText = '';
  recog.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) finalText += t;
      else interim += t;
    }
    document.getElementById('q').value = (finalText || interim).trim();
  };
  recog.onerror = () => { mic.classList.remove('hot'); setStatus('待命'); };
  recog.onend = async () => {
    mic.classList.remove('hot');
    const q = (finalText || document.getElementById('q').value || '').trim();
    finalText = '';
    if (q) await runQuery(q);
    else setStatus('待命');
  };
  const start = () => {
    if (speaking) return;
    finalText = '';
    mic.classList.add('hot');
    setStatus('聆听中');
    try { recog.start(); } catch(_) {}
  };
  const stop = () => { try { recog.stop(); } catch(_) {} };
  mic.addEventListener('mousedown', start);
  mic.addEventListener('mouseup', stop);
  mic.addEventListener('mouseleave', stop);
  mic.addEventListener('touchstart', (e) => { e.preventDefault(); start(); });
  mic.addEventListener('touchend', (e) => { e.preventDefault(); stop(); });
}
</script>
</body>
</html>`;

function readBody(req) {
  return new Promise(async (resolve) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    resolve(body);
  });
}

function readJson(req) {
  return readBody(req).then((body) => {
    try {
      return JSON.parse(body || "{}");
    } catch (_) {
      return {};
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  if (!url.startsWith("/api/market") && url !== "/healthz") {
    debugLog.debug("HTTP", `${req.method} ${url.split("?")[0]}`, null, {
      rateKey: `http:${req.method}:${url.split("?")[0]}`,
      rateMs: 2000
    });
  }

  if (req.method === "GET" && (url === "/" || url.startsWith("/?"))) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(ASK_HTML);
    return;
  }
  if (req.method === "GET" && url.startsWith("/voice")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(VOICE_HTML);
    return;
  }
  if (req.method === "GET" && url.startsWith("/board")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(BOARD_HTML);
    return;
  }
  if (req.method === "GET" && url.startsWith("/follow")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(FOLLOW_HTML);
    return;
  }
  if (req.method === "GET" && url.startsWith("/market")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(MARKET_HTML);
    return;
  }
  if (req.method === "POST" && url === "/voice/turn") {
    const body = await readJson(req);
    const result = await voiceTurn({
      query: body.query || body.text || "",
      speak: body.speak !== false
    });
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
    return;
  }
  if (req.method === "GET" && url === "/api/board") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(boardColumns()));
    return;
  }
  if (req.method === "POST" && url.startsWith("/api/board/")) {
    const id = decodeURIComponent(url.slice("/api/board/".length).split("?")[0]);
    const body = await readJson(req);
    try {
      const item = setInboxStatus(id, body.status || "pending");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: String(err.message || err), statuses: STATUSES }));
    }
    return;
  }
  if (req.method === "GET" && url === "/api/followup") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(followupBoard.boardColumns()));
    return;
  }
  if (req.method === "GET" && url === "/api/market") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(market.buildMarketDashboard({ quoteLimit: 16 })));
    return;
  }
  if (req.method === "POST" && url.startsWith("/api/followup/")) {
    const id = decodeURIComponent(url.slice("/api/followup/".length).split("?")[0]);
    const body = await readJson(req);
    try {
      const item = followupBoard.setTaskStatus(id, body.status || "todo");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }
  if (req.method === "POST" && url === "/ask") {
    const body = await readJson(req);
    const result = await askAsync(body.query || "", {
      writeGap: true,
      session: true,
      live: body.live !== false,
      llm: body.llm !== false
    });
    debugLog.info("Ask", "HTTP /ask", {
      q: String(body.query || "").slice(0, 60),
      layer: result.layer,
      llm: Boolean(result.llm)
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
    return;
  }
  if (req.method === "POST" && url === "/webhook/ask") {
    const body = await readJson(req);
    const result = handleWebhookAsk(body, ask);
    res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
    return;
  }
  if (req.method === "GET" && (url === "/healthz" || url.startsWith("/healthz?"))) {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: true,
        product: "xiaoxing",
        tts: ttsConfigured(),
        wechat: publicConfig(),
        llm: { ...llmStatus(), onGap: llmAskEnabled("gap") },
        briefing: readLatestBriefing(),
        market: {
          quotes: market.listRecentQuotes(3).length,
          dashboard: true
        }
      })
    );
    return;
  }
  if (req.method === "GET" && (url === "/briefing" || url.startsWith("/briefing?"))) {
    let card = readLatestBriefing();
    if (!card.ok || card.empty) {
      card = await buildDailyBriefing({ live: false });
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(card));
    return;
  }
  if (req.method === "POST" && url === "/briefing/refresh") {
    const body = await readJson(req).catch(() => ({}));
    let scrapeFn = null;
    if (body.live) {
      try {
        const { scrapeUrl, hasApiKey } = require("../lib/firecrawl/client.cjs");
        if (hasApiKey()) scrapeFn = scrapeUrl;
      } catch (_) {}
    }
    const card = await buildDailyBriefing({
      live: Boolean(body.live && scrapeFn),
      scrapeFn
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(card));
    return;
  }
  if (url.startsWith("/wechat")) {
    const q = parseQuery(url);
    const rawBody = req.method === "POST" ? await readBody(req) : "";
    const out = handleWechatHttp({
      method: req.method,
      query: q,
      rawBody,
      askFn: (text) => ask(text, { writeGap: true, session: false })
    });
    res.writeHead(out.status, { "Content-Type": out.contentType });
    res.end(out.body);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(port, host, () => {
  debugLog.info("HTTP", "小星服务已启动", {
    host,
    port,
    logFile: debugLog.getFilePath(),
    tts: ttsConfigured(),
    wechat: publicConfig()
  });
  console.log(`小星服务 http://${host}:${port}`);
  console.log(`语音问答 http://${host}:${port}/voice`);
  console.log(`复盘看板 http://${host}:${port}/board`);
  console.log(`农服跟进 http://${host}:${port}/follow`);
  console.log(`行情看板 http://${host}:${port}/market`);
  console.log(`Webhook   POST http://${host}:${port}/webhook/ask`);
  console.log(`语音回合 POST http://${host}:${port}/voice/turn`);
  console.log(`微信回调  http://${host}:${port}/wechat`);
  console.log(`健康检查  http://${host}:${port}/healthz`);
  console.log(`系统日志  ${debugLog.getFilePath()}`);
  console.log(`TTS 配置  ${ttsConfigured() ? "已就绪" : "未配置（将用浏览器朗读）"}`);
  console.log(`微信就绪  ${JSON.stringify(publicConfig())}`);
});
