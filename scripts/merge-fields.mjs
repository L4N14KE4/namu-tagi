// fields-report.json의 66개 분야를 합쳐 47개로 만든다(요청 없음). node scripts/merge-fields.mjs
// 결과: data/fields-merged.json, data/fields-merged.md. 합친 분야의 쉬움이 EASY_THIN개보다 적으면 쉬움 풀에 보통도 넣는다(easyPool: '쉬움+보통').
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DATA = join(dirname(fileURLToPath(import.meta.url)), 'data');
const EASY_MIN = 1615, NORMAL_MIN = 677, MIN_BACKLINKS = 100, EASY_THIN = 10;
const MERGES = {
  '애니메이션과 만화': ['애니메이션과 만화', '웹툰과 웹소설'],
  '캐릭터': ['애니 캐릭터', '게임 캐릭터'],
  '히어로와 특촬': ['슈퍼히어로', '특촬과 로봇'],
  '동물': ['동물', '공룡과 고생물'],
  '괴담과 도시전설': ['괴담과 도시전설', 'SCP와 크리처'],
  '놀이': ['카드게임과 보드게임', '취미와 놀이', '장난감과 프라모델'],
  '음악': ['노래와 음반', '악기와 음악'],
  '우주와 날씨': ['우주와 천문', '날씨와 자연재해'],
  '물리와 수학': ['물리와 화학', '수학'],
  '음식': ['음식', '과자와 디저트', '음료와 술'],
  '탈것과 교통': ['자동차', '철도와 지하철', '항공과 공항'],
  'IT와 전자기기': ['IT와 소프트웨어', '전자기기'],
  '밈과 유행어': ['인터넷 문화와 밈', '유행과 유행어'],
  '문학과 미술': ['문학과 책', '미술'],
  '스포츠 종목': ['스포츠 종목', '격투기와 프로레슬링'],
};
const src = JSON.parse(readFileSync(join(DATA, 'fields-report.json'), 'utf8')).fields;
const used = new Set(Object.values(MERGES).flat());
const groups = { ...MERGES };
for (const n of Object.keys(src)) if (!used.has(n)) groups[n] = [n];
const tierOf = bl => bl >= EASY_MIN ? 'easy' : bl >= NORMAL_MIN ? 'normal' : bl >= MIN_BACKLINKS ? 'hard' : null;
const out = {}, md = ['| 분야 | 합친 분야 | 쉬움 | 보통 | 어려움 | 쉬움 풀 | 시작 가능 |', '| --- | --- | --- | --- | --- | --- | --- |'];
for (const [name, parts] of Object.entries(groups)) {
  const docs = new Map();
  for (const p of parts) for (const d of src[p].docs) docs.set(d.title, Math.max(d.bl ?? 0, docs.get(d.title) ?? 0));
  const f = { parts, easy: [], normal: [], hard: [], startOnly: [] };
  for (const [t, bl] of [...docs].sort((a, b) => b[1] - a[1])) (f[tierOf(bl)] ?? f.startOnly).push(t);
  f.easyPool = f.easy.length < EASY_THIN ? '쉬움+보통' : '쉬움';
  out[name] = f;
  md.push(`| ${name} | ${parts.length > 1 ? parts.join(' + ') : '-'} | ${f.easy.length} | ${f.normal.length} | ${f.hard.length} | ${f.easyPool === '쉬움' ? f.easy.length : f.easy.length + f.normal.length} (${f.easyPool}) | ${docs.size} |`);
}
writeFileSync(join(DATA, 'fields-merged.json'), JSON.stringify(out, null, 1));
writeFileSync(join(DATA, 'fields-merged.md'), md.join('\n') + '\n');
console.log(`${Object.keys(out).length}개 분야, 쉬움 풀에 보통을 넣은 분야 ${Object.values(out).filter(f => f.easyPool !== '쉬움').length}개`);
