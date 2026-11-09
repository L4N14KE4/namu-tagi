// 분야 목록을 확장용 extension/fields.json으로 만든다(네트워크 없음). 입력은 merge-fields.mjs가 만든 data/fields-merged.json.
//   node scripts/build-fields-json.mjs
// 팝업(무작위 모드 분야 고르기, 오늘의 문제 분야 표시)과 게임의 새 문제가 읽는다. 나무위키 모든 페이지에 붙는 content script가 아니라 필요할 때만 읽는다(약 0.15MB).
// 모양: { groups: [[묶음, [분야...]]...], f: { 분야: { e, n, h, t } } }
//   e n h = 목표가 될 수 있는 문서(역링크 쉬움 1615 이상, 보통 677 이상, 어려움 100 이상). 분야는 도착(목표)만 정해서 시작 전용 문서(역링크 100 미만)는 담지 않는다
//   t = 1이면 쉬움이 얇아(10개 미만) 쉬움에 보통도 섞어서 뽑는다. x = 그래도 10개가 안 될 때 쉬움 풀에 더하는 어려움 중 역링크 많은 문서
import { readFileSync, writeFileSync } from 'node:fs';
const GROUPS = [
  ['사람', ['역사 인물', '아이돌과 가수', '배우', '유튜버와 스트리머', '스포츠 선수', '성우', '정치인과 정당']],
  ['장소', ['나라', '세계의 도시', '한국 지리', '건축과 랜드마크']],
  ['자연', ['동물', '반려동물', '식물', '우주와 날씨']],
  ['스포츠와 놀이', ['스포츠 종목', '스포츠 팀과 리그', '스포츠 대회', 'e스포츠와 프로게이머', '놀이']],
  ['서브컬처', ['애니메이션과 만화', '캐릭터', '게임', '히어로와 특촬', '괴담과 도시전설']],
  ['작품', ['영화', '드라마', '방송과 예능', '음악', '문학과 미술', '신화와 전설']],
  ['역사와 사회', ['한국사', '세계사와 전쟁', '미스터리와 사건 사고', '군사와 무기', '종교와 철학', '언어와 문자', '경제와 직업']],
  ['과학과 기술', ['물리와 수학', '의학과 몸', 'IT와 전자기기', '탈것과 교통']],
  ['생활과 문화', ['음식', '기업과 브랜드', '밈과 유행어', '교육과 학교', '패션과 뷰티', '축제와 기념일']],
];
const EASY_THIN = 10;
const POOL_MIN = 20; // 쉬움을 보통과 합친 풀이 이보다 작으면 어려움 중 역링크 상위 문서로 채운다
const merged = JSON.parse(readFileSync(new URL('data/fields-merged.json', import.meta.url)));
const names = GROUPS.flatMap(g => g[1]);
const miss = names.filter(n => !merged[n]), extra = Object.keys(merged).filter(n => !names.includes(n));
if (miss.length || extra.length) throw new Error(`묶음과 합친 분야가 안 맞아요. 없음: ${miss}, 묶음에 없음: ${extra}`);
// 한 문서가 여러 분야에 들어 있으면, 그 분야로 분류된 나무위키 분류(hit)가 가장 많은 분야에만 남긴다(같으면 모두 남김).
// 분류 하나에 우연히 걸린 곳(방탄소년단 → 정치인과 정당, 푸틴 → 스포츠 선수)을 거른다. hit는 fields-report.json의 문서마다 있다.
const report = JSON.parse(readFileSync(new URL('data/fields-report.json', import.meta.url))).fields;
const hits = new Map(); // 문서 → 분야 → 걸린 분류들
for (const [k, v] of Object.entries(merged)) for (const part of v.parts) {
  const docs = report[part].docs;
  for (const x of Array.isArray(docs) ? docs : Object.values(docs)) {
    if (!hits.has(x.title)) hits.set(x.title, new Map());
    const m = hits.get(x.title);
    if (!m.has(k)) m.set(k, new Set());
    for (const h of x.hit || []) m.get(k).add(h);
  }
}
const bl = new Map(); // 문서 → 역링크 수(분야 사이에서 가장 큰 값)
for (const v of Object.values(report)) for (const x of (Array.isArray(v.docs) ? v.docs : Object.values(v.docs))) bl.set(x.title, Math.max(bl.get(x.title) || 0, x.bl || 0));
const strongest = (t, k) => { const m = hits.get(t); if (!m || m.size < 2) return true; return (m.get(k)?.size || 0) >= Math.max(...[...m.values()].map(s => s.size)); };
// 한 분야에만 걸렸는데 분야가 틀린 문서(사람이 훑어 정함, 2026-11-08). 분야 이름 → 제목 목록. 새로 읽은 문서에서 잘못된 것을 찾으면 여기에 더한다.
const WRONG = JSON.parse(readFileSync(new URL('data/fields-wrong.json', import.meta.url)));
const wrong = new Set(Object.entries(WRONG).flatMap(([k, a]) => a.map(t => `${k}\t${t}`)));
const f = {};
let dropped = 0, wrongDropped = 0;
for (const n of names) {
  const m = merged[n], keep = t => { if (wrong.has(`${n}\t${t}`)) { wrongDropped++; return false; } if (!strongest(t, n)) { dropped++; return false; } return true; };
  f[n] = { e: m.easy.filter(keep), n: m.normal.filter(keep), h: m.hard.filter(keep) };
  if (f[n].e.length < EASY_THIN) { // 쉬움이 10개 미만이면 쉬움에 보통도 섞고(t), 그래도 10개가 안 되면 어려움 중 역링크가 많은 문서를 x로 더한다
    f[n].t = 1;
    const need = POOL_MIN - f[n].e.length - f[n].n.length;
    if (need > 0) f[n].x = [...f[n].h].sort((a, b) => (bl.get(b) || 0) - (bl.get(a) || 0)).slice(0, need);
  }
}
console.log(`여러 분야에서 덜 맞는 소속 ${dropped}개, 직접 뺀 오분류 ${wrongDropped}개를 뺐어요`);
const out = JSON.stringify({ groups: GROUPS, f });
writeFileSync(new URL('../extension/fields.json', import.meta.url), out);
console.log(`분야 ${names.length}개, ${(out.length / 1024).toFixed(0)}KB(글자 수)`);
