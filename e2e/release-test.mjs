// 릴리스 zip(또는 extension 폴더)을 Chrome for Testing 새 프로필에 압축해제 로드해 확인한다. 의존 패키지 없음(Node 22+ 내장 WebSocket으로 CDP).
//   gh release download v0.1.0 -p '*.zip' -D <빈 폴더> && unzip <zip> -d <빈 폴더2>
//   node e2e/release-test.mjs <빈 폴더2>        (폴더를 안 주면 저장소의 extension/)
// 확인: 설치하면 환영 페이지와 manifest 버전, 우클릭 메뉴 4개, 권한, 팝업 직접 출제 입력(draft)과 초기화, 나무위키 사과 → 사과나무 한 판.
// 새 임시 프로필이라 사용자 크롬 기록에는 판이 남지 않는다. 나무위키에 실제로 접속한다.
// 정식 크롬 137+는 --load-extension을 무시해서 Chrome for Testing이 필요하다: CHROME 환경 변수, e2e/browsers(npm run chrome), ~/.cache/puppeteer 순으로 찾는다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const ext = path.resolve(process.argv[2] || path.join(here, '../extension'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'namu-tagi-'));
const findCft = d => { try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === 'Google Chrome for Testing' && fs.statSync(p).isFile()) return p; if (fs.statSync(p).isDirectory()) { const r = findCft(p); if (r) return r; } } } catch {} return null; };
const CFT = process.env.CHROME || findCft(path.join(here, 'browsers')) || findCft(path.join(os.homedir(), '.cache/puppeteer/chrome'));
if (!CFT) { console.error('Chrome for Testing이 없습니다. e2e에서 npm install && npm run chrome 을 실행하세요.'); process.exit(2); }
const PORT = 9333;
const VERSION = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8')).version;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'; // 헤드리스 표시(HeadlessChrome)를 뺀 보통 UA
const chrome = spawn(CFT, ['--headless=new', `--user-data-dir=${profile}`, `--load-extension=${ext}`, `--disable-extensions-except=${ext}`,
  `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check', `--user-agent=${UA}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
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
  // 크롬 안에 든 다른 확장도 background.js 서비스 워커가 있어서, 환영 페이지의 확장 ID로 우리 것을 찾는다.
  const welcome = await waitFor(async () => (await targets()).find(t => t.type === 'page' && t.url.endsWith('/welcome.html')));
  check('설치하면 환영 페이지가 열린다', welcome, welcome?.url);
  const extId = new URL(welcome.url).host;
  const sw = await waitFor(async () => (await targets()).find(t => t.type === 'service_worker' && t.url === `chrome-extension://${extId}/background.js`));
  check('서비스 워커가 뜬다', sw, sw?.url);
  if (welcome) {
    const s = await attach(welcome.targetId);
    const v = await waitFor(() => evaluate(s, `document.body.innerText.includes('v${VERSION}') && document.body.innerText.slice(0, 60)`));
    check(`환영 페이지에 v${VERSION}`, v, JSON.stringify(v));
  }

  // 2. 우클릭 메뉴 네 개가 만들어졌다(없는 id는 update가 실패한다)
  const sws = await attach(sw.targetId);
  const menus = await evaluate(sws, `Promise.all(['start:page','goal:page','start:link','goal:link','nope'].map(id => chrome.contextMenus.update(id, {}).then(() => 'ok', e => 'err')))`);
  check('우클릭 메뉴 4개 등록(없는 id는 오류)', menus.join() === 'ok,ok,ok,ok,err', menus.join());
  const perms = await evaluate(sws, `chrome.runtime.getManifest().permissions.join()`);
  check('권한은 activeTab, contextMenus, storage', perms === 'activeTab,contextMenus,storage', perms);

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
  await send('Target.closeTarget', { targetId: popId });

  // 4. 나무위키에서 한 판: 사과 → 사과나무(뒤로가기 금지)
  const { targetId: gameId } = await send('Target.createTarget', { url: 'https://namu.wiki/w/%EC%82%AC%EA%B3%BC#ng-goal=%EC%82%AC%EA%B3%BC%EB%82%98%EB%AC%B4&mode=custom&nb=1' });
  const gs = await attach(gameId);
  const st = () => evaluate(gs, `JSON.parse(sessionStorage.getItem('ng_state') || 'null')`);
  const host = await waitFor(() => evaluate(gs, `!!document.getElementById('ng-host')`), 30000);
  check('나무위키 문서에 진행 막대가 붙음', host);
  const playing = await waitFor(async () => (await st())?.status === 'playing', 20000);
  check('카운트다운 뒤 playing', playing);
  const clicked = await evaluate(gs, `(() => { const a = [...document.querySelectorAll('a[href^="/w/"]')].find(a => decodeURIComponent(a.getAttribute('href').split('#')[0]) === '/w/사과나무'); if (!a) return false; a.click(); return true; })()`);
  check('본문의 사과나무 링크를 누름', clicked);
  const done = await waitFor(async () => { const s = await st(); return s?.status === 'done' && s; }, 20000);
  check('사과나무에 도착해 끝남', done?.status === 'done', done ? JSON.stringify({ win: done.win, path: done.path }) : '');
  const card = await waitFor(() => evaluate(gs, `document.getElementById('ng-host')?.shadowRoot?.textContent.includes('도착') && 'ok'`), 5000);
  check('결과 카드에 "도착"', card);
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
