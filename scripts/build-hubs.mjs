// 허브 문서 목록(extension/hubs.js)을 만든다. "허브 문서 금지" 규칙이 쓴다.
//   node scripts/build-hubs.mjs            hub-candidates.txt 전체를 조사
//   node scripts/build-hubs.mjs --resume   이미 조사한 문서는 건너뜀
// 후보마다 문서 앞부분(넘겨주기를 따라 정식 이름을 얻는다)과 역링크 페이지를 한 번씩 받아 '문서' 이름공간 역링크 수를 읽고,
// 정식 이름 기준으로 중복을 없앤 뒤 역링크가 MIN_BACKLINKS개 이상인 문서만 남긴다. 나무위키 부담을 줄이려고 요청 사이에 1초씩 쉰다.
// 역링크 수는 시간이 가며 바뀌지만 이 규모의 문서는 순위가 거의 변하지 않는다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPORT = join(here, 'hubs-report.json');
const OUT = join(here, '..', 'extension', 'hubs.js');
const MIN_BACKLINKS = 2000; // 0.27.0에서 3000 → 2000(허브 금지는 직접 켜는 어려운 모드라 빡빡하게)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const enc = t => t.split('/').map(encodeURIComponent).join('/');

async function head(url, limit) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      const reader = res.body.getReader();
      const chunks = []; let size = 0;
      while (size < limit) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); size += value.length; }
      reader.cancel().catch(() => {});
      return { status: res.status, url: res.url, html: Buffer.concat(chunks).toString('utf8') };
    } catch (e) {
      console.warn(`  재시도 ${attempt + 1}: ${e.message}`);
      await sleep(10000 * (attempt + 1));
    }
  }
  return { status: 0, url, html: '' };
}

async function inspect(input) {
  const doc = await head('https://namu.wiki/w/' + enc(input), 40000);
  await sleep(1000);
  if (doc.status !== 200) return { input, status: doc.status };
  const canon = doc.html.match(/<link rel="canonical" href="https:\/\/namu\.wiki\/w\/([^"]+)"/);
  const canonical = canon ? decodeURIComponent(canon[1]) : decodeURIComponent(new URL(doc.url).pathname.slice(3));
  const bl = await head('https://namu.wiki/backlink/' + enc(canonical), 60000);
  await sleep(1000);
  const m = bl.html.match(/문서 \(([\d,]+)\)/);
  return { input, status: 200, canonical, backlinks: m ? Number(m[1].replace(/,/g, '')) : null };
}

const candidates = [...new Set(readFileSync(join(here, 'hub-candidates.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')))];
const report = process.argv.includes('--resume') && existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, 'utf8')) : [];
const done = new Set(report.map(r => r.input));
for (const [i, word] of candidates.entries()) {
  if (done.has(word)) continue;
  const r = await inspect(word);
  report.push(r);
  console.log(`[${i + 1}/${candidates.length}] ${word} → ${r.canonical ?? r.status} ${r.backlinks ?? ''}`);
  writeFileSync(REPORT, JSON.stringify(report, null, 1));
}
const top = [...new Map(report.filter(r => r.status === 200 && r.backlinks).map(r => [r.canonical, r])).values()]
  .filter(r => r.backlinks >= MIN_BACKLINKS).sort((a, b) => b.backlinks - a.backlinks);
const built = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, `// 자동 생성: node scripts/build-hubs.mjs (${built}). 직접 고치지 말고 scripts/hub-candidates.txt를 고친 뒤 다시 만든다.
// 허브 문서(어디서나 링크되는 큰 문서) 정식 이름 ${top.length}개. 역링크 ${top.at(-1)?.backlinks}~${top[0]?.backlinks}개. "허브 문서 금지" 규칙이 쓴다.
var LR_HUBS = ${JSON.stringify({ built, docs: top.map(r => r.canonical) }, null, 1)};
`);
console.log(`\n완료: 허브 ${top.length}개 (역링크 ${top.at(-1)?.backlinks}~${top[0]?.backlinks}), 조사한 후보 ${report.length}개`);
