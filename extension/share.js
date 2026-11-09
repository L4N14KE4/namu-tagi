// 도전장 공유. 결과 카드(content.js)와 팝업의 기록 화면(popup.js)이 같이 쓴다.
// 판 하나는 me = { start, goal, mode, diff, day, rules, vs: { by, steps, ms, path, times } }로 받는다(vs가 보내는 사람의 기록).
const LR_SHARE = (() => {
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  // 닉네임 검사. server/src/index.js의 nameProblem과 같은 규칙이어야 한다(서버가 거절하면 공유가 말없이 긴 링크로 바뀌니 여기서 먼저 알린다).
  // 보이지 않는 글자(폭 없는 공백, 한글 채움 글자 등)와 운영자로 오해할 이름을 막는다. 띄어쓰기·기호·전각을 빼고 비교한다.
  const INVISIBLE = /[\u0000-\u001f\u007f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/; // 글자를 그대로 넣지 말고 \u 이스케이프로 둔다(보이지 않는 글자라 편집기가 지우거나 GitHub가 경고한다)
  const RESERVED = ['운영자', '운영진', '운영팀', '관리자', '관리팀', '개발자', '개발팀', '공식', '고객센터', '나무위키', '나무타기', 'namuwiki', 'namutagi', 'admin', 'official', 'staff', 'moderator'];
  const nameProblem = s => INVISIBLE.test(s) ? '보이지 않는 글자는 이름에 쓸 수 없어요.' :
    RESERVED.some(w => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '').includes(w)) ? '운영자로 오해할 수 있는 이름은 쓸 수 없어요.' : '';
  // 오늘의 문제는 회차 대신 날짜로 보여 준다(1회 = 2026-10-25, 한국 시간). 팝업의 FIRST_DAY와 같아야 한다.
  const dayLabel = n => { const d = new Date(Date.UTC(2026, 9, 25) + (n - 1) * 86400e3); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
  const limitText = s => (s % 60 ? `${s}초` : `${s / 60}분`);
  // 규칙을 하나씩 글로. 모드에 안 맞는 조합(손으로 만든 도전장, 옛 기록)일 때 쓴다.
  const ruleItems = (r = {}) => [r.nb && '뒤로가기 금지', r.nt && '틀 상자 링크 금지', r.nc && '분류 링크 금지', r.nf && '각주 링크 금지', r.nh && '허브 문서 금지',
    r.nr && '재방문 금지', r.ms && `${r.ms}단계 안에 도착`, r.tl && `제한 시간 ${limitText(r.tl)}`].filter(Boolean);
  // 규칙 모드: 어떤 링크를 못 쓰는지의 묶음 셋. 팝업은 이 셋 중에 고르고, 제한 시간과 최대 단계는 추가 옵션으로 따로 고른다.
  // 도전장 링크와 옛 기록은 아무 조합이나 들고 올 수 있어서 modeOf가 null이면 규칙을 하나씩 적는다.
  const FLAG_KEYS = ['nb', 'nt', 'nc', 'nf', 'nh', 'nr'];
  // note는 팝업의 모드 설명과 도전장 수락 창이 같이 쓴다(받는 사람은 모드 이름만으로는 무엇을 막는지 모른다).
  const MODES = { basic: { name: '기본', flags: [], note: '본문 링크라면 무엇이든 눌러도 돼요.' },
    hard: { name: '하드', flags: ['nb', 'nt', 'nh'], note: '뒤로가기, 틀 상자 링크, 허브 문서를 못 써요.' },
    extreme: { name: '익스트림', flags: FLAG_KEYS, note: '뒤로가기, 틀 상자, 분류, 각주 링크를 못 써요.\n허브 문서와 지나간 문서로도 못 가요.' } };
  const modeOf = (r = {}) => Object.keys(MODES).find(m => FLAG_KEYS.every(k => !!r[k] === MODES[m].flags.includes(k))) || null;
  // 추가 옵션 글(제한 시간, 최대 단계). 결과 카드, 수락 창, 공유 글이 모드 이름 옆에 붙인다.
  const limitItems = (r = {}) => [r.ms && `${r.ms}단계 안에 도착`, r.tl && `제한 시간 ${limitText(r.tl)}`].filter(Boolean);
  // 공유 문구용 걸린 시간: "1분 23.45초", 1분 안이면 "23.45초"
  const took = ms => { const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000); return (m ? `${m}분 ` : '') + `${((cs % 6000) / 100).toFixed(2)}초`; };

  // 도전장 짧은 형식. 한글은 그대로 두고 꼭 필요한 글자만 바꿔서 링크가 짧다(같은 판이 398자 → 84자). 짧은 링크 서버(server/src/index.js)도 같은 형식으로 보낸다.
  //  ng=목표 d=회차(오늘의 문제) rd=난이도 글자(무작위) f=분야 이름(목표 카드에 붙는 글) r=규칙 글자 tl= ms= b=보낸 사람
  //  p=시작과 목표를 뺀 경로(|로 이음) t=문서마다 걸린 1/100초(36진수, .로 이음). 단계·전체 시간은 여기서 다시 센다. 푸는 쪽은 content.js의 parseShort.
  const RULE_CH = { nb: 'b', nt: 't', nc: 'c', nf: 'f', nh: 'h', nr: 'r' }, DIFF_CH = { easy: 'e', normal: 'n', hard: 'h', wild: 'w' };
  const esc = s => String(s).replace(/[%&=#+|\s]/g, c => (c === ' ' ? '+' : encodeURIComponent(c)));
  const challengeLink = s => {
    const v = s.vs, cs = v.times.map(t => Math.floor(t / 10)), flags = Object.keys(RULE_CH).filter(k => s.rules?.[k]).map(k => RULE_CH[k]).join('');
    const kv = [['ng', esc(s.goal)], ...(s.mode === 'daily' && s.day ? [['d', s.day]] : []), ...(s.mode === 'random' && s.diff ? [['rd', DIFF_CH[s.diff]]] : []), ...(s.fd ? [['f', esc(s.fd)]] : []),
      ...(flags ? [['r', flags]] : []), ...(s.rules?.tl ? [['tl', s.rules.tl]] : []), ...(s.rules?.ms ? [['ms', s.rules.ms]] : []),
      ['b', esc(v.by)], ['p', v.path.slice(1, -1).map(esc).join('|')], ['t', cs.slice(1).map((c, i) => (c - cs[i]).toString(36)).join('.')]];
    return `https://namu.wiki/w/${s.start.split('/').map(x => x.replace(/[%?#\s\\]/g, encodeURIComponent)).join('/')}#` + kv.map(([k, x]) => `${k}=${x}`).join('&');
  };

  // 링크는 짧은 링크 서버(server/)가 준 주소, 서버에 닿지 못하면 짧은 형식(#ng=) 나무위키 링크.
  // 웹스토어 주소. 가운데 'namutagi'는 웹스토어가 무시하는 이름 자리이고 뒤의 확장 ID로 찾아간다.
  const STORE_URL = 'https://chromewebstore.google.com/detail/namutagi/fiadjnefijhjdngbdcaoahcdhkbnckfi';
  const SHORT_BASE = 'https://namutagi.com';
  // 익명 ID: 브라우저마다 무작위 UUID 하나. chrome.storage.sync라 크롬 동기화를 켜면 다른 컴퓨터에서도 같다. 서버는 이 값의 해시만 저장한다(나중에 로그인과 연결할 때 증명용).
  const playerId = async () => {
    let { pid } = await chrome.storage.sync.get('pid');
    if (!pid) { pid = crypto.randomUUID(); await chrome.storage.sync.set({ pid }); }
    return pid;
  };
  // 짧은 링크 서버에 도전장을 맡기고 https://namutagi.com/<id>를 받는다. 3초 안에 못 받으면 null(긴 링크로 대신한다).
  // 결과 카드는 나무위키 출처로, 팝업은 확장 출처로 보낸다. 서버가 두 출처를 다 받는다.
  const shortLink = async me => {
    try {
      const body = JSON.stringify({ pid: await playerId(), start: me.start, goal: me.goal, mode: me.mode, diff: me.diff, fd: me.fd || undefined, day: me.day, rules: me.rules,
        by: me.vs.by, path: me.vs.path, times: me.vs.times, ver: chrome.runtime.getManifest().version });
      const r = await fetch(`${SHORT_BASE}/c`, { method: 'POST', body, signal: AbortSignal.timeout(3000) });
      const { id } = r.ok ? await r.json() : {};
      return id ? `${SHORT_BASE}/${id}` : null;
    } catch { return null; }
  };
  // 공유 글의 규칙 줄: 모드 이름(기본은 빼고)과 추가 옵션, 모드에 안 맞으면 하나씩. 없으면 빈 글.
  const rulesText = r => { const m = modeOf(r); return (m ? [m !== 'basic' && `${MODES[m].name} 모드`, ...limitItems(r)].filter(Boolean) : ruleItems(r)).join(', '); };
  const shareText = (me, link) => {
    const v = me.vs;
    return (me.mode === 'daily' ? `나무타기 ${dayLabel(me.day)}의 문제\n` : '') +
      `${v.by}님이 ${me.start} 문서에서 ${me.goal} 문서로 ${took(v.ms)} 만에 ${v.steps}단계로 이동했어요.\n` +
      (rulesText(me.rules) ? `규칙: ${rulesText(me.rules)}\n` : '') +
      `같은 문제에 도전해 보세요 ⚔️\n${link}` +
      (link.startsWith(SHORT_BASE) ? '' : `\n도전하려면 확장을 먼저 설치해야 해요.\n나무타기 확장 설치 👉\n${STORE_URL}`); // 짧은 링크는 열면 설치 안내가 나온다. 긴 링크(서버에 못 닿았을 때)는 나무위키로 바로 가서 안내할 곳이 없다
  };

  // ---- 분야 ----
  // fields.json(scripts/build-fields-json.mjs가 만듦)은 약 0.7MB라 필요할 때만 읽는다. 팝업은 확장 안의 파일을, 게임 탭은 web_accessible_resources로 연 파일을 읽는다.
  let fieldsP;
  const fieldsData = () => (fieldsP ||= fetch(chrome.runtime.getURL('fields.json')).then(r => r.json()).catch(e => { fieldsP = null; throw e; }));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  // 목표 풀: 쉬움이 얇은 분야(t)는 쉬움에 보통을 섞고, 그래도 모자라면 x(어려움 중 역링크 많은 문서)도 섞는다.
  const goalPool = (x, diff) => (diff === 'easy' ? (x.t ? [...x.e, ...x.n, ...(x.x || [])] : x.e) : x[{ normal: 'n', hard: 'h' }[diff]]);
  // 고른 분야(없으면 전부) 중 하나를 균등하게 뽑고, 그 분야에서 난이도에 맞는 목표와 시작 문서를 뽑는다. 최근에 나온 목표(used)는 피한다.
  // 분야는 도착(목표)만 정한다. 시작은 호출하는 쪽이 나무위키 랜덤 문서로 뽑는다(start ''). 풀이 비면 null.
  // 분야를 고르지 않았으면(아무거나) 어느 분야에도 없는 기존 목록(words) 문서도 "기타" 한 칸으로 끼워 넣는다. 이 문서가 뽑히면 fd는 ''이다.
  const draw = (data, fds, diff, used = [], words) => {
    const chosen = (fds || []).filter(f => data.f[f]), names = chosen.length ? chosen : Object.keys(data.f);
    const rest = !chosen.length && words?.[diff] ? words[diff].filter(w => !used.includes(w) && !fieldOf(data, w)) : [];
    if (rest.length && Math.random() < 1 / (names.length + 1)) return { fd: '', goal: rnd(rest), start: '' };
    const ok = names.filter(f => goalPool(data.f[f], diff).some(w => !used.includes(w)));
    const cand = ok.length ? ok : names.filter(f => goalPool(data.f[f], diff).length);
    if (!cand.length) return null;
    const fd = rnd(cand), x = data.f[fd], pool = goalPool(x, diff), left = pool.filter(w => !used.includes(w));
    const goal = rnd(left.length ? left : pool);
    return { fd, goal, start: '' };
  };
  // 문서가 속한 분야(오늘의 문제 표시용). 두 분야 이상에 들면 문서가 더 적은 분야를 쓴다(누가 계산해도 같은 결과). 없으면 ''.
  let byTitle;
  const fieldOf = (data, title) => {
    if (!byTitle) {
      byTitle = new Map();
      const size = f => { const x = data.f[f]; return x.e.length + x.n.length + x.h.length; };
      for (const f of Object.keys(data.f)) for (const t of ['e', 'n', 'h'].flatMap(k => data.f[f][k])) { const o = byTitle.get(t); if (!o || size(f) < size(o)) byTitle.set(t, f); }
    }
    return byTitle.get(title) || '';
  };
  // 주소나 도전장으로 들어온 분야 이름. 카드에 그대로 찍히니 길이를 줄이고 보이지 않는 글자와 운영자 같은 이름은 버린다.
  const fdName = s => { s = String(s || '').trim().slice(0, 20); return !s || nameProblem(s) ? '' : s; };
  // 닉네임을 비워 두면 쓰는 자동 이름("명랑한 다람쥐"). 처음 한 번 만들어 저장해 두고, 직접 쓴 닉네임이 있으면 그것을 쓴다.
  const NICK_ADJ = ['명랑한', '용감한', '느긋한', '씩씩한', '부지런한', '엉뚱한', '수줍은', '듬직한', '재빠른', '졸린', '배고픈', '호기심 많은',
    '똑똑한', '푸근한', '당당한', '다정한', '날쌘', '반짝이는', '포근한', '느릿한', '상냥한', '의젓한', '활기찬'];
  const NICK_ANIMAL = ['다람쥐', '고양이', '여우', '토끼', '펭귄', '수달', '판다', '코알라', '고슴도치', '햄스터', '부엉이', '돌고래', '거북이', '오리', '너구리',
    '기린', '하마', '사슴', '곰', '호랑이', '늑대', '앵무새', '미어캣', '알파카', '카피바라', '두더지', '참새', '사자', '강아지', '개구리', '물개', '고래', '라마', '얼룩말'];
  const randomNick = () => { const pick = a => a[Math.floor(Math.random() * a.length)]; return `${pick(NICK_ADJ)} ${pick(NICK_ANIMAL)}`; };
  // 공유 칸: 닉네임을 받아 결과 문구를 복사한다. make(nick)가 me를 돌려준다. 모양은 쓰는 쪽(결과 카드, 팝업)이 .share로 꾸민다.
  const form = async make => {
    let saved = '', auto = '';
    try { // 확장이 새로고침돼 연결이 끊긴 경우는 catch로 빠진다
      ({ nick: saved = '', autoNick: auto = '' } = await chrome.storage.local.get(['nick', 'autoNick']));
      if (!auto) { auto = randomNick(); await chrome.storage.local.set({ autoNick: auto }); }
    } catch { auto = auto || randomNick(); }
    const input = el('input', { value: saved, placeholder: auto, maxLength: 20 });
    const out = el('textarea', { readOnly: true, hidden: true }); // 자동 복사가 막혔을 때 직접 고르고 복사하는 칸
    // 복사한 글 미리보기: 붙여 넣을 글 그대로 보여 준다. 링크만 작고 흐리게, 한글을 풀어서 보여 준다(%EC… 그대로면 상자를 다 차지한다).
    const shown = el('div', { className: 'sharebox', hidden: true });
    const readable = u => { try { return decodeURI(u); } catch { return u; } };
    const note = el('div', { className: 'muted' });
    let made = {}, busy = false; // busy: 링크를 받는 동안(최대 3초) 또 누르면 서버에 같은 도전장을 또 만들지 않게 무시한다
    const copy = async () => {
      if (busy) return;
      const typed = input.value.trim(), nick = typed || auto, why = nameProblem(nick);
      if (why) { note.textContent = why; return input.focus(); }
      if (typed) try { await chrome.storage.local.set({ nick: typed }); } catch {}
      if (made.nick !== nick) { // 같은 이름으로 다시 누르면 받아 둔 링크를 다시 쓴다(서버에 같은 도전장을 또 만들지 않게)
        note.textContent = '링크 만드는 중…'; busy = true;
        const me = make(nick);
        try { made = { nick, me, link: await shortLink(me) || challengeLink(me) }; } finally { busy = false; }
      }
      out.value = shareText(made.me, made.link);
      shown.replaceChildren(...out.value.split(/(https?:\/\/\S+)/).map((part, i) => (i % 2 ? el('span', { className: 'lk', textContent: readable(part) }) : part)));
      try { await navigator.clipboard.writeText(out.value); out.hidden = true; shown.hidden = false; note.textContent = '복사했어요.\n메신저에 붙여 넣으세요.'; }
      catch { shown.hidden = true; out.hidden = false; out.select(); note.textContent = '자동 복사가 막혀 있어요.\n위 글을 복사해 주세요.'; }
    };
    input.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) copy(); };
    return el('div', { className: 'share' },
      el('label', { textContent: '닉네임 (비우면 이 이름을 써요)' }),
      el('div', { className: 'row' }, input, el('button', { className: 'btn primary', textContent: '복사하기', onclick: copy })), shown, out, note);
  };
  return { nameProblem, dayLabel, limitText, ruleItems, limitItems, MODES, modeOf, RULE_CH, DIFF_CH, form, fieldsData, draw, fieldOf, fdName };
})();
