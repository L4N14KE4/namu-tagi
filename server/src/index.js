// 나무타기 짧은 링크 서버. 의존 패키지 없음.
//   POST /c      확장이 도전장을 맡기고 짧은 주소의 id를 받는다(본문은 JSON 글자, text/plain이라 preflight가 없다)
//   GET  /:id    메신저 미리보기용 OG 태그를 담은 페이지를 주고, 사람은 바로 나무위키 도전장(#ng=… 짧은 형식)으로 보낸다
//   GET  /       웹스토어로 보낸다
// 리다이렉트 주소는 저장한 값으로만 만들어서 아무 곳으로나 보내는 데 쓸 수 없다.
const STORE_URL = 'https://chromewebstore.google.com/detail/namutagi/fiadjnefijhjdngbdcaoahcdhkbnckfi';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const RULES = ['nb', 'nt', 'nc', 'nf', 'nh', 'nr'];
const DIFFS = ['easy', 'normal', 'hard', 'wild'];
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const bad = reason => json({ error: reason }, 400);
const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
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
const okDoc = s => typeof s === 'string' && s.length > 0 && s.length <= 255 && !/[\u0000-\u001f]/.test(s);
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

const create = async (req, env) => {
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
const page = (title, desc, to) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title><meta property="og:type" content="website"><meta property="og:site_name" content="나무타기">
<meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(desc)}"><meta name="twitter:card" content="summary">
${to ? `<meta http-equiv="refresh" content="0; url=${escHtml(to)}">` : ''}</head>
<body style="font: 15px/1.6 -apple-system, system-ui, 'Apple SD Gothic Neo', sans-serif; margin: 40px auto; max-width: 560px; padding: 0 16px; word-break: keep-all;">
<p>${escHtml(desc)}</p>${to ? `<p><a href="${escHtml(to)}">나무위키에서 도전하기</a></p>` : `<p><a href="https://namu.wiki/">나무위키로 가기</a></p>`}
<p><a href="${STORE_URL}">나무타기 확장 설치</a></p><p style="color: #777;">나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임이에요.</p>
${to ? `<script>location.replace(${JSON.stringify(to).replace(/</g, '\\u003c')})</script>` : ''}</body></html>`;

const show = async (id, env) => {
  const row = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(id).first();
  if (!row) return html(page('나무타기', '없는 도전장이에요. 주소를 다시 확인해 주세요.', null), 404);
  const c = { ...row, rules: JSON.parse(row.rules), path: JSON.parse(row.path), times: JSON.parse(row.times) };
  return html(page(`${c.by}님의 도전장`, `${c.start} → ${c.goal}, ${c.steps}단계 ${took(c.ms)}. 나무타기 확장이 있으면 같은 문제에 바로 도전할 수 있어요.`, challengeLink(c)));
};

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (pathname === '/c' && req.method === 'POST') return create(req, env);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });
    if (pathname === '/') return Response.redirect(STORE_URL, 302);
    const m = pathname.match(/^\/([0-9A-Za-z]{6})$/);
    return m ? show(m[1], env) : html(page('나무타기', '없는 주소예요.', null), 404);
  },
};
