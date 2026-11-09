const $ = id => document.getElementById(id);
const enc = name => name.split('/').map(encodeURIComponent).join('/');
const docOf = url => {
  try { const u = new URL(url); return u.hostname === 'namu.wiki' && u.pathname.startsWith('/w/') ? decodeURIComponent(u.pathname.slice(3)) : null; }
  catch { return null; }
};
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const store = chrome.storage.local;
const pad = n => String(n).padStart(2, '0');
const dur = ms => { if (ms < 60000) return (ms / 1000).toFixed(1) + '초'; const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}분 ${s % 60}초`; }; // 한 단계에 걸린 시간
const fmt = ms => { const cs = Math.floor(ms / 10), s = Math.floor(cs / 100); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${pad(cs % 100)}`; };
const DIFF = { easy: '쉬움', normal: '보통', hard: '어려움', wild: '🎲 랜덤' };

// ---- 화면 전환: 설명(처음 한 번, 그 뒤엔 ?), 게임, 기록 ----
const views = ['intro', 'game', 'records'];
const show = view => {
  for (const v of views) $(v).hidden = v !== view;
  $('help').classList.toggle('on', view === 'intro');
  $('showRecords').classList.toggle('on', view === 'records');
  if (view === 'records') renderRecords();
};
$('help').onclick = () => { if ($('intro').hidden) setIntro(true); show($('intro').hidden ? 'intro' : 'game'); };
$('showRecords').onclick = () => show($('records').hidden ? 'records' : 'game');
// 설명 글과 모양은 intro.js. 처음 연 팝업은 짧은 설명(확인이 스크롤 없이 보임)을, ? 는 전체 설명을 보여 준다.
document.head.append(el('style', { textContent: LR_INTRO.css }));
const setIntro = full => { $('introBody').innerHTML = full ? LR_INTRO.html : LR_INTRO.short; $('introMore').hidden = full; };
setIntro(true);
$('introMore').onclick = () => { setIntro(true); window.scrollTo(0, 0); };
$('introDone').onclick = () => { store.set({ introSeen: true }); show('game'); };

// 직접 출제와 무작위 탭. 마지막에 쓴 탭과 난이도를 기억한다.
const setMode = mode => {
  for (const b of document.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.mode === mode);
  $('f').hidden = mode !== 'custom';
  $('randomPanel').hidden = mode !== 'random';
  $('dailyPanel').hidden = mode !== 'daily';
  $('rules').hidden = mode === 'daily';
  $('pick').hidden = true;
  if (mode !== 'daily') (mode === 'random' ? $('goRandom') : $('go')).before($('rules')); // 규칙 칸은 두 탭이 같이 쓴다. 고른 뒤 누르게 시작 버튼 바로 위로
  if (mode === 'daily') renderDaily();
};
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => setMode(b.dataset.mode);
const DIFF_NOTE = { easy: '들어오는 링크가 많은 문서가 목표예요.', normal: '들어오는 링크가 적당한 문서가 목표예요.', hard: '들어오는 링크가 적은 문서가 목표예요.',
  wild: '시작도 목표도 나무위키 랜덤 문서예요.\n도달할 수 없을 수도 있어요.' };
const noteDiff = () => {
  const d = document.querySelector('input[name="diff"]:checked').value;
  $('diffNote').textContent = DIFF_NOTE[d];
  $('fieldBox').hidden = d === 'wild' || !fdata; // 랜덤은 시작도 목표도 나무위키 랜덤 문서라 분야가 없다
};
for (const r of document.querySelectorAll('input[name="diff"]')) r.onchange = () => { store.set({ diff: r.value }); noteDiff(); };
// ---- 무작위 분야 ----
// fields.json(share.js의 fieldsData)의 묶음 칩을 누르면 분야 칩이 펼쳐진다. 분야는 여러 개 고를 수 있고(묶음을 넘나들어도 유지), 아무것도 안 고르면 아무거나. 고른 분야는 기억한다.
// 뽑을 때는 고른 분야 중 하나를 균등하게 뽑고 그 분야에서 목표(도착)만 뽑는다(share.js의 draw). 시작은 예전처럼 나무위키 랜덤 문서.
let fdata = null, fgrp = '';
const fsel = new Set();
const fieldsChanged = () => { store.set({ fields: [...fsel] }); renderFields(); };
const renderFields = () => {
  if (!fdata) return;
  const count = g => g[1].filter(f => fsel.has(f)).length;
  $('fG').replaceChildren(
    el('button', { type: 'button', className: 'chip any' + (fsel.size ? '' : ' on'), textContent: '아무거나', onclick: () => { fsel.clear(); fgrp = ''; fieldsChanged(); } }),
    ...fdata.groups.map(g => el('button', { type: 'button', className: 'chip grp' + (g[0] === fgrp ? ' on' : ''), onclick: () => { fgrp = fgrp === g[0] ? '' : g[0]; renderFields(); } },
      g[0], ...(count(g) ? [el('b', { textContent: String(count(g)) })] : []))));
  const g = fdata.groups.find(x => x[0] === fgrp);
  $('fSub').hidden = !g;
  if (g) {
    const all = g[1].every(f => fsel.has(f));
    $('fF').replaceChildren(
      el('button', { type: 'button', className: 'chip all' + (all ? ' on' : ''), textContent: `${g[0]} 전체`, onclick: () => { g[1].forEach(f => (all ? fsel.delete(f) : fsel.add(f))); fieldsChanged(); } }),
      ...g[1].map(f => el('button', { type: 'button', className: 'chip fld' + (fsel.has(f) ? ' on' : ''), textContent: f, onclick: () => { fsel.has(f) ? fsel.delete(f) : fsel.add(f); fieldsChanged(); } })));
  }
  const l = [...fsel];
  $('fieldVal').textContent = l.length ? (l.length <= 2 ? l.join(', ') : `${l.slice(0, 2).join(', ')} 외 ${l.length - 2}`) : '아무거나';
  // 분야는 도착(목표)만 정한다. 글에도 "목표가"로 밝힌다.
  $('fieldNote').textContent = !l.length ? '목표가 모든 분야에서 골고루 나와요.' : l.length === 1 ? `목표가 ${l[0]} 분야에서 나와요.` : `목표가 고른 ${l.length}개 분야에서 골고루 나와요.`;
};
// ---- 규칙 ----
// 직접 출제와 무작위에만 적용한다(오늘의 문제는 모두 같은 규칙). 마지막 선택을 기억한다.
// 모드(기본, 하드, 익스트림, share.js의 MODES)와 추가 옵션(제한 시간, 최대 단계)을 몇 개 값 중에 고른다. 값이 적어야 같은 규칙 기록끼리 모인다.
// 저장 모양은 예전 스위치 때와 같다(nb~nr, tl초, ms). 게임과 도전장 링크는 아무 조합이나 그대로 돈다.
const picked = name => document.querySelector(`input[name="${name}"]:checked`).value;
// 허브 문서 목록(접이식): 어떤 문서가 막히는지 미리 볼 수 있다. 목록은 hubs.js(역링크 많은 순).
$('hubSum').textContent = `허브 문서 목록 보기 (${LR_HUBS.docs.length}개)`;
$('hubList').textContent = LR_HUBS.docs.join(', ');
const FLAGS = { nb: '뒤로 금지', nt: '틀 금지', nc: '분류 금지', nf: '각주 금지', nh: '허브 금지', nr: '재방문 금지' };
const rules = () => ({ ...Object.fromEntries(Object.keys(FLAGS).map(k => [k, LR_SHARE.MODES[picked('rmode')].flags.includes(k)])), tl: Number(picked('tl')), ms: Number(picked('ms')) });
const noteRules = () => {
  const r = rules();
  $('modeNote').textContent = LR_SHARE.MODES[picked('rmode')].note; // 설명은 도전장 수락 창과 같다(share.js)
  $('hubs').hidden = !r.nh;
  $('optsNote').textContent = [r.tl && `${r.tl / 60}분`, r.ms && `${r.ms}단계`].filter(Boolean).join(', ');
};
for (const i of document.querySelectorAll('#rules input[type="radio"]')) i.onchange = () => { store.set({ rules: rules() }); noteRules(); };

// ---- 나무위키 탭 연결 ----
// 연결(port)이 살아 있는 동안 그 탭의 콘텐츠 스크립트가 자동완성과 목표 확인을 맡는다. 팝업이 닫히면 연결이 끊기고
// 그 탭은 원래대로 돌아간다. 확장을 새로고침한 뒤 열려 있던 탭은 그 탭을 새로고침해야 답한다.
let port = null, reqId = 0, nsTab = null;
const waiting = new Map();
const connect = tabId => {
  nsTab = tabId;
  port = chrome.tabs.connect(tabId, { name: 'popup' });
  port.onMessage.addListener(m => {
    if (m.theme) document.documentElement.dataset.theme = m.theme; // 나무위키 탭의 테마를 따른다
    else { waiting.get(m.id)?.(m.data); waiting.delete(m.id); }
  });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError; port = null;
    // 확장을 새로고침하기 전에 열린 탭에는 새 콘텐츠 스크립트가 없어 연결이 바로 끊긴다. 말없이 추천이 비는 대신 팝업을 덮고 알려 준다.
    $('dead').hidden = false;
  });
};
// 탭을 새로고침하면 새 콘텐츠 스크립트가 붙으므로, 다 불러온 뒤 다시 연결하고 안내를 닫는다.
$('reload').onclick = () => {
  const btn = $('reload'); btn.disabled = true; btn.textContent = '새로고침 중…';
  const done = (id, info) => {
    if (id !== nsTab || info.status !== 'complete') return;
    chrome.tabs.onUpdated.removeListener(done);
    btn.disabled = false; btn.textContent = '탭 새로고침'; $('dead').hidden = true; connect(nsTab);
  };
  chrome.tabs.onUpdated.addListener(done);
  chrome.tabs.reload(nsTab);
};
const request = msg => port ? new Promise(res => { const id = ++reqId; waiting.set(id, res); port.postMessage({ id, ...msg }); }) : Promise.resolve(null);

// 시작과 목표가 같으면 바로 알리고 시작 버튼을 막는다. 넘겨주기로만 같은 경우(UN·유엔)는 목표 확인 뒤에 걸러진다.
// 칸이 바뀔 때마다 여기를 지나므로 입력도 여기서 남긴다(draft). 팝업은 페이지를 누르기만 해도 닫혀서, 문서를 옮겨 다니며 "이 문서로"를 하나씩 누를 수 있게.
// chrome.storage.session이라 크롬을 끄면 사라진다. 우클릭 메뉴(background.js)도 같은 draft에 넣는다. 직접 출제로 판을 시작하면 지운다(launch).
const draft = chrome.storage.session;
const check = () => {
  const s = $('start').value.trim(), g = $('goal').value.trim();
  const same = s !== '' && s === g;
  $('err').textContent = same ? '시작과 목표가 같아요' : '';
  $('go').disabled = same;
  $('pick').hidden = true;
  $('clear').hidden = !s && !g;
  draft.set({ draft: { start: $('start').value, goal: $('goal').value } });
};
$('clear').onclick = () => { $('start').value = $('goal').value = ''; check(); };

// 지금 탭이 나무위키면 연결하고 "이 문서로"를 켠다. activeTab 덕분에 팝업을 연 탭의 주소만 읽을 수 있다.
// 환영 페이지의 시작 버튼으로 열린 팝업은 주소를 못 읽는다. 대신 background.js가 남긴 startTab이 그 탭이면 나무위키 대문이니 연결한다.
chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  const url = tab?.url || '';
  const { startTab } = await chrome.storage.session.get('startTab');
  if (startTab) chrome.storage.session.remove('startTab');
  if (/^https:\/\/namu\.wiki\//.test(url) || (!url && tab && tab.id === startTab)) connect(tab.id);
  else $('hint').textContent = '나무위키 탭에서 열면 문서 이름 추천, "이 문서로", 목표 문서 확인을 쓸 수 있어요.';
  const doc = docOf(url);
  for (const b of document.querySelectorAll('[data-fill]')) {
    if (!doc) { b.disabled = true; b.title = '나무위키 문서 탭에서 열어 주세요'; continue; }
    b.title = doc;
    b.onclick = () => { $(b.dataset.fill).value = doc; check(); };
  }
});

// ---- 자동완성 ----
for (const input of document.querySelectorAll('.row input')) {
  const ul = input.parentElement.nextElementSibling;
  let timer, seq = 0, active = -1;
  const list = items => {
    ul.replaceChildren(...items.map(t => el('li', { textContent: t })));
    ul.hidden = !items.length; active = -1;
  };
  const pick = t => { input.value = t; list([]); check(); };
  input.addEventListener('input', () => {
    check();
    clearTimeout(timer);
    const q = input.value.trim(), my = ++seq;
    if (!q || !port) return list([]);
    timer = setTimeout(async () => { const items = await request({ type: 'suggest', q }); if (my === seq) list(items || []); }, 250);
  });
  ul.addEventListener('mousedown', e => { if (e.target.tagName === 'LI') { e.preventDefault(); pick(e.target.textContent); } });
  input.addEventListener('keydown', e => {
    const lis = [...ul.children];
    if (e.isComposing || ul.hidden || !lis.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length;
      lis.forEach((li, i) => li.classList.toggle('on', i === active));
      lis[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(lis[active].textContent); }
    else if (e.key === 'Escape') { e.preventDefault(); list([]); }
  });
  input.addEventListener('blur', () => list([]));
  // 채워진 칸을 다시 누르면 전부 고른다: 바로 치면 덮어써지고, 그냥 나가면 그대로 남는다. 이미 커서가 있는 칸을 또 누르면 평소처럼 커서만 옮긴다.
  input.addEventListener('mousedown', e => { if (document.activeElement !== input) { e.preventDefault(); input.focus(); input.select(); } });
}

// ---- 게임 시작 ----
// 무작위 목표: words.js 목록(정식 이름, 역링크 수로 나눈 난이도)에서 뽑는다. 최근에 나온 단어는 피하고, 다 쓰면 그 난이도만 다시 돈다.
// 난이도가 없으면(직접 출제에서 목표를 비움) 난이도부터 셋 중 하나를 고른다. 목록 전체에서 뽑으면 어려움(약 64%)으로 쏠린다.
const pickGoal = async diff => {
  const pool = LR_WORDS[diff || ['easy', 'normal', 'hard'][Math.floor(Math.random() * 3)]];
  let { used = [] } = await store.get('used');
  let left = pool.filter(w => !used.includes(w));
  if (!left.length) { left = pool; used = used.filter(w => !pool.includes(w)); }
  const goal = left[Math.floor(Math.random() * left.length)];
  await store.set({ used: [...used, goal].slice(-2000) });
  return goal;
};
// 목표가 확정되면 새 탭을 연다. 시작이 비어 있으면 나무위키 랜덤 문서에서 시작한다(302로 옮겨 가도 해시는 따라간다).
// 해시 형식은 content.js의 parse와 같다(rs=무작위 시작, nb·nt·tl=규칙, day=오늘의 문제 회차).
const ruleParams = r => ({ ...Object.fromEntries(Object.keys(FLAGS).filter(k => r[k]).map(k => [k, '1'])), ...(r.tl ? { tl: String(r.tl) } : {}), ...(r.ms ? { ms: String(r.ms) } : {}) });
const launch = (start, goal, extra = {}) => {
  if (start && start === goal) { $('err').textContent = '시작과 목표가 같아요'; return; } // UN과 유엔처럼 넘겨주기로 같은 경우
  const hash = new URLSearchParams({ 'ng-goal': goal, mode: 'custom', ...(extra.mode === 'daily' ? {} : ruleParams(rules())), ...extra, ...(start ? {} : { rs: '1' }) });
  if (!extra.mode) draft.remove('draft'); // 직접 출제로 시작하면 입력을 비운다
  chrome.tabs.create({ url: (start ? `https://namu.wiki/w/${enc(start)}` : 'https://namu.wiki/random') + '#' + hash });
};
const busy = (btn, on, label) => { btn.disabled = on; btn.textContent = on ? '확인 중…' : label; };
// 나무위키 탭이 목표 문서를 확인한다(정식 이름, 존재, 동음이의어). 동음이의어면 여기서 뜻을 고른다.
const resolveGoal = async (start, name) => {
  busy($('go'), true, '게임 시작'); $('pick').hidden = true;
  const r = await request({ type: 'probe', name });
  busy($('go'), false, '게임 시작');
  if (!r) return; // 그새 연결이 끊김
  if (!r.ok) { $('err').textContent = r.reason; return; }
  // 게임 탭이 다시 읽지 않도록 목표 미리보기를 저장해 둔다(최근 200개).
  if (r.preview) { const { previews = {} } = await store.get('previews'); await store.set({ previews: Object.fromEntries([...Object.entries(previews).slice(-199), [r.doc, r.preview]]) }); }
  if (!r.near) return launch(start, r.doc);
  const btn = d => el('button', { type: 'button', className: 'btn', textContent: d === r.doc ? `${d} (동음이의어 문서 자체)` : d,
    onclick: () => (d === r.doc ? launch(start, d) : resolveGoal(start, d)) });
  const listBox = el('div', { className: 'list' }, ...[r.doc, ...r.near].map(btn));
  if (r.rest.length) listBox.append(el('details', { open: !r.near.length }, el('summary', { textContent: `다른 링크 ${r.rest.length}개` }), ...r.rest.map(btn)));
  $('pick').replaceChildren(el('h3', { textContent: `'${r.doc}'는 동음이의어 문서예요.\n목표를 골라 주세요.` }), listBox);
  $('pick').hidden = false;
};

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const start = $('start').value.trim(), goal = $('goal').value.trim();
  if (start && start === goal) return check();
  if (!goal) return launch(start, await pickGoal(null)); // 목록 단어는 정식 이름이라 확인할 필요가 없다
  if (port) return resolveGoal(start, goal);
  // 목표 확인(정식 이름, 동음이의어 고르기)은 나무위키 탭이 해 준다. 연결이 없으면(나무위키가 아닌 탭, 새로고침 안 한 탭) 시작하지 않는다.
  $('err').textContent = '목표 문서를 확인하려면\n나무위키 탭에서 팝업을 열어 주세요.';
});
$('goRandom').onclick = async () => {
  const diff = document.querySelector('input[name="diff"]:checked').value;
  $('errRandom').textContent = '';
  if (diff === 'wild') return launch('', '', { mode: 'random', diff }); // 랜덤은 시작도 목표도 새 탭이 /random으로 뽑는다
  // 분야 목록에서 목표를 뽑는다(시작은 비워서 새 탭이 /random으로 뽑는다). 목록을 못 읽으면(그리고 분야를 고르지 않았으면) 예전처럼 words.js 목표와 무작위 시작.
  let r = null;
  try {
    const { used = [] } = await store.get('used');
    r = LR_SHARE.draw(fdata || await LR_SHARE.fieldsData(), [...fsel], diff, used, LR_WORDS);
    if (r) await store.set({ used: [...used, r.goal].slice(-2000) });
  } catch {}
  if (r) return launch(r.start, r.goal, { mode: 'random', diff, rs: '1', ...(r.fd ? { fd: r.fd } : {}), ...(fsel.size ? { fds: [...fsel].join(',') } : {}) });
  if (fsel.size) return void ($('errRandom').textContent = '고른 분야에서 문서를 못 뽑았어요.');
  launch('', await pickGoal(diff), { mode: 'random', diff });
};

// ---- 오늘의 문제 ----
// 2026-10-25(한국 시간)를 1로 센 날짜 번호를 씨앗으로, 무작위 모드 목록(words.js)의 보통 구간 문서에서 시작과 목표를 뽑는다. 모두 같은 문제를 받는다.
// 보통 구간만 쓰는 것은 쉬우면 너무 싱겁게 풀리기 때문이다. 허브 목록과는 상관없다.
// 목록은 정렬한 집합으로만 쓴다(파일 안 순서는 상관없음). 그것을 고정 순서 Q로 한 번 섞어 둔다.
// 목표는 Q를 바퀴(N일)마다 다시 섞은 순서대로 하루에 하나씩 쓴다. 시작은 Q에서 목표 위치로부터 s칸 뒤 문서이고, s는 바퀴마다 1, 2, 3...으로 커진다.
// 그래서 (시작, 목표) 쌍은 같은 쌍도 뒤집힌 쌍도 ceil(N/2)-1바퀴(N=889면 약 1081년) 동안 다시 안 나온다. scripts/check-daily.mjs가 이를 확인한다.
// ponytail: words.js를 다시 만들어 보통 구간이 바뀌면(문서를 더하거나, 역링크 수가 경계를 넘나들면) 그 뒤로 모든 날의 문제가 바뀐다(옛 판의 기록은 자기 시작·목표를 들고 있어 괜찮다). 친구와 같은 버전이어야 오늘 문제가 같다.
const FIRST_DAY = Date.UTC(2026, 9, 25);
const { dayLabel } = LR_SHARE;
const dayNumber = () => Math.floor((Date.now() + 9 * 3600e3 - FIRST_DAY) / 86400e3) + 1;
const seeded = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffled = (list, seed) => { const a = [...list], rnd = seeded(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dailyCombo = n => {
  const Q = shuffled([...LR_WORDS.normal].sort(), 20261025), N = Q.length;
  const c = Math.floor((n - 1) / N), K = Math.ceil(N / 2) - 1; // c: 몇 번째 바퀴, K: 쌍이 안 겹치는 바퀴 수
  const goal = shuffled(Q, c * 104729 + 7)[(n - 1) % N];
  return { start: Q[(Q.indexOf(goal) + 1 + (c % K)) % N], goal };
};
// 지나간 문서 목록(이동내역). 뒤로가기나 앞으로가기로 간 곳에는 표시가 붙는다. 버튼을 누르면 펼치고 접는다.
const trailList = r => el('ol', { className: 'trail', hidden: true }, ...r.path.map((d, i) => el('li', {},
  ...(Number.isFinite(r.times?.[i]) && Number.isFinite(r.times?.[i + 1]) ? [el('span', { className: 'dt', textContent: dur(r.times[i + 1] - r.times[i]), title: '이 문서에 머문 시간' })] : []), d, ...(r.back?.[i] ? [el('small', { textContent: ' 뒤로/앞으로' })] : []))));
const trailToggle = list => { const b = el('button', { type: 'button', className: 'linkbtn', textContent: '이동내역 보기', onclick: () => { list.hidden = !list.hidden; b.textContent = list.hidden ? '이동내역 보기' : '이동내역 접기'; } }); return b; };
// 시작 → 목표 한 줄. 이름이 길면 시작과 목표를 따로 줄여서 목표가 늘 보인다(통째로 줄이면 긴 시작 문서에 목표가 가려진다). 전체 이름은 마우스를 올리면 보인다.
const whatOf = r => el('span', { className: 'what', title: `${r.start} → ${r.goal}` },
  el('span', { textContent: r.start }), el('span', { className: 'arr', textContent: '→' }), el('span', { className: 'g', textContent: r.goal }));
// 끝낸 판을 기록 화면에서도 공유한다. 공유 칸은 결과 카드와 같다(share.js). 처음 누를 때 만든다. 단계별 시간이 없는 판은 도전장을 못 만들어 버튼을 숨긴다.
const sharePart = r => {
  const slot = el('div', { className: 'shareslot', hidden: true });
  let made = false, making = false; // 칸을 만드는 동안 또 누르면 무시한다(안 그러면 열렸다가 바로 닫힌다)
  const b = el('button', { type: 'button', className: 'linkbtn', textContent: '공유하기', hidden: !(r.win && r.times?.length === r.path.length), onclick: async () => {
    if (making) return;
    if (!made) { making = true; slot.append(await LR_SHARE.form(nick => ({ ...r, vs: { by: nick, steps: r.steps, ms: r.ms, path: r.path, times: r.times } }))); made = true; making = false; }
    slot.hidden = !slot.hidden; b.textContent = slot.hidden ? '공유하기' : '공유 접기';
    if (!slot.hidden) slot.querySelector('input').focus();
  } });
  return [b, slot];
};
const renderDaily = async () => {
  const n = dayNumber(), { start, goal } = dailyCombo(n);
  $('dailyNo').textContent = `${dayLabel(n)}의 문제`;
  $('dailyCombo').textContent = `${start} → ${goal}`;
  LR_SHARE.fieldsData().then(d => { const f = LR_SHARE.fieldOf(d, goal); if (f) $('dailyCombo').replaceChildren(`${start} → ${goal}`, el('span', { className: 'fchip', textContent: f })); }, () => {}); // 목표가 든 분야(없으면 안 붙임)
  const { records = [] } = await store.get('records');
  const wins = records.filter(r => r.mode === 'daily' && r.win);
  const today = wins.filter(r => r.day === n).reduce((b, r) => (!b || better(r, b) ? r : b), null);
  const days = new Set(wins.map(r => r.day));
  let streak = 0;
  for (let d = days.has(n) ? n : n - 1; days.has(d); d--) streak++;
  $('dailyMine').textContent = today ? `오늘 ${today.steps}단계, ${fmt(today.ms)}에 풀었어요` : '아직 안 풀었어요';
  $('dailyStreak').hidden = !streak;
  $('dailyStreak').textContent = `연속 ${streak}일째`;
  const list = today ? trailList(today) : null, btn = $('dailyTrailBtn');
  btn.hidden = !list; btn.textContent = '이동내역 보기'; $('dailyTrail').replaceChildren(...(list ? [...list.children] : [])); $('dailyTrail').hidden = true;
  btn.onclick = () => { $('dailyTrail').hidden = !$('dailyTrail').hidden; btn.textContent = $('dailyTrail').hidden ? '이동내역 보기' : '이동내역 접기'; };
};
$('goDaily').onclick = async () => {
  const n = dayNumber(), { start, goal } = dailyCombo(n);
  const fd = await LR_SHARE.fieldsData().then(d => LR_SHARE.fieldOf(d, goal), () => '');
  launch(start, goal, { mode: 'daily', day: String(n), ...(fd ? { fd } : {}) });
};

// ---- 기록 ----
// 콘텐츠 스크립트가 끝난 판마다 남긴 records(최근 200판)로 통계를 낸다. 최고 기록은 단계가 적을수록, 같으면 빠를수록 좋다.
const better = (a, b) => a.steps < b.steps || (a.steps === b.steps && a.ms < b.ms);
const stat = (value, label) => el('div', { className: 'stat' }, el('b', { textContent: value }), el('span', { textContent: label }));
// 끝난 이유를 한 줄에 들어가는 짧은 말로 줄인다. 전체 문구는 마우스를 올리면 보인다.
const shortReason = r => !r ? '종료' : r.includes('그만') ? '그만둠' : r.includes('제한 시간') ? '시간 초과' : r.includes('단계 안에') ? '단계 초과' : r.includes('주소창') ? '주소창 이동'
  : r.includes('뒤로가기') ? '뒤로가기 금지' : r.includes('허브') ? '허브 문서' : r.includes('이미 지나간') ? '재방문' : r.includes('누르지 않은') ? '링크 외 이동'
  : r.includes('끝내지 않음') ? '끝내지 않음' : r.includes('다시 시작') ? '다시 시작함' : r.includes('떠났') ? '화면 떠남' : r.includes('개발자 도구') ? '개발자 도구' : '종료';
// 규칙 조합: 같은 규칙으로 한 판끼리만 비교해야 해서, 통계와 최고 기록과 최근 판을 규칙 조합별로 따로 본다.
// 키는 content.js의 ruleKey와 같다. 규칙이 없던 옛 기록은 "규칙 없음"과 같다.
const RULE_FLAGS = Object.keys(FLAGS);
const ruleKeyOf = r => { const x = r.rules || {}; return RULE_FLAGS.map(k => (x[k] ? 1 : 0)).join('') + `/${x.tl || 0}/${x.ms || 0}`; };
const ruleLabelOf = r => {
  const x = r.rules || {}, m = LR_SHARE.modeOf(x); // 모드에 맞으면 모드 이름, 아니면(옛 기록, 도전장) 규칙을 하나씩
  const on = [...(m ? [LR_SHARE.MODES[m].name] : RULE_FLAGS.filter(k => x[k]).map(k => FLAGS[k])), x.tl && (x.tl % 60 ? `${x.tl}초 제한` : `${x.tl / 60}분 제한`), x.ms && `${x.ms}단계 제한`].filter(Boolean);
  return on.join(', ');
};
// 기록은 모드(기본, 하드, 익스트림) 탭으로 나눠 본다. 같은 모드라도 추가 옵션이 다르면 기록을 비교할 수 없어서, 옵션 조합이 둘 이상이면
// 고르는 칸을 띄운다(처음엔 그 모드에서 가장 최근에 한 판의 것, '전체'는 합쳐 보기). 모드에 안 맞는 옛 조합(스위치 시절 기록,
// 손으로 만든 도전장)은 있을 때만 '기타' 탭에 모으고, 그 안에서는 규칙 조합마다 나눈다. 탭은 처음엔 가장 최근에 한 판의 모드.
const modeKeyOf = r => LR_SHARE.modeOf(r.rules || {}) || 'other';
const optKeyOf = r => (modeKeyOf(r) === 'other' ? ruleKeyOf(r) : `${r.rules?.tl || 0}/${r.rules?.ms || 0}`);
const optLabelOf = r => (modeKeyOf(r) === 'other' ? ruleLabelOf(r)
  : [r.rules?.tl && (r.rules.tl % 60 ? `${r.rules.tl}초 제한` : `${r.rules.tl / 60}분 제한`), r.rules?.ms && `${r.rules.ms}단계 제한`].filter(Boolean).join(', ') || '추가 옵션 없음');
let recMode = null, recOpt = null; // 모드 키, 옵션 조합 키 또는 'all'
const renderRecords = async () => {
  const { records: all = [] } = await store.get('records');
  const box = $('records');
  if (!all.length) return box.replaceChildren(el('p', { className: 'empty', textContent: '아직 끝낸 판이 없어요.\n한 판 해 보세요!' }));
  const modes = [...Object.keys(LR_SHARE.MODES), ...(all.some(r => modeKeyOf(r) === 'other') ? ['other'] : [])];
  if (!modes.includes(recMode)) recMode = modeKeyOf(all[0]);
  const inMode = all.filter(r => modeKeyOf(r) === recMode);
  const groups = new Map();
  for (const r of inMode) { const k = optKeyOf(r); if (!groups.has(k)) groups.set(k, { label: optLabelOf(r), n: 0 }); groups.get(k).n++; }
  if (!recOpt || (recOpt !== 'all' && !groups.has(recOpt))) recOpt = inMode.length ? optKeyOf(inMode[0]) : 'all';
  const records = recOpt === 'all' ? inMode : inMode.filter(r => optKeyOf(r) === recOpt);
  const tabs = el('div', { className: 'seg rectabs' }, ...modes.map(m => el('label', { className: 'm-' + m },
    el('input', { type: 'radio', name: 'recmode', checked: m === recMode, onchange: () => { recMode = m; recOpt = null; renderRecords(); } }), m === 'other' ? '기타' : LR_SHARE.MODES[m].name)));
  const picker = groups.size < 2 ? [] : [el('select', { className: 'rulesel', title: '추가 옵션별로 보기', onchange: e => { recOpt = e.target.value; renderRecords(); } },
    ...[...groups].map(([k, g]) => el('option', { value: k, textContent: `${g.label} (${g.n}판)`, selected: k === recOpt })),
    el('option', { value: 'all', textContent: `전체 (${inMode.length}판)`, selected: recOpt === 'all' }))];
  const wins = records.filter(r => r.win);
  const avg = f => wins.length ? wins.reduce((s, r) => s + f(r), 0) / wins.length : 0;
  let streak = 0, best = 0, run = 0;
  for (const r of records) { if (!r.win) break; streak++; }
  for (const r of [...records].reverse()) { run = r.win ? run + 1 : 0; best = Math.max(best, run); }
  const bestByDiff = Object.keys(DIFF).map(d => [d, wins.filter(r => r.mode === 'random' && r.diff === d).reduce((b, r) => (!b || better(r, b) ? r : b), null)]);
  let armed = false;
  const reset = el('button', { className: 'btn start', textContent: '기록 지우기',
    onclick: async () => {
      if (!armed) { armed = true; reset.textContent = '한 번 더 누르면 모두 지워져요'; return; }
      await store.remove(['records', 'used']); renderRecords();
    } });
  if (!records.length) return box.replaceChildren(tabs, el('p', { className: 'empty', textContent: `${LR_SHARE.MODES[recMode].name} 모드로 끝낸 판이 아직 없어요.` }), reset);
  box.replaceChildren(
    tabs, ...picker,
    el('div', { className: 'grid' },
      stat(records.length, '판'), stat(`${Math.round(wins.length / records.length * 100)}%`, '도착률'), stat(streak, '연속 도착'),
      stat(wins.length ? avg(r => r.steps).toFixed(1) : '-', '평균 단계'), stat(wins.length ? fmt(avg(r => r.ms)).slice(0, 5) : '-', '평균 시간'), stat(best, '최고 연속')),
    el('h3', { textContent: '무작위 최고 기록' }),
    // 최근 판과 같은 모양: 시작 → 목표와 기록을 한 줄에, 지나간 문서는 이동내역 보기로 편다(경로를 다 늘어놓으면 길 때 어지럽다).
    el('ul', { className: 'best' }, ...bestByDiff.map(([d, r]) => {
      const name = el('b', { textContent: DIFF[d].replace('🎲 ', '') }); // 이름 칸에서는 주사위를 빼고 글자만
      if (!r) return el('li', {}, name, el('span', { textContent: '아직 없어요' }));
      const trail = trailList(r), [share, slot] = sharePart(r);
      return el('li', {}, name,
        whatOf(r), el('span', { className: 'res', textContent: `${r.steps}단계 ${fmt(r.ms)}` }),
        el('span', { className: 'sub' }, share, trailToggle(trail)), trail, slot);
    })),
    el('h3', { textContent: '최근 판' }),
    el('ul', { className: 'recent' }, ...records.slice(0, 10).map(r => {
      const meta = [r.mode === 'random' && `무작위 ${DIFF[r.diff] || ''}`.trim(), r.mode === 'daily' && `${dayLabel(r.day)}의 문제`, r.vs && `${r.vs}님과 대결`].filter(Boolean).join(', ');
      const trail = trailList(r), toggle = trailToggle(trail), [share, slot] = sharePart(r);
      return el('li', {},
        el('b', { className: 'tag ' + (r.win ? 'win' : 'lose'), textContent: r.win ? '도착' : '실패' }),
        whatOf(r),
        el('span', { className: 'res' + (r.win ? '' : ' fail'), textContent: r.win ? `${r.steps}단계 ${fmt(r.ms)}` : shortReason(r.reason), title: r.win ? '' : r.reason || '' }),
        el('span', { className: 'sub' }, el('span', { className: 'meta', textContent: meta }), share, toggle),
        trail, slot);
    })),
    reset);
};

// 처음 화면. 위의 함수와 값이 모두 정의된 뒤에 그린다.
store.get(['introSeen', 'popupMode', 'diff', 'rules', 'fields'], ({ introSeen, popupMode, diff, rules = {}, fields = [] }) => {
  // 지난 선택을 되살린다. 모드에 안 맞는 옛 스위치 조합이나 고를 수 없는 값(예전 숫자 입력)이면 기본과 없음으로.
  const pick = (name, v) => { (document.querySelector(`input[name="${name}"][value="${v}"]`) || document.querySelector(`input[name="${name}"]`)).checked = true; };
  pick('rmode', LR_SHARE.modeOf(rules) || 'basic'); pick('tl', rules.tl || 0); pick('ms', rules.ms || 0); noteRules();
  setMode('daily'); // 처음 열면 오늘의 문제. 남은 입력(draft)이 있으면 아래에서 직접 출제로 바꾼다
  const radio = document.querySelector(`input[name="diff"][value="${diff}"]`);
  if (radio) radio.checked = true;
  noteDiff();
  LR_SHARE.fieldsData().then(d => { fdata = d; for (const f of fields) if (d.f[f]) fsel.add(f); renderFields(); noteDiff(); }, () => {}); // 분야 목록을 못 읽으면 분야 칸 없이 예전처럼
  if (!introSeen) setIntro(false);
  show(introSeen ? 'game' : 'intro');
  draft.get('draft', ({ draft: d }) => {
    if (!d?.start && !d?.goal) return;
    $('start').value = d.start || ''; $('goal').value = d.goal || '';
    setMode('custom'); check();
  });
});
