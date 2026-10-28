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
  if (mode === 'daily') renderDaily();
};
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => setMode(b.dataset.mode);
const DIFF_NOTE = { easy: '들어오는 링크가 많은 문서가 목표예요.', normal: '들어오는 링크가 적당한 문서가 목표예요.', hard: '들어오는 링크가 적은 문서가 목표예요.',
  wild: '시작도 목표도 나무위키 랜덤 문서예요.\n도달할 수 없을 수도 있어요.' };
const noteDiff = () => { $('diffNote').textContent = DIFF_NOTE[document.querySelector('input[name="diff"]:checked').value]; };
for (const r of document.querySelectorAll('input[name="diff"]')) r.onchange = () => { store.set({ diff: r.value }); noteDiff(); };
// ---- 규칙 ----
// 직접 출제와 무작위에만 적용한다(오늘의 문제는 모두 같은 규칙). 마지막 선택을 기억한다.
// 제한 시간은 분 단위로 입력받아 초로 저장한다. 비우거나 0이면 없음.
const minutes = () => Math.min(99, Math.max(0, Math.floor(Number($('tlm').value) || 0)));
const maxSteps = () => Math.min(99, Math.max(0, Math.floor(Number($('msn').value) || 0)));
// 허브 문서 목록(접이식): 어떤 문서가 막히는지 미리 볼 수 있다. 목록은 hubs.js(역링크 많은 순).
$('hubSum').textContent = `허브 문서 목록 보기 (${LR_HUBS.docs.length}개)`;
$('hubList').textContent = LR_HUBS.docs.join(', ');
const FLAGS = { nb: '뒤로 금지', nt: '틀 금지', nc: '분류 금지', nf: '각주 금지', nh: '허브 금지', nr: '재방문 금지' };
const rules = () => ({ ...Object.fromEntries(Object.keys(FLAGS).map(k => [k, $(k).checked])), tl: minutes() * 60, ms: maxSteps() });
const noteRules = () => {
  const r = rules();
  const on = [...Object.keys(FLAGS).filter(k => r[k]).map(k => FLAGS[k]), r.tl && `${r.tl / 60}분`, r.ms && `${r.ms}단계`].filter(Boolean);
  $('rulesNote').textContent = on.length > 3 ? `${on.length}개 적용` : on.join(', ') || '기본';
};
for (const id of ['tlm', 'msn']) $(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2); }); // 숫자만, 두 자리(최대 99)
for (const id of [...Object.keys(FLAGS), 'tlm', 'msn']) $(id).addEventListener(['tlm', 'msn'].includes(id) ? 'input' : 'change', () => { store.set({ rules: rules() }); noteRules(); });

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
const check = () => {
  const s = $('start').value.trim(), g = $('goal').value.trim();
  const same = s !== '' && s === g;
  $('err').textContent = same ? '시작과 목표가 같아요' : '';
  $('go').disabled = same;
  $('pick').hidden = true;
};

// 지금 탭이 나무위키면 연결하고 "이 문서로"를 켠다. activeTab 덕분에 팝업을 연 탭의 주소만 읽을 수 있다.
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const url = tab?.url || '';
  if (/^https:\/\/namu\.wiki\//.test(url)) connect(tab.id);
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
  launch('', diff === 'wild' ? '' : await pickGoal(diff), { mode: 'random', diff }); // 랜덤은 목표도 새 탭이 /random으로 뽑는다
};

// ---- 오늘의 문제 ----
// 2026-10-25(한국 시간)를 1로 센 날짜 번호를 씨앗으로, 무작위 모드 목록(words.js)의 보통 구간 문서에서 시작과 목표를 뽑는다. 모두 같은 문제를 받는다.
// 보통 구간만 쓰는 것은 쉬우면 너무 싱겁게 풀리기 때문이다. 허브 목록과는 상관없다.
// 목록은 정렬한 집합으로만 쓴다(파일 안 순서는 상관없음). 그것을 고정 순서 Q로 한 번 섞어 둔다.
// 목표는 Q를 바퀴(N일)마다 다시 섞은 순서대로 하루에 하나씩 쓴다. 시작은 Q에서 목표 위치로부터 s칸 뒤 문서이고, s는 바퀴마다 1, 2, 3...으로 커진다.
// 그래서 (시작, 목표) 쌍은 같은 쌍도 뒤집힌 쌍도 ceil(N/2)-1바퀴(N=889면 약 1081년) 동안 다시 안 나온다. scripts/check-daily.mjs가 이를 확인한다.
// ponytail: words.js를 다시 만들어 보통 구간이 바뀌면(문서를 더하거나, 역링크 수가 경계를 넘나들면) 그 뒤로 모든 날의 문제가 바뀐다(옛 판의 기록은 자기 시작·목표를 들고 있어 괜찮다). 친구와 같은 버전이어야 오늘 문제가 같다.
const FIRST_DAY = Date.UTC(2026, 9, 25);
const dayLabel = n => { const d = new Date(FIRST_DAY + (n - 1) * 86400e3); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
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
const renderDaily = async () => {
  const n = dayNumber(), { start, goal } = dailyCombo(n);
  $('dailyNo').textContent = `${dayLabel(n)}의 문제`;
  $('dailyCombo').textContent = `${start} → ${goal}`;
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
$('goDaily').onclick = () => { const n = dayNumber(), { start, goal } = dailyCombo(n); launch(start, goal, { mode: 'daily', day: String(n) }); };

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
  const x = r.rules || {};
  const on = [...RULE_FLAGS.filter(k => x[k]).map(k => FLAGS[k]), x.tl && (x.tl % 60 ? `${x.tl}초 제한` : `${x.tl / 60}분 제한`), x.ms && `${x.ms}단계 제한`].filter(Boolean);
  return on.join(', ') || '규칙 없음';
};
let recFilter = null; // 규칙 조합 키 또는 'all'. 처음엔 가장 최근에 한 판의 규칙 조합
const renderRecords = async () => {
  const { records: all = [] } = await store.get('records');
  const box = $('records');
  if (!all.length) return box.replaceChildren(el('p', { className: 'empty', textContent: '아직 끝낸 판이 없어요.\n한 판 해 보세요!' }));
  const groups = new Map();
  for (const r of all) { const k = ruleKeyOf(r); if (!groups.has(k)) groups.set(k, { label: ruleLabelOf(r), n: 0 }); groups.get(k).n++; }
  if (!recFilter || (recFilter !== 'all' && !groups.has(recFilter))) recFilter = ruleKeyOf(all[0]);
  const records = recFilter === 'all' ? all : all.filter(r => ruleKeyOf(r) === recFilter);
  const picker = groups.size < 2 ? [] : [el('label', { textContent: '규칙별로 보기' }),
    el('select', { className: 'rulesel', onchange: e => { recFilter = e.target.value; renderRecords(); } },
      ...[...groups].map(([k, g]) => el('option', { value: k, textContent: `${g.label} (${g.n}판)`, selected: k === recFilter })),
      el('option', { value: 'all', textContent: `전체 (${all.length}판)`, selected: recFilter === 'all' }))];
  const wins = records.filter(r => r.win);
  const avg = f => wins.length ? wins.reduce((s, r) => s + f(r), 0) / wins.length : 0;
  let streak = 0, best = 0, run = 0;
  for (const r of records) { if (!r.win) break; streak++; }
  for (const r of [...records].reverse()) { run = r.win ? run + 1 : 0; best = Math.max(best, run); }
  const bestByDiff = Object.keys(DIFF).map(d => [d, wins.filter(r => r.mode === 'random' && r.diff === d).reduce((b, r) => (!b || better(r, b) ? r : b), null)]);
  const pathLine = r => el('span', { className: 'path', textContent: r.path.join(' → ') });
  let armed = false;
  const reset = el('button', { className: 'btn start', textContent: '기록 지우기',
    onclick: async () => {
      if (!armed) { armed = true; reset.textContent = '한 번 더 누르면 모두 지워져요'; return; }
      await store.remove(['records', 'used']); renderRecords();
    } });
  box.replaceChildren(
    ...picker,
    el('div', { className: 'grid' },
      stat(records.length, '판'), stat(`${Math.round(wins.length / records.length * 100)}%`, '도착률'), stat(streak, '연속 도착'),
      stat(wins.length ? avg(r => r.steps).toFixed(1) : '-', '평균 단계'), stat(wins.length ? fmt(avg(r => r.ms)).slice(0, 5) : '-', '평균 시간'), stat(best, '최고 연속')),
    el('h3', { textContent: '무작위 최고 기록' }),
    el('ul', { className: 'best' }, ...bestByDiff.map(([d, r]) => el('li', {}, el('b', { textContent: DIFF[d] }),
      el('span', { textContent: r ? `${r.steps}단계, ${fmt(r.ms)}` : '아직 없어요' }), ...(r ? [pathLine(r)] : [])))),
    el('h3', { textContent: '최근 판' }),
    el('ul', { className: 'recent' }, ...records.slice(0, 10).map(r => {
      const meta = [r.mode === 'random' && `무작위 ${DIFF[r.diff] || ''}`.trim(), r.mode === 'daily' && `${dayLabel(r.day)}의 문제`, r.vs && `${r.vs}님과 대결`].filter(Boolean).join(', ');
      const trail = trailList(r), toggle = trailToggle(trail);
      return el('li', {},
        el('b', { className: 'tag ' + (r.win ? 'win' : 'lose'), textContent: r.win ? '도착' : '실패' }),
        el('span', { className: 'what', textContent: `${r.start} → ${r.goal}`, title: `${r.start} → ${r.goal}` }),
        el('span', { className: 'res' + (r.win ? '' : ' fail'), textContent: r.win ? `${r.steps}단계 ${fmt(r.ms)}` : shortReason(r.reason), title: r.win ? '' : r.reason || '' }),
        el('span', { className: 'sub' }, el('span', { textContent: meta }), toggle),
        trail);
    })),
    reset);
};

// 처음 화면. 위의 함수와 값이 모두 정의된 뒤에 그린다.
store.get(['introSeen', 'popupMode', 'diff', 'rules'], ({ introSeen, popupMode, diff, rules = {} }) => {
  for (const k of Object.keys(FLAGS)) $(k).checked = !!rules[k];
  $('tlm').value = rules.tl ? String(Math.min(99, Math.round(rules.tl / 60))) : ''; $('msn').value = rules.ms ? String(Math.min(99, rules.ms)) : ''; noteRules();
  setMode('daily'); // 처음 열면 늘 오늘의 문제
  const radio = document.querySelector(`input[name="diff"][value="${diff}"]`);
  if (radio) radio.checked = true;
  noteDiff();
  if (!introSeen) setIntro(false);
  show(introSeen ? 'game' : 'intro');
});
