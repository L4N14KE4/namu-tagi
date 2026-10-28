// Wikidata로 목표 후보를 제안한다. 풀(candidates.txt, words.js)은 건드리지 않는다. 확인은 사람이 한다.
//   node scripts/suggest-candidates-wikidata.mjs [--min-sitelinks 150]
// 1) 한국어 위키백과 문서가 있고 링크된 언어판이 min-sitelinks개 이상인 Wikidata 항목을 받는다(여러 나라에서 아는 문서라 시사성이 적다).
//    조회수 대신 이걸 쓰는 까닭: 월별 조회수 상위는 한국 시사·인물·성 관련 문서로 치우친다(suggest-candidates.mjs).
// 2) 항목의 '무엇의 한 종류인가'(P31)를 큰 갈래(사람, 국가·지역, 생물 ...)로 모아 분야를 정한다. 분류 이름으로 짐작하던 것보다 정확하다.
// 3) 지금 풀(words.js)도 같은 방법으로 나눠 분포와 링크된 언어판 수를 견준다. 새 후보는 scripts/wikidata-candidates.tsv에 쓴다.
//    (제목, 분야, 링크된 언어판 수, 주의, 항목 번호). 주의: 생존 인물, 성 관련 문서. 동음이의·목록·분류 항목은 뺀다.
// 받은 응답은 scripts/wikidata-cache.json에 남겨 다시 돌릴 때 건너뛴다. 요청은 하나씩 차례로 보내고 사이에 쉰다.
// ponytail: 분야는 항목의 P31을 큰 갈래의 하위 갈래(P279*)로 거슬러 올라가 정한다. 여러 갈래에 걸치면 아래 FIELDS의 앞선 것이 이긴다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--min-sitelinks');
const MIN = i < 0 ? 150 : Number(process.argv[i + 1]);
const UA = 'namu-game-research/0.1 (hobby project; serial low-rate requests)';
const CACHE = join(here, 'wikidata-cache.json');
const OUT = join(here, 'wikidata-candidates.tsv');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : { items: {}, pool: {}, roots: {} };
const save = () => writeFileSync(CACHE, JSON.stringify(cache));

async function sparql(query) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql', { method: 'POST',
        headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query }) });
      if (res.ok) return (await res.json()).results.bindings;
      const text = await res.text();
      if (/TimeoutException/.test(text)) throw Object.assign(new Error('질의가 너무 오래 걸려요. 범위를 줄이세요.'), { fatal: true });
      if (res.status === 429 || res.status >= 500) await sleep((Number(res.headers.get('retry-after')) || 15 * (attempt + 1)) * 1000);
      throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
    } catch (e) {
      if (e.fatal) throw e;
      console.warn(`  재시도 ${attempt + 1}: ${e.message}`);
    }
  }
  throw new Error('받지 못했어요');
}

// 분야: 항목의 P31 갈래가 아래 큰 갈래(Q번호)의 하위 갈래면 그 분야. 앞선 줄이 이긴다. 같은 분야 이름이 두 번 나와도 된다(구체적인 갈래를 앞에).
const FIELDS = [
  ['인물', ['Q5', 'Q22989102', 'Q113103481']], // 신화 속 신도 인물로 본다
  ['국가·지역', ['Q6256', 'Q3624078', 'Q515', 'Q486972', 'Q82794', 'Q2221906', 'Q56061', 'Q5107', 'Q23442', 'Q8502', 'Q4022', 'Q165', 'Q12046615']],
  ['생물', ['Q16521', 'Q55983715', 'Q39367']],
  ['음식', ['Q2095', 'Q40050', 'Q746549', 'Q19861951', 'Q140646522']],
  ['신체·의학', ['Q12136', 'Q112193867', 'Q112965645', 'Q112826905', 'Q103812529', 'Q103914748']],
  ['스포츠', ['Q349', 'Q13406554', 'Q16510064', 'Q847017', 'Q12973014', 'Q31629']],
  ['작품·미디어', ['Q11424', 'Q5398426', 'Q7725634', 'Q482994', 'Q134556', 'Q7889', 'Q188451', 'Q4263830', 'Q223393', 'Q7777573', 'Q112248470', 'Q39725049', 'Q56055944', 'Q15773347', 'Q1114461', 'Q15711870']],
  ['역사·사건', ['Q13418847', 'Q198', 'Q178561', 'Q3839081', 'Q11514315', 'Q3024240', 'Q1190554']],
  ['과학·기술', ['Q336', 'Q11862829', 'Q11173', 'Q11344', 'Q6999', 'Q9143', 'Q7397', 'Q35127', 'Q118733587', 'Q17444909', 'Q47154513', 'Q22675015', 'Q113145171', 'Q169336']],
  ['단체·종교·언어', ['Q43229', 'Q9174', 'Q34770', 'Q25295', 'Q112872396']],
  ['사물·탈것·건축', ['Q8205328', 'Q811979', 'Q124078422', 'Q63981612', 'Q2424752', 'Q124315169', 'Q140424465', 'Q334166', 'Q2235308', 'Q123588392', 'Q110295396', 'Q111360549', 'Q317088']],
  ['작품·미디어', ['Q386724', 'Q17537576', 'Q2431196']],
  ['개념', ['Q151885', 'Q166902']],
];

const ROOTS = [...new Set(FIELDS.flatMap(([, q]) => q))];
if (cache.rootsFor !== ROOTS.join()) { cache.roots = {}; cache.rootsFor = ROOTS.join(); } // 분야 갈래를 바꿨으면 갈래 대응을 다시 받는다
const EXCLUDE = new Set(['Q4167410', 'Q13406463', 'Q4167836', 'Q11266439', 'Q17633526']); // 동음이의, 목록, 분류, 틀, 위키뉴스
const NAMESPACE = /^(위키백과|특수|분류|파일|틀|포털|사용자|도움말|미디어위키|모듈|토론|위키프로젝트|그림|이미지|Wikipedia|Special|Category|File|Template|Portal|User|Help|Talk|MediaWiki|Module):/;
const DATEISH = /^(\d+|\d+년(대)?|\d+월( \d+일)?|\d+일|(기원전 )?\d+세기|[월화수목금토일]요일|년|날|달 \(시간\)|주 \(시간\))$/; // 위키백과 안내 문서, 날짜·시간 단위 문서는 목표로 부적절
const FLAG_TITLE = /(성교|성기|음경|음핵|음순|외음부|사정|발기|체위|섹스|펠라티오|커닐링구스|보지|유방|전희|애무|성관계|정상위|후배위|기승위|피스팅|스로팅|이루마티오|두덩털|정액|야동|질$)/;

const SELECT = `SELECT ?item ?sl ?title (GROUP_CONCAT(DISTINCT STRAFTER(STR(?cls), "/entity/"); SEPARATOR=",") AS ?classes) (MAX(IF(BOUND(?d), 1, 0)) AS ?dead) WHERE {`;
const TAIL = `  OPTIONAL { ?item wdt:P31 ?cls }
  OPTIONAL { ?item wdt:P570 ?d }
} GROUP BY ?item ?sl ?title`;
const rowOf = b => ({ q: b.item.value.split('/').pop(), title: b.title.value, sl: Number(b.sl.value), classes: (b.classes?.value ?? '').split(',').filter(Boolean), dead: b.dead?.value === '1' });

// ---- 1) 후보: 링크된 언어판 수 범위마다 한 번씩(한꺼번에 받으면 시간이 초과된다) ----
const cuts = [MIN, ...[105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 170, 200, 250, 350].filter(c => c > MIN), 100000]; // 낮은 쪽은 항목이 많아 잘게 나눈다(한 번에 받으면 시간 초과)
for (let k = 0; k + 1 < cuts.length; k++) {
  const key = `${cuts[k]}-${cuts[k + 1]}`;
  if (cache.items[key]) continue;
  const rows = await sparql(`${SELECT}
  ?item wikibase:sitelinks ?sl . FILTER(?sl >= ${cuts[k]} && ?sl < ${cuts[k + 1]})
  ?ko schema:about ?item ; schema:isPartOf <https://ko.wikipedia.org/> ; schema:name ?title .
${TAIL}`);
  cache.items[key] = rows.map(rowOf); save();
  console.log(`언어판 ${cuts[k]}~${cuts[k + 1] - 1}개: ${rows.length}개 항목`);
  await sleep(3000);
}
const items = Object.values(cache.items).flat();

// ---- 지금 풀과 허브 ----
const readVar = (file, name) => JSON.parse(readFileSync(join(here, '..', 'extension', file), 'utf8').match(new RegExp(`var ${name} = (\\{[\\s\\S]*\\});`))[1]);
const W = readVar('words.js', 'LR_WORDS');
const pool = [...W.easy, ...W.normal, ...W.hard];
const known = new Set([...pool, ...readVar('hubs.js', 'LR_HUBS').docs]);
for (let n = 0; n < pool.length; n += 300) {
  const batch = pool.slice(n, n + 300), key = `${n}`;
  if (cache.pool[key]) continue;
  const rows = await sparql(`${SELECT}
  VALUES ?title { ${batch.map(t => JSON.stringify(t) + '@ko').join(' ')} }
  ?ko schema:name ?title ; schema:isPartOf <https://ko.wikipedia.org/> ; schema:about ?item .
  ?item wikibase:sitelinks ?sl .
${TAIL}`);
  cache.pool[key] = rows.map(rowOf); save();
  console.log(`지금 풀 ${Math.min(n + 300, pool.length)}/${pool.length}: ${rows.length}개 항목`);
  await sleep(3000);
}
const poolItems = Object.values(cache.pool).flat();

// ---- 2) 갈래 → 큰 갈래(P279*) ----
const classes = [...new Set([...items, ...poolItems].flatMap(r => r.classes))].filter(c => !cache.roots[c]);
for (let n = 0; n < classes.length; n += 120) {
  const batch = classes.slice(n, n + 120);
  const rows = await sparql(`SELECT ?cls ?root WHERE {
  VALUES ?cls { ${batch.map(c => 'wd:' + c).join(' ')} }
  VALUES ?root { ${ROOTS.map(c => 'wd:' + c).join(' ')} }
  ?cls wdt:P279* ?root }`);
  for (const c of batch) cache.roots[c] = [];
  for (const b of rows) cache.roots[b.cls.value.split('/').pop()].push(b.root.value.split('/').pop());
  save();
  console.log(`갈래 ${Math.min(n + 120, classes.length)}/${classes.length}`);
  await sleep(3000);
}

const fieldOf = r => {
  const roots = new Set(r.classes.flatMap(c => cache.roots[c] ?? []));
  return FIELDS.find(([, q]) => q.some(x => roots.has(x)))?.[0] ?? '기타';
};
const flagOf = r => r.classes.includes('Q5') && !r.dead ? '생존 인물' : FLAG_TITLE.test(r.title) ? '성 관련' : '';

// ---- 3) 분포와 목록 ----
const skip = r => r.classes.some(c => EXCLUDE.has(c)) || NAMESPACE.test(r.title) || DATEISH.test(r.title) || /목록|\(동음이의\)/.test(r.title);
const uniq = list => [...new Map(list.map(r => [r.q, r])).values()];
const fresh = uniq(items).filter(r => !skip(r) && !known.has(r.title)).map(r => ({ ...r, field: fieldOf(r), flag: flagOf(r) })).sort((a, b) => b.sl - a.sl);
const clean = fresh.filter(r => !r.flag);
const poolRows = uniq(poolItems).filter(r => !skip(r)).map(r => ({ ...r, field: fieldOf(r) }));
const dist = list => { const d = {}; for (const r of list) d[r.field] = (d[r.field] ?? 0) + 1; return d; };
const dp = dist(poolRows), dc = dist(clean);
const pct = (n, tot) => `${n} (${Math.round(100 * n / tot)}%)`.padStart(12);
const sls = poolRows.map(r => r.sl).sort((a, b) => a - b), q = p => sls[Math.floor(sls.length * p)];
console.log(`\n링크된 언어판 ${MIN}개 이상 + 한국어 위키백과 문서가 있는 항목 ${uniq(items).length}개. 그중 풀·허브에 이미 있는 것 ${uniq(items).filter(r => !skip(r) && known.has(r.title)).length}개`);
console.log(`새 후보 ${fresh.length}개, 주의 표시 ${fresh.length - clean.length}개를 뺀 ${clean.length}개`);
console.log(`지금 풀 ${pool.length}개 중 Wikidata에서 같은 제목을 찾은 것 ${poolRows.length}개. 링크된 언어판 수: 하위 10% ${q(.1)}, 25% ${q(.25)}, 중앙값 ${q(.5)}, 75% ${q(.75)}, 90% ${q(.9)}; ${MIN}개 이상 ${Math.round(100 * sls.filter(x => x >= MIN).length / sls.length)}%\n`);
console.log('분야'.padEnd(16) + '지금 풀'.padStart(12) + '새 후보'.padStart(12));
for (const f of [...new Set([...Object.keys(dp), ...Object.keys(dc)])].sort((a, b) => (dc[b] ?? 0) - (dp[b] ?? 0) - ((dc[a] ?? 0) - (dp[a] ?? 0))))
  console.log(f.padEnd(14) + pct(dp[f] ?? 0, poolRows.length) + pct(dc[f] ?? 0, clean.length));

writeFileSync(OUT, '제목\t분야\t링크된 언어판 수\t주의\t항목\n' + [...clean, ...fresh.filter(r => r.flag)].map(r => [r.title, r.field, r.sl, r.flag, r.q].join('\t')).join('\n') + '\n');
console.log(`\n목록: ${OUT} (링크된 언어판이 많은 순, 주의 표시된 것은 맨 아래)`);
