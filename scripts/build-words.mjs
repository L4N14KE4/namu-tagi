// 무작위 모드와 오늘의 문제에 쓰는 목표 단어 목록을 만든다.
//   node scripts/build-words.mjs            candidates.txt 전체를 다시 조사
//   node scripts/build-words.mjs --resume   이미 조사한 단어는 건너뜀(중간에 끊겼을 때)
// 오늘의 문제는 이 파일의 '보통' 구간 문서를 그대로 쓴다(별도 목록 없음). 그래서 다시 만들면 그 뒤 날짜의 문제가 바뀐다.
//
// 단어마다 요청 두 번: 문서 앞부분(넘겨주기 따라감, 40KB까지만)과 역링크 페이지(약 43KB).
// 문서에서 정식 이름·존재·동음이의어 여부를, 역링크 페이지에서 '문서' 이름공간 역링크 수를 읽는다.
// 나무위키 부담을 줄이려고 요청 사이에 1초씩 쉰다. 800단어면 30분 남짓 걸린다.
//
// 역링크 수는 문서가 고쳐지면 조금씩 바뀐다. 난이도는 세 구간으로만 나누므로 대부분은 몇 달 그대로지만,
// 화제가 된 문서는 빨리 움직인다. 가끔(예: 한 달에 한 번) 이 스크립트를 다시 돌려 목록을 새로 만든다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const EXT = join(here, '..', 'extension');
const REPORT = join(here, 'words-report.json');
const OUT = join(EXT, 'words.js');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
// 이보다 적게 연결된 문서는 도달이 너무 어려워 뺀다(0.25.1에서 30 → 100).
const MIN_BACKLINKS = 100;
// 난이도 경계는 역링크 수로 고정한다. 목록이 자라도 쉬움·보통·어려움의 뜻이 그대로이고 이미 있던 단어의 난이도가 안 바뀐다.
const EASY_MIN = 1615, NORMAL_MIN = 677;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const enc = t => t.split('/').map(encodeURIComponent).join('/');

// 응답 앞부분만 읽고 끊는다(분류 줄은 문서 HTML 앞 18KB 안에 있다).
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
  const disambig = doc.html.includes('/w/%EB%B6%84%EB%A5%98:%EB%8F%99%EC%9D%8C%EC%9D%B4%EC%9D%98%EC%96%B4');
  const bl = await head('https://namu.wiki/backlink/' + enc(canonical), 60000);
  await sleep(1000);
  const m = bl.html.match(/문서 \(([\d,]+)\)/);
  return { input, status: 200, canonical, disambig, backlinks: m ? Number(m[1].replace(/,/g, '')) : null };
}

const candidates = [...new Set(readFileSync(join(here, 'candidates.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')))];
const resume = process.argv.includes('--resume') && existsSync(REPORT);
const report = resume ? JSON.parse(readFileSync(REPORT, 'utf8')) : [];
const done = new Set(report.map(r => r.input));
for (const [i, word] of candidates.entries()) {
  if (done.has(word)) continue;
  const r = await inspect(word);
  report.push(r);
  console.log(`[${i + 1}/${candidates.length}] ${word} → ${r.canonical ?? r.status}${r.disambig ? ' (동음이의어)' : ''} ${r.backlinks ?? ''}`);
  writeFileSync(REPORT, JSON.stringify(report, null, 1)); // 끊겨도 --resume으로 이어 가도록 매번 저장
}

// 정식 이름 기준으로 중복을 없애고, 동음이의어·없는 문서·역링크가 너무 적은 문서를 뺀다.
const usable = [...new Map(report
  .filter(r => r.status === 200 && !r.disambig && r.backlinks >= MIN_BACKLINKS)
  .map(r => [r.canonical, r])).values()]
  .sort((a, b) => b.backlinks - a.backlinks);
const built = new Date().toISOString().slice(0, 10);
const range = t => `${t.at(-1)?.backlinks}~${t[0]?.backlinks}`;
const tiers = { easy: usable.filter(r => r.backlinks >= EASY_MIN), normal: usable.filter(r => r.backlinks < EASY_MIN && r.backlinks >= NORMAL_MIN), hard: usable.filter(r => r.backlinks < NORMAL_MIN) };
writeFileSync(OUT, `// 자동 생성: node scripts/build-words.mjs (${built}). 직접 고치지 말고 scripts/candidates.txt를 고친 뒤 다시 만든다.
// 정식 문서 이름만 담는다(넘겨주기 이름은 정식 이름으로 바꿈). 난이도는 '문서' 이름공간 역링크 수로 나눈 것(경계 고정).
// 쉬움 역링크 ${range(tiers.easy)}, 보통 ${range(tiers.normal)}, 어려움 ${range(tiers.hard)}. 역링크 ${MIN_BACKLINKS}개 미만과 동음이의어 문서는 뺐다.
var LR_WORDS = ${JSON.stringify({ built, easy: tiers.easy.map(r => r.canonical), normal: tiers.normal.map(r => r.canonical), hard: tiers.hard.map(r => r.canonical) }, null, 1)};
`);
console.log(`\n완료: 쓸 수 있는 문서 ${usable.length}개 (쉬움 ${tiers.easy.length}, 보통 ${tiers.normal.length}, 어려움 ${tiers.hard.length}), 뺀 것 ${report.length - usable.length}개`);
console.log('구간:', { easy: range(tiers.easy), normal: range(tiers.normal), hard: range(tiers.hard) });
