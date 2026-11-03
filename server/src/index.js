// 나무타기 짧은 링크 서버. 의존 패키지 없음.
//   POST /c      확장이 도전장을 맡기고 짧은 주소의 id를 받는다(본문은 JSON 글자, text/plain이라 preflight가 없다)
//   GET  /:id    도전장 페이지. 미리보기 봇은 OG 태그를 읽고, 확장이 있는 사람은 바로 나무위키 도전장(#ng=… 짧은 형식)으로 넘어가고, 없는 사람은 설치 안내를 본다.
//   public/      /(랜딩 페이지, index.html), /welcome(설치 환영 페이지), /privacy, /shots/, /og.png, /wordmark.svg, /fonts/(wrangler.toml의 assets). 있는 파일은 Worker보다 먼저 나간다
// 리다이렉트 주소는 저장한 값으로만 만들어서 아무 곳으로나 보내는 데 쓸 수 없다.
const STORE_URL = 'https://chromewebstore.google.com/detail/namutagi/fiadjnefijhjdngbdcaoahcdhkbnckfi';
// 확장의 결과 카드(콘텐츠 스크립트)는 나무위키 페이지의 출처로, 팝업의 기록 화면은 확장 자신의 출처로 보낸다.
// 다른 사이트가 방문자 브라우저로 도전장을 찍어 내지 못하게 POST는 이 출처들만 받는다. 확장 ID는 public/site.js의 EXT와 같다(웹스토어, 개발용 압축해제).
const ORIGINS = ['https://namu.wiki', 'chrome-extension://fiadjnefijhjdngbdcaoahcdhkbnckfi', 'chrome-extension://bljboledcipggdpgboobagbhobhlgijb'];
const cors = req => ({ 'Access-Control-Allow-Origin': ORIGINS.includes(req.headers.get('Origin')) ? req.headers.get('Origin') : ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' });
const RULES = ['nb', 'nt', 'nc', 'nf', 'nh', 'nr'];
const DIFFS = ['easy', 'normal', 'hard', 'wild'];
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); // CORS 머리는 fetch에서 붙인다
const bad = reason => json({ error: reason }, 400);
const html = (body, status = 200, cache = 'no-store') => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache } });
// 도전장은 한 번 만들면 바뀌지 않아서 Cloudflare 가장자리에 1시간 캐시한다(삭제 요청은 1시간 뒤 반영).
const KEEP = 'public, max-age=3600';
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => ID_CHARS[b % 62]).join('');
const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const cut = s => (s.length > 30 ? s.slice(0, 30) + '…' : s); // 카드와 페이지의 문서 이름. 긴 글을 넣어 공지처럼 꾸미지 못하게 자른다
const took = ms => { const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000); return (m ? `${m}분 ` : '') + `${((cs % 6000) / 100).toFixed(2)}초`; };

// 나무위키 도전장 링크(짧은 형식). extension/share.js의 challengeLink와 같은 형식이어야 한다.
const RULE_CH = { nb: 'b', nt: 't', nc: 'c', nf: 'f', nh: 'h', nr: 'r' }, DIFF_CH = { easy: 'e', normal: 'n', hard: 'h', wild: 'w' };
const esc = s => String(s).replace(/[%&=#+|\s]/g, c => (c === ' ' ? '+' : encodeURIComponent(c)));
// \ 도 바꾼다: 브라우저는 주소 속 \ 를 / 로 읽어서 ..\member 같은 이름이 /w/ 밖으로 나간다.
const escPath = s => s.split('/').map(x => x.replace(/[%?#\s\\]/g, encodeURIComponent)).join('/');
const challengeLink = c => {
  const cs = c.times.map(t => Math.floor(t / 10)), flags = RULES.filter(k => c.rules[k]).map(k => RULE_CH[k]).join('');
  const kv = [['ng', esc(c.goal)], ...(c.mode === 'daily' && c.day ? [['d', c.day]] : []), ...(c.mode === 'random' && c.diff ? [['rd', DIFF_CH[c.diff]]] : []),
    ...(flags ? [['r', flags]] : []), ...(c.rules.tl ? [['tl', c.rules.tl]] : []), ...(c.rules.ms ? [['ms', c.rules.ms]] : []),
    ['b', esc(c.by)], ['p', c.path.slice(1, -1).map(esc).join('|')], ['t', cs.slice(1).map((v, i) => (v - cs[i]).toString(36)).join('.')]];
  return `https://namu.wiki/w/${escPath(c.start)}#` + kv.map(([k, v]) => `${k}=${v}`).join('&');
};

// 확장의 parse와 같은 범위로 검사한다. 맞지 않으면 저장하지 않는다.
// . 과 .. 칸은 주소에서 접혀 /w/ 밖(예: /member/logout)으로 보내게 되므로 받지 않는다(\ 도 / 로 읽히니 같이 나눠 본다).
// 글자 방향을 뒤집는 글자(U+202E 등)는 카드의 글을 다르게 보이게 꾸밀 수 있어 받지 않는다.
const okDoc = s => typeof s === 'string' && s.length > 0 && s.length <= 255 && !/[\u0000-\u001f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(s)
  && !s.split(/[\\/]/).some(x => x === '.' || x === '..');
// 닉네임 검사. extension/share.js의 nameProblem과 같은 규칙이어야 한다(확장이 먼저 알리고, 서버는 직접 보내는 요청을 막는다).
// 보이지 않는 글자(폭 없는 공백, 한글 채움 글자 등)와 운영자로 오해할 이름을 막는다. 띄어쓰기·기호·전각을 빼고 비교한다.
// ponytail: 낱말 목록이라 "운영쟈" 같은 변형은 못 막는다. 문제가 된 도전장은 D1에서 지운다.
const INVISIBLE = /[\u0000-\u001f\u007f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/;
const RESERVED = ['운영자', '운영진', '운영팀', '관리자', '관리팀', '개발자', '개발팀', '공식', '고객센터', '나무위키', '나무타기', 'namuwiki', 'namutagi', 'admin', 'official', 'staff', 'moderator'];
const nameProblem = s => INVISIBLE.test(s) ? 'invisible' : RESERVED.some(w => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '').includes(w)) ? 'reserved' : '';
const okInt = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const validate = b => {
  if (!b || typeof b !== 'object') return 'body';
  if (typeof b.pid !== 'string' || !/^[0-9a-f-]{36}$/.test(b.pid)) return 'pid';
  if (!okDoc(b.start) || !okDoc(b.goal)) return 'doc';
  if (!['custom', 'random', 'daily'].includes(b.mode)) return 'mode';
  if (b.diff != null && !DIFFS.includes(b.diff)) return 'diff';
  if (b.day != null && !okInt(b.day, 100000)) return 'day';
  const r = b.rules;
  if (!r || typeof r !== 'object' || Object.keys(r).some(k => ![...RULES, 'tl', 'ms'].includes(k)) || RULES.some(k => r[k] != null && typeof r[k] !== 'boolean')) return 'rules';
  if (!okInt(r.tl ?? 0, 99 * 60) || !okInt(r.ms ?? 0, 99)) return 'rules';
  if (typeof b.by !== 'string' || !b.by.trim() || b.by.length > 20 || nameProblem(b.by)) return 'by';
  const { path, times } = b;
  if (!Array.isArray(path) || path.length < 2 || path.length > 60 || !path.every(okDoc)) return 'path';
  if (path[0] !== b.start || path.at(-1) !== b.goal) return 'path';
  if (!Array.isArray(times) || times.length !== path.length || times[0] !== 0 || !times.every((t, i) => okInt(t, 99 * 3600e3) && (i === 0 || t >= times[i - 1]))) return 'times';
  return null;
};

// IPv6는 한 집(한 회선)이 /64를 통째로 받아 주소를 마음대로 바꿀 수 있어서 앞 64비트로 센다.
const ipKey = ip => {
  if (!ip.includes(':')) return ip;
  const [a, b] = ip.split('::'), h = a ? a.split(':') : [], t = b ? b.split(':') : [];
  return (b === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t]).slice(0, 4).join(':');
};

const create = async (req, env) => {
  if (!ORIGINS.includes(req.headers.get('Origin'))) return json({ error: 'origin' }, 403);
  if (!(await env.LIMIT.limit({ key: ipKey(req.headers.get('CF-Connecting-IP') || '') })).success) return json({ error: 'slow' }, 429);
  if (Number(req.headers.get('Content-Length')) > 8192) return bad('size'); // 큰 본문은 읽기 전에 거절(길이 없이 오면 아래에서)
  const text = await req.text();
  if (text.length > 8192) return bad('size');
  let b; try { b = JSON.parse(text); } catch { return bad('json'); }
  const why = validate(b);
  if (why) return bad(why);
  const rules = Object.fromEntries([...RULES.map(k => [k, !!b.rules[k]]), ['tl', b.rules.tl || 0], ['ms', b.rules.ms || 0]]);
  const player = await sha256(b.pid);
  for (let i = 0; i < 5; i++) { // 겹치면 다른 id로 다시
    const id = newId();
    const r = await env.DB.prepare('INSERT OR IGNORE INTO challenges (id, created_at, player, start, goal, mode, diff, day, rules, by, steps, ms, path, times, ver) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, Date.now(), player, b.start, b.goal, b.mode, b.diff ?? null, b.day ?? null, JSON.stringify(rules), b.by.trim(), b.path.length - 1, b.times.at(-1),
        JSON.stringify(b.path), JSON.stringify(b.times), typeof b.ver === 'string' ? b.ver.slice(0, 20) : null).run();
    if (r.meta.changes) return json({ id }); // 주소는 확장이 붙인다(SHORT_BASE + '/' + id)
  }
  return json({ error: 'id' }, 500);
};

// 도전장 페이지와 없는 페이지. 메신저 미리보기 봇은 OG 태그만 읽고, 사람에게는 스크립트가 확장이 있는지 물어 있으면 바로 나무위키로 보낸다.
// 공통 모양과 스크립트는 public/site.css, public/site.js(다른 페이지와 같다). 여기에는 이 페이지에만 다른 것만 둔다.
// 첫 방문 요청은 문서, site.css, site.js, 로고, 아이콘 다섯 번이다(글꼴은 대시보드 요청 제한에서 빠진다).
const STYLE = `
  h1 { margin: 0 0 24px; line-height: 1.25; }
  [data-s] > p:last-child { margin-bottom: 0; }
  table { width: auto; }
  th { width: auto; }
  td span, .nb { white-space: nowrap; }   /* 규칙 하나, "게임이에요.[1]"은 끊지 않는다 */
  /* 난이도와 모드는 게임 안(결과 카드, 수락 창)과 같은 색 칩. 밑의 설명은 받는 사람이 모드 이름만으로 모르는 것을 알려 준다 */
  td .chip { display: inline-block; padding: 0 9px; border-radius: 10px; color: #fff; font-size: .9em; line-height: 1.7; }
  .d-easy { background: #28b472; } .d-normal { background: #ec9f19; color: #1c1d1f !important; } .d-hard { background: #d64a58; } .d-wild { background: #8e5ce6; }
  .m-basic { background: #00a69c; } .m-hard { background: #00756e; } .m-extreme { background: #004d47; }
  td .note { display: block; margin-top: 4px; white-space: normal; font-size: .9em; opacity: .75; }
  @media (max-width: 520px) { .btn { display: block; width: 100%; } }
`;
const page = (title, desc, main, script = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>${escHtml(title)}</title><link rel="icon" href="/og.png"><meta property="og:type" content="website"><meta property="og:site_name" content="나무타기">
<meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(desc)}"><meta property="og:image" content="https://namutagi.com/og-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/site.css"><style>${STYLE}</style></head>
<body><header><div><a href="/"><img src="/wordmark.svg" alt="나무타기"></a></div></header><article>${main}</article><script src="/site.js"></script>${script}</body></html>`;

const notFound = () => html(page('나무타기', '없는 페이지예요. 주소를 다시 확인해 주세요.', `<h1>나무타기</h1>
<p>없는 페이지예요.<br>주소를 다시 확인해 주세요.</p><a class="btn primary" href="/">홈으로 가기</a>`), 404); // 없는 도전장과 없는 주소를 가르지 않는다

// 확장은 manifest의 externally_connectable로 namutagi.com의 'ping'에 답한다(ask는 site.js). 없으면 바로 실패한다(없는 ID, chrome.runtime 없음).
// 폰과 크롬 계열이 아닌 브라우저(userAgentData.mobile이 false가 아님)는 설치할 수 없어서 PC 안내를 보여 준다.
// 설치하러 갔다가 이 탭으로 돌아오면 다시 불러서 확인한다.
const SCRIPT = to => `<script>
const TO = ${JSON.stringify(to).replace(/</g, '\\u003c')};
const show = s => { document.querySelectorAll('[data-s]').forEach(d => { d.hidden = d.dataset.s !== s; }); document.querySelector('.fns').hidden = s === 'have'; };
Promise.race([ask('ping'), new Promise((_, no) => setTimeout(no, 1500))]).then(() => {
  show('have'); location.replace(TO);
}, () => {
  if (navigator.userAgentData?.mobile !== false) return show('phone');
  show('none');
  addEventListener('visibilitychange', () => { if (!document.hidden) location.reload(); });
});
const copy = document.getElementById('copy');
copy.onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); } catch { return prompt('이 링크를 복사해 주세요', location.href); }
  copy.textContent = '복사했어요';
  setTimeout(() => { copy.textContent = '링크 복사'; }, 2000);
};
</script>`;

// 규칙 글. extension/share.js의 MODES, modeOf, ruleItems, limitItems와 content.js의 DIFF와 같은 말을 쓴다.
// 게임 안처럼 난이도(무작위)와 규칙(모드 이름과 추가 옵션)을 나눈다. 모드에 안 맞는 조합(옛 도전장, 손으로 만든 링크)만 규칙을 하나씩 적는다.
const DIFF_NAME = { easy: '쉬움', normal: '보통', hard: '어려움', wild: '🎲 랜덤' };
const FLAG_KEYS = ['nb', 'nt', 'nc', 'nf', 'nh', 'nr'];
const MODES = { basic: { name: '기본', flags: [] }, hard: { name: '하드', flags: ['nb', 'nt', 'nh'], note: '뒤로가기, 틀 상자 링크, 허브 문서를 못 써요.' },
  extreme: { name: '익스트림', flags: FLAG_KEYS, note: '뒤로가기, 틀 상자, 분류, 각주 링크를 못 써요. 허브 문서와 지나간 문서로도 못 가요.' } };
const modeOf = r => Object.keys(MODES).find(m => FLAG_KEYS.every(k => !!r[k] === MODES[m].flags.includes(k))) || null;
const limitText = s => (s % 60 ? `${s}초` : `${s / 60}분`);
const limitItems = r => [r.ms && `${r.ms}단계 안에 도착`, r.tl && `제한 시간 ${limitText(r.tl)}`].filter(Boolean);
const ruleItems = r => [r.nb && '뒤로가기 금지', r.nt && '틀 상자 링크 금지', r.nc && '분류 링크 금지', r.nf && '각주 링크 금지', r.nh && '허브 문서 금지', r.nr && '재방문 금지', ...limitItems(r)].filter(Boolean);
const list = items => items.map((t, i) => `<span>${escHtml(t)}${i < items.length - 1 ? ',' : ''}</span>`).join(' ');
const ruleRows = c => {
  const m = modeOf(c.rules), diff = c.mode === 'random' && DIFF_NAME[c.diff];
  const rules = c.mode === 'daily' ? '' : m ? [`<span class="chip m-${m}">${MODES[m].name}</span>`, list(limitItems(c.rules))].filter(Boolean).join(' ') + (MODES[m].note ? `<span class="note">${MODES[m].note}</span>` : '')
    : list(ruleItems(c.rules));
  return (diff ? `<tr><th>난이도</th><td><span class="chip d-${c.diff}">${diff}</span></td></tr>` : '') + (rules ? `<tr><th>규칙</th><td>${rules}</td></tr>` : '');
};

const challengeMain = (c, to) => {
  const by = escHtml(c.by);
  return `<h1>${by}님의 도전장</h1>
<p><b>${escHtml(cut(c.start))}</b> 문서에서 <b>${escHtml(cut(c.goal))}</b> 문서로 이동하는 판이에요.</p>
<table><tr><th>기록</th><td>${c.steps}단계, ${took(c.ms)}</td></tr>${ruleRows(c)}</table>
<div data-s="none" hidden><p>나무타기는 본문 링크만 눌러 목표 문서까지 가는 나무위키 <span class="nb">게임이에요.<a class="ref" href="#fn1">[1]</a></span><br>${by}님과 겨루려면 나무타기 확장이 필요해요.<br>설치하고 이 탭으로 돌아오면 바로 도전할 수 있어요.</p><a class="btn primary" href="${STORE_URL}" target="_blank" rel="noopener">설치하러 가기</a></div>
<div data-s="phone" hidden><p>나무타기는 PC 크롬에서 하는 나무위키 <span class="nb">게임이에요.<a class="ref" href="#fn1">[1]</a></span><br>PC에서 이 링크를 열면 ${by}님과 겨룰 수 있어요.</p><button class="btn primary" id="copy">링크 복사</button></div>
<div data-s="have" hidden><p>나무위키로 이동하는 중이에요…<br>넘어가지 않으면 <a id="to" href="${escHtml(to)}">여기</a>를 눌러 주세요.</p></div>
<noscript><p><a href="${escHtml(to)}">나무위키에서 도전하기</a></p></noscript>
<div class="fns" hidden><span id="fn1"><a href="#">[1]</a> 나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임이에요.</span></div>`;
};

const show = async (id, env, ctx) => {
  const key = new Request(`https://namutagi.com/${id}?page5`); // 페이지 모양을 바꾸면 이름을 바꿔 옛 캐시를 버린다
  const hit = await caches.default.match(key);
  if (hit) return hit;
  const row = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(id).first();
  if (!row) return notFound();
  const c = { ...row, rules: JSON.parse(row.rules), path: JSON.parse(row.path), times: JSON.parse(row.times) };
  const to = new URL(challengeLink(c)).href;
  const res = html(page(`${c.by}님의 도전장`, `${cut(c.start)} → ${cut(c.goal)}, ${c.steps}단계 ${took(c.ms)}. 같은 문제에 도전해 보세요.`, challengeMain(c, to), SCRIPT(to)), 200, KEEP);
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
};

export default {
  async fetch(req, env, ctx) {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (pathname === '/c' && req.method === 'POST') { const res = await create(req, env); for (const [k, v] of Object.entries(cors(req))) res.headers.set(k, v); return res; }
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });
    const m = pathname.match(/^\/([0-9A-Za-z]{6})$/);
    return m ? show(m[1], env, ctx) : notFound();
  },
};
