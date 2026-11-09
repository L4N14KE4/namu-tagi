// 날짜별 오늘의 문제 목록을 본다(제작자용): node scripts/list-daily.mjs [시작일 YYYY-MM-DD] [일수] [--words 파일]
// 공식은 extension/popup.js의 dailyCombo를 그대로 쓴다. 문제는 words.js의 보통 구간 목록으로 정해지니,
// 목록이 바뀌기 전에 나갔던 문제를 보려면 그때의 words.js를 --words로 준다(예: git show <커밋>:extension/words.js > /tmp/old-words.js).
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const wi = args.indexOf('--words');
const wordsFile = wi >= 0 ? args.splice(wi, 2)[1] : new URL('../extension/words.js', import.meta.url);
const code = (f => f.slice(f.indexOf('const seeded ='), f.indexOf('// 지나간 문서 목록')))(readFileSync(new URL('../extension/popup.js', import.meta.url), 'utf8'));
const words = new Function(readFileSync(wordsFile, 'utf8') + ';return LR_WORDS')();
const combo = new Function('LR_WORDS', code + ';return dailyCombo')(words);
const fields = JSON.parse(readFileSync(new URL('../extension/fields.json', import.meta.url), 'utf8')).f;
const fieldOf = t => { let b = null, bs = 1e9; for (const [k, o] of Object.entries(fields)) { const l = [...o.e, ...o.n, ...o.h]; if (l.includes(t) && l.length < bs) { bs = l.length; b = k; } } return b; };
const DAY = 864e5, DAY1 = Date.UTC(2026, 9, 25); // 2026-10-25가 1회차(한국 날짜)
const kstToday = Math.floor((Date.now() + 9 * 3600e3) / DAY) * DAY;
const from = args[0] ? Date.parse(args[0] + 'T00:00:00Z') : kstToday;
const n = Number(args[1] || 14);
for (let i = 0; i < n; i++) {
  const t = from + i * DAY, no = Math.round((t - DAY1) / DAY) + 1;
  if (no < 1) continue;
  const { start, goal } = combo(no);
  console.log(`${new Date(t).toISOString().slice(0, 10)}  ${String(no).padStart(3)}회차  ${start} → ${goal}${fieldOf(goal) ? `  [${fieldOf(goal)}]` : ''}`);
}
