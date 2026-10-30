// 나무타기 짧은 링크 서버. 의존 패키지 없음.
//   POST /c      확장이 도전장을 맡기고 짧은 주소의 id를 받는다(본문은 JSON 글자, text/plain이라 preflight가 없다)
//   GET  /:id    브라우저로 연 사람은 302로 바로 나무위키 도전장(#ng=… 짧은 형식)으로 보낸다(중간 흰 화면 없음).
//                메신저 미리보기 봇에게는 OG 태그를 담은 카드 페이지를 준다. 판단을 못 하면 카드 페이지가 "이동하는 중이에요"를 보이고 바로 넘긴다.
//   GET  /       웹스토어로 보낸다
//   GET  /og.png 미리보기 카드 그림(public/, wrangler.toml의 assets)
// 리다이렉트 주소는 저장한 값으로만 만들어서 아무 곳으로나 보내는 데 쓸 수 없다.
const STORE_URL = 'https://chromewebstore.google.com/detail/namutagi/fiadjnefijhjdngbdcaoahcdhkbnckfi';
// 확장의 콘텐츠 스크립트는 나무위키 페이지의 출처로 보낸다. 다른 사이트가 방문자 브라우저로 도전장을 찍어 내지 못하게 POST는 이 출처만 받는다.
const ORIGIN = 'https://namu.wiki';
const CORS = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const RULES = ['nb', 'nt', 'nc', 'nf', 'nh', 'nr'];
const DIFFS = ['easy', 'normal', 'hard', 'wild'];
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const bad = reason => json({ error: reason }, 400);
const html = (body, status = 200, cache = 'no-store') => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache } });
// 도전장은 한 번 만들면 바뀌지 않아서 Cloudflare 가장자리에 1시간 캐시한다(삭제 요청은 1시간 뒤 반영).
const KEEP = 'public, max-age=3600';
// 브라우저는 사람이 링크를 열 때 Sec-Fetch-Mode: navigate를 보낸다. 미리보기 봇은 보통 안 보내지만, 브라우저 엔진으로 긁는 봇도 있어 이름으로 한 번 더 거른다.
// 앱 안 브라우저(사람)의 UA에도 KAKAOTALK, Line 같은 앱 이름이 들어 있어서 미리보기 봇 이름만 좁게 잡는다(카카오톡 봇은 kakaotalk-scrap).
const BOT = /bot|crawl|spider|scrap|preview|facebookexternalhit|whatsapp|yeti|daumoa|embedly|vkshare|pinterest/i;
const isPerson = req => req.headers.get('Sec-Fetch-Mode') === 'navigate' && !BOT.test(req.headers.get('User-Agent') || '');
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => ID_CHARS[b % 62]).join('');
const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const took = ms => { const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000); return (m ? `${m}분 ` : '') + `${((cs % 6000) / 100).toFixed(2)}초`; };

// 나무위키 도전장 링크(짧은 형식). extension/content.js의 challengeLink와 같은 형식이어야 한다.
const RULE_CH = { nb: 'b', nt: 't', nc: 'c', nf: 'f', nh: 'h', nr: 'r' }, DIFF_CH = { easy: 'e', normal: 'n', hard: 'h', wild: 'w' };
const esc = s => String(s).replace(/[%&=#+|\s]/g, c => (c === ' ' ? '+' : encodeURIComponent(c)));
const escPath = s => s.split('/').map(x => x.replace(/[%?#\s]/g, encodeURIComponent)).join('/');
const challengeLink = c => {
  const cs = c.times.map(t => Math.floor(t / 10)), flags = RULES.filter(k => c.rules[k]).map(k => RULE_CH[k]).join('');
  const kv = [['ng', esc(c.goal)], ...(c.mode === 'daily' && c.day ? [['d', c.day]] : []), ...(c.mode === 'random' && c.diff ? [['rd', DIFF_CH[c.diff]]] : []),
    ...(flags ? [['r', flags]] : []), ...(c.rules.tl ? [['tl', c.rules.tl]] : []), ...(c.rules.ms ? [['ms', c.rules.ms]] : []),
    ['b', esc(c.by)], ['p', c.path.slice(1, -1).map(esc).join('|')], ['t', cs.slice(1).map((v, i) => (v - cs[i]).toString(36)).join('.')]];
  return `https://namu.wiki/w/${escPath(c.start)}#` + kv.map(([k, v]) => `${k}=${v}`).join('&');
};

// 확장의 parse와 같은 범위로 검사한다. 맞지 않으면 저장하지 않는다.
// . 과 .. 칸은 주소에서 접혀 /w/ 밖(예: /member/logout)으로 보내게 되므로 받지 않는다.
const okDoc = s => typeof s === 'string' && s.length > 0 && s.length <= 255 && !/[\u0000-\u001f]/.test(s) && !s.split('/').some(x => x === '.' || x === '..');
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
  if (typeof b.by !== 'string' || !b.by.trim() || b.by.length > 20 || /[\u0000-\u001f]/.test(b.by)) return 'by';
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
  if (req.headers.get('Origin') !== ORIGIN) return json({ error: 'origin' }, 403);
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

// 미리보기 카드 + 바로 이동. 메신저 크롤러는 OG 태그를 읽고, 사람은 meta refresh와 location.replace로 나무위키로 간다.
// 바탕과 글자색은 나무위키(밝은 #f5f5f5 / 어두운 #000)를 따라 화면 모드에 맞춘다. 흰 화면이 번쩍이지 않게.
const page = (title, desc, to) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escHtml(title)}</title><meta property="og:type" content="website"><meta property="og:site_name" content="나무타기">
<meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(desc)}"><meta property="og:image" content="https://namutagi.com/og.png"><meta property="og:image:width" content="400"><meta property="og:image:height" content="400"><meta name="twitter:card" content="summary">
${to ? `<meta http-equiv="refresh" content="0; url=${escHtml(to)}">` : ''}
<style>html{background:#f5f5f5;color:#212529}a{color:#0275d8;text-decoration:none}small{color:#6c757d}@media (prefers-color-scheme:dark){html{background:#000;color:#e0e0e0}a{color:#ec9f19}small{color:#9a9a9a}}
body{font:15px/1.6 "Pretendard JP",Pretendard,-apple-system,system-ui,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 16px;text-align:center;word-break:keep-all}
p{margin:0 0 8px}</style></head>
<body>${to ? `<p>나무위키로 이동하는 중이에요…</p><p><small>${escHtml(desc)}</small></p><p><small><a href="${escHtml(to)}">바로 가기</a></small></p>`
  : `<p>${escHtml(desc)}</p><p><a href="https://namu.wiki/">나무위키로 가기</a></p>`}
<p><small><a href="${STORE_URL}">나무타기 확장 설치</a></small></p><p><small>나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임이에요.</small></p>
${to ? `<script>location.replace(${JSON.stringify(to).replace(/</g, '\\u003c')})</script>` : ''}</body></html>`;

const show = async (req, id, env, ctx) => {
  const person = isPerson(req), key = new Request(`https://namutagi.com/${id}?${person ? 'go' : 'card2'}`); // 사람용(302)과 봇용(카드)을 따로 캐시(카드 모양을 바꾸면 이름을 바꿔 옛 캐시를 버린다)
  const hit = await caches.default.match(key);
  if (hit) return hit;
  const row = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(id).first();
  if (!row) return html(page('나무타기', '없는 도전장이에요. 주소를 다시 확인해 주세요.', null), 404);
  const c = { ...row, rules: JSON.parse(row.rules), path: JSON.parse(row.path), times: JSON.parse(row.times) };
  const to = new URL(challengeLink(c)).href; // Location 헤더는 ASCII여야 해서 한글을 %로 바꾼 꼴로
  const res = person ? new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': KEEP } })
    : html(page(`${c.by}님의 도전장`, `${c.start} → ${c.goal}, ${c.steps}단계 ${took(c.ms)}. 나무타기 확장이 있으면 같은 문제에 바로 도전할 수 있어요.`, to), 200, KEEP);
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
};

export default {
  async fetch(req, env, ctx) {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (pathname === '/c' && req.method === 'POST') return create(req, env);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });
    if (pathname === '/') return Response.redirect(STORE_URL, 302);
    const m = pathname.match(/^\/([0-9A-Za-z]{6})$/);
    return m ? show(req, m[1], env, ctx) : html(page('나무타기', '없는 주소예요.', null), 404);
  },
};
