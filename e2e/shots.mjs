// 랜딩, 환영 페이지, README에 쓰는 화면 사진을 다시 찍는다. 의존 패키지 없음(Node 22+ 내장 WebSocket으로 CDP).
//   node e2e/shots.mjs <폴더>          보통은 server/public/shots. 찍은 뒤 index.html, welcome.html의 사진 주소 ?v= 를 올린다.
//   CROPS=<폴더> node e2e/shots.mjs …   밝은 화면의 팝업과 카드(결과, 도전장 수락, 승리)만 오려 PNG로도 저장한다(웹스토어 스크린샷용 Figma 그림).
// Chrome for Testing 새 프로필에 extension/을 올려 나무위키에서 실제로 게임을 한다(사용자 크롬 기록에는 남지 않는다). 광고 주소는 막는다.
// 게임 화면은 브라우저 1.25배 확대처럼(768x480을 2.5배) 찍고, 결과와 승리 화면은 카드가 잘리지 않게 1120x700을 약 1.71배로 찍는다. 결과는 모두 1920x1200.
// 팝업은 320px 폭을 2배로, 기록 화면은 아래 예시 기록으로 찍는다. 밝은 화면, 어두운 화면 둘 다.
// 문제는 김치 → 아폴로 11호, 규칙 없음. 내 경로는 김치 → 러시아 → 소련 → 아폴로 계획 → 아폴로 11호(실제로 누름),
// 도전장 상대(명랑한 다람쥐)는 김치 → 대한민국 → 미국 → 소련 → 아폴로 계획 → 아폴로 11호, 48.20초(예시). 나무위키 문서가 바뀌어 링크가 사라지면 경로를 고친다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const OUT = process.argv[2];
if (!OUT) { console.error('사용법: node e2e/shots.mjs <폴더>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const ext = path.join(here, '../extension');
const findCft = d => { try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === 'Google Chrome for Testing' && fs.statSync(p).isFile()) return p; if (fs.statSync(p).isDirectory()) { const r = findCft(p); if (r) return r; } } } catch {} return null; };
const CFT = process.env.CHROME || findCft(path.join(here, 'browsers')) || findCft(path.join(os.homedir(), '.cache/puppeteer/chrome'));
if (!CFT) { console.error('Chrome for Testing이 없습니다. npx @puppeteer/browsers install chrome@stable --path e2e/browsers 를 실행하세요.'); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'namu-tagi-shots-')), PORT = 9344;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
const chrome = spawn(CFT, ['--headless=new', `--user-data-dir=${profile}`, `--load-extension=${ext}`, `--disable-extensions-except=${ext}`, `--remote-debugging-port=${PORT}`,
  '--no-first-run', '--hide-scrollbars', `--user-agent=${UA}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const ev = async (s, expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await sleep(200); } return null; };
const shot = async (s, name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 82 }, s);
  fs.writeFileSync(path.join(OUT, `${name}.webp`), Buffer.from(data, 'base64'));
  console.log(name);
};
// 밝은 화면에서 쉐도 DOM 안의 카드 하나를 2배로 오려 PNG로 남긴다(CROPS가 있을 때만)
const CROPS = process.env.CROPS;
if (CROPS) fs.mkdirSync(CROPS, { recursive: true });
const WIDE = 1920 / 1120; // 결과, 승리 화면의 배율(1120x700을 1920x1200으로)
const crop = async (s, theme, name, sel, dpr) => {
  if (!CROPS || theme !== 'light') return;
  const r = await ev(s, `(() => { const b = document.getElementById('ng-host').shadowRoot.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })()`);
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 2 / dpr }, captureBeyondViewport: true }, s); // 탭 배율과 곱해 2배
  fs.writeFileSync(path.join(CROPS, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('crop', name);
};
const BLOCK = ['*doubleclick*', '*googlesyndication*', '*googletagservices*', '*adservice*', '*adsystem*', '*criteo*', '*taboola*', '*dable*', '*mobon*'];
// 새 탭: 크기, 밝기, 확대 배율을 먼저 맞추고 연다. 포커스를 흉내 내 게임이 "떠났다"고 보지 않게 한다.
const tab = async (url, theme, w, h, scale) => {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, s);
  await send('Network.enable', {}, s);
  await send('Network.setBlockedURLs', { urls: BLOCK }, s);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false }, s);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] }, s);
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }, s);
  await send('Page.navigate', { url }, s);
  return { targetId, s, close: () => send('Target.closeTarget', { targetId }) };
};
const st = s => ev(s, `JSON.parse(sessionStorage.getItem('ng_state') || 'null')`);
const linkTo = doc => `[...document.querySelectorAll('a[href^="/w/"]')].find(a => decodeURIComponent(a.getAttribute('href').split('#')[0].split('?')[0]) === '/w/' + ${JSON.stringify(doc)})`;
const go = async (s, doc, wait) => {
  const n = (await st(s)).path.length;
  if (!await ev(s, `(() => { const a = ${linkTo(doc)}; if (!a) return false; a.click(); return true; })()`)) throw new Error(`링크가 없어요: ${doc}`);
  if (!await waitFor(async () => (await st(s)).path.length > n || (await st(s)).status === 'done', 20000)) throw new Error(`이동하지 않았어요: ${doc}`);
  await sleep(wait);
};
const hud = s => `document.getElementById('ng-host').shadowRoot`;
const q = encodeURIComponent, GOAL = '아폴로 11호';
const GAME = `https://namu.wiki/w/${q('김치')}#ng-goal=${q(GOAL)}&mode=custom`;
const VS = ['김치', '대한민국', '미국', '소련', '아폴로 계획', GOAL];
const INVITE = `${GAME}&by=${q('명랑한 다람쥐')}&s=5&t=48200&${VS.map(x => 'p=' + q(x)).join('&')}&pt=0,7300,16100,27400,39900,48200`;
// 기록 화면용 예시 기록(규칙 없음)
const DAY = 86400e3, now = Date.now(), today = Math.floor((now + 9 * 3600e3) / DAY) - Math.floor(Date.UTC(2026, 9, 25) / DAY) + 1;
const rec = (n, mode, diff, path, times, extra = {}) => ({ id: `demo-${n}`, at: now - (extra.ago || 0), mode, diff, start: path[0], goal: path.at(-1), win: extra.win ?? true, steps: path.length - 1,
  ms: times.at(-1), path, times, back: path.map(() => false), reason: extra.win === false ? '그만둠' : null, day: extra.day ?? null,
  rules: { nb: false, nt: false, nc: false, nf: false, nh: false, nr: false, tl: 0, ms: 0 }, vs: extra.vs || null });
const RECORDS = [
  rec(1, 'daily', null, ['피처폰', '휴대전화', '대한민국', 'K-POP', 'Stray Kids'], [0, 8200, 15400, 29100, 41800], { day: today, ago: 3600e3 }),
  rec(2, 'random', 'normal', ['사과', '만유인력의 법칙', '아이작 뉴턴'], [0, 14200, 26700], { ago: DAY }),
  rec(3, 'random', 'hard', ['등대', '알렉산드리아', '이집트', '클레오파트라 7세'], [0, 18300, 37000, 52600], { ago: DAY + 5e6 }),
  rec(4, 'daily', null, ['김치', '러시아', '국제우주정거장'], [0, 21000, 43500], { day: today - 1, ago: DAY * 1.2 }),
  rec(5, 'custom', null, ['고양이', '고대 이집트'], [0, 16000], { win: false, ago: DAY * 2 }),
  rec(6, 'daily', null, ['자전거', '독일', '루트비히 판 베토벤'], [0, 19000, 31800], { day: today - 2, ago: DAY * 2.2 }),
  rec(7, 'random', 'easy', ['바나나', '필리핀'], [0, 6100], { ago: DAY * 3 }),
  rec(8, 'custom', null, ['커피', '에티오피아'], [0, 5400], { vs: '명랑한 다람쥐', ago: DAY * 3.5 }),
  rec(9, 'random', 'normal', ['기린', '아프리카', '사바나'], [0, 9700, 23100], { ago: DAY * 4 }),
].map(r => ({ ...r, at: Math.round(r.at) }));

try {
  const ver = await waitFor(() => fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()));
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  // 크롬 안에 든 다른 확장도 background.js가 있어서 이름으로 우리 것을 찾는다
  const sw = await waitFor(async () => {
    for (const t of (await send('Target.getTargets')).targetInfos) {
      if (t.type !== 'service_worker' || !t.url.endsWith('/background.js')) continue;
      const { sessionId } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
      if (await ev(sessionId, `chrome.runtime.getManifest().name.includes('나무타기')`)) return { t, sessionId };
    }
  });
  const extId = new URL(sw.t.url).host, sws = sw.sessionId;
  await ev(sws, `chrome.storage.local.set({ introSeen: true })`);
  const popup = async (name, theme, draft, prep, maxH) => {
    await ev(sws, draft ? `chrome.storage.session.set({ draft: ${JSON.stringify(draft)} })` : `chrome.storage.session.remove('draft')`);
    const p = await tab(`chrome-extension://${extId}/popup.html`, theme, 320, 900, 2);
    await sleep(800);
    await ev(p.s, `document.fonts.ready`);
    // 나무위키 탭에서 연 팝업이 아니라서 뜨는 안내는 실제 팝업에 없으니 지운다
    await ev(p.s, `[...document.querySelectorAll('p,div')].filter(e => !e.children.length && e.textContent.includes('나무위키 탭에서 열면')).forEach(e => e.remove())`);
    if (prep) await ev(p.s, prep);
    await sleep(400);
    const h = await ev(p.s, `Math.ceil(document.documentElement.getBoundingClientRect().height)`);
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: Math.min(h, maxH || h), deviceScaleFactor: 2, mobile: false }, p.s);
    await sleep(200);
    await shot(p.s, `${name}-${theme}`);
    if (CROPS && theme === 'light') { const { data } = await send('Page.captureScreenshot', { format: 'png' }, p.s); fs.writeFileSync(path.join(CROPS, `${name}.png`), Buffer.from(data, 'base64')); }
    await p.close();
  };

  for (const theme of ['light', 'dark']) {
    // 팝업: 오늘의 문제, 직접 출제(접은 것, 규칙 펼친 것), 기록
    // 오늘의 문제는 아직 안 푼 모양으로, 기록 화면은 예시 기록으로(앞 판의 실제 기록이 섞이지 않게 덮어쓴다)
    await ev(sws, `chrome.storage.local.remove('records')`);
    await popup('popup-today', theme, null);
    await popup('popup-custom', theme, { start: '김치', goal: GOAL });
    // 규칙 칸: 하드를 고르고 추가 옵션을 펼쳐 3분을 고른 모양(저장된 규칙은 다음 사진 전에 기본으로 되돌린다)
    await popup('popup-rules', theme, { start: '김치', goal: GOAL }, `document.querySelector('input[name="rmode"][value="hard"]').click(); document.getElementById('opts').open = true; document.querySelector('input[name="tl"][value="180"]').click()`);
    await ev(sws, `chrome.storage.local.remove('rules')`);
    await ev(sws, `chrome.storage.local.set({ records: ${JSON.stringify(RECORDS)} })`);
    await popup('popup-records', theme, null, `document.getElementById('showRecords').click()`, 620);

    // 혼자 하는 판: 카운트다운, 시작(목표 설명), 경로를 펼친 화면(play), 도착 결과
    const a = await tab(GAME, theme, 768, 480, 2.5);
    await waitFor(() => ev(a.s, `!!${hud()}?.querySelector('.cd.on')`));
    await sleep(1300);
    await shot(a.s, `countdown-${theme}`);
    if (!await waitFor(async () => (await st(a.s))?.status === 'playing')) throw new Error('게임이 시작되지 않았어요');
    await sleep(2200);
    await shot(a.s, `start-${theme}`);
    await go(a.s, '러시아', 3000);
    await go(a.s, '소련', 3500);
    await ev(a.s, `${hud()}.querySelector('.crumb').click()`);
    await sleep(600);
    await shot(a.s, `play-${theme}`);
    await ev(a.s, `${hud()}.querySelector('.crumb').click()`);
    await go(a.s, '아폴로 계획', 4000);
    // 결과 카드는 길어서(카드 최대 높이는 화면의 80%) 1.25배 화면에 다 안 들어간다. 도착 직전에 넓힌다
    await send('Emulation.setDeviceMetricsOverride', { width: 1120, height: 700, deviceScaleFactor: WIDE, mobile: false }, a.s);
    await go(a.s, GOAL, 1200);
    await shot(a.s, `result-${theme}`);
    await crop(a.s, theme, 'card-result', '.card', WIDE);
    await a.close();

    // 도전장: 수락 창(1.25배)과 승리 화면(1.2배)
    const b = await tab(INVITE, theme, 768, 480, 2.5);
    const accept = `[...${hud()}?.querySelectorAll('button') || []].find(x => x.textContent === '도전하기')`;
    await waitFor(() => ev(b.s, `!!${accept}`));
    await sleep(1500);
    await shot(b.s, `invite-${theme}`);
    await crop(b.s, theme, 'card-invite', '.card', 2.5);
    await b.close();
    const c = await tab(INVITE, theme, 1120, 700, WIDE); // 승리 카드는 두 경로를 나란히 보여 줘서 더 길다
    await waitFor(() => ev(c.s, `!!${accept}`));
    await ev(c.s, `${accept}.click()`);
    if (!await waitFor(async () => (await st(c.s))?.status === 'playing')) throw new Error('도전이 시작되지 않았어요');
    await sleep(2500);
    await go(c.s, '러시아', 5000);
    await go(c.s, '소련', 4500);
    await go(c.s, '아폴로 계획', 6000);
    await go(c.s, GOAL, 900);
    await shot(c.s, `win-${theme}`);
    await crop(c.s, theme, 'card-win', '.card', WIDE);
    await c.close();
  }
} catch (e) {
  console.error('실패:', e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(800);
  fs.rmSync(profile, { recursive: true, force: true });
}
