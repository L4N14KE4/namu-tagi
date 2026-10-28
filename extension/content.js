// 나무타기 프로토타입. document_start에 실행. 서버·점수·계정 없음.
// 상태는 탭의 sessionStorage 하나. ponytail: 탭을 닫으면 끝이고 복구는 없다. 탭을 복제하면 게임도 복제된다.
(() => {
  // ---- 공통 도구 ----
  // 게임이 아닌 탭에서도 팝업 연결(자동완성·목표 확인)이 쓰므로, 아래 '게임 아님' return보다 앞에 둔다.

  // 허용 이름공간은 "접두사 없음"과 "틀:"뿐. 콜론이 든 일반 문서("피지컬: 100")는 목록에 없으므로 통과한다.
  const BANNED_NS = ['분류:', '파일:', '사용자:', '특수기능:', '나무위키:', '토론:', '휴지통:', '투표:',
    '파일휴지통:', '위키운영:', '템플릿:', '시스템:', '특정판:', '삭제된사용자:', '아이피사용자:', '편집필터:'];
  const banned = doc => BANNED_NS.some(ns => doc.startsWith(ns));
  const HUBS = new Set(typeof LR_HUBS === 'undefined' ? [] : LR_HUBS.docs); // 허브 문서 금지 규칙이 쓰는 목록(hubs.js)
  // "/w/문서명?from=...#s-1" → "문서명". 쿼리·해시는 pathname에 없으니 자연히 빠진다.
  const docOf = url => {
    try { const p = new URL(url, location.origin).pathname; return p.startsWith('/w/') ? decodeURIComponent(p.slice(3)) : null; }
    catch { return null; }
  };
  const encPath = name => name.split('/').map(encodeURIComponent).join('/');
  const currentDoc = (d = document) => { const c = d.querySelector('link[rel=canonical]'); return c ? docOf(c.getAttribute('href')) : null; };

  // 클래스명과 data-v 해시는 배포마다 바뀐다(한 달 사이 cf067982 → 820edf40). 그래서 이름을 쓰지 않고
  // 구조로 찾는다. h1이 속한 Vue 컴포넌트 루트가 기사 영역이고, 그 안에서 title 속성을 가진 /w/ 링크(본문 렌더러만
  // title을 붙인다)가 가장 많이 공유하는 scoped 속성이 본문 렌더러다. 사이드바는 기사 영역 밖에 있다.
  const scopeAttrs = el => [...el.attributes].map(a => a.name).filter(n => n.startsWith('data-v-'));
  const articleRoot = (d = document) => {
    const h1 = d.querySelector('h1');
    const attr = h1 && scopeAttrs(h1).find(n => h1.parentElement.hasAttribute(n));
    if (!attr) return null;
    let root = h1;
    while (root.parentElement && root.parentElement.hasAttribute(attr)) root = root.parentElement;
    return root;
  };
  const rendererAttr = root => {
    const count = {};
    for (const a of root.querySelectorAll('a[title][href^="/w/"]')) for (const n of scopeAttrs(a)) count[n] = (count[n] || 0) + 1;
    return Object.keys(count).sort((x, y) => count[y] - count[x])[0] || null;
  };
  // ponytail: 문구 비교는 나무위키가 문장을 바꾸면 깨진다. 새 탭 첫 로드는 HTTP 404도 함께 본다(notFound).
  const notFoundText = root => !!root && [...root.querySelectorAll('p')].some(p => p.textContent.trim() === '해당 문서를 찾을 수 없습니다.');
  const isDisambig = root => [...root.querySelectorAll('a[href^="/w/"]')].some(a => docOf(a.getAttribute('href')) === '분류:동음이의어');
  // 동음이의어 문서의 뜻 후보. 뜻 문서는 보통 "사과(노래)", "배(선박)", "사과/품종"처럼 같은 이름으로 시작하므로 그것을 near로 앞에 둔다.
  const meanings = (doc, root) => {
    const attr = rendererAttr(root);
    const docs = [...new Set([...root.querySelectorAll('a[title][href^="/w/"]')]
      .filter(a => attr && a.hasAttribute(attr) && !/\bnofollow\b/.test(a.rel))
      .map(a => docOf(a.getAttribute('href')))
      .filter(d => d && d !== doc && !banned(d)))];
    const base = doc.replace(/\(동음이의어\)$/, '');
    const isNear = d => d === base || [base + '(', base + ' ', base + '/'].some(p => d.startsWith(p));
    return { near: docs.filter(isNear), rest: docs.filter(d => !isNear(d)) };
  };
  const theme = () => document.body?.classList.contains('theseed-dark-mode') ? 'dark' : 'light';
  // 목표 미리보기: '개요' 아래 첫 문단과 정보 상자(첫 줄에 문서 이름이 있는 표)의 첫 사진.
  // 넘겨주기 안내·편집 보호 안내는 건너뛰고, "○○ 관련 문서" 틀 상자의 그림은 쓰지 않는다.
  const previewOf = (d, root) => {
    const attr = rendererAttr(root), h1 = d.querySelector('h1');
    const squash = t => t.replace(/\s+/g, '').toLowerCase();
    const title = squash(h1?.innerText || '').replace(/\(.*\)$/, '');
    const skip = t => /여기로 연결됩니다|참고하십시오|편집 보호된 문서|ACL 탭/.test(t);
    const overview = [...root.querySelectorAll('h2')].find(h => /개요/.test(h.innerText));
    const blocks = [...root.querySelectorAll(`div[${attr}]`)].filter(b => !b.closest('table') && [...b.childNodes].some(c => c.nodeType === 3 && c.textContent.trim().length > 5))
      .filter(b => !overview || overview.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const text = blocks.map(b => b.innerText.trim().replace(/\s+/g, ' ').replace(/\[\d+\]/g, '')).find(t => t.length > 20 && !skip(t)) || '';
    const box = [...root.querySelectorAll('table')].find(t => { const first = t.rows[0]?.innerText || ''; return !first.includes('관련 문서') && squash(first).includes(title) && t.querySelector('img'); });
    const src = box && [...box.querySelectorAll('img')].map(i => i.getAttribute('data-src') || i.getAttribute('src') || '').find(s => s.includes('i.namu.wiki') && !s.endsWith('.svg'));
    return { text: text.length > 140 ? text.slice(0, 140) + '…' : text, img: src ? new URL(src, 'https://namu.wiki').href : '' };
  };

  // ---- 팝업 연결: 자동완성과 목표 확인 ----
  // 팝업이 열려 연결(port)이 살아 있는 동안만 동작한다. 팝업이 닫히면 연결이 끊기고 이 탭은 원래대로 돌아간다.
  //
  // 자동완성: 나무위키 추천 API는 응답이 페이지 스크립트만 푸는 암호문이라 직접 못 쓴다. 대신 이 탭의 나무위키 검색창에
  // 글자를 넣고 나무위키가 직접 그린 추천 목록을 읽는다. 사용자가 검색창에 치는 것과 같은 요청이다. 그동안 검색창의
  // 글자·×·안내 문구·추천 상자는 가린다.
  //
  // 목표 확인: 팝업은 문서 내용을 못 읽고, fetch로는 SPA 껍데기만 온다. 이 탭에 보이지 않는 같은 사이트 iframe으로
  // 목표 문서를 열어 정식 이름(넘겨주기 해소), 존재 여부, 동음이의어 여부와 뜻 후보를 읽는다.
  const norm = t => t.toLowerCase().replace(/\s+/g, '');
  const searchBox = () => {
    const input = document.querySelector('#app input[type="search"]');
    const attr = input && scopeAttrs(input)[0];
    if (!attr) return null;
    let box = input;
    while (box.parentElement && box.parentElement.hasAttribute(attr)) box = box.parentElement;
    return { input, box };
  };
  const typeInto = (input, v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); };
  const suggest = async (sb, q) => {
    const read = () => [...sb.box.querySelectorAll('a[href="#"]')].filter(a => !a.querySelector('svg')).map(a => a.textContent.trim()).filter(Boolean);
    const before = read().join('\n');
    typeInto(sb.input, q);
    let i = 0;
    while (read().join('\n') === before && i++ < 15) await new Promise(r => setTimeout(r, 100));
    const list = read();
    // 목록이 안 바뀌었으면(요청 실패 등) 지난 검색어의 목록일 수 있다. 검색어를 담은 항목만 남긴다.
    return list.join('\n') === before ? list.filter(t => norm(t).includes(norm(q))) : list;
  };
  const probes = new Set();
  const probe = name => new Promise(resolve => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:800px;visibility:hidden;pointer-events:none';
    f.src = '/w/' + encPath(name);
    const finish = r => { clearInterval(iv); clearTimeout(tm); probes.delete(f); f.remove(); resolve(r); };
    const tm = setTimeout(() => finish({ ok: false, reason: `문서를 불러오지 못했어요: ${name}` }), 15000);
    const iv = setInterval(() => {
      let d; try { d = f.contentDocument; } catch { return; }
      const doc = d && currentDoc(d), root = d && articleRoot(d);
      if (!doc || !root) return;
      if (notFoundText(root)) return finish({ ok: false, reason: `문서가 없어요: ${name}` });
      if (!root.querySelector('a[title][href^="/w/"]')) return; // 본문이 아직 안 그려짐
      if (banned(doc)) return finish({ ok: false, reason: `목표로 쓸 수 없는 이름공간이에요: ${doc}` });
      const preview = previewOf(d, root);
      finish(isDisambig(root) ? { ok: true, doc, preview, ...meanings(doc, root) } : { ok: true, doc, preview });
    }, 100);
    probes.add(f);
    document.documentElement.appendChild(f);
  });
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'popup') return;
    const sb = searchBox();
    const hide = document.createElement('style');
    if (sb) {
      const sel = sb.box.tagName.toLowerCase() + scopeAttrs(sb.box).map(n => `[${n}]`).join('');
      hide.textContent = `
        ${sel} input[type="search"], ${sel} input[type="search"]::placeholder { color: transparent !important; }
        ${sel} input[type="search"]::-webkit-search-cancel-button { display: none !important; }
        ${sel} div:has(> a[href="#"]):not(:has(input)) { display: none !important; }`; // 추천 상자. :has 안에 :has는 못 쓴다
      document.documentElement.appendChild(hide);
    }
    const send = m => { try { port.postMessage(m); } catch {} }; // 그새 팝업이 닫혔으면 버린다
    send({ theme: theme() });
    port.onMessage.addListener(async ({ id, type, q, name }) => {
      if (type === 'suggest') send({ id, data: sb && q ? await suggest(sb, String(q)).catch(() => []) : [] });
      if (type === 'probe') send({ id, data: await probe(String(name)) });
    });
    port.onDisconnect.addListener(() => {
      if (sb) typeInto(sb.input, '');
      hide.remove();
      for (const f of probes) f.remove();
    });
  });

  // 이미 열려 있는 같은 문서에서 공유 링크를 붙여 넣으면 해시만 바뀌어 페이지가 다시 불러와지지 않는다.
  // 게임 중이든 아니든 새로고침해서 링크의 게임을 시작한다(시작할 때 해시는 지워지므로 되풀이되지 않는다).
  window.addEventListener('hashchange', () => { if (/^#ng-goal=/.test(location.hash)) location.reload(); });

  // ---- 게임 상태 ----
  const KEY = 'ng_state', CSS_KEY = 'ng_css';
  const DIFF = { easy: '쉬움', normal: '보통', hard: '어려움', wild: '🎲 랜덤' };
  // 오늘의 문제는 회차 대신 날짜로 보여 준다(1회 = 2026-10-25, 한국 시간). 팝업의 FIRST_DAY와 같아야 한다.
  const dayLabel = n => { const d = new Date(Date.UTC(2026, 9, 25) + (n - 1) * 86400e3); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
  const limitText = s => (s % 60 ? `${s}초` : `${s / 60}분`);
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };
  const save = s => sessionStorage.setItem(KEY, JSON.stringify(s));
  const clear = () => { sessionStorage.removeItem(KEY); sessionStorage.removeItem(CSS_KEY); };

  // 게임은 해시로 시작한다. 값은 URLSearchParams 형식.
  //  /w/<시작>#ng-goal=<목표>&mode=..&diff=..   팝업이 목표를 이미 확인했거나 공유 링크. 시작 문서에서 바로 시작한다.
  //  /random#ng-goal=<목표>&rs=1&...            시작 문서를 무작위로. 나무위키 /random이 302로 보내도 해시는 따라간다.
  // 나머지 값:
  //  mode=custom|random|daily   직접 출제·무작위 목표(diff=easy|normal|hard)·오늘의 문제(day=회차)
  //  rs=1                       시작 문서가 무작위
  //  nb nt nc nf nh nr =1       규칙: 뒤로가기·틀 상자 링크·분류 링크·각주 속 링크·허브 문서 금지, 같은 문서 재방문 금지
  //  tl=초 ms=단계              규칙: 제한 시간, 최대 단계
  //  by= s= t= p=…              도전장: 보낸 사람, 그 사람의 단계·시간(ms)·경로(문서마다 p 하나)
  let state = load();
  const fresh = (status, start, goal, extra = {}) => ({ start, goal, status, path: [], pending: null, mode: 'custom', diff: null, rs: false,
    day: null, rules: { nb: false, nt: false, nc: false, nf: false, nh: false, nr: false, tl: 0, ms: 0 }, vs: null, ...extra });
  const num = (v, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; }; // 주소 값은 0~max 정수로
  const parse = q => ({
    mode: ['random', 'daily'].includes(q.get('mode')) ? q.get('mode') : 'custom',
    diff: DIFF[q.get('diff')] ? q.get('diff') : null, rs: q.get('rs') === '1', tries: Number(q.get('tries') || 0), day: Number(q.get('day')) || null,
    rules: { nb: q.get('nb') === '1', nt: q.get('nt') === '1', nc: q.get('nc') === '1', nf: q.get('nf') === '1', nh: q.get('nh') === '1', nr: q.get('nr') === '1',
             tl: num(q.get('tl'), 99 * 60), ms: num(q.get('ms'), 99) },
    vs: q.get('by') ? { by: q.get('by').slice(0, 20), steps: num(q.get('s'), 999), ms: num(q.get('t'), 99 * 3600e3), path: q.getAll('p').slice(0, 60), times: (q.get('pt') || '').split(',').map(Number) } : null,
  });
  const params = new URLSearchParams(location.hash.slice(1));
  const fromHash = params.has('ng-goal'); // 목표 확인(정식 이름, 동음이의어 고르기)은 팝업이 끝내고 온다
  if (fromHash) {
    state = fresh('starting', docOf(location.pathname) || '', params.get('ng-goal').trim(), parse(params));
    state.invite = !!state.vs && !state.rs; // 도전장 링크는 수락해야 시작한다(아래 invite). 새로고침·다시하기로는 다시 묻지 않는다.
  }
  if (fromHash) { save(state); history.replaceState(null, '', location.pathname + location.search); }
  // 시작 전(도전장 수락 창, 카운트다운)에 주소창이나 뒤로가기로 다른 문서를 열면 그 문서에서 판이 시작돼 버린다(목표 옆 문서에서 시작하는 꼼수).
  // 시작 문서가 아닌 곳에서 다시 불러왔으면 판을 버린다. 아직 시작 전이라 기록할 것도 없다. 같은 문서 새로고침은 그대로 이어 간다.
  else if (state?.status === 'starting' && state.start && docOf(location.pathname) !== state.start) { clear(); state = null; }
  // ---- 처음 설치 안내 ----
  // 설치하고 처음 나무위키에 들어오면 설명(팝업의 ? 와 같은 글, intro.js)을 화면 가운데에 한 번 띄운다. 확인을 누르면 introSeen이 저장돼
  // 팝업도 처음 열 때 설명을 띄우지 않는다. 주소 끝에 #ng-intro를 붙이면 언제든 다시 띄울 수 있다.
  const introOnce = async () => {
    let seen = true;
    try { ({ introSeen: seen } = await chrome.storage.local.get('introSeen')); } catch { return; }
    if (seen && location.hash !== '#ng-intro') return;
    if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    const host = document.createElement('div');
    host.id = 'ng-intro';
    const sh = host.attachShadow({ mode: 'open' });
    sh.innerHTML = `
      <style>
        :host { all: initial; --card: #fff; --text: #212529; --muted: #6c757d; --border: #dadada; --soft: #f5f5f5; --primary: #00a69c; --err: #d64a58; --link: #0275d8;
                font-family: "Pretendard JP", Pretendard, -apple-system, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; }
        :host([data-theme="dark"]) { --card: #1c1d1f; --text: #e0e0e0; --muted: #9a9a9a; --border: #3e3e3e; --soft: #26282b; --link: #ec9f19; }
        .ov { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; }
        .card { display: flex; flex-direction: column; width: min(460px, 92vw); max-height: 88vh; background: var(--card); color: var(--text);
                border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 6px 24px rgba(0,0,0,.35); font-size: 14px; }
        .scroll { overflow: auto; padding: 20px 24px 8px; }
        .foot { padding: 12px 24px 18px; }
        button { font: inherit; font-weight: 600; width: 100%; padding: 10px; border: 0; border-radius: .3rem; background: var(--primary); color: #fff; cursor: pointer; }
        button:hover { filter: brightness(1.08); }
        ${LR_INTRO.css}
      </style>
      <div class="ov"><div class="card"><div class="scroll">${LR_INTRO.html}</div><div class="foot"><button>확인</button></div></div></div>`;
    const paint = () => { host.dataset.theme = theme(); };
    paint(); new MutationObserver(paint).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const close = () => host.remove();
    sh.querySelector('button').onclick = () => {
      try { chrome.storage.local.set({ introSeen: true }); } catch {}
      if (location.hash === '#ng-intro') history.replaceState(null, '', location.pathname + location.search);
      close();
    };
    try { chrome.storage.onChanged.addListener(c => { if (c.introSeen?.newValue) close(); }); } catch {} // 다른 탭에서 확인했으면 이 탭 것도 닫는다
    for (const t of ['keydown', 'keypress', 'keyup']) host.addEventListener(t, e => e.stopPropagation()); // 나무위키 단축키로 새지 않게
    document.body.appendChild(host);
  };
  if (!state) { introOnce(); return; } // 게임 중이 아닌 탭: 게임용 리스너도 CSS도 붙이지 않는다(처음 설치 안내만 확인).
  document.documentElement.dataset.ng = state.status; // CSS 훅: 게임 중인 탭 표시
  // 지난 로드에서 만든 화면 정리 CSS를 바로 넣는다(아래 hideChrome). 새로고침·시작 문서에서 사이드바가 번쩍이지 않게.
  const dynStyle = document.createElement('style');
  const applyCss = css => { dynStyle.textContent = css; document.documentElement.appendChild(dynStyle); };
  try { applyCss(sessionStorage.getItem(CSS_KEY) || ''); } catch {}

  // ---- 화면 정리 ----
  // 사이드바(실시간 검색어·최근 변경)와 검색창은 클래스명이 해시라 고정 CSS로 못 잡는다. 그려진 페이지에서 구조로 찾아
  // 그 빌드의 scoped 속성으로 CSS를 만든다. 사이드바가 30초마다 다시 그려져도 같은 속성이라 규칙이 계속 맞는다.
  const selectorOf = el => el.tagName.toLowerCase() + scopeAttrs(el).map(n => `[${n}]`).join('');
  const hideChrome = () => {
    const root = articleRoot(); if (!root) return;
    const targets = new Set();
    // 기사 영역 밖에서 문서로 보내는 링크(최근 변경 /w/, 실시간 검색어 /Go?q=)를 품은 덩어리. 기사 영역은 절대 포함하지 않는다.
    for (const a of document.querySelectorAll('#app a[href^="/w/"], #app a[href^="/Go"]')) {
      if (root.contains(a)) continue;
      let c = a;
      while (c.parentElement && !c.parentElement.contains(root)) c = c.parentElement;
      targets.add(c);
    }
    // 검색창은 입력칸이 속한 컴포넌트 전체(검색·이동·랜덤 버튼)
    const sb = searchBox();
    if (sb) targets.add(sb.box);
    // 편집 요청 버튼은 링크가 아니라 <label>이라 글자로 찾는다(클래스·속성값은 배포마다 바뀐다).
    for (const lb of document.querySelectorAll('#app label')) if (lb.textContent.trim() === '편집 요청' && !lb.contains(document.querySelector('h1'))) targets.add(lb);
    // ponytail: scoped 속성이 없는 덩어리는 건너뛴다("div" 같은 선택자로 페이지 전체를 가리지 않도록).
    const sels = [...targets].map(selectorOf)
      .filter(sel => sel.includes('[') && ![...document.querySelectorAll(sel)].some(el => el.contains(root)));
    const css = sels.length ? `html[data-ng] :is(${[...new Set(sels)].join(', ')}) { display: none !important; }` : '';
    if (css !== dynStyle.textContent) { applyCss(css); try { sessionStorage.setItem(CSS_KEY, css); } catch {} }
  };

  // ---- 판정 ----
  const verdict = a => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) return { ok: true, doc: currentDoc() }; // 목차·각주: 같은 문서 안 이동
    const doc = docOf(href);
    if (!doc) return { ok: false, reason: '본문의 문서 링크만 누를 수 있어요' };
    if (/\bnofollow\b/.test(a.rel)) return { ok: false, reason: '없는 문서예요' };
    const cat = doc.startsWith('분류:'); // 분류는 목표·시작 문서로는 못 쓰지만 이동은 된다
    if (banned(doc) && !cat) return { ok: false, reason: '그 이름공간은 안 돼요' };
    if (cat && state.rules.nc) return { ok: false, reason: '분류 링크 금지 규칙이에요' };
    if (state.rules.nh && HUBS.has(doc) && doc !== state.goal) return { ok: false, reason: '허브 문서 금지 규칙이에요' };
    if (state.rules.nr && doc !== currentDoc() && state.path.some(p => p.doc === doc)) return { ok: false, reason: '이미 지나간 문서예요' };
    const root = articleRoot();
    if (!root) return { ok: false, reason: '페이지 구조를 인식할 수 없어요' };
    const attr = rendererAttr(root);
    // 분류 줄의 링크는 본문 렌더러가 그리지 않는다. 분류 문서는 목록 전체가 링크이고 그 링크들이 렌더러 속성 두 가지로 나뉘어 있다.
    // 그래서 분류 링크와, 분류 문서 안의 링크는 기사 영역 안에 있으면 인정한다.
    const onCat = currentDoc()?.startsWith('분류:');
    if (!root.contains(a) || (!cat && !onCat && (!attr || !a.hasAttribute(attr)))) return { ok: false, reason: '본문 안의 링크만 인정돼요' };
    if (state.rules.nt && (doc.startsWith('틀:') || inTemplateBox(a, root))) return { ok: false, reason: '틀 상자 링크 금지 규칙이에요' };
    if (state.rules.nf && inFootnote(a, root)) return { ok: false, reason: '각주 링크 금지 규칙이에요' };
    return { ok: true, doc };
  };
  // 접는 상자: 틀이 표가 아니라 접는 상자(<details>)와 div로 그려지는 문서가 많다(티니핑 등). 접는 상자 안의 링크와,
  // 접는 상자 말고는 짧은 제목뿐인 겉 상자(제목 줄의 링크)를 틀로 본다. 제목(h2~)이 든 덩어리까지 올라오면 본문이라 멈춘다.
  // 목차도 접는 상자(<details>)로 그려지는데 틀이 아니다. 목차는 #s-N 링크를 품고 있어서 그걸로 빼낸다.
  // ponytail: 본문에 직접 쓴 접기 상자도 같이 막힌다.
  const inFoldBox = (a, root) => {
    for (let x = a.parentElement; x && x !== root && root.contains(x); x = x.parentElement) {
      if (x.querySelector('h2, h3, h4, h5, h6, a[href^="#s-"]')) return false;
      if (x.tagName === 'DETAILS') return true;
      const d = x.querySelector('details');
      if (d && x.textContent.length - d.textContent.length <= 60) return true;
    }
    return false;
  };
  // 안내 상자: 접기 버튼이 없는 틀 가운데 흔한 것은 "자세한 내용은 ○○ 문서를 참고하십시오", "○○은(는) 여기로 연결됩니다",
  // "상위 문서: ○○" 같은 한두 줄짜리 안내 틀이다. 표식이 없어서 짧은 덩어리(200자 이하, 제목 없음)의 문구로 알아본다.
  // 보이는 글자(innerText)로 본다. textContent에는 아이콘 마크업 문자열이 섞여 있다.
  // ponytail: 본문에 직접 쓴 같은 문구의 짧은 문단도 걸린다. 링크가 빽빽한 덩어리를 상자로 보는 방법은 본문의 작품 목록 같은
  // 링크 나열까지 잡아서(중학생 문서 링크 581개 중 289개) 쓰지 않았다.
  const NOTICE = /(참고|참조)(하십시오|하세요|바랍니다|해 주세요)|^\s*(상위|하위|관련|본문|세부|자세한)\s*(문서|항목|내용)?\s*[:：]/;
  // 다른 뜻 안내("○○에 대한 내용은 ○○ 문서를 참고하십시오", "○○은(는) 여기로 연결됩니다")는 상자 모양이 아니라 본문 맨 위 한 줄로 보이고
  // 동음이의어 문서로 가는 길이라(사용자가 틀이라고 느끼지 않는다) 틀 금지에서 뺀다.
  const DISAMBIG_NOTICE = /에 대한 (내용|설명)은|여기로 (연결|넘어)|으로 연결됩니다/;
  const inNoticeBox = (a, root) => {
    for (let i = 0, x = a.parentElement; i < 4 && x && x !== root; i++, x = x.parentElement) {
      if (x.querySelector('h2, h3, h4, h5, h6')) return false;
      const t = x.innerText.replace(/\s+/g, ' ').trim();
      if (t.length > 200 || DISAMBIG_NOTICE.test(t)) return false;
      if (NOTICE.test(t)) return true;
    }
    return false;
  };
  // 틀 상자: 문서 어디에 있든(위쪽·중간·끝), 최상위 표 가운데 "펼치기·접기" 버튼이 있거나 다른 틀(`틀:` 문서)로 가는 링크를 품은 것.
  // 나무위키는 틀에서 온 표에 표식을 달지 않아서(클래스·속성이 틀과 직접 쓴 표에서 똑같다) 모양으로 짐작한다.
  // ponytail: 접기 버튼도 `틀:` 링크도 없는 틀은 못 알아보고, 접기 버튼이 있는 직접 쓴 표(정보 상자 안의 접기 등)는 틀로 잘못 볼 수 있다.
  const inTemplateBox = (a, root) => {
    if (inFoldBox(a, root) || inNoticeBox(a, root)) return true;
    let t = a.closest('table');
    if (!t) return false;
    for (let up = t.parentElement?.closest('table'); up && root.contains(up); up = up.parentElement?.closest('table')) t = up;
    return /펼치기\s*·\s*접기/.test(t.textContent) || [...t.querySelectorAll('a[href^="/w/"]')].some(x => docOf(x.getAttribute('href'))?.startsWith('틀:'));
  };

  // 각주 속 링크: 각주 목록의 한 항목은 되돌아가기 링크(#rfn-N)를 직접 자식으로 가진 요소다. 그 안에 든 링크가 각주 속 링크.
  const inFootnote = (a, root) => {
    for (let x = a.parentElement; x && root.contains(x); x = x.parentElement) if (x.querySelector(':scope > a[href^="#rfn-"]')) return true;
    return false;
  };

  // ---- 입력 가로채기 ----
  const linkOf = e => (e.target instanceof Element) ? e.target.closest('a[href]') : null;
  const block = (e, msg) => { e.preventDefault(); e.stopImmediatePropagation(); if (msg) toast(msg); };
  window.addEventListener('click', e => {
    const a = linkOf(e); if (!a) return;
    if (state.status !== 'playing') return block(e, state.status === 'starting' ? '잠시만요, 준비 중이에요' : null);
    if (state.pausedAt) return block(e); // 자리 비움 창이 떠 있는 동안
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return block(e, '새 탭으로는 열 수 없어요');
    const v = verdict(a);
    if (!v.ok) return block(e, v.reason);
    if (v.doc === currentDoc()) return; // 같은 문서: 단계 아님
    state.pending = v.doc; save(state);
  }, true);
  window.addEventListener('auxclick', e => { if (linkOf(e)) block(e, '새 탭으로는 열 수 없어요'); }, true);
  // 게임 중에는 링크 밖에서도 막는다. 글자를 골라 우클릭하면 "Google에서 검색"·"검사", 글자를 끌어 탭 줄에 놓으면 검색이 된다.
  const live = () => state.status === 'playing' || state.status === 'starting';
  for (const t of ['contextmenu', 'dragstart']) window.addEventListener(t, e => { if (linkOf(e) || live()) e.preventDefault(); }, true);
  window.addEventListener('keydown', e => {
    // 찾기(Cmd/Ctrl+F), 다음 찾기(Cmd/Ctrl+G, F3), 선택한 글자로 찾기(맥 Cmd+E). 한글 입력 중에도 잡히게 물리 키로 본다.
    // 진행 막대 버튼을 누르면 포커스가 Shadow DOM 안에 남으므로 아래 host 검사보다 먼저 본다.
    // 개발자 도구(F12, 맥 Cmd+Opt+I/J/C, 윈도 Ctrl+Shift+I/J/C)와 소스 보기(Cmd+Opt+U, Ctrl+U)도 같이 막는다. 메뉴로 여는 것은 devtools.js가 잡는다.
    const tools = e.code === 'F12' || (((e.metaKey && e.altKey) || (e.ctrlKey && e.shiftKey)) && ['KeyI', 'KeyJ', 'KeyC'].includes(e.code))
      || (((e.metaKey && e.altKey) || e.ctrlKey) && e.code === 'KeyU');
    const find = ((e.ctrlKey || e.metaKey) && ['KeyF', 'KeyG', 'KeyE'].includes(e.code)) || e.code === 'F3' || tools;
    if (!find && e.target === host) return; // 결과 창(닉네임 칸)에서 친 키. Shadow DOM 밖에서는 대상이 host로 보인다
    const inField = e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]');
    // 나무위키 단축키 A(랜덤)·E(편집)·D(토론). 한글 IME가 켜져 있어도 물리 키로 잡는다.
    const namuKey = !inField && !e.ctrlKey && !e.metaKey && !e.altKey && ['KeyA', 'KeyE', 'KeyD'].includes(e.code);
    if ((find && live()) || namuKey) { e.preventDefault(); e.stopImmediatePropagation(); toast('게임 중에는 찾기와 단축키를 쓸 수 없어요'); }
  }, true);

  // ---- 개발자 도구와 화면 밖 포커스 ----
  // 개발자 도구가 열려 있으면 devtools.js가 1초마다 이 함수를 부른다(메뉴로 열었거나 게임 전에 열어 둔 경우도). 이 함수는 확장 세계에만 있어 페이지가 부를 수 없다.
  window.ngDevtools = () => { if (state.status === 'playing') lose('개발자 도구를 열었어요'); else if (state.status === 'starting') fail('개발자 도구를 닫고 다시 시작해 주세요'); };
  // 브라우저 메뉴로 연 찾기 창, 주소창, 옆에 띄운 다른 창으로 포커스가 가면 본문을 숨긴다. 숨긴 글자는 찾기가 못 찾고, 옆 창을 보며 조사할 수도 없다.
  // 화면을 누르면 다시 보인다. 시계는 계속 간다. 본문 속 iframe(유튜브 등)으로 간 포커스는 이 문서 안이라 hasFocus()가 참이어서 숨기지 않는다.
  // 포커스가 나간 것은 탭을 떠난 것과 똑같이 센다(leave/back, 아래 떠남). 창을 나란히 놓고 옆 창을 보는 조사에도 30초·경고 규칙이 걸리게.
  const veilPage = on => { document.documentElement.toggleAttribute('data-ng-blur', on); host?.toggleAttribute('data-blur', on); };
  window.addEventListener('blur', () => setTimeout(() => { if (state.status === 'playing' && !document.hasFocus()) { veilPage(true); leave(); } }));
  window.addEventListener('focus', () => { veilPage(false); back(); });

  // ---- 자리 비움 ----
  // 제한 시간이 없는 판에서 5분 동안 아무 입력이 없으면 "아직 하고 계세요?" 창을 띄우고 시계를 멈춘다(pausedAt).
  // 멈추는 시각은 마지막 입력 + 5분이라 자리 비운 5분은 기록에 남는다(시계를 멈추려고 일부러 기다려 봐야 손해).
  // 이어하기를 누르면 멈춘 만큼 startedAt을 뒤로 밀어서, Date.now() - startedAt으로 재는 시간이 멈춘 구간만 빠진 채 이어진다.
  // 걸린 시간은 어디서나 elapsed()로 잰다. 닫기는 그만두기와 같다(진 판으로 기록).
  const IDLE_MS = 5 * 60 * 1000;
  let lastActive = Date.now();
  for (const t of ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart']) window.addEventListener(t, () => { lastActive = Date.now(); }, { capture: true, passive: true });
  const elapsed = () => (state.pausedAt || Date.now()) - state.startedAt;
  const timeUp = () => `제한 시간(${fmt(state.rules.tl * 1000).slice(0, 5)})이 끝났어요`;
  const idleCheck = () => {
    // 떠나 있는 동안(awayAt)은 보지 않는다. 숨은 탭에서도 이 검사가 돌아서, 안 그러면 5분 넘게 떠난 판이 30초 규칙을 피해 자리 비움으로 바뀐다.
    if (state.status !== 'playing' || state.rules.tl || state.pausedAt || state.awayAt || Date.now() - lastActive < IDLE_MS) return;
    state.pausedAt = Math.max(lastActive, state.startedAt) + IDLE_MS; save(state); showIdle(); // 시작 전(카운트다운 대기)의 입력 없음은 세지 않는다
  };
  const resume = () => {
    $('.overlay').classList.remove('on');
    state.startedAt += Date.now() - state.pausedAt; delete state.pausedAt; lastActive = Date.now(); save(state);
  };
  const showIdle = () => showCard('아직 하고 계세요?', [
    el('p', {}, '5분 동안 아무것도 안 해서', el('br'), '시계를 멈췄어요.'),
    el('p', { className: 'muted', textContent: '닫으면 진 판으로 기록돼요.' })],
    [button('이어하기', resume, true), button('다시하기', retry), button('닫기', quit)]);

  // 다른 탭·프로그램으로 가거나(visibilitychange) 페이지를 떠나면(pagehide) 나간 시각을 적어 둔다. 시계는 멈추지 않는다(떠난 시간도 기록에 들어간다).
  // 30초를 넘겨 떠나 있었으면 진 판. 짧게 떠난 것은 한 번만 경고하고(경고 창은 1단계) 두 번째에 진 판. 다른 창을 눌러 포커스만 나간 것도(blur) 떠난 것으로 센다. 제한 시간 판도 같다.
  // 새로고침은 떠난 것으로 세지 않는다. 새로 불러온 경우는 아래 begin이 back()을 부른다. 경고 창은 새로고침해도 다시 뜬다(state.warn).
  const AWAY_MS = 30000;
  const MAX_AWAY = 1; // 이만큼까지는 경고만. 더 떠나면 진 판
  const leave = () => { if (state.status === 'playing' && !state.awayAt) { state.awayAt = Date.now(); save(state); } };
  const back = (count = true) => {
    if (state.status !== 'playing' || !state.awayAt) return;
    const gone = Date.now() - state.awayAt; delete state.awayAt;
    if (count) state.aways = (state.aways || 0) + 1;
    if (gone > AWAY_MS) return lose('30초 넘게 게임 화면을 떠났어요');
    if (state.aways > MAX_AWAY) return lose('게임 화면을 너무 자주 떠났어요');
    if (count) state.warn = true;
    save(state); showWarn();
  };
  const showWarn = () => {
    if (!state.warn || !$) return;
    showCard('게임 화면을 떠났어요', [el('p', {}, '게임 중에는 다른 탭이나 창으로 가지 마세요.', el('br'), '한 번 더 떠나면 실격이에요.')], [button('계속하기', () => {
      delete state.warn; save(state);
      if (state.pausedAt) showIdle(); else $('.overlay').classList.remove('on'); // 자리 비움 창 위에 떴으면 그 창으로 돌아간다
    }, true)]);
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? leave() : back()));
  window.addEventListener('pagehide', leave);
  window.addEventListener('pageshow', e => { if (e.persisted) back(); });

  // ---- 이동 확정 ----
  // 승인된 클릭(pending) 또는 뒤로/앞으로(popstate)의 결과로 canonical 문서가 바뀌면 1단계. 그 외의 변화는 무효.
  // 뒤로가기 금지 판: 실격 대신 뒤로가기를 되돌린다. 이 리스너는 나무위키(Vue)보다 먼저 붙어서, 이벤트를 멈추면 나무위키는 이전 문서를 그리지 않는다.
  // 주소만 바뀐 상태라 바로 앞으로가기로 돌려놓고, 그 앞으로가기 이벤트도 멈춘다. 새로고침 뒤의 전체 로드 뒤로가기는 begin이 돌려보낸다.
  let popped = false, bouncing = false;
  window.addEventListener('popstate', e => {
    if (bouncing) { bouncing = false; return e.stopImmediatePropagation(); }
    // 목차·각주를 눌러 쌓인 해시 기록으로 돌아가는 뒤로가기는 같은 문서 안 이동이라 막지도 단계로 세지도 않는다.
    // 이 시점엔 나무위키가 아직 화면을 안 바꿨으니 currentDoc()은 지금 보는 문서이고, 주소(location)는 가려는 곳이다.
    const here = currentDoc();
    if (here && docOf(location.pathname) === here) return;
    if (state.status === 'playing' && state.rules.nb) { e.stopImmediatePropagation(); bouncing = true; history.forward(); return toast('뒤로가기 금지 판이에요'); }
    popped = true; state.pending = null; save(state);
  }, true);
  const check = () => {
    if (state.status !== 'playing') return;
    const doc = currentDoc(); if (!doc) return;
    const last = state.path[state.path.length - 1].doc;
    if (doc === last) return;
    const t = elapsed();
    const revisit = state.rules.nr && state.path.some(p => p.doc === doc); // 넘겨주기로 이름만 바뀐 재방문도 잡는다
    if (state.pending) { state.path.push({ clicked: state.pending, doc, t }); state.pending = null; }
    else if (popped) state.path.push({ clicked: '<', doc, t }); // 뒤로가기 금지 판의 뒤로가기는 popstate 리스너와 begin이 되돌려서 여기 오지 않는다
    else { state.status = 'invalid'; state.reason = '본문 링크를 누르지 않은 이동이 감지됐어요'; }
    popped = false;
    if (state.status === 'playing') {
      const r = state.rules, end = reason => { state.status = 'invalid'; state.reason = reason; };
      // 링크 이름으로는 못 가려낸 경우(넘겨주기로 허브 문서에 닿음 등)는 도착한 뒤에 걸러 게임을 끝낸다.
      if (r.tl && t >= r.tl * 1000) end(timeUp()); // 마지막 순간 누른 링크가 제한을 넘겨 도착한 경우
      else if (doc === state.goal) { state.status = 'done'; state.finishedAt = t; }
      else if (r.nh && HUBS.has(doc)) end('허브 문서 금지 규칙이에요');
      else if (revisit) end('이미 지나간 문서에 다시 갔어요');
      else if (r.ms && state.path.length - 1 >= r.ms) end(`${r.ms}단계 안에 도착하지 못했어요`);
    }
    if (state.status === 'playing' && state.path.length === 2) $('.preview').hidden = true; // 첫 이동 뒤 목표 설명은 접는다(ⓘ로 다시 연다)
    save(state); render();
    if (state.status !== 'playing') record();
  };

  // ---- 무작위 목표 ----
  // 목표는 words.js 목록(정식 이름, 역링크 수로 나눈 난이도)에서 뽑는다. 최근에 나온 단어는 피하고, 다 쓰면 그 난이도만 다시 돈다.
  // 랜덤 난이도: 숨은 iframe으로 나무위키 /random을 한 번 더 열어 목표를 정한다(fetch는 셸만 받아 302를 못 따라간다).
  // 완전 랜덤이지만 역링크 10 미만이면 다시 뽑는다(고립된 문서가 목표면 판이 안 된다). 8번 안에 못 찾으면 마지막 것을 쓴다.
  const WILD_MIN = 10;
  const frameLoad = url => new Promise(res => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    const done = () => res(f);
    f.onload = done; setTimeout(done, 15000); f.src = url; document.body.appendChild(f);
  });
  const pickWild = async (except, onTry) => {
    let last = '';
    for (let i = 0; i < 8; i++) {
      if (onTry) onTry(i + 1);
      const f = await frameLoad('/random');
      let name = '';
      for (let t = 0; t < 12 && !name; t++) { try { const p = f.contentWindow.location.pathname; if (p.startsWith('/w/')) name = docOf(p); } catch {} if (!name) await sleep(250); }
      f.remove(); await sleep(700);
      if (!name || name === except || banned(name)) continue;
      last = name;
      const g = await frameLoad('/backlink/' + encPath(name));
      let n = 0;
      for (let t = 0; t < 20; t++) { try { const m = g.contentDocument.body.innerText.match(/문서 \(([\d,]+)\)/); if (m) { n = Number(m[1].replace(/,/g, '')); break; } } catch {} await sleep(250); }
      g.remove(); await sleep(700);
      if (n >= WILD_MIN) return name;
    }
    return last;
  };
  const pickGoal = async (diff, except) => {
    if (diff === 'wild') return pickWild(except);
    const pool = (diff ? LR_WORDS[diff] : [...LR_WORDS.easy, ...LR_WORDS.normal, ...LR_WORDS.hard]).filter(w => w !== except);
    let used = [];
    try { ({ used = [] } = await chrome.storage.local.get('used')); } catch {}
    let left = pool.filter(w => !used.includes(w));
    if (!left.length) { left = pool; used = used.filter(w => !pool.includes(w)); }
    const goal = left[Math.floor(Math.random() * left.length)];
    try { await chrome.storage.local.set({ used: [...used, goal].slice(-2000) }); } catch {}
    return goal;
  };
  const hashFor = (s, more = {}) => {
    const q = new URLSearchParams({ 'ng-goal': s.goal, mode: s.mode });
    if (s.diff) q.set('diff', s.diff);
    if (s.rs) q.set('rs', '1');
    if (s.day) q.set('day', s.day);
    if (s.rules?.nb) q.set('nb', '1');
    if (s.rules?.nt) q.set('nt', '1');
    for (const k of ['nc', 'nf', 'nh', 'nr']) if (s.rules?.[k]) q.set(k, '1');
    if (s.rules?.tl) q.set('tl', s.rules.tl);
    if (s.rules?.ms) q.set('ms', s.rules.ms);
    if (s.vs) { q.set('by', s.vs.by); q.set('s', s.vs.steps); q.set('t', s.vs.ms); for (const d of s.vs.path) q.append('p', d); if (s.vs.times?.length === s.vs.path.length) q.set('pt', s.vs.times.join(',')); }
    for (const [k, v] of Object.entries(more)) q.set(k, v);
    return '#' + q;
  };
  // 새 문제(무작위 판): 시작·목표를 둘 다 새로 뽑아 처음부터. 시간·경로를 0으로 돌린다(버린 판의 기록은 abandon). 랜덤 난이도는 목표를 새 탭 로드가 뽑는다(ng-goal 빈 값).
  const newProblem = async () => {
    await abandon();
    const goal = state.mode === 'custom' ? state.goal : state.diff === 'wild' ? '' : await pickGoal(state.diff, state.goal); // 직접 출제(시작 비움)는 목표를 두고 시작만 새로
    location.replace('/random' + hashFor({ ...state, goal, rs: true, day: null, vs: null }));
  };

  // ---- 목표 미리보기 ----
  // 팝업이 목표를 확인하며 저장해 둔 미리보기를 쓰고, 없으면(무작위 목표·공유 링크) 이 탭에서 목표 문서를 한 번 숨겨 열어 읽는다.
  // 그때 목표가 넘겨주기로 바뀌어 있으면 정식 이름으로 고친다(목록을 만든 뒤 문서 이름이 바뀐 경우).
  const loadPreview = async goal => {
    let previews = {};
    try { ({ previews = {} } = await chrome.storage.local.get('previews')); } catch {}
    if (previews[goal]) return { doc: goal, preview: previews[goal] };
    const r = await probe(goal);
    if (!r.ok) return r;
    try { await chrome.storage.local.set({ previews: Object.fromEntries([...Object.entries(previews).slice(-199), [r.doc, r.preview]]) }); } catch {}
    return r;
  };
  const showPreview = async open => {
    const goal = state.goal, r = await loadPreview(goal);
    if (!$ || goal !== state.goal || state.status !== 'playing') return;
    if (r.ok === false) return toast(r.reason);
    if (r.doc !== goal) { state.goal = r.doc; save(state); render(); }
    if (!r.preview?.text) return;
    $('.pgoal').textContent = r.doc;
    $('.preview p').textContent = r.preview.text;
    $('.pimg').hidden = !r.preview.img;
    if (r.preview.img) $('.pimg img').src = r.preview.img;
    $('.info').hidden = false;
    if (open) $('.preview').hidden = false;
  };

  // ---- 폭죽 ----
  // canvas-confetti(vendor/, ISC 라이선스)를 쓴다. 효과 전용 캔버스는 진행 막대·결과 창과 같은 Shadow DOM 안에 둬서 나무위키 화면과 섞이지 않는다.
  // 모션 줄이기 설정을 켠 사용자에게는 라이브러리가 알아서 터뜨리지 않는다(disableForReducedMotion).
  let fire = null;
  // 다크에서는 밝은 색(연한 노랑, 흰색)을 섞고, 라이트에서는 배경에 묻히지 않게 빼고 나무위키 파랑을 넣는다.
  const palette = () => theme() === 'light'
    ? ['#00a69c', '#28b472', '#ec9f19', '#d64a58', '#0275d8']
    : ['#00a69c', '#28b472', '#ec9f19', '#d64a58', '#fefc8c', '#ffffff'];
  const cc = o => fire && fire({ colors: palette(), disableForReducedMotion: true, ...o });
  // 내 기록 경신과 도전장 승리 모두 화면 아래 가운데에서 위로 한 번
  const burst = () => cc({ particleCount: 140, angle: 90, spread: 100, startVelocity: 75, origin: { x: .5, y: 1 } });
  // 도전장은 시간이 빠른 쪽이 이긴다. 시간이 같을 때만 단계가 적은 쪽.
  const vsWin = () => {
    const v = state.vs, steps = state.path.length - 1;
    return state.status === 'done' && !!v && (state.finishedAt < v.ms || (state.finishedAt === v.ms && steps < v.steps));
  };
  // 이번 판이 내 기록을 깼을 때만 보여 주는 안내 줄. 전에 깬 기록(state.best)과 비교해 단계가 줄었으면 단계, 같으면 시간을 보여 준다.
  const bestText = () => {
    const b = state.best, steps = state.path.length - 1;
    return b ? `내 기록을 갱신했어요 (${steps < b.steps ? `${b.steps}단계 → ${steps}단계` : `${fmt(b.ms)} → ${fmt(state.finishedAt)}`})` : null;
  };
  const paintBest = () => {
    const t = bestText();
    if (!$ || !t || $('.best')) return;
    $('.result').after(el('p', { className: 'verdict best', textContent: t }));
  };
  // 도착한 판이 기록으로 남은 직후 한 번만 부른다(새로고침해서 결과 창을 다시 그릴 때는 부르지 않는다).
  // 도전장 상대를 이겼거나, 내 기록을 깼거나, 오늘의 문제를 풀었으면 폭죽. 여럿이어도 한 번.
  const celebrate = () => {
    paintBest();
    if (vsWin() || state.best || state.mode === 'daily') burst();
  };

  // ---- 로컬 기록 ----
  // 판마다 확장 저장소에 하나씩 남긴다(최근 200판). 시작하는 순간 '끝내지 않음'(진 판)으로 먼저 넣고, 끝나면(도착·규칙 위반·포기) 같은 id의 기록을
  // 결과로 바꾼다. 그래서 탭을 닫거나 다른 링크로 덮어쓰거나 확장이 꺼져도 진 판으로 남는다. 시작 전에 끝난 판(없는 문서 등)은 남기지 않는다.
  // 최고 기록과 통계는 팝업의 기록 화면이 이 목록으로 계산한다.
  // 같은 문제 = 같은 시작→목표이고 규칙이 같은 판. 단계가 적을수록, 같으면 더 빠를수록 좋은 기록이다.
  const ruleKey = r => { const x = r.rules || {}; return ['nb', 'nt', 'nc', 'nf', 'nh', 'nr'].map(k => (x[k] ? 1 : 0)).join('') + `/${x.tl || 0}/${x.ms || 0}`; }; // 규칙이 없던 옛 기록은 규칙 없음과 같다
  const sameProblem = (a, b) => a.start === b.start && a.goal === b.goal && ruleKey(a) === ruleKey(b);
  const better = (a, b) => a.steps < b.steps || (a.steps === b.steps && a.ms < b.ms);
  const entry = reason => {
    const win = state.status === 'done';
    return { id: state.id, at: Date.now(), mode: state.mode, diff: state.diff, start: state.start, goal: state.goal, win, steps: state.path.length - 1,
      ms: win ? state.finishedAt : state.finishedAt ?? elapsed(), path: state.path.map(p => p.doc), times: state.path.map(p => p.t), back: state.path.map(p => p.clicked === '<'),
      reason: win ? null : reason || state.reason, day: state.day, rules: state.rules, vs: state.vs?.by || null };
  };
  // r을 이 판의 기록으로 넣는다(r이 없으면 지운다). 이 판의 다른 기록을 돌려준다. 쓰기는 한 줄로 세워 시작 때 넣는 기록이 결과를 덮지 않게 한다.
  let writing = Promise.resolve();
  const saveRecord = r => (writing = writing.then(async () => {
    try {
      const { records = [] } = await chrome.storage.local.get('records');
      const rest = records.filter(x => x.id !== state.id);
      await chrome.storage.local.set({ records: (r ? [r, ...rest] : rest).slice(0, 200) });
      return rest;
    } catch { toast('기록을 저장하지 못했어요. 탭을 새로고침해 주세요', 5000); return null; } // 확장이 업데이트·새로고침돼 이 탭의 연결이 끊긴 경우
  }));
  const record = async reason => {
    if (state.recorded || !state.startedAt) return;
    state.recorded = true; save(state);
    const r = entry(reason), rest = await saveRecord(r);
    // 전에 이 문제를 깬 적이 있고 이번이 더 좋을 때만 기록 경신이다(첫 도착은 아니다).
    const prev = r.win && rest ? rest.filter(x => x.win && sameProblem(x, r)).reduce((b, x) => (!b || better(x, b) ? x : b), null) : null;
    if (prev && better(r, prev)) { state.best = { steps: prev.steps, ms: prev.ms }; save(state); }
    if (r.win) celebrate();
  };
  // 다시하기·새 문제로 진행 중인 판을 버릴 때: 한 번도 이동하지 않았으면 기록을 지우고(시작 문서가 마음에 안 드는 경우), 이동했으면 진 판으로 남긴다.
  const abandon = async () => {
    if (state.status !== 'playing') return;
    if (state.path.length > 1) { state.status = 'invalid'; await record('다시 시작함'); }
    else { state.recorded = true; await saveRecord(null); }
  };

  // 없는 문서: 새 탭 첫 로드는 HTTP 404가 오고, 같은 출처 이동(location.replace, 새로고침)은 200 껍데기라 문구로 본다.
  const notFound = () => performance.getEntriesByType('navigation')[0]?.responseStatus >= 400 || notFoundText(articleRoot());
  // 껍데기 로드에서는 DOMContentLoaded 시점에 canonical·h1이 아직 없다. 생길 때까지 기다린다.
  const settle = cb => {
    const ok = () => currentDoc() && articleRoot();
    if (ok()) return cb();
    const mo = new MutationObserver(() => { if (ok()) { mo.disconnect(); clearTimeout(tm); cb(); } });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    const tm = setTimeout(() => { mo.disconnect(); cb(); }, 15000); // ponytail: 15초 안에 못 그리면 못 불러온 것으로 본다
  };
  // ---- 시작 카운트다운 ----
  // 화면을 50% 어둡게 덮고 "준비됐나요? 3, 2, 1, 시작!". "시작!"이 뜨는 순간 돌려주고(그때부터 시간을 잰다), 어두운 배경과 위쪽 시작→목표 줄도
  // 그 순간 걷힌다(시간이 가는 동안 화면이 가려지지 않게). "시작!" 글자만 잠깐 남았다가 흐려진다.
  // 새로고침으로 이어 가는 판에는 쓰지 않는다. 처음 시작·다시하기·도전장 수락 뒤에만 한다.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const countdown = async (prep, start) => {
    // 보이지 않는 탭(백그라운드로 열린 링크)이면 보일 때까지 기다린다. 아무도 못 보는 동안 시간이 흐르지 않게.
    while (document.hidden) await new Promise(r => document.addEventListener('visibilitychange', r, { once: true }));
    const cd = $('.cd'), num = $('.cd b'), ab = $('.cd .ab');
    const route = () => { ab.textContent = `${start} → ${state.goal || '?'}`; }; // 위쪽 고정 자리. 애니메이션 없음
    route();
    const show = (t, cls) => { num.className = ''; void num.offsetWidth; num.textContent = t; num.className = cls; }; // 클래스를 뺐다 넣어 애니메이션을 되감는다
    cd.className = 'cd on'; num.textContent = '';
    // 카운트다운 동안은 눌러지지도 스크롤되지도 않게 한다(스크롤바를 없애면 너비가 바뀌므로 입력을 막는다).
    const stop = e => { if (e.type !== 'keydown' || ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) e.preventDefault(); };
    const evs = ['wheel', 'touchmove', 'keydown'];
    for (const t of evs) window.addEventListener(t, stop, { passive: false, capture: true });
    if (prep) { const tell = n => { show(`목표 문서를 찾고 있어요…${n ? `\n${n}번째 문서 확인 중` : ''}`, 'wait'); num.append(el('small', { textContent: '링크가 거의 안 걸린 외딴 문서는 건너뛰어요' })); }; tell(0); await prep(tell); route(); }
    show('준비됐나요?', 'pop ready'); await sleep(1300); // 준비됐나요?와 3, 2, 1은 따로 하나씩 보여 준다
    for (const n of [3, 2, 1]) { show(n, 'pop'); await sleep(800); }
    for (const t of evs) window.removeEventListener(t, stop, { capture: true });
    show('시작!', 'go'); cd.classList.add('start'); // start: 배경이 걷히고 이제부터 아래 화면을 누를 수 있다
    setTimeout(() => { cd.classList.add('out'); setTimeout(() => { cd.className = 'cd'; }, 450); }, 700);
  };

  const begin = () => {
    settle(async () => {
      const doc = currentDoc();
      if (state.status === 'starting') {
        // 무작위 시작이 못 쓰는 문서(없음·다른 이름공간·목표와 같음)면 세 번까지 다시 뽑는다.
        if (state.rs && (!doc || notFound() || banned(doc) || doc === state.goal) && (state.tries || 0) < 3)
          return location.replace('/random' + hashFor(state, { tries: String((state.tries || 0) + 1) }));
        if (!doc) return fail(`시작 문서를 불러오지 못했어요: ${state.start}`);
        if (notFound()) return fail(`시작 문서가 없어요: ${state.start}`);
        if (banned(doc)) return fail(`시작 문서로 쓸 수 없는 이름공간이에요: ${doc}`);
        if ((!state.goal && state.diff !== 'wild') || banned(state.goal)) return fail(`목표 문서로 쓸 수 없어요: ${state.goal}`);
        if (doc === state.goal) return fail('시작과 목표가 같아요');
        hideChrome();
        state.start = doc; save(state); // 넘겨주기로 들어왔어도 정식 이름으로 고정한다. 카운트다운 중 새로고침은 위의 시작 문서 확인을 통과한다
        await countdown(state.goal ? null : async tell => { state.goal = await pickWild(doc, tell); save(state); }, doc); // 랜덤: 목표를 찾은 뒤에 카운트다운
        if (state.status !== 'starting') return; // 카운트다운 중에 끝났다(개발자 도구)
        state.path = [{ doc, t: 0 }]; state.startedAt = Date.now(); state.status = 'playing'; state.id = crypto.randomUUID(); save(state);
        saveRecord(entry('끝내지 않음')); // 탭을 닫거나 덮어써도 진 판으로 남게 미리 넣어 둔다(아래 로컬 기록)
      } else if (state.status === 'playing') {
        // 전체 로드 후 복귀. 새로고침이면 같은 문서라 그대로 이어 간다.
        const nav = performance.getEntriesByType('navigation')[0]?.type, last = state.path[state.path.length - 1].doc;
        let count = nav !== 'reload'; // 새로고침은 떠난 것으로 세지 않는다
        if (state.bounce) { delete state.bounce; delete state.awayAt; save(state); toast('뒤로가기 금지 판이에요'); } // 아래에서 되돌려 보낸 뒤 다시 온 것
        else if (doc && doc !== last) {
          // 뒤로·앞으로가 전체 로드가 된 경우(앞 문서가 브라우저 캐시에서 빠짐 등). 크롬은 새로고침 뒤의 뒤로가기도 보통 같은 페이지 안 이동(popstate)으로 처리한다.
          // 뒤로가기 금지 판이면 실격 대신 원래 문서로 돌려보낸다.
          if (nav === 'back_forward' && state.rules.nb) {
            state.bounce = true; save(state); history.forward();
            return setTimeout(() => location.replace('/w/' + encPath(last)), 1500); // 앞 기록이 없으면 주소로 돌아간다
          }
          // 이번 판에 지나온 문서로 뒤로·앞으로 간 것이나, 승인된 클릭이 전체 로드로 넘어간 것은 정상 이동이다. 그 밖은 주소창 이동 등.
          if (nav === 'back_forward' && state.path.some(p => p.doc === doc)) { popped = true; state.pending = null; }
          else if (state.pending === doc) count = false;
          if (popped || state.pending === doc) check();
          else lose('주소창이나 즐겨찾기처럼 본문 링크가 아닌 방법으로 다른 문서를 열었어요');
        }
        // 다른 곳에 갔다가 돌아온 판. 다른 사이트에 갔다가 여러 칸 뒤로가기로 앞 문서에 돌아와도 떠난 시간과 횟수는 잰다.
        if (!state.bounce) back(count);
      }
      render(); hideChrome();
      if (state.status === 'playing') showPreview(state.path.length === 1);
      if (state.status === 'playing') { if (state.warn) showWarn(); else if (state.pausedAt) showIdle(); } // 창이 떠 있는 채 새로고침했으면 다시 띄운다
      new MutationObserver(check).observe(document.head, { subtree: true, childList: true, attributes: true, characterData: true });
      // 사이드바는 본문보다 늦게 그려지므로 매초 다시 확인한다(바뀐 게 없으면 아무것도 안 함).
      setInterval(() => { hideChrome(); if (state.status === 'playing') render(); idleCheck(); }, 1000);
      // 시간은 1/100초까지 보여 주므로 화면 그릴 때마다 갱신한다.
      const tick = () => {
        if (state.status === 'playing') {
          const used = elapsed(), limit = state.rules.tl * 1000;
          if (limit && used >= limit) lose(timeUp());
          else if (limit) {
            $('.time').textContent = remain(limit - used); $('.time').classList.add('rem');
          } else $('.time').textContent = fmt(used);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  const fail = msg => { state.status = 'invalid'; state.reason = msg; save(state); render(); }; // 시작 전: 기록하지 않는다
  const lose = reason => { state.status = 'invalid'; state.reason = reason; save(state); render(); record(); }; // 게임 중: 진 판으로 기록
  // 이 판에 걸린 제한 조건을 글로. 도전장 수락 창, 결과 카드, 공유 문구가 같이 쓴다.
  const ruleItems = r => [r.nb && '뒤로가기 금지', r.nt && '틀 상자 링크 금지', r.nc && '분류 링크 금지', r.nf && '각주 링크 금지', r.nh && '허브 문서 금지',
    r.nr && '재방문 금지', r.ms && `${r.ms}단계 안에 도착`, r.tl && `제한 시간 ${limitText(r.tl)}`].filter(Boolean);
  // 조건 목록을 작은 라벨 줄로 보여 준다(결과 카드, 도전장 수락 창).
  const ruleChips = (label, items) => el('div', { className: 'rchips' }, el('i', { textContent: label }), ...items.map(t => el('span', { textContent: t })));
  // 도전장 링크: 바로 시작하지 않고 어디서 어디로 가는 판인지와 상대 기록을 보여 준 뒤, 수락해야 시작한다(시간도 그때부터 잰다).
  const invite = () => {
    const v = state.vs, b = t => el('b', { textContent: t });
    const rules = [state.diff && DIFF[state.diff], ...ruleItems(state.rules)].filter(Boolean);
    showCard(`${v.by}님이 도전장을 보냈어요`, [
      el('p', {}, b(state.start), ' 문서에서 ', b(state.goal), ' 문서로 이동하는 판이에요.'),
      el('p', { className: 'verdict', textContent: `${v.by}님의 기록 ${v.steps}단계, ${fmt(v.ms)}` }),
      ...(rules.length ? [ruleChips('규칙', rules)] : [])],
      [button('도전하기', () => { $('.overlay').classList.remove('on'); delete state.invite; save(state); begin(); }, true), button('취소', quit)]);
  };
  // 게임 화면(사이드바·검색창 숨김)은 카운트다운이 시작되기 전에 이미 갖춰져 있어야 시작할 때 너비가 바뀌지 않는다.
  // 사이드바는 본문보다 늦게 그려지므로 화면이 바뀔 때마다(한 프레임에 한 번) 다시 숨긴다.
  let chromeRaf = 0;
  const watchChrome = () => {
    new MutationObserver(() => { if (!chromeRaf) chromeRaf = requestAnimationFrame(() => { chromeRaf = 0; hideChrome(); }); }).observe(document.documentElement, { subtree: true, childList: true });
    hideChrome();
  };
  const ready = async () => {
    // 경로를 켜 둘지는 마지막에 고른 값을 기억한다(경로 버튼). 이어 하는 판은 그 판의 값을 쓴다.
    if (state.pathOn === undefined) { try { ({ hudPath: state.pathOn } = await chrome.storage.local.get('hudPath')); } catch {} }
    mount(); render(); watchChrome(); if (state.invite) invite(); else begin();
  };

  // ---- HUD (Shadow DOM, #app 바깥이라 Vue 재렌더에 안 날아감) ----
  // 색과 글꼴은 나무위키 실측값(2026-10, --espejo-* 변수). 막대와 카드는 나무위키 테마를 따르고, 주요 버튼은 두 테마 모두
  // 나무위키 초록(#00a69c), 경고 안내는 나무위키 위험색(#d64a58)이다.
  let $, host;
  // 아이콘은 Lucide(ISC, vendor/LICENSE-lucide.txt)의 info, list. 환영 페이지(welcome.html)의 줄 아이콘도 같은 라이브러리다.
  const ICON_INFO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
  const ICON_LIST = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg>';
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  const mount = () => {
    host = el('div', { id: 'ng-host' });
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; --bar: linear-gradient(to right, #00a69c, #00a69c, #28b472); --bar-text: #fff; --accent: #fff;
                --card: #fff; --text: #212529; --muted: #6c757d; --border: #ccc; --btn: #fff; --btn-border: #dadada; --btn-hover: #efefef;
                --primary: #00a69c; --danger: #d64a58; --soft: #eef0f2; --soft-border: rgba(0,0,0,.3);
                font-family: "Pretendard JP", Pretendard, -apple-system, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; }
        :host { word-break: keep-all; overflow-wrap: anywhere; } /* 한글을 낱말 중간에서 끊지 않는다 */
        [hidden] { display: none !important; } /* 아래 all: unset·display 규칙이 hidden 속성을 덮지 않게 */
        :host([data-theme="dark"]) { --bar: #2e3033; --accent: #ec9f19; --card: #1c1d1f; --text: #e0e0e0; --muted: #9a9a9a;
                --border: #444; --btn: #000; --btn-border: #3e3e3e; --btn-hover: #1e1e1e; --soft: #2c2e32; --soft-border: rgba(255,255,255,.34); }
        .top { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 2147483647; display: flex; flex-direction: column; gap: 6px;
               width: max-content; max-width: calc(100vw - 24px); }
        .bar { background: var(--bar); color: var(--bar-text);
               font-size: 14px; line-height: 1.4; padding: 8px 14px; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,.3);
               display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; max-width: calc(100vw - 24px); } /* 좁은 창에서는 규칙 칩이 윗줄로 접힌다 */
        .bar b { color: var(--accent); }
        .bar .grp { display: inline-flex; align-items: center; gap: 6px; }
        .bar .ctl { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; height: 26px; padding: 0 8px;
                    border-radius: 13px; background: rgba(255,255,255,.18); font-size: 12px; line-height: 1; white-space: nowrap; cursor: pointer; }
        .bar .acts { display: flex; gap: 9px; flex: 1 1 auto; } /* 새 문제·다시하기·그만두기. 좁아서 줄이 바뀌면 남는 너비를 버튼이 나눠 채운다 */
        .bar .acts .ctl { flex: 1 1 auto; }
        .bar .ctl:hover { background: rgba(255,255,255,.32); }
        .bar .ctl.icon { width: 26px; padding: 0; }
        .bar .ctl svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .bar .chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .bar .chips:empty { display: none; }
        .bar .chip { font-size: 12px; padding: 1px 7px; border-radius: 9px; background: rgba(255,255,255,.2); white-space: nowrap; }
        .bar .chip.d-easy { background: #28b472; } .bar .chip.d-normal { background: #ec9f19; color: #1c1d1f; } .bar .chip.d-hard { background: #d64a58; } .bar .chip.d-wild { background: #8e5ce6; } /* 팝업의 난이도 버튼 색 */
        :host(:not([data-theme="dark"])) .bar .chip[class*=" d-"] { box-shadow: 0 0 0 1px #fff; } /* 밝은 막대(청록~초록)에서 쉬움 초록이 묻히지 않게 얇은 흰 테두리. 크기는 안 변한다. 다크 막대는 회색이라 필요 없다 */
        .bar .vs { font-size: 12px; opacity: .9; white-space: nowrap; }
        .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
        .compare h3 { font-size: 13px; margin: 0 0 4px; color: var(--muted); font-weight: 600; }
        .compare .rec { font-size: 14px; font-weight: 700; margin: 0 0 8px; }
        .compare ol { margin: 0; padding-left: 20px; font-size: 14px; }
        /* 상대 경로는 처음엔 흐리게 가리고 눌러야 보인다(재도전할 때 힌트를 보고 싶지 않을 수 있다) */
        .veil { position: relative; cursor: pointer; }
        .veil ol { filter: blur(5px); user-select: none; transition: filter .15s; }
        .veil::after { content: '눌러서 보기'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
        .veil.on { cursor: default; }
        .veil.on ol { filter: none; user-select: auto; }
        .veil.on::after { content: none; }
        .verdict { font-weight: 700; margin: 4px 0 0; }
        .verdict.best { color: var(--primary); }
        .rchips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 10px 0 2px; }
        .rchips i { flex-basis: 100%; font-style: normal; color: var(--muted); font-size: 14px; margin-bottom: 2px; }
        .rchips span { padding: 1px 9px; border-radius: 10px; background: var(--soft); border: 1px solid var(--border); font-size: 12.5px; line-height: 1.6; white-space: nowrap; }
        .bar .time { font-variant-numeric: tabular-nums; min-width: 66px; }
        .bar .time.rem { min-width: 7.5em; text-align: center; } /* 남은 시간은 글자 수가 달라도 막대가 덜 흔들리게 폭을 잡는다 */
        .preview { display: flex; gap: 12px; align-items: stretch;
                   width: 0; min-width: 100%; box-sizing: border-box; background: var(--card); /* 폭 0 + 최소 100%: 막대 폭에 맞춘다(설명이 막대를 넓히지 않는다) */ color: var(--text); border: 1px solid var(--border);
                   border-radius: 6px; padding: 10px 12px; font-size: 13px; line-height: 1.5; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
        /* 사진은 글 덩어리(제목+본문) 높이만큼 늘어난다. 사진 원래 크기가 상자 높이를 밀지 않도록 안에 띄워 둔다. */
        .preview .pimg { position: relative; width: 92px; min-height: 64px; flex: none; border-radius: 4px; overflow: hidden; }
        .preview .pimg img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .preview .ptxt { flex: 1; min-width: 0; }
        .preview p { margin: 2px 0 0; }
        /* 이동내역: 목표 설명처럼 진행 막대와 같은 폭으로 펼친다. 이동할 때마다 갱신되고 길어지면 안에서 스크롤한다. */
        .trail { width: 0; min-width: 100%; box-sizing: border-box; max-height: 40vh; overflow: auto; background: var(--card); color: var(--text); border: 1px solid var(--border);
                 border-radius: 6px; padding: 8px 12px; font-size: 13px; line-height: 1.6; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
        .trail ol { margin: 0; padding-left: 24px; }
        .trail small { color: var(--muted); }
        .dt { float: right; margin-left: 12px; color: var(--muted); font-size: 12.5px; font-variant-numeric: tabular-nums; }
        /* 한 줄 경로: 최근 세 곳만 보이고(앞은 …) 눌러서 전체 목록을 펼친다. 폭은 진행 막대를 따른다. */
        .crumb { width: 0; min-width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 8px; padding: 5px 12px; cursor: pointer; font-size: 13px; line-height: 1.5;
                 background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
        .crumb .cl { flex: none; color: var(--muted); }
        .crumb .chev { flex: none; margin-left: auto; color: var(--muted); }
        .crumb .cp { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; overflow: hidden; white-space: nowrap; }
        .crumb .cp .it { display: flex; gap: 6px; flex: 0 1 auto; min-width: 0; }
        .crumb .cp .d { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .crumb .cp .sep, .crumb .cp .dim { flex: none; color: var(--muted); }
        .crumb .cp .cur { font-weight: 700; }
        .crumb .cp.measure .it { flex-shrink: 0; } /* 폭을 잴 때만: 줄어들지 않은 원래 폭으로 */
        .bar .ctl.icon.on { background: rgba(255,255,255,.4); }
        .preview .pclose { all: unset; cursor: pointer; align-self: flex-start; color: var(--muted); font-size: 18px; line-height: 1; }
        /* 시작 카운트다운: 화면 전체를 50% 어둡게 */
        .cd { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.5); display: none; flex-direction: column; align-items: center;
              justify-content: center; color: #fff; user-select: none; text-shadow: 0 4px 24px rgba(0,0,0,.4); }
        .cd.on { display: flex; }
        .cd .ab { position: absolute; bottom: calc(50% + 90px); left: 5vw; right: 5vw; text-align: center; font-size: clamp(20px, 3vw, 36px); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd.start { pointer-events: none; background: none; }
        .cd.start .ab { display: none; }
        .cd.out { animation: cdfade .45s ease-in both; }
        .cd b { font-size: clamp(48px, 7vw, 90px); line-height: 1.05; font-weight: 800; font-variant-numeric: tabular-nums; }
        .cd b.wait { font-size: clamp(20px, 3.2vw, 38px); max-width: 90vw; white-space: pre-line; text-align: center; line-height: 1.5; }
        .cd b.wait small { display: block; margin-top: 10px; font-size: 18px; font-weight: 500; opacity: .8; }
        .cd b.pop { animation: cdpop .8s ease-out both; }
        .cd b.ready { font-size: clamp(28px, 4.6vw, 60px); animation-duration: 1.3s; }
        .cd b.go { color: #3ddc97; animation: cdgo .7s cubic-bezier(.2,1.4,.4,1) both; }
        @keyframes cdpop { 0% { transform: scale(1.7); opacity: 0; } 25% { transform: scale(1); opacity: 1; } 75% { opacity: 1; } 100% { transform: scale(.88); opacity: 0; } }
        @keyframes cdgo { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes cdfade { to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .cd b.pop, .cd b.go { animation: none; } .cd.out { animation-duration: .01s; } }
        .toast { position: fixed; left: 50%; top: 58px; transform: translateX(-50%); z-index: 2147483647; background: var(--danger); color: #fff;
                 border-radius: 6px; font-size: 14px; font-weight: 600; padding: 8px 14px;
                 box-shadow: 0 2px 10px rgba(0,0,0,.25); opacity: 0; transition: opacity .2s; pointer-events: none; }
        .toast.on { opacity: 1; }
        .overlay { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.55); display: none; align-items: center; justify-content: center; }
        .overlay.on { display: flex; }
        .overlay.shade { backdrop-filter: blur(10px); } /* 게임 중에 뜬 창 뒤의 본문은 흐려서 못 읽게 한다(아래 showCard) */
        .fx { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647; }
        /* 포커스가 화면 밖에 있어 본문을 숨긴 동안(content.css) 빈 자리에 띄우는 한 줄. 누르면 포커스가 돌아와 사라진다 */
        .blurnote { display: none; position: fixed; inset: 0; align-items: center; justify-content: center; color: var(--text); font-size: 16px; pointer-events: none; }
        :host([data-blur]) .blurnote { display: flex; }
        .card { background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; font-size: 15px; line-height: 1.5;
                box-sizing: border-box; padding: 20px 24px; width: max-content; min-width: min(240px, 90vw); max-width: min(420px, 90vw); max-height: 80vh; overflow: auto; box-shadow: 0 6px 24px rgba(0,0,0,.35); }
        .card.wide { min-width: min(400px, 90vw); max-width: min(520px, 90vw); } /* 두 경로를 나란히 */
        .card h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; white-space: pre-line; }
        .card h2.big { margin: 0 0 10px; font-size: 30px; line-height: 1.25; } /* 도착!·게임 종료 */
        .card ol { margin: 8px 0; padding-left: 22px; }
        .result { margin: 0 0 4px; font-size: 20px; font-weight: 700; }
        .sec { margin: 16px 0 6px; font-size: 15px; font-weight: 700; }
        .card small, .muted { color: var(--muted); }
        .muted { white-space: pre-line; }
        .btn { font: inherit; font-size: 14px; padding: 6px 12px; border: 1px solid var(--btn-border); background: var(--btn); color: var(--text);
               border-radius: .3rem; cursor: pointer; }
        .btn:hover { background: var(--btn-hover); }
        .btn.primary, .btn.primary:hover { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .btn.primary:hover { filter: brightness(1.08); }
        .actions { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(92px, 1fr); gap: 8px; margin-top: 18px; }
        .actions .btn { padding: 8px 0; font-weight: 600; text-align: center; }
        .actions .btn:not(.primary) { background: var(--soft); border-color: var(--soft-border); }
        .actions .btn:not(.primary):hover { background-image: linear-gradient(rgba(128,128,128,.2), rgba(128,128,128,.2)); }
        .pick { margin: 8px 0; max-height: 50vh; overflow: auto; }
        .pick .btn { display: block; width: 100%; margin: 0 0 4px; text-align: left; }
        .pick summary { cursor: pointer; color: var(--muted); margin: 8px 0 6px; }
        .share { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
        .share label { display: block; margin-bottom: 6px; font-size: 14px; }
        /* 아래 버튼 줄(세 칸)과 칸을 맞춘다: 입력칸은 두 칸, 복사하기는 세 번째 칸 */
        .share .row { display: grid; grid-template-columns: repeat(3, minmax(92px, 1fr)); gap: 8px; }
        .share .row .btn { height: 39px; padding: 0; font-weight: 600; text-align: center; }
        .share input, .share textarea { font: inherit; font-size: 14px; padding: 6px 8px; border: 1px solid var(--btn-border); border-radius: .3rem;
               background: var(--btn); color: var(--text); box-sizing: border-box; }
        .share input { grid-column: span 2; min-width: 0; height: 39px; padding: 0 10px; }
        .share textarea { width: 100%; height: 96px; margin-top: 8px; resize: none; }
        /* 복사한 글 미리보기. 다섯 줄쯤 보이고 넘치면 안에서 스크롤한다. 한글은 낱말 단위로, 긴 링크는 아무 데서나 끊긴다(:host) */
        .share .sharebox { margin-top: 8px; max-height: 7.5em; overflow: auto; padding: 6px 10px; border: 1px solid var(--btn-border); border-radius: .3rem;
                           background: var(--btn); font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
        .share .sharebox .lk { font-size: 12px; color: var(--muted); }
      </style>
      <div class="top"><div class="bar"><span class="chips"></span><span class="grp">목표 <b class="goal"></b><button class="ctl icon info" title="목표 미리보기" hidden>${ICON_INFO}</button></span>
        <span>단계 <b class="steps">0</b></span><button class="ctl icon pathbtn" title="경로 보기/숨기기" hidden>${ICON_LIST}</button><b class="time">00:00.00</b><span class="vs" hidden></span><span class="acts"><button class="ctl newq" hidden>새 문제</button><button class="ctl retrybtn" hidden>다시하기</button><button class="ctl quit">그만두기</button></span></div>
      <div class="preview" hidden><div class="pimg"><img alt=""></div><div class="ptxt"><b class="pgoal"></b><p></p></div><button class="pclose" title="닫기">×</button></div>
        <div class="crumb" title="지나온 문서 전체 보기" hidden><span class="cl">경로</span><span class="cp"></span><span class="chev">▾</span></div>
        <div class="trail" hidden><ol start="0"></ol></div></div>
      <div class="cd"><div class="ab"></div><b></b></div>
      <div class="overlay"><div class="card"><h2 class="title"></h2><div class="body"></div><div class="actions"></div></div></div>
      <div class="toast"></div>
      <div class="blurnote">화면을 누르면 다시 보여요</div>
      <canvas class="fx"></canvas>`;
    $ = sel => shadow.querySelector(sel);
    if (typeof confetti === 'function') fire = confetti.create($('.fx'), { resize: true, useWorker: false }); // 워커는 나무위키 페이지의 보안 정책에 막힐 수 있어 쓰지 않는다
    $('.quit').onclick = quit;
    $('.pathbtn').onclick = () => { state.pathOn = state.pathOn === false; save(state); try { chrome.storage.local.set({ hudPath: state.pathOn }); } catch {} render(); };
    window.addEventListener('resize', () => { crumbW = -1; fitCrumb(); });
    $('.crumb').onclick = () => { state.trailOpen = !state.trailOpen; save(state); render(); $('.trail').scrollTop = $('.trail').scrollHeight; };
    // 다시하기: 같은 시작·목표·규칙으로 처음부터. 진행을 날리는 버튼이라 3초 안에 한 번 더 눌러야 한다. 이동한 뒤에 다시 시작한 판은 진 판으로 남는다(abandon).
    const armed = (sel, label, ask, run) => {
      let arm = 0;
      $(sel).onclick = () => {
        const b = $(sel);
        if (!arm) { b.textContent = ask; arm = setTimeout(() => { arm = 0; b.textContent = label; }, 3000); return; }
        clearTimeout(arm); run();
      };
    };
    armed('.retrybtn', '다시하기', '정말 다시?', retry);
    armed('.newq', '새 문제', '정말 새로?', newProblem);
    $('.info').onclick = () => { $('.preview').hidden = !$('.preview').hidden; render(); };
    $('.pclose').onclick = () => { $('.preview').hidden = true; render(); };
    // 닉네임 칸에서 친 글자가 나무위키 단축키(A 랜덤 등)로 새지 않게, 이 안의 키 이벤트는 여기서 멈춘다.
    for (const t of ['keydown', 'keypress', 'keyup']) host.addEventListener(t, e => e.stopPropagation());
    document.body.appendChild(host);
  };
  // 종료는 상태를 지우고 새로고침한다. 새 문서에서는 state가 없어 리스너·CSS·HUD가 하나도 붙지 않는다.
  // 진행 중에 그만두면 진 판으로 기록한다.
  const quit = async () => {
    if (state.status === 'playing') { state.status = 'invalid'; await record('그만둠'); }
    clear(); location.reload();
  };
  // 다시하기: 같은 시작·목표로 새 게임 상태를 넣고 시작 문서를 다시 연다(지금 문서가 시작 문서여도 새로 불러온다).
  const retry = async () => {
    await abandon();
    // 메모리의 state도 새 판으로 바꾼다. 안 그러면 페이지를 떠날 때 leave()가 옛 판(진행 중)에 떠난 시각을 적어 저장하면서 새 판을 덮어쓴다.
    save(state = fresh('starting', state.start, state.goal, { mode: state.mode, diff: state.diff, day: state.day, rules: state.rules, vs: state.vs }));
    location.replace('/w/' + encPath(state.start));
  };
  let toastTimer;
  const toast = (msg, ms = 1500) => { if (!$) return; $('.toast').textContent = msg; $('.toast').classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('.toast').classList.remove('on'), ms); };
  const dur = ms => { if (ms < 60000) return (ms / 1000).toFixed(1) + '초'; const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}분 ${s % 60}초`; }; // 한 단계에 걸린 시간
  // 목록 한 줄의 오른쪽에 붙이는 걸린 시간. times[i] - times[i-1]이 i번째 문서에 닿기까지 걸린 시간이다. 시간이 없으면(옛 기록) 붙이지 않는다.
  const dt = (times, i) => (Number.isFinite(times?.[i]) && Number.isFinite(times?.[i + 1]) ? [el('span', { className: 'dt', textContent: dur(times[i + 1] - times[i]), title: '이 문서에 머문 시간' })] : []);
  const pad = n => String(n).padStart(2, '0');
  // 남은 시간: 1분 넘게 남았으면 "4분 35초 남음", 마지막 1분부터는 "34.52초 남음".
  const remain = ms => {
    if (ms <= 60000) return `${(Math.floor(ms / 10) / 100).toFixed(2)}초 남음`;
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ''} 남음`;
  };
  const fmt = ms => { const cs = Math.floor(ms / 10), s = Math.floor(cs / 100); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${pad(cs % 100)}`; };
  // 공유 문구용 걸린 시간: "1분 23.45초", 1분 안이면 "23.45초"
  const took = ms => { const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000); return (m ? `${m}분 ` : '') + `${((cs % 6000) / 100).toFixed(2)}초`; };
  // 눌러서 볼 때까지 흐리게 가리는 덮개(상대 경로용)
  const veil = child => { const on = () => box.classList.add('on'); const box = el('div', { className: 'veil', tabIndex: 0, title: '눌러서 보기', onclick: on, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on(); } } }, child); return box; };
  const button = (text, onclick, primary) => el('button', { className: 'btn' + (primary ? ' primary' : ''), textContent: text, onclick });
  const showCard = (title, body, actions, big) => {
    $('.title').textContent = title; $('.title').classList.toggle('big', !!big);
    $('.body').replaceChildren(...body);
    $('.actions').replaceChildren(...actions);
    // 멈춘 창과 도전장 수락 창은 시계가 안 가는 동안 뜬다. 뒤 본문이 보이면 스크롤해 가며 미리 읽을 수 있어서 흐린다. 결과 창은 그대로.
    $('.overlay').classList.toggle('shade', live());
    $('.overlay').classList.add('on');
  };

  // 공유하기: 닉네임을 받아 결과 문구를 복사한다. 링크는 같은 문제를 시작 문서에서 바로 여는 #ng-goal 형식.
  // ponytail: 웹스토어 등록 전이라 설치 링크는 자리표시자다. 등록하면 STORE_URL의 EXTENSION_ID만 실제 ID로 바꾼다.
  const STORE_URL = 'https://chromewebstore.google.com/detail/namutagi/EXTENSION_ID';
  // 도전장 링크에는 내 이름·단계·시간·경로를 담는다. 받은 사람은 진행 막대에서 내 기록을 보고, 끝나면 경로를 비교한다.
  const shareText = nick => {
    const steps = state.path.length - 1;
    const me = { ...state, rs: false, vs: { by: nick, steps, ms: state.finishedAt, path: state.path.map(p => p.doc), times: state.path.map(p => p.t) } };
    const link = `https://namu.wiki/w/${encPath(state.start)}${hashFor(me)}`;
    const daily = state.mode === 'daily';
    return (daily ? `나무타기 ${dayLabel(state.day)}의 문제\n` : '') +
      `${nick}님이 ${state.start} 문서에서 ${state.goal} 문서로 ${took(state.finishedAt)} 만에 ${steps}단계로 이동했어요.\n` +
      (ruleItems(state.rules).length ? `조건: ${ruleItems(state.rules).join(', ')}\n` : '') +
      `같은 문제에 도전해 보세요 👉 ${link}\n도전하려면 확장을 먼저 설치해야 해요.\n나무타기 확장 설치 👉 ${STORE_URL}`; // 확장이 없으면 링크는 그냥 나무위키 문서로 열린다
  };
  // 닉네임을 비워 두면 쓰는 자동 이름("명랑한 다람쥐"). 처음 한 번 만들어 저장해 두고, 직접 쓴 닉네임이 있으면 그것을 쓴다.
  const NICK_ADJ = ['명랑한', '용감한', '느긋한', '씩씩한', '부지런한', '엉뚱한', '수줍은', '듬직한', '재빠른', '졸린', '배고픈', '호기심 많은',
    '똑똑한', '푸근한', '당당한', '다정한', '날쌘', '반짝이는', '포근한', '느릿한', '상냥한', '의젓한', '활기찬'];
  const NICK_ANIMAL = ['다람쥐', '고양이', '여우', '토끼', '펭귄', '수달', '판다', '코알라', '고슴도치', '햄스터', '부엉이', '돌고래', '거북이', '오리', '너구리',
    '기린', '하마', '사슴', '곰', '호랑이', '늑대', '앵무새', '미어캣', '알파카', '카피바라', '두더지', '참새', '사자', '강아지', '개구리', '물개', '고래', '라마', '얼룩말'];
  const randomNick = () => { const pick = a => a[Math.floor(Math.random() * a.length)]; return `${pick(NICK_ADJ)} ${pick(NICK_ANIMAL)}`; };
  const openShare = async () => {
    if ($('.share')) return $('.share input').focus();
    let saved = '', auto = '';
    try { // 확장이 새로고침돼 연결이 끊긴 경우는 catch로 빠진다
      ({ nick: saved = '', autoNick: auto = '' } = await chrome.storage.local.get(['nick', 'autoNick']));
      if (!auto) { auto = randomNick(); await chrome.storage.local.set({ autoNick: auto }); }
    } catch { auto = auto || randomNick(); }
    const input = el('input', { value: saved, placeholder: auto, maxLength: 20 });
    const out = el('textarea', { readOnly: true, hidden: true }); // 자동 복사가 막혔을 때 직접 고르고 복사하는 칸
    // 복사한 글 미리보기: 붙여 넣을 글 그대로 보여 준다. 링크만 작고 흐리게, 한글을 풀어서 보여 준다(%EC… 그대로면 상자를 다 차지한다).
    const shown = el('div', { className: 'sharebox', hidden: true });
    const readable = u => { try { return decodeURI(u); } catch { return u; } };
    const note = el('div', { className: 'muted' });
    const copy = async () => {
      const typed = input.value.trim(), nick = typed || auto;
      if (typed) try { await chrome.storage.local.set({ nick: typed }); } catch {}
      out.value = shareText(nick);
      shown.replaceChildren(...out.value.split(/(https?:\/\/\S+)/).map((part, i) => (i % 2 ? el('span', { className: 'lk', textContent: readable(part) }) : part)));
      try { await navigator.clipboard.writeText(out.value); out.hidden = true; shown.hidden = false; note.textContent = '복사했어요.\n메신저에 붙여 넣으세요.'; }
      catch { shown.hidden = true; out.hidden = false; out.select(); note.textContent = '자동 복사가 막혀 있어요.\n위 글을 복사해 주세요.'; }
    };
    input.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) copy(); };
    $('.body').append(el('div', { className: 'share' },
      el('label', { textContent: '닉네임 (비우면 이 이름을 써요)' }),
      el('div', { className: 'row' }, input, button('복사하기', copy, true)), shown, out, note));
    input.focus();
  };

  // 한 줄 경로를 막대 폭에 맞춘다: 앞쪽 문서부터 숨기고 …를 붙인다. 지금 문서는 늘 보이고, 혼자서도 길면 …로 줄어든다.
  let crumbW = -1;
  const fitCrumb = () => {
    const cp = $('.cp'), w = cp.clientWidth;
    if ($('.crumb').hidden || !w || w === crumbW) return;
    crumbW = w;
    const its = [...cp.querySelectorAll('.it')], dim = cp.querySelector('.dim');
    const apply = k => { its.forEach((e, i) => { e.hidden = i < k; e.firstChild.hidden = i === k && k === 0; }); dim.hidden = k === 0; };
    cp.classList.add('measure');
    let k = 0;
    for (; k < its.length - 1; k++) { apply(k); if (cp.scrollWidth <= w) break; }
    apply(k);
    cp.classList.remove('measure');
  };
  let shown = false;
  const render = () => {
    if (!$) return;
    host.dataset.theme = theme();
    const steps = Math.max(0, state.path.length - 1);
    const playing = state.status === 'playing';
    $('.goal').textContent = state.goal || '확인 중';
    $('.steps').textContent = steps + (state.rules.ms ? '/' + state.rules.ms : '');
    // 이동내역: 버튼으로 열고 닫는다(새로고침해도 유지). 목록은 이동할 때마다 다시 그리고 맨 아래(지금 문서)로 내린다.
    // 경로와 목표 설명은 따로 켜고 끈다: 경로 버튼(≡)은 경로 줄 전체를, ⓘ는 목표 설명을 여닫는다. 경로 줄을 누르면 전체 목록이 펼쳐진다.
    const pathOn = state.pathOn !== false;
    $('.pathbtn').hidden = !playing; $('.pathbtn').classList.toggle('on', pathOn); $('.info').classList.toggle('on', !$('.preview').hidden);
    $('.crumb').hidden = !(playing && pathOn); $('.chev').textContent = state.trailOpen ? '▴' : '▾';
    $('.trail').hidden = !(playing && pathOn && state.trailOpen);
    const sig = state.path.map(p => p.doc + (p.clicked === '<' ? '<' : '')).join('|');
    if ($('.trail ol').dataset.v !== sig) {
      $('.trail ol').dataset.v = sig;
      const pt = state.path.map(p => p.t);
      $('.trail ol').replaceChildren(...state.path.map((p, i, all) => el('li', {}, ...dt(pt, i), i && i === all.length - 1 ? el('b', { textContent: p.doc }) : p.doc,
        ...(i === 0 ? [el('small', { textContent: ' 시작' })] : []), ...(p.clicked === '<' ? [el('small', { textContent: ' 뒤로/앞으로' })] : []))));
      $('.trail').scrollTop = $('.trail').scrollHeight;
      // 한 줄 경로: 지나온 문서를 모두 한 줄에 늘어놓고, 막대 폭에 안 들어가면 앞쪽부터 …로 줄인다(fitCrumb).
      $('.cp').replaceChildren(el('span', { className: 'dim', textContent: '…', hidden: true }),
        ...state.path.map((p, i, all) => el('span', { className: 'it' + (i && i === all.length - 1 ? ' cur' : '') },
          el('span', { className: 'sep', textContent: '›' }), el('span', { className: 'd', textContent: p.doc }))));
      crumbW = -1;
    }
    fitCrumb();
    const chips = [state.diff && DIFF[state.diff], state.mode === 'daily' && `${dayLabel(state.day)}의 문제`,
      state.rules.nb && '뒤로 금지', state.rules.nt && '틀 금지', state.rules.nc && '분류 금지', state.rules.nf && '각주 금지', state.rules.nh && '허브 금지',
      state.rules.nr && '재방문 금지', state.rules.ms && `${state.rules.ms}단계 제한`, state.rules.tl && `${limitText(state.rules.tl)} 제한`].filter(Boolean);
    if ($('.chips').dataset.v !== chips.join()) { $('.chips').dataset.v = chips.join(); $('.chips').replaceChildren(...chips.map(t => el('span', { className: 'chip' + (state.diff && t === DIFF[state.diff] ? ' d-' + state.diff : ''), textContent: t }))); }
    $('.vs').hidden = !state.vs;
    if (state.vs) $('.vs').textContent = `vs ${state.vs.by} ${state.vs.steps}단계 ${fmt(state.vs.ms)}`;
    $('.newq').hidden = !(playing && (state.mode === 'random' || (state.mode === 'custom' && state.rs)) && !state.vs); // 도전 중에는 문제를 못 바꾼다
    $('.retrybtn').hidden = !(playing || (state.status === 'starting' && state.start)); // 카운트다운 동안에도 보여 막대 폭이 시작 때 튀지 않게(눌러지지는 않는다). 무작위 시작이 아직 안 정해졌으면(start 없음) 숨긴다.
    if (state.status === 'invalid' && state.startedAt && state.finishedAt == null) { state.finishedAt = elapsed(); save(state); } // 진 판도 끝난 순간의 시간을 굳힌다(안 그러면 0으로 보인다)
    if (!playing) { $('.time').textContent = fmt(state.finishedAt ?? 0); $('.time').classList.remove('rem'); }
    if ((state.status === 'done' || state.status === 'invalid') && !shown) {
      shown = true;
      $('.preview').hidden = true; $('.info').hidden = true;
      const done = state.status === 'done';
      const times = state.path.map(p => p.t);
      const list = el('ol', {}, ...state.path.map((p, i) => el('li', {}, ...dt(times, i), p.doc, ...(p.clicked === '<' ? [' ', el('small', { textContent: '(뒤로/앞으로)' })] : []))));
      const canRetry = state.path.length > 0 && state.goal; // 시작 전에 끝난 경우(없는 문서 등)는 다시 할 게 없다
      // 도전장으로 온 판이면 상대 기록과 비교하고 두 경로를 나란히 보여 준다(상대 경로는 끝난 뒤에만 보인다).
      const v = state.vs;
      const sec = x => (Math.abs(x) / 1000).toFixed(2) + '초', dSteps = steps - (v ? v.steps : 0);
      const verdict = !v ? null : !done ? `${v.by}님은 ${v.steps}단계, ${fmt(v.ms)}에 도착했어요` :
        state.finishedAt < v.ms ? `${v.by}님보다 ${sec(v.ms - state.finishedAt)} 빨라요! 이겼어요` :
        state.finishedAt > v.ms ? `${v.by}님보다 ${sec(state.finishedAt - v.ms)} 느려요` :
        dSteps < 0 ? `${v.by}님과 같은 시간인데 ${-dSteps}단계 적어요! 이겼어요` : dSteps > 0 ? `${v.by}님과 같은 시간인데 ${dSteps}단계 많아요` : `${v.by}님과 똑같아요`;
      const verdict2 = v && done && dSteps && state.finishedAt !== v.ms ? `(단계는 ${Math.abs(dSteps)}단계 ${dSteps > 0 ? '많아요' : '적어요'})` : null;
      const rec = (n, s, ms) => [el('h3', { textContent: n }), el('p', { className: 'rec', textContent: `${s}단계, ${fmt(ms)}` })];
      const pathView = v && v.path.length ? el('div', { className: 'compare' },
        el('div', {}, ...(done ? rec('내 경로', steps, state.finishedAt) : [el('h3', { textContent: '내 경로' })]), list),
        el('div', {}, ...rec(`${v.by}님 경로`, v.steps, v.ms), veil(el('ol', {}, ...v.path.map((d, i) => el('li', {}, ...dt(v.times, i), d)))))) : el('div', {}, el('h3', { className: 'sec', textContent: '이동기록' }), list);
      showCard(done ? '도착!' : '게임 종료',
        [...(done ? [el('p', { className: 'result', textContent: `${steps}단계, ${fmt(state.finishedAt)}` })] : []),
          ...(state.reason ? [el('p', { textContent: state.reason })] : []), ...(verdict ? [el('p', { className: 'verdict', textContent: verdict })] : []), ...(verdict2 ? [el('p', { textContent: verdict2 })] : []),
          ...(ruleItems(state.rules).length ? [ruleChips('조건', ruleItems(state.rules))] : []), pathView],
        [...(done ? [button('공유하기', openShare, true)] : []), ...(canRetry ? [button('다시하기', retry, !done)] : []), button('닫기', quit)], true);
      $('.card').classList.toggle('wide', !!(v && v.path.length)); // 두 경로를 나란히 보여 줄 때만 넓힌다
      paintBest();
    }
  };

  // bfcache로 복원되면 스크립트가 다시 돌지 않아 메모리 상태와 저장 상태가 갈라진다. 새로고침으로 맞춘다.
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  document.addEventListener('DOMContentLoaded', ready);
})();
