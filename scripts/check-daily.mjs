// 오늘의 문제 공식(extension/popup.js)의 보장을 확인한다: node scripts/check-daily.mjs
// 1) 한 바퀴에 목표가 한 번씩 2) (시작, 목표)가 같은 쌍도 뒤집힌 쌍도 ceil(N/2)-1바퀴 동안 안 겹침 3) 목록 파일의 순서와 상관없이 같은 문제
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../extension/popup.js', import.meta.url), 'utf8');
const code = src.slice(src.indexOf('const seeded ='), src.indexOf('// 지나간 문서 목록'));
const make = normal => new Function('LR_WORDS', code + ';return dailyCombo')({ normal });
const words = new Function(readFileSync(new URL('../extension/words.js', import.meta.url), 'utf8') + ';return LR_WORDS')().normal;
const N = words.length, K = Math.ceil(N / 2) - 1, combo = make(words);
const id = new Map([...words].sort().map((w, i) => [w, i]));
const seen = new Set(); let bad = 0;
const fail = m => { if (bad++ < 5) console.log('실패:', m); };
for (let n = 1; n <= N * K; n++) {
  const { start, goal } = combo(n), a = id.get(start), b = id.get(goal);
  if (a === undefined || b === undefined || a === b) fail(`${n}일 시작·목표 이상 ${start} → ${goal}`);
  if (seen.has(a * N + b) || seen.has(b * N + a)) fail(`${n}일 쌍이 겹침 ${start} → ${goal}`);
  seen.add(a * N + b);
}
if (new Set(Array.from({ length: N }, (_, i) => combo(i + 1).goal)).size !== N) fail('첫 바퀴에 목표가 겹침');
const shuf = make([...words].reverse());
for (let n = 1; n <= 3000; n += 7) if (combo(n).goal !== shuf(n).goal || combo(n).start !== shuf(n).start) fail(`${n}일 목록 순서에 따라 달라짐`);
console.log(bad ? `실패 ${bad}건` : `통과: ${N}개, ${K}바퀴(${N * K}일, 약 ${Math.round(N * K / 365.25)}년) 동안 쌍이 안 겹침`);
console.log('1~3일차:', [1, 2, 3].map(n => { const { start, goal } = combo(n); return `${start} → ${goal}`; }).join(' | '));
process.exit(bad ? 1 : 0);
