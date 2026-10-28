// 한국어 위키백과 조회수로 목표 후보를 제안한다. 풀(candidates.txt, words.js)은 건드리지 않는다. 확인은 사람이 한다.
//   node scripts/suggest-candidates.mjs [--months 12] [--min-months 8] [--top 600]
// 1) 지난 N달의 월별 조회수 상위 1000개(wikimedia pageviews API)를 받아 합친다. 한 달만 많이 읽힌 뉴스성 문서를 거르려고
//    min-months달 이상 상위에 오른 것만 남기고, 특수·분류 같은 이름공간, 날짜·연도, 목록, 동음이의 문서는 뺀다.
// 2) 후보와 지금 풀(words.js)의 분류(위키백과 분류)를 받아 분야를 짐작하고, 분포를 견줘 보여 준다. 성인·범죄 같은 분류가 걸린 문서는 '주의' 표시.
// 3) 지금 풀과 허브에 없는 새 후보만 scripts/wiki-candidates.tsv에 쓴다(제목, 분야, 상위에 오른 달 수, 조회수 합, 주의).
// 받은 응답은 scripts/wiki-cache.json에 남겨 다시 돌릴 때 건너뛴다. 요청은 하나씩 차례로 보내고 사이에 쉰다.
// ponytail: 분야는 분류 이름의 낱말로 짐작한 것이라 틀릴 수 있다(분포를 보려는 용도). 풀에 넣기 전에 목록을 사람이 훑는다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const num = (name, def) => { const i = process.argv.indexOf('--' + name); return i < 0 ? def : Number(process.argv[i + 1]); };
const MONTHS = num('months', 12), MIN_MONTHS = num('min-months', 8), TOP = num('top', 600);
const UA = 'namu-game-research/0.1 (hobby project; serial low-rate requests)';
const CACHE = join(here, 'wiki-cache.json');
const OUT = join(here, 'wiki-candidates.tsv');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : { pageviews: {}, cats: {} };
const save = () => writeFileSync(CACHE, JSON.stringify(cache));

async function getJson(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) { // 너무 빨랐다. 알려 준 시간(없으면 점점 늘려서)만큼 쉰다
        await sleep((Number(res.headers.get('retry-after')) || 15 * (attempt + 1)) * 1000);
        throw new Error('HTTP ' + res.status);
      }
      return await res.json();
    } catch (e) {
      console.warn(`  재시도 ${attempt + 1}: ${e.message}`);
    }
  }
  throw new Error('받지 못했어요: ' + url.slice(0, 120));
}

// ---- 1) 월별 조회수 상위 ----
const now = new Date();
const months = Array.from({ length: MONTHS }, (_, i) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1 - i, 1));
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
});
for (const m of months) {
  if (cache.pageviews[m]) continue;
  const j = await getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/ko.wikipedia/all-access/${m}/all-days`);
  cache.pageviews[m] = j?.items?.[0]?.articles ?? [];
  console.log(`조회수 ${m}: ${cache.pageviews[m].length}개`);
  save(); await sleep(1500);
}

const NAMESPACE = /^(위키백과|특수|분류|파일|틀|포털|사용자|도움말|미디어위키|모듈|토론|위키프로젝트|그림|이미지|위키백과토론|사용자토론|파일토론|틀토론|분류토론|포털토론|도움말토론|Wikipedia|Special|Category|File|Template|Portal|User|Help|Talk|MediaWiki|Module):/;
const DATEISH = /^(\d+년(대)?|\d+월( \d+일)?|\d+일|(기원전 )?\d+세기|\d+년 \d+월( \d+일)?)$/;
const skip = t => NAMESPACE.test(t) || DATEISH.test(t) || /목록|동음이의/.test(t) || t === '대문' || /^[ㄱ-ㅎㅏ-ㅣ]$/.test(t); // 한글 낱자 문서도 뺀다
const agg = new Map();
for (const m of months) for (const a of cache.pageviews[m]) {
  const t = a.article.replace(/_/g, ' ');
  if (skip(t)) continue;
  const e = agg.get(t) ?? { title: t, months: 0, views: 0 };
  e.months++; e.views += a.views; agg.set(t, e);
}
const steady = [...agg.values()].filter(e => e.months >= MIN_MONTHS).sort((a, b) => b.views - a.views).slice(0, TOP);
console.log(`\n${months.length}달 동안 ${agg.size}개 문서가 상위 1000에 올랐고, ${MIN_MONTHS}달 이상 오른 것은 ${[...agg.values()].filter(e => e.months >= MIN_MONTHS).length}개(상위 ${TOP}개만 씀: ${steady.length}개)`);

// ---- 지금 풀과 허브 ----
const readVar = (file, name) => JSON.parse(readFileSync(join(here, '..', 'extension', file), 'utf8').match(new RegExp(`var ${name} = (\\{[\\s\\S]*\\});`))[1]);
const W = readVar('words.js', 'LR_WORDS');
const pool = [...W.easy, ...W.normal, ...W.hard];
const known = new Set([...pool, ...readVar('hubs.js', 'LR_HUBS').docs]);

// ---- 2) 분류와 분야 ----
async function fetchCats(titles) {
  const todo = titles.filter(t => !cache.cats[t]);
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const pages = new Map(), redirects = new Map(), normalized = new Map();
    let cont = {};
    do {
      const q = new URLSearchParams({ action: 'query', prop: 'categories', cllimit: 'max', clshow: '!hidden', redirects: '1',
        titles: batch.join('|'), format: 'json', formatversion: '2', ...cont });
      const j = await getJson(`https://ko.wikipedia.org/w/api.php?${q}`);
      for (const r of j?.query?.redirects ?? []) redirects.set(r.from, r.to);
      for (const n of j?.query?.normalized ?? []) normalized.set(n.from, n.to);
      for (const p of j?.query?.pages ?? []) {
        const e = pages.get(p.title) ?? { title: p.title, missing: !!p.missing, cats: [] };
        for (const c of p.categories ?? []) e.cats.push(c.title.replace(/^분류:/, ''));
        pages.set(p.title, e);
      }
      cont = j?.continue ?? null;
      await sleep(1000);
    } while (cont);
    for (const t of batch) {
      const n = normalized.get(t) ?? t, to = redirects.get(n) ?? n, p = pages.get(to);
      cache.cats[t] = p ? { to: p.title, missing: p.missing, cats: p.cats } : { missing: true, cats: [] };
    }
    save();
    console.log(`분류 ${Math.min(i + 50, todo.length)}/${todo.length}`);
  }
}
await fetchCats([...new Set([...steady.map(e => e.title), ...pool])]);

const PERSON = /(\d+년 출생|\d+년 사망|살아 ?있는 사람|\d+세기 (출생|사망)|\d+년대 (출생|사망))/;
const RULES = [
  ['국가·지역', /(국가|나라|도시|광역시|행정 구역|지방 자치|지리|섬$|산맥|하천|호수|반도|대륙|수도|의 주$|의 도$|의 군$|의 구$|의 시$|의 읍면동)/],
  ['역사·사건', /(전쟁|사건|혁명|역사|왕조|시대|제국|조약|참사|사고|학살|운동|왕국|기원전|세기)/],
  ['과학·기술', /(과학|물리|화학|수학|천문|우주|컴퓨터|소프트웨어|인터넷|기술|공학|의학|질병|약학|전자|운영 체제|프로그래밍|통신|건축|교통|자동차|항공|철도)/],
  ['생물', /(동물|식물|생물|포유|조류|어류|곤충|파충|양서|균류|나무|꽃|과일|채소|작물|분류군)/],
  ['음식', /(음식|요리|음료|식품|과자|디저트|주류|조미료|발효|식재료)/],
  ['영상·음악·게임', /(영화|드라마|애니메이션|만화|웹툰|게임|음악|앨범|노래|소설|문학|도서|방송|예능|텔레비전|뮤지컬|연극|가요|밴드|캐릭터|유튜브|라이트 노벨)/],
  ['스포츠', /(스포츠|축구|야구|농구|배구|골프|올림픽|월드컵|리그|경기|대회|e스포츠)/],
  ['사회·종교·단체', /(정치|법|경제|사회|종교|기업|회사|단체|정당|언어|교육|학교|대학|군사|행정|사상|철학|기독교|불교|이슬람|조직|기관|문화)/],
];
const FLAG = /(성인|포르노|음란|성행위|성애|자위|야동|성범죄|성폭력|강간|살인|자살|마약|도박|사이비|혐오|성매매|불법)/;
const FLAG_TITLE = /(성교|성기|음경|음핵|음순|외음부|사정|발기|체위|섹스|펠라티오|커닐링구스|보지|유방|전희|애무|성관계|정상위|후배위|기승위|피스팅|스로팅|이루마티오|두덩털|정액|야동|질$)/; // 성 관련 문서(분류에 안 걸리는 것)
const LIVING = /살아 ?있는 사람/; // 생존 인물은 시사성이 크고 민감할 수 있어 기본으로 뺀다
const classify = title => {
  const c = cache.cats[title];
  if (!c || c.missing) return { field: '(위키백과에 없음)', flag: '' };
  const flag = c.cats.some(x => LIVING.test(x)) ? '생존 인물' : FLAG_TITLE.test(title) ? '성 관련' : (c.cats.find(x => FLAG.test(x)) ?? '').slice(0, 30);
  if (c.cats.some(x => PERSON.test(x))) return { field: '인물', flag };
  const score = RULES.map(([f, re]) => [f, c.cats.filter(x => re.test(x)).length]).sort((a, b) => b[1] - a[1]);
  return { field: score[0][1] ? score[0][0] : '기타', flag };
};

// ---- 3) 분포와 목록 ----
const fresh = steady.filter(e => !known.has(e.title) && !known.has(cache.cats[e.title]?.to));
const rows = fresh.map(e => ({ ...e, ...classify(e.title) })).filter(r => r.field !== '(위키백과에 없음)');
const clean = rows.filter(r => !r.flag);
const dist = list => { const d = {}; for (const r of list) d[r.field] = (d[r.field] ?? 0) + 1; return d; };
const poolRows = pool.map(t => ({ title: t, ...classify(t) }));
const poolFound = poolRows.filter(r => r.field !== '(위키백과에 없음)');
const dp = dist(poolFound), dc = dist(clean);
const fields = [...new Set([...Object.keys(dp), ...Object.keys(dc)])].filter(f => f !== '(위키백과에 없음)');
const pct = (n, tot) => `${n} (${Math.round(100 * n / tot)}%)`.padStart(11);
console.log(`\n지금 풀 ${pool.length}개 중 위키백과에서 같은 이름을 찾은 것 ${poolFound.length}개, 위키백과 상위 후보 ${steady.length}개 중 풀·허브에 이미 있는 것 ${steady.length - fresh.length}개`);
console.log(`새 후보 ${fresh.length}개 중 위키백과 문서로 확인된 것 ${rows.length}개, 주의 표시 ${rows.length - clean.length}개를 뺀 ${clean.length}개\n`);
console.log('분야'.padEnd(16) + '지금 풀'.padStart(11) + '새 후보'.padStart(11));
for (const f of fields.sort((a, b) => (dc[b] ?? 0) - (dp[b] ?? 0) - ((dc[a] ?? 0) - (dp[a] ?? 0))))
  console.log(f.padEnd(14) + pct(dp[f] ?? 0, poolFound.length) + pct(dc[f] ?? 0, clean.length));

writeFileSync(OUT, '제목\t분야\t상위에 오른 달\t조회수 합\t주의\n' + [...clean, ...rows.filter(r => r.flag)].map(r => [r.title, r.field, r.months, r.views, r.flag].join('\t')).join('\n') + '\n');
console.log(`\n목록: ${OUT} (주의 표시된 것은 맨 아래)`);
