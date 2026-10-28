// 나무타기 가로 로고(마크 + 글자)를 SVG와 레이어별 SVG로 뽑는다.
// 사용: node design/wordmark.mjs demo/logo.html <출력 폴더>
// 마크는 demo/logo.html의 '목표 깃발'을 불러 쓴다. 글자 나·무는 나무위키 로고(960x275 그림)에서 가장자리를 소수점 단위로 재서 그대로 다시 그렸고,
// 타·기는 같은 규칙(획 굵기 차이, 둥근 모서리)으로 새로 짰다. 좌표는 그 그림의 픽셀 단위이고 그릴 때 3배로 키운다.
import fs from 'fs';

const [html, out] = process.argv.slice(2);
const src = fs.readFileSync(html, 'utf8').match(/<script>([\s\S]*?)document\.getElementById\('grid'\)/)[1];
const { V, shapes, svg, G1, G2 } = new Function(src + 'return { V, shapes, svg, G1, G2 };')();
const v = V.find(x => x.name === '목표 깃발');

const U = 3;                                      // 그림 픽셀 → 로고 단위
const TONE = '#614d42';                           // 나무위키 글자색(재서 얻음)
const CV = 4.75, CC = 4.2;                        // 모서리 반지름: 볼록(바깥) / 오목(획이 만나는 안쪽). 원본에서 쟀다
const RING_R = 30.28, HOLE_R = 12.05;             // 고리 바깥/구멍 반지름
const OX = 342.52;                                // 글자 왼쪽 끝(나의 ㄴ)
const FLAG_SHIFT = -34 / 2.2367;                  // 사용자가 마크 PSD에서 깃발을 왼쪽으로 34px(2048px 기준) 옮겼다
const MARK_PX = [45, 30, 2003, 1425, 2048];       // 마크 PSD에서 보이는 부분 x0 y0 x1 y1, 캔버스 폭
const TEXT_TOP = 46.6, TEXT_BOTTOM = 226;         // 원본 글자 위끝(위 고리) 아래끝(무 줄기)
const GAP = 48.95;                                // 마크 오른쪽 끝과 글자 사이(원본)

// ── 직교 다각형 → 모서리를 둥글린 path. over[i]로 꼭짓점별 반지름 지정(0이면 각진 채)
function rpath(pts, over = []) {
  const n = pts.length, norm = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
  let area = 0;
  for (let i = 0; i < n; i++) { const [a, b] = pts[i], [c, d] = pts[(i + 1) % n]; area += a * d - c * b; }
  const info = pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const d1 = norm([p[0] - a[0], p[1] - a[1]]), d2 = norm([b[0] - p[0], b[1] - p[1]]);
    const cr = d1[0] * d2[1] - d1[1] * d2[0];
    return { p, d1, d2, cr, r: over[i] ?? (Math.sign(cr) === Math.sign(area) ? CV : CC) };
  });
  const f = x => +x.toFixed(2), E = c => [c.p[0] - c.d1[0] * c.r, c.p[1] - c.d1[1] * c.r], X = c => [c.p[0] + c.d2[0] * c.r, c.p[1] + c.d2[1] * c.r];
  let d = `M${X(info[0]).map(f)}`;
  const corner = c => c.r ? `L${E(c).map(f)}A${c.r} ${c.r} 0 0 ${c.cr > 0 ? 1 : 0} ${X(c).map(f)}` : `L${c.p.map(f)}`;
  for (let i = 1; i < n; i++) d += corner(info[i]);
  return d + corner(info[0]) + 'Z';
}
const rect = (x, y, w, h, r = CV) => rpath([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], [r, r, r, r]);
const mv = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);
const path = (...ds) => `<path fill-rule="evenodd" d="${ds.join('')}"/>`;

// ── 나·무: 원본 그대로. (왼쪽, 오른쪽, 위, 아래)는 가장자리 실측
const NA_L = [[342.52, 123.47], [370.49, 123.47], [370.49, 179.4], [412.43, 179.4], [412.43, 207.4], [342.52, 207.4]];   // ㄴ: 세로 28.0, 아래줄 28.0
const A = (dx, ringY, bottom, tickY) => [[426.41, ringY + 22], [449.71, ringY + 22], [449.71, tickY], [477.66, tickY], [477.66, tickY + 23.26],
  [449.71, tickY + 23.26], [449.71, bottom], [426.41, bottom]].map(([x, y]) => [x + dx, y]);                              // ㅏ: 줄기 23.3, 짧은 획 23.3. 위쪽 두 점은 고리에 가려진다
const HID = [0, 0];                                                                                                        // 줄기 윗점은 각진 채(고리 밑에 숨음)
const MU_T = [[496.32, 174.73], [594.18, 174.73], [594.18, 198.07], [556.89, 198.07], [556.89, 226], [533.59, 226], [533.59, 198.07], [496.32, 198.07]];

// ── 타·기: 같은 규칙으로 새로 짬
const DX_TA = 617.48 - OX;                        // 타의 ㅌ 왼쪽을 위의 가로줄 왼쪽(617.48)에 맞춤
const BAR = 18.6, GAP_T = (207.4 - 123.47 - 3 * BAR) / 2, VT = 28.0;   // ㅌ: 줄 셋은 ㅋ 가운데 줄처럼 18.6, 사이는 ㅋ처럼 약 14, 세로는 ㄴ처럼 28
const bar = i => 123.47 + i * (BAR + GAP_T);
const TA_T = [[342.52, bar(0)], [412.43, bar(0)], [412.43, bar(0) + BAR], [342.52 + VT, bar(0) + BAR], [342.52 + VT, bar(1)], [412.43, bar(1)], [412.43, bar(1) + BAR],
  [342.52 + VT, bar(1) + BAR], [342.52 + VT, bar(2)], [412.43, bar(2)], [412.43, 207.4], [342.52, 207.4]];
const TICK_TA = bar(1) + BAR / 2 - 23.26 / 2;     // 짧은 획은 ㅌ 가운데 줄 높이에 맞춤
const GI_GAP = 22 - 31 / 1.25 / U;                // 타 끝과 기 사이. 처음엔 22였고 사용자가 wordmark.psd에서 기를 왼쪽으로 31px(3384px 기준) 옮겼다
const DX_GI = 477.66 + DX_TA + GI_GAP - 771.27;   // 기의 ㄱ 왼쪽이 771.27 + DX_GI
const GI_G = [[771.27, 123.47], [841.16, 123.47], [841.16, 207.4], [841.16 - VT, 207.4], [841.16 - VT, 123.47 + VT], [771.27, 123.47 + VT]];   // ㄱ: ㄴ처럼 28
const GI_I = (dx) => [[871.46 + dx, 109.6 + 22], [894.76 + dx, 109.6 + 22], [894.76 + dx, 216.66], [871.46 + dx, 216.66]];

const glyphs = {
  나: [path(rpath(NA_L)), path(rpath(A(0, 104.8, 216.66, 165.47), HID))],
  무: [path(rect(505.63, 95.53, 74.57, 60.6), rect(526.6, 116.53, 32.62, 18.6, CC)), path(rpath(MU_T))],
  타: [path(rpath(mv(TA_T, DX_TA))),path(rpath(A(DX_TA, 77.2, 221.34, TICK_TA), HID))],
  기: [path(rpath(mv(GI_G, DX_GI))), path(rpath(GI_I(DX_GI), HID))],
};
const RINGS = { 나: [435.7, 104.8], 타: [435.7 + DX_TA, 77.2], 기: [883.11 + DX_GI, 109.6] };   // 나·타는 줄기보다 2.4 왼쪽(원본 나가 그렇다)
const ring = ([cx, cy]) => path(
  `M${cx - RING_R} ${cy}a${RING_R} ${RING_R} 0 1 0 ${2 * RING_R} 0a${RING_R} ${RING_R} 0 1 0 ${-2 * RING_R} 0z`,
  `M${cx - HOLE_R} ${cy}a${HOLE_R} ${HOLE_R} 0 1 0 ${2 * HOLE_R} 0a${HOLE_R} ${HOLE_R} 0 1 0 ${-2 * HOLE_R} 0z`).replace('<path', '<path fill="url(#rg)"');

// ── 마크: logo.html이 그린 조각을 이름별로 받아 온다(layers.mjs와 같은 이름)
let r = 0;
const RING_NAME = ['왼쪽 위 고리', '가운데 고리', '목표 고리', '출발 고리'];
const names = shapes(v).map(e => e.k === 'seg' ? (e.w ? '깃대' : '가지') : e.k === 'ring' ? RING_NAME[r++] : '깃발');
const MARK_ORDER = ['깃대', '가지', '출발 고리', '왼쪽 위 고리', '가운데 고리', '목표 고리', '깃발'];
const piece = name => {
  const s = svg(v, 'logo', 0, (e, j) => names[j] === name);
  return { vb: s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number), defs: s.match(/<defs>[\s\S]*<\/defs>/)[0], body: s.replace(/^[\s\S]*<\/defs>/, '').replace('</svg>', '') };
};
const { vb } = piece('가지');
const sc = MARK_PX[4] / vb[2];                    // 마크 PSD 픽셀 → 마크 좌표
const u = (px, py) => [vb[0] + px / sc, vb[1] + py / sc];
const [ux0, uy0] = u(MARK_PX[0], MARK_PX[1]), [ux1] = u(MARK_PX[2], MARK_PX[3]);
const k = 2 * RING_R * U / 210;                   // 마크 고리 지름(210)을 글자 고리와 같게. 원본도 그렇다
const TOP = TEXT_TOP * U, MARK_W = k * (ux1 - ux0), TEXT_X = MARK_W + GAP * U;
const markT = `translate(${-k * ux0} ${TOP - k * uy0}) scale(${k})`;

// ── 조립. tone: 글자와 가지 색. pick(이름) → 이 조각을 그릴지
const NAMES = [...'나무타기'].map(c => `글자 ${c}`), RNAMES = [...'나타기'].map(c => `고리 ${c}`);
export function build(tone, pick = () => true, mono = false) {   // mono: 고리·깃발까지 tone 한 색(초록 막대 위 흰 로고용)
  const PAD = 40, textW = (RINGS.기[0] + RING_R - OX) * U;
  const parts = [], tg = `translate(${TEXT_X} 0) scale(${U}) translate(${-OX} 0)`;
  for (const c of '나무타기') if (pick(`글자 ${c}`)) parts.push(`<g fill="${tone}" transform="${tg}">${glyphs[c].join('')}</g>`);
  for (const c of '나타기') if (pick(`고리 ${c}`)) parts.push(`<g transform="${tg}">${ring(RINGS[c])}</g>`);
  let defs = `<linearGradient id="rg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${G1}"/><stop offset="1" stop-color="${G2}"/></linearGradient>`;
  for (const n of MARK_ORDER) if (pick(n)) {
    const p = piece(n);
    defs += p.defs.replace(/<\/?defs>/g, '');
    let b = p.body.split('#5f4d3e').join(tone);
    if (n === '깃발') b = `<g transform="translate(${FLAG_SHIFT} 0)">${b}</g>`;
    parts.push(`<g transform="${markT}">${b}</g>`);
  }
  const x0 = -PAD, y0 = TOP - PAD, w = TEXT_X + textW + 2 * PAD, h = (TEXT_BOTTOM - TEXT_TOP) * U + 2 * PAD;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${Math.round(w * 1.25)}" height="${Math.round(h * 1.25)}"><defs>${defs}</defs>${parts.join('')}</svg>`;
  return { w, h, svg: mono ? s.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/url\(#\w+\)/g, tone) : s };
}

if (out) {
  fs.mkdirSync(out, { recursive: true });
  const light = build(TONE), dark = build('#ece6de');
  fs.writeFileSync(`${out}/wordmark-light.svg`, light.svg);
  fs.writeFileSync(`${out}/wordmark-dark.svg`, dark.svg);
  fs.writeFileSync(`${out}/wordmark-white.svg`, build('#fff', undefined, true).svg);   // 팝업 머리글(초록 막대와 어두운 막대 둘 다 흰색)
  const order = [...NAMES, ...RNAMES, ...MARK_ORDER];             // 아래에서 위로
  const layers = order.map((name, i) => {
    const file = `${out}/wm-${i}.svg`;
    fs.writeFileSync(file, build(TONE, n => n === name).svg);
    return { name, file };
  });
  const [W, H] = [Math.round(light.w * 1.25), Math.round(light.h * 1.25)];
  fs.writeFileSync(`${out}/plan.json`, JSON.stringify({ wordmark: { w: W, h: H, layers } }, null, 1));
  console.log(W, H, order.length);
}
