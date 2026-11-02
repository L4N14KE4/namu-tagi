// 릴리스 zip(또는 extension 폴더)을 Chrome for Testing 새 프로필에 압축해제 로드해 확인한다. 의존 패키지 없음(Node 22+ 내장 WebSocket으로 CDP).
//   gh release download v0.1.0 -p '*.zip' -D <빈 폴더> && unzip <zip> -d <빈 폴더2>
//   node e2e/release-test.mjs <빈 폴더2>        (폴더를 안 주면 저장소의 extension/)
// 확인: 설치하면 환영 페이지와 manifest 버전, 우클릭 메뉴 4개, 권한, 팝업 직접 출제 입력(draft)과 초기화, 나무위키 사과 → 사과나무 한 판,
//       공유하기로 만든 도전장 링크를 열면 수락 창에 같은 이름, 경로, 시간이 뜨는지.
// SHORT_BASE=http://localhost:8787 을 주면 확장 사본의 서버 주소를 바꿔 로컬 서버(server/, npx wrangler dev --local)로 시험한다.
// 사본은 확장 ID가 달라 페이지가 확장을 못 찾으므로 도전장은 설치 안내가 뜨는지 보고 나무위키 링크를 직접 연다. 끝까지 보려면 배포 뒤 SHORT_BASE 없이 저장소의 extension/로 돌린다.
// 새 임시 프로필이라 사용자 크롬 기록에는 판이 남지 않는다. 나무위키에 실제로 접속한다.
// 정식 크롬 137+는 --load-extension을 무시해서 Chrome for Testing이 필요하다: CHROME 환경 변수, e2e/browsers(npm run chrome), ~/.cache/puppeteer 순으로 찾는다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
let ext = path.resolve(process.argv[2] || path.join(here, '../extension'));
const SHORT = process.env.SHORT_BASE;
if (SHORT) { // 사본을 만들어 SHORT_BASE만 바꾼다
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'namu-tagi-ext-'));
  fs.cpSync(ext, copy, { recursive: true });
  const cj = path.join(copy, 'content.js'), src = fs.readFileSync(cj, 'utf8');
  if (!src.includes("const SHORT_BASE = 'https://namutagi.com';")) { console.error('content.js에서 SHORT_BASE를 못 찾았어요'); process.exit(2); }
  fs.writeFileSync(cj, src.replace("const SHORT_BASE = 'https://namutagi.com';", `const SHORT_BASE = '${SHORT}';`));
  const bj = path.join(copy, 'background.js'), mj = path.join(copy, 'manifest.json'), man = JSON.parse(fs.readFileSync(mj, 'utf8'));
  fs.writeFileSync(bj, fs.readFileSync(bj, 'utf8').replace("'https://namutagi.com/welcome'", `'${SHORT}/welcome'`));
  man.externally_connectable.matches.push(`${SHORT}/*`);
  fs.writeFileSync(mj, JSON.stringify(man));
  ext = copy;
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'namu-tagi-'));
const findCft = d => { try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === 'Google Chrome for Testing' && fs.statSync(p).isFile()) return p; if (fs.statSync(p).isDirectory()) { const r = findCft(p); if (r) return r; } } } catch {} return null; };
const CFT = process.env.CHROME || findCft(path.join(here, 'browsers')) || findCft(path.join(os.homedir(), '.cache/puppeteer/chrome'));
if (!CFT) { console.error('Chrome for Testing이 없습니다. e2e에서 npm install && npm run chrome 을 실행하세요.'); process.exit(2); }
const PORT = 9333;
const VERSION = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8')).version;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'; // 헤드리스 표시(HeadlessChrome)를 뺀 보통 UA
const chrome = spawn(CFT, ['--headless=new', `--user-data-dir=${profile}`, `--load-extension=${ext}`, `--disable-extensions-except=${ext}`,
  `--remote-debugging-port=${PORT}`, '--no-first-run', ...(SHORT ? ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults'] : []), '--no-default-browser-check', `--user-agent=${UA}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail); };

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async (sessionId, expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (fn, ms = 15000, step = 250) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await sleep(step); } return null; };
const attach = async targetId => (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
const targets = async () => (await send('Target.getTargets')).targetInfos;

try {
  const ver = await waitFor(() => fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()));
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });

  // 1. 설치하면 환영 페이지가 열린다(onInstalled install)
  const BASE = SHORT || 'https://namutagi.com';
  const welcome = await waitFor(async () => (await targets()).find(t => t.type === 'page' && t.url.startsWith(`${BASE}/welcome`)));
  check('설치하면 환영 페이지가 열린다', welcome, welcome?.url);
  // 크롬 안에 든 다른 확장도 background.js 서비스 워커가 있어서, 이름으로 우리 것을 찾는다.
  const sw = await waitFor(async () => {
    for (const t of await targets()) {
      if (t.type !== 'service_worker' || !t.url.endsWith('/background.js')) continue;
      if (await evaluate(await attach(t.targetId), `chrome.runtime.getManifest().name.includes('나무타기')`)) return t;
    }
  });
  check('서비스 워커가 뜬다', sw, sw?.url);
  const extId = new URL(sw.url).host;
  if (welcome) {
    const s = await attach(welcome.targetId);
    const v = await waitFor(() => evaluate(s, `document.body.innerText.includes('v${VERSION}') && document.body.innerText.slice(0, 60)`));
    check(`환영 페이지에 v${VERSION}`, v, JSON.stringify(v));
    const face = await evaluate(s, `document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').length)`);
    check('환영 페이지에 Pretendard', face === 2, face);
    const ping = await evaluate(s, `chrome.runtime.sendMessage(${JSON.stringify(extId)}, 'ping')`);
    check('페이지가 물으면 확장이 답함', ping === true, ping);
    await evaluate(s, SHORT ? `chrome.runtime.sendMessage(${JSON.stringify(extId)}, 'introSeen')` : `seen()`);
    // 실제 서버면 버튼을 직접 누른다. 사본은 확장 ID가 달라 버튼이 확장을 못 찾으므로 메시지를 직접 보낸다.
    const opened = SHORT ? await evaluate(s, `chrome.runtime.sendMessage(${JSON.stringify(extId)}, 'openPopup')`)
      : await evaluate(s, `document.getElementById('go').click(), true`);
    await sleep(1500);
    const popupUp = (await targets()).some(t => t.url === `chrome-extension://${extId}/popup.html`);
    check('환영 페이지가 부탁하면 팝업이 열림', opened === true && popupUp, `답 ${opened}, 팝업 ${popupUp}`);
    for (const t of await targets()) if (t.url === `chrome-extension://${extId}/popup.html`) await send('Target.closeTarget', { targetId: t.targetId }).catch(() => {});
  }

  // 랜딩 페이지: 확장이 있으면 버튼이 나무위키로 바뀐다(사본은 ID가 달라 그대로). 사진과 글꼴이 다 받아진다.
  const { targetId: landId } = await send('Target.createTarget', { url: `${BASE}/` });
  const ls = await attach(landId);
  const land = await waitFor(() => evaluate(ls, `document.readyState === 'complete' && document.querySelector('.go')?.textContent`));
  const wanted = SHORT ? '크롬 확장 추가하기' : '나무위키로 가기';
  const landBtn = await waitFor(() => evaluate(ls, `document.querySelector('.go').textContent === ${JSON.stringify(wanted)} && document.querySelector('.go').textContent`), 4000);
  check(`랜딩 버튼이 "${wanted}"`, landBtn, land);
  const broken = await evaluate(ls, `(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }); await new Promise(r => setTimeout(r, 2500)); return [...document.images].filter(i => !i.naturalWidth).map(i => i.src).join(); })()`);
  check('랜딩 사진이 모두 나옴', broken === '', broken);
  await send('Target.closeTarget', { targetId: landId });

  // 2. 우클릭 메뉴 네 개가 만들어졌다(없는 id는 update가 실패한다)
  const sws = await attach(sw.targetId);
  const menus = await evaluate(sws, `Promise.all(['start:page','goal:page','start:link','goal:link','nope'].map(id => chrome.contextMenus.update(id, {}).then(() => 'ok', e => 'err')))`);
  check('우클릭 메뉴 4개 등록(없는 id는 오류)', menus.join() === 'ok,ok,ok,ok,err', menus.join());
  const perms = await evaluate(sws, `chrome.runtime.getManifest().permissions.join()`);
  check('권한은 activeTab, contextMenus, storage', perms === 'activeTab,contextMenus,storage', perms);
  const intro = await evaluate(sws, `chrome.storage.local.get('introSeen').then(o => o.introSeen)`);
  check('환영 페이지가 알리면 introSeen 저장', intro === true, intro);

  // 3. 메뉴가 넣는 draft를 팝업이 직접 출제 칸에 채우고, 초기화가 지운다
  await evaluate(sws, `chrome.storage.session.set({ draft: { start: '사과', goal: '사과나무' } })`);
  const { targetId: popId } = await send('Target.createTarget', { url: `chrome-extension://${extId}/popup.html` });
  const ps = await attach(popId);
  const popup = await waitFor(() => evaluate(ps, `document.querySelector('.tabs .on')?.dataset.mode === 'custom' && JSON.stringify([document.getElementById('start').value, document.getElementById('goal').value, document.getElementById('clear').hidden])`));
  check('남은 입력이 있으면 직접 출제 탭에 채워짐', popup === JSON.stringify(['사과', '사과나무', false]), popup);
  await evaluate(ps, `document.getElementById('clear').click()`);
  await sleep(300);
  const cleared = await evaluate(sws, `chrome.storage.session.get('draft').then(o => JSON.stringify([o.draft.start, o.draft.goal]))`);
  check('초기화가 입력을 비움', cleared === JSON.stringify(['', '']), cleared);
  const popFont = await evaluate(ps, `document.fonts.load('16px Pretendard').then(() => document.fonts.ready).then(() => [...document.fonts].some(f => f.family === 'Pretendard' && f.status === 'loaded'))`);
  check('팝업에 Pretendard', popFont === true, popFont);
  await send('Target.closeTarget', { targetId: popId });

  // 새 게임을 시작하면 다른 탭의 판이 끝난다. 이동 전이면 기록이 지워지고, 이동 뒤면 진 판으로 남는다.
  const GAME = 'https://namu.wiki/w/%EC%82%AC%EA%B3%BC#ng-goal=%EA%B0%90&mode=custom';
  const openGame = async () => {
    const { targetId } = await send('Target.createTarget', { url: GAME });
    const s = await attach(targetId);
    await waitFor(async () => (await evaluate(s, `JSON.parse(sessionStorage.getItem('ng_state') || 'null')?.status`)) === 'playing', 30000);
    return { targetId, s, st: () => evaluate(s, `JSON.parse(sessionStorage.getItem('ng_state') || 'null')`) };
  };
  const records = () => evaluate(sws, `chrome.storage.local.get('records').then(o => o.records || [])`);
  const g1 = await openGame(), id1 = (await g1.st()).id;
  const g2 = await openGame();
  const ended1 = await waitFor(async () => { const x = await g1.st(); return x.status === 'invalid' && x; }, 8000);
  check('새 게임을 시작하면 이전 판이 끝남', ended1 && (await g2.st()).status === 'playing', ended1?.reason);
  await sleep(500);
  check('이동 전이면 이전 판 기록을 지움', !(await records()).some(r => r.id === id1));
  const moved = await evaluate(g2.s, `(() => { const a = document.querySelector('a[href="/w/%EC%82%AC%EA%B3%BC%EB%82%98%EB%AC%B4"]') || [...document.querySelectorAll('a[href^="/w/"]')].find(a => decodeURIComponent(a.getAttribute('href').split('#')[0]) === '/w/사과나무'); if (!a) return false; a.click(); return true; })()`);
  await waitFor(async () => (await g2.st()).path.length > 1, 15000);
  const id2 = (await g2.st()).id, g3 = await openGame();
  const ended2 = await waitFor(async () => { const x = await g2.st(); return x.status === 'invalid' && x; }, 8000);
  await sleep(500);
  const rec2 = (await records()).find(r => r.id === id2);
  check('이동 뒤면 이전 판을 진 판으로 남김', moved && ended2 && rec2 && !rec2.win, rec2?.reason);
  check('끝난 판 화면에 이유가 나옴', await evaluate(g2.s, `document.getElementById('ng-host').shadowRoot.textContent.includes('다른 탭에서 새 게임을 시작했어요')`));
  for (const g of [g1, g2, g3]) await send('Target.closeTarget', { targetId: g.targetId });

  // 4. 나무위키에서 한 판: 사과 → 사과나무(뒤로가기 금지)
  const { targetId: gameId } = await send('Target.createTarget', { url: 'https://namu.wiki/w/%EC%82%AC%EA%B3%BC#ng-goal=%EC%82%AC%EA%B3%BC%EB%82%98%EB%AC%B4&mode=custom&nb=1' });
  const gs = await attach(gameId);
  const st = () => evaluate(gs, `JSON.parse(sessionStorage.getItem('ng_state') || 'null')`);
  const host = await waitFor(() => evaluate(gs, `!!document.getElementById('ng-host')`), 30000);
  check('나무위키 문서에 진행 막대가 붙음', host);
  const playing = await waitFor(async () => (await st())?.status === 'playing', 20000);
  check('카운트다운 뒤 playing', playing);
  const hudFont = await waitFor(() => evaluate(gs, `[...document.fonts].some(f => f.family.includes('NamutagiPretendard') && f.status === 'loaded') && getComputedStyle(document.getElementById('ng-host').shadowRoot.querySelector('button')).fontFamily.slice(0, 18)`), 5000);
  check('진행 막대에 글꼴, 나무위키 본문은 그대로', hudFont === 'NamutagiPretendard' && await evaluate(gs, `!getComputedStyle(document.body).fontFamily.includes('Namutagi')`), hudFont);
  const clicked = await evaluate(gs, `(() => { const a = [...document.querySelectorAll('a[href^="/w/"]')].find(a => decodeURIComponent(a.getAttribute('href').split('#')[0]) === '/w/사과나무'); if (!a) return false; a.click(); return true; })()`);
  check('본문의 사과나무 링크를 누름', clicked);
  const done = await waitFor(async () => { const s = await st(); return s?.status === 'done' && s; }, 20000);
  check('사과나무에 도착해 끝남', done?.status === 'done', done ? JSON.stringify({ win: done.win, path: done.path }) : '');
  const card = await waitFor(() => evaluate(gs, `document.getElementById('ng-host')?.shadowRoot?.textContent.includes('도착') && 'ok'`), 5000);
  check('결과 카드에 "도착"', card);

  // 5. 공유하기 → 도전장 링크 → 새 탭에서 열면 수락 창(이름, 경로, 시간)
  const NICK = '시험 a|b&c+d';
  await evaluate(gs, `[...document.getElementById('ng-host').shadowRoot.querySelectorAll('button')].find(b => b.textContent === '공유하기').click()`);
  await waitFor(() => evaluate(gs, `!!document.getElementById('ng-host').shadowRoot.querySelector('.share input')`), 5000);
  await evaluate(gs, `(() => { const r = document.getElementById('ng-host').shadowRoot, i = r.querySelector('.share input'); i.value = ${JSON.stringify(NICK)};
    [...r.querySelectorAll('.share button')].find(b => b.textContent === '복사하기').click(); })()`);
  const text = await waitFor(() => evaluate(gs, `(() => { const r = document.getElementById('ng-host').shadowRoot; return !/만드는 중/.test(r.querySelector('.share .muted').textContent) && r.querySelector('.share textarea').value; })()`), 8000);
  const link = text && (text.match(/⚔️\n(\S+)/) || [])[1];
  check(SHORT ? '공유 글에 짧은 링크' : '공유 글에 도전장 링크', link && (!SHORT || link.startsWith(SHORT + '/')), `${link?.length}자 ${link}`);
  check('짧은 링크 공유 글에 설치 안내 없음', !link?.startsWith(SHORT || 'https://namutagi.com') || !text.includes('확장을 먼저'), text?.split('\n').pop());
  if (link) {
    const { targetId: inv } = await send('Target.createTarget', { url: link });
    const is = await attach(inv);
    if (SHORT) {
      const prompt = await waitFor(() => evaluate(is, `document.querySelector('[data-s="none"]')?.hidden === false && document.querySelector('[data-s="none"] a.btn').textContent`), 8000);
      check('확장을 못 찾으면 설치 안내', prompt === '설치하러 가기', prompt);
      await send('Page.navigate', { url: await evaluate(is, `document.getElementById('to').href`) }, is);
    }
    const vs = await waitFor(async () => { const s = await evaluate(is, `JSON.parse(sessionStorage.getItem('ng_state') || 'null')`); return s?.invite && s.vs; }, 30000);
    check('도전장 링크를 열면 수락 대기', vs, vs ? JSON.stringify({ by: vs.by, steps: vs.steps, ms: vs.ms, path: vs.path }) : '');
    check('도전장의 이름, 경로, 시간이 같음', vs && vs.by === NICK && JSON.stringify(vs.path) === JSON.stringify(done.path.map(p => p.doc)) && Math.floor(vs.ms / 10) === Math.floor(done.finishedAt / 10),
      vs ? `보낸 ${Math.floor(done.finishedAt / 10)} / 받은 ${Math.floor(vs.ms / 10)} (1/100초)` : '');
    const btn = await waitFor(() => evaluate(is, `[...document.getElementById('ng-host')?.shadowRoot?.querySelectorAll('button') || []].some(b => b.textContent === '도전하기') && 'ok'`), 10000);
    check('수락 창에 도전하기 버튼', btn);
  }
} catch (e) {
  check('오류 없이 끝남', false, e.message);
} finally {
  chrome.kill();
  await sleep(1000); // 크롬이 프로필 쓰기를 마칠 때까지
  fs.rmSync(profile, { recursive: true, force: true });
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} 통과`);
  process.exit(failed ? 1 : 0);
}
