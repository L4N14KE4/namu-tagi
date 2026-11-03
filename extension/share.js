// 도전장 공유. 결과 카드(content.js)와 팝업의 기록 화면(popup.js)이 같이 쓴다.
// 판 하나는 me = { start, goal, mode, diff, day, rules, vs: { by, steps, ms, path, times } }로 받는다(vs가 보내는 사람의 기록).
const LR_SHARE = (() => {
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  // 닉네임 검사. server/src/index.js의 nameProblem과 같은 규칙이어야 한다(서버가 거절하면 공유가 말없이 긴 링크로 바뀌니 여기서 먼저 알린다).
  // 보이지 않는 글자(폭 없는 공백, 한글 채움 글자 등)와 운영자로 오해할 이름을 막는다. 띄어쓰기·기호·전각을 빼고 비교한다.
  const INVISIBLE = /[\u0000-\u001f\u007f­͏؜ᅟᅠ឴឵᠋-᠏​‌‎‏‪-‮⁠-⁯ㅤ﻿ﾠ]/;
  const RESERVED = ['운영자', '운영진', '운영팀', '관리자', '관리팀', '개발자', '개발팀', '공식', '고객센터', '나무위키', '나무타기', 'namuwiki', 'namutagi', 'admin', 'official', 'staff', 'moderator'];
  const nameProblem = s => INVISIBLE.test(s) ? '보이지 않는 글자는 이름에 쓸 수 없어요.' :
    RESERVED.some(w => s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '').includes(w)) ? '운영자로 오해할 수 있는 이름은 쓸 수 없어요.' : '';
  // 오늘의 문제는 회차 대신 날짜로 보여 준다(1회 = 2026-10-25, 한국 시간). 팝업의 FIRST_DAY와 같아야 한다.
  const dayLabel = n => { const d = new Date(Date.UTC(2026, 9, 25) + (n - 1) * 86400e3); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
  const limitText = s => (s % 60 ? `${s}초` : `${s / 60}분`);
  // 이 판에 걸린 제한 조건을 글로. 도전장 수락 창, 결과 카드, 공유 문구가 같이 쓴다.
  const ruleItems = (r = {}) => [r.nb && '뒤로가기 금지', r.nt && '틀 상자 링크 금지', r.nc && '분류 링크 금지', r.nf && '각주 링크 금지', r.nh && '허브 문서 금지',
    r.nr && '재방문 금지', r.ms && `${r.ms}단계 안에 도착`, r.tl && `제한 시간 ${limitText(r.tl)}`].filter(Boolean);
  // 공유 문구용 걸린 시간: "1분 23.45초", 1분 안이면 "23.45초"
  const took = ms => { const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000); return (m ? `${m}분 ` : '') + `${((cs % 6000) / 100).toFixed(2)}초`; };

  // 도전장 짧은 형식. 한글은 그대로 두고 꼭 필요한 글자만 바꿔서 링크가 짧다(같은 판이 398자 → 84자). 짧은 링크 서버(server/src/index.js)도 같은 형식으로 보낸다.
  //  ng=목표 d=회차(오늘의 문제) rd=난이도 글자(무작위) r=규칙 글자 tl= ms= b=보낸 사람
  //  p=시작과 목표를 뺀 경로(|로 이음) t=문서마다 걸린 1/100초(36진수, .로 이음). 단계·전체 시간은 여기서 다시 센다. 푸는 쪽은 content.js의 parseShort.
  const RULE_CH = { nb: 'b', nt: 't', nc: 'c', nf: 'f', nh: 'h', nr: 'r' }, DIFF_CH = { easy: 'e', normal: 'n', hard: 'h', wild: 'w' };
  const esc = s => String(s).replace(/[%&=#+|\s]/g, c => (c === ' ' ? '+' : encodeURIComponent(c)));
  const challengeLink = s => {
    const v = s.vs, cs = v.times.map(t => Math.floor(t / 10)), flags = Object.keys(RULE_CH).filter(k => s.rules?.[k]).map(k => RULE_CH[k]).join('');
    const kv = [['ng', esc(s.goal)], ...(s.mode === 'daily' && s.day ? [['d', s.day]] : []), ...(s.mode === 'random' && s.diff ? [['rd', DIFF_CH[s.diff]]] : []),
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
      const body = JSON.stringify({ pid: await playerId(), start: me.start, goal: me.goal, mode: me.mode, diff: me.diff, day: me.day, rules: me.rules,
        by: me.vs.by, path: me.vs.path, times: me.vs.times, ver: chrome.runtime.getManifest().version });
      const r = await fetch(`${SHORT_BASE}/c`, { method: 'POST', body, signal: AbortSignal.timeout(3000) });
      const { id } = r.ok ? await r.json() : {};
      return id ? `${SHORT_BASE}/${id}` : null;
    } catch { return null; }
  };
  const shareText = (me, link) => {
    const v = me.vs;
    return (me.mode === 'daily' ? `나무타기 ${dayLabel(me.day)}의 문제\n` : '') +
      `${v.by}님이 ${me.start} 문서에서 ${me.goal} 문서로 ${took(v.ms)} 만에 ${v.steps}단계로 이동했어요.\n` +
      (ruleItems(me.rules).length ? `조건: ${ruleItems(me.rules).join(', ')}\n` : '') +
      `같은 문제에 도전해 보세요 ⚔️\n${link}` +
      (link.startsWith(SHORT_BASE) ? '' : `\n도전하려면 확장을 먼저 설치해야 해요.\n나무타기 확장 설치 👉\n${STORE_URL}`); // 짧은 링크는 열면 설치 안내가 나온다. 긴 링크(서버에 못 닿았을 때)는 나무위키로 바로 가서 안내할 곳이 없다
  };
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
    let made = {};
    const copy = async () => {
      const typed = input.value.trim(), nick = typed || auto, why = nameProblem(nick);
      if (why) { note.textContent = why; return input.focus(); }
      if (typed) try { await chrome.storage.local.set({ nick: typed }); } catch {}
      if (made.nick !== nick) { // 같은 이름으로 다시 누르면 받아 둔 링크를 다시 쓴다(서버에 같은 도전장을 또 만들지 않게)
        note.textContent = '링크 만드는 중…';
        const me = make(nick);
        made = { nick, me, link: await shortLink(me) || challengeLink(me) };
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
  return { nameProblem, dayLabel, limitText, ruleItems, RULE_CH, DIFF_CH, form };
})();
