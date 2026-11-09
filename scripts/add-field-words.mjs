// 분야 조사에서 알게 된 문서(extension/fields.json에 남은 것)를 words.js에 더한다. 나무위키 요청 없음.
//   node scripts/add-field-words.mjs
// 역링크 수는 fields-report.json에서 읽고, 난이도 경계는 build-words.mjs와 같다. 이미 있는 문서는 그대로 둔다.
// 오늘의 문제는 words.js의 보통 구간이라 이걸 돌리면 그 뒤 날짜의 문제가 바뀐다. build-words.mjs를 다시 돌리면 이 문서들은 사라지니 그 뒤에 다시 돌린다.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'extension', 'words.js');
const EASY_MIN = 1615, NORMAL_MIN = 677, MIN_BACKLINKS = 100;
const src = readFileSync(OUT, 'utf8');
const W = JSON.parse(src.match(/var LR_WORDS = (\{[\s\S]*\});/)[1]);
const rep = JSON.parse(readFileSync(join(here, 'data', 'fields-report.json'), 'utf8'));
const bl = new Map();
for (const f of Object.values(rep.fields)) for (const d of Object.values(f.docs)) if (d.bl != null) bl.set(d.title, Math.max(bl.get(d.title) || 0, d.bl));
const fields = JSON.parse(readFileSync(join(here, '..', 'extension', 'fields.json'), 'utf8')).f;
const have = new Set([...W.easy, ...W.normal, ...W.hard]);
const add = { easy: [], normal: [], hard: [] };
for (const f of Object.values(fields)) for (const t of new Set([...f.e, ...f.n, ...f.h, ...(f.x || [])])) {
  const b = bl.get(t);
  if (have.has(t) || !(b >= MIN_BACKLINKS)) continue;
  have.add(t); add[b >= EASY_MIN ? 'easy' : b >= NORMAL_MIN ? 'normal' : 'hard'].push([b, t]);
}
for (const k of ['easy', 'normal', 'hard']) W[k] = [...W[k], ...add[k].sort((a, b) => b[0] - a[0]).map(x => x[1])];
const built = new Date().toISOString().slice(0, 10);
writeFileSync(OUT, `// 자동 생성: node scripts/build-words.mjs 뒤에 node scripts/add-field-words.mjs (${built}). 직접 고치지 말고 scripts/data/candidates.txt를 고친 뒤 다시 만든다.
// 정식 문서 이름만 담는다(넘겨주기 이름은 정식 이름으로 바꿈). 난이도는 '문서' 이름공간 역링크 수로 나눈 것(경계 고정: 쉬움 ${EASY_MIN}~, 보통 ${NORMAL_MIN}~${EASY_MIN - 1}, 어려움 ${MIN_BACKLINKS}~${NORMAL_MIN - 1}).
// 역링크 ${MIN_BACKLINKS}개 미만과 동음이의어 문서는 뺐다. ${built}에 분야 조사 문서를 더했다.
var LR_WORDS = ${JSON.stringify({ ...W, built }, null, 1)};
`);
console.log('더함', Object.fromEntries(Object.entries(add).map(([k, v]) => [k, v.length])), '합계', Object.fromEntries(Object.entries(W).filter(([k]) => k !== 'built').map(([k, v]) => [k, v.length])));
