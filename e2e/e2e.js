// 실제 크롬에 확장을 로드해 핵심 흐름을 검증한다. HUD는 closed shadow라 sessionStorage 상태로 판정한다.
const puppeteer = require('puppeteer-core');
const path = require('path'), fs = require('fs');
const EXT = path.resolve(__dirname, '../extension');
// 정식 크롬 137+는 --load-extension을 무시한다. Chrome for Testing이 필요하다: npm run chrome
const findCft = () => { const walk = d => { try { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (/Google Chrome for Testing$|^chrome$/.test(f) && fs.statSync(p).isFile()) return p; if (fs.statSync(p).isDirectory()) { const r = walk(p); if (r) return r; } } } catch {} return null; }; return walk(path.join(__dirname, 'browsers')); };
const CHROME = process.env.CHROME || findCft();
if (!CHROME) { console.error('Chrome for Testing이 없습니다. 먼저 npm run chrome 을 실행하세요.'); process.exit(2); }
const HEADLESS = process.env.HEADFUL ? false : true;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const st = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('ng_state') || 'null'));
const waitStatus = (page, pred, ms = 20000) => page.waitForFunction(p => { const s = JSON.parse(sessionStorage.getItem('ng_state') || 'null'); return s && new Function('s', 'return ' + p)(s); }, { timeout: ms, polling: 200 }, pred);
const R = {};
const ok = (name, cond, info) => { R[name] = { pass: !!cond, info }; console.log((cond ? 'PASS ' : 'FAIL ') + name, info === undefined ? '' : JSON.stringify(info)); };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: HEADLESS, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run', '--window-size=1400,900', '--lang=ko-KR'] });
  try {
    // T1: 새 탭에서 시작 문서(사과)에 목표(유엔)를 걸어 시작 → playing(카운트다운 뒤)
    let page = await browser.newPage();
    await page.goto('https://namu.wiki/w/%EC%82%AC%EA%B3%BC#ng-goal=%EC%9C%A0%EC%97%94', { waitUntil: 'domcontentloaded' });
    await waitStatus(page, "s.status === 'playing'");
    let s = await st(page);
    ok('T1 resolve+start', s.start === '사과' && s.goal === '유엔' && s.path.length === 1, { start: s.start, goal: s.goal, href: page.url() });
    ok('T1 html[data-ng]', !!(await page.evaluate(() => document.documentElement.dataset.ng)));
    ok('T1 HUD mounted', await page.evaluate(() => !!document.getElementById('ng-host')));
    const hidden = await page.evaluate(() => { const q = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el).display : 'no-el'; }; return { search: q('input[type=search]'), history: q('a[href^="/history/"]'), edit: q('a[href^="/edit/"]'), recent: q('a[href^="/RecentChanges"]') }; });
    ok('T1 CSS hides shell links', hidden.search === 'none' && hidden.edit === 'none' && hidden.recent === 'none', hidden);

    // 금지 클릭: 사이드바(소수 data-v 그룹), 분류, Ctrl+클릭 → 경로 불변, 새 탭 없음
    const pages = () => browser.targets().filter(t => t.type() === 'page').length; const targetsBefore = pages();
    const sideSel = await page.evaluate(() => { const dv = a => [...a.attributes].map(x => x.name).find(n => n.startsWith('data-v-')); const g = {}; for (const a of document.querySelectorAll('a[href^="/w/"]')) (g[dv(a)] = g[dv(a)] || []).push(a); const side = Object.values(g).filter(v => v.length >= 3 && v.length <= 40).sort((a, b) => b.length - a.length)[0]; if (!side) return null; side[0].id = 'ng-test-side'; return '#ng-test-side'; });
    if (sideSel) { await page.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), sideSel); await page.click(sideSel); await sleep(1500); }
    s = await st(page);
    ok('T1 sidebar click ignored', sideSel && s.path.length === 1 && page.url().endsWith('/w/%EC%82%AC%EA%B3%BC'), { sideSel, href: page.url() });
    // 보이는 본문 링크 하나를 고른다(접힌 틀 안의 링크는 실제 클릭이 안 된다).
    const pickBody = () => page.evaluate(() => { const dv = a => [...a.attributes].map(x => x.name).filter(n => n.startsWith('data-v-')); const cnt = {}; const all = [...document.querySelectorAll('a[title][href^="/w/"]')].filter(a => !a.closest('h1')); all.forEach(a => dv(a).forEach(n => cnt[n] = (cnt[n] || 0) + 1)); const attr = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0]; const cur = decodeURIComponent(new URL(document.querySelector('link[rel=canonical]').href).pathname.slice(3)); const a = all.find(a => a.hasAttribute(attr) && !/nofollow/.test(a.rel) && !a.getAttribute('href').startsWith('/w/%ED%8B%80:') && !decodeURIComponent(a.getAttribute('href')).endsWith('(동음이의어)') && (() => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; })() && decodeURIComponent(new URL(a.href).pathname.slice(3)) !== cur); if (!a) return null; a.id = 'ng-test-body'; a.scrollIntoView({ block: 'center' }); return decodeURIComponent(new URL(a.href).pathname.slice(3)); });
    const pickDoc = await pickBody();
    const cherry = '#ng-test-body';
    ok('T1 picked visible body link', !!pickDoc, pickDoc);
    await page.keyboard.down('Meta'); await page.click(cherry); await page.keyboard.up('Meta'); await sleep(1500); // macOS: Cmd+클릭 = 새 탭. Ctrl+클릭은 우클릭 메뉴
    s = await st(page);
    ok('T1 cmd+click ignored, no new tab', s.path.length === 1 && pages() === targetsBefore, { newPages: pages() - targetsBefore, pathLen: s.path.length });

    // 본문 클릭 → 1단계
    await page.click(cherry);
    await waitStatus(page, "s.path.length === 2");
    s = await st(page);
    ok('T1 body click counted', s.path[1].clicked === pickDoc && s.status === 'playing', s.path);

    // 뒤로가기 → 1단계(<)
    await page.goBack({ waitUntil: 'commit' }).catch(() => {});
    await waitStatus(page, "s.path.length === 3");
    s = await st(page);
    ok('T1 back counted', s.path[2].doc === '사과' && s.path[2].clicked === '<', s.path[2]);

    // 새로고침(셸 로드) → 이어감
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(4000);
    s = await st(page);
    ok('T3 reload resumes (shell load)', s && s.status === 'playing' && s.path.length === 3, { status: s && s.status, len: s && s.path.length, body: await page.evaluate(() => performance.getEntriesByType('navigation')[0].encodedBodySize) });

    // 주소창 이동 → invalid
    await page.goto('https://namu.wiki/w/%EC%9C%A0%EC%97%94', { waitUntil: 'domcontentloaded' });
    await waitStatus(page, "s.status === 'invalid'");
    s = await st(page);
    ok('T4 address-bar move invalid', s.status === 'invalid', s.reason);
    await page.close();

    // T2: 목표 도달
    page = await browser.newPage();
    await page.goto('https://namu.wiki/w/%EC%82%AC%EA%B3%BC#ng-goal=' + encodeURIComponent(pickDoc), { waitUntil: 'domcontentloaded' });
    await waitStatus(page, "s.status === 'playing'");
    const goalLinkOk = await page.evaluate(doc => { const a = [...document.querySelectorAll('a[title][href^="/w/"]')].find(a => decodeURIComponent(new URL(a.href).pathname.slice(3)) === doc && a.getBoundingClientRect().width > 0); if (!a) return false; a.id = 'ng-test-goal'; a.scrollIntoView({ block: 'center' }); return true; }, pickDoc);
    ok('T2 goal link visible on start page', goalLinkOk, { goal: (await st(page)).goal });
    await page.click('#ng-test-goal');
    await waitStatus(page, "s.status === 'done'");
    s = await st(page);
    ok('T2 goal reached', s.status === 'done' && s.path.length === 2 && typeof s.finishedAt === 'number', { finishedAt: s.finishedAt });
    await page.close();

    // T6: 없는 시작 (replace = 셸 로드, 문구로 판정)
    page = await browser.newPage();
    await page.goto('https://namu.wiki/w/%EC%9D%B4%EB%9F%B0%EB%AC%B8%EC%84%9C%EB%8A%94%EC%97%86%EC%8A%B5%EB%8B%88%EB%8B%A4zz#ng-goal=%EC%B2%B4%EB%A6%AC', { waitUntil: 'domcontentloaded' });
    await waitStatus(page, "s.status === 'invalid' || s.status === 'playing'", 30000);
    s = await st(page);
    ok('T6 missing start rejected', s.status === 'invalid' && /시작 문서가 없어요/.test(s.reason), { status: s.status, reason: s.reason, href: page.url() });
    await page.close();

    // T8: 그만두기 → 새로고침 → 평범한 탭(링크 정상 동작)
    page = await browser.newPage();
    await page.goto('https://namu.wiki/w/%EC%82%AC%EA%B3%BC#ng-goal=%EC%9C%A0%EC%97%94', { waitUntil: 'domcontentloaded' });
    await waitStatus(page, "s.status === 'playing'");
    const navAfterQuit = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.getElementById('ng-host').shadowRoot.querySelector('.quit').click());
    await navAfterQuit;
    await page.waitForFunction(() => document.querySelector('a[title][href^="/w/"]'), { timeout: 20000 });
    await sleep(1500);
    const after = await page.evaluate(() => ({ ng: document.documentElement.dataset.ng, host: !!document.getElementById('ng-host'), state: sessionStorage.getItem('ng_state'), search: getComputedStyle(document.querySelector('input[type=search]')).display }));
    await pickBody();
    await page.click('#ng-test-body');
    await page.waitForFunction(() => location.pathname !== '/w/%EC%82%AC%EA%B3%BC', { timeout: 15000 }).catch(() => {});
    ok('T8 quit restores normal tab', !after.ng && !after.host && !after.state && after.search !== 'none' && !page.url().endsWith('/w/%EC%82%AC%EA%B3%BC'), { after, href: page.url() });
    await page.close();

    // T7: 게임 아닌 탭은 손대지 않는다
    page = await browser.newPage();
    await page.goto('https://namu.wiki/w/%EC%82%AC%EA%B3%BC', { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    ok('T7 non-game tab untouched', await page.evaluate(() => !document.documentElement.dataset.ng && !document.getElementById('ng-host') && getComputedStyle(document.querySelector('input[type=search]')).display !== 'none'));
    await page.close();
  } catch (e) {
    console.log('ERROR', e.message);
  } finally {
    await browser.close();
    const fails = Object.entries(R).filter(([, v]) => !v.pass).map(([k]) => k);
    console.log(`\n${Object.keys(R).length - fails.length}/${Object.keys(R).length} passed` + (fails.length ? ', FAILED: ' + fails.join(', ') : ''));
    process.exit(fails.length ? 1 : 0);
  }
})();
