// 팝업을 확장 밖(localhost)에서 열어 볼 때 쓰는 chrome API 흉내. build.py가 popup.html의 popup.js 앞에 끼워 넣는다.
// 쿼리: theme=dark|light(연결된 나무위키 탭의 테마), dead=1(탭 연결이 끊긴 상태, 탭 새로고침 버튼을 누르면 복구).
// 시험 중에 window.__store(저장소), window.__created(chrome.tabs.create로 열린 주소들), window.__reloaded를 읽거나 고칠 수 있다.
  const P = new URLSearchParams(location.search);
  window.__created = []; window.__store = { introSeen: true, popupMode: P.get('mode') || 'custom', records: [{"at": 1792874148948, "mode": "custom", "diff": null, "start": "사과", "goal": "사과(동음이의어)", "win": true, "steps": 3, "ms": 22540, "path": ["사과", "사과나무", "사과", "사과(동음이의어)"], "reason": null}, {"at": 1792874088948.0, "mode": "custom", "diff": null, "start": "사과", "goal": "사과(동음이의어)", "win": true, "steps": 1, "ms": 43230, "path": ["사과", "사과(동음이의어)"], "reason": null}, {"at": 1792874028948.0, "mode": "random", "diff": "normal", "start": "Soony 6", "goal": "바나나", "win": false, "steps": 0, "ms": 9000, "path": ["Soony 6"], "reason": "그만둠"}, {"at": 1792873968948.0, "mode": "random", "diff": "easy", "start": "윌라(래퍼)", "goal": "미국", "win": true, "steps": 2, "ms": 31020, "path": ["윌라(래퍼)", "대한민국", "미국"], "reason": null}] };
  const area = { get: (k, cb) => { const keys = Array.isArray(k) ? k : [k]; const o = Object.fromEntries(keys.map(x => [x, window.__store[x]])); if (cb) cb(o); return Promise.resolve(o); },
    set: o => { Object.assign(window.__store, o); return Promise.resolve(); }, remove: ks => { for (const k of [].concat(ks)) delete window.__store[k]; return Promise.resolve(); } };
  window.chrome = { runtime: {}, storage: { local: area }, tabs: {
    query: (q, cb) => cb([{ id: 7, url: 'https://namu.wiki/w/%EC%82%AC%EA%B3%BC' }]),
    connect: () => { const ls = []; setTimeout(() => ls.forEach(f => f({ theme: P.get('theme') || 'dark' })), 0);
      return { onMessage: { addListener: f => ls.push(f) }, onDisconnect: { addListener: f => { if (P.get('dead') && !window.__reloaded) setTimeout(f, 0); } }, postMessage: m => setTimeout(() => ls.forEach(f => f({ id: m.id, data: m.type === 'probe' ? { ok: true, doc: m.name } : [] })), 100) }; },
    reload: id => { window.__reloaded = id; }, onUpdated: { addListener: f => { window.__onUpd = f; }, removeListener() {} },
    create: o => window.__created.push(decodeURIComponent(o.url)),
    getCurrent: cb => cb({ id: 7 }), remove: id => { window.__removed = id; } } }; // 환영 페이지의 닫기 버튼용
