// namutagi.com 페이지 공통 스크립트(랜딩 /, 환영 /welcome, 개인정보 /privacy, 도전장 /:id). 페이지에 없는 요소는 건너뛴다.

// 확장(manifest의 externally_connectable)에 메시지를 보낸다. 어느 한 ID라도 true로 답하면 성공, 확장이 없으면 바로 실패한다.
const EXT = ['fiadjnefijhjdngbdcaoahcdhkbnckfi', 'bljboledcipggdpgboobagbhobhlgijb'];   // 웹스토어, 개발용(압축해제)
const ask = msg => Promise.any(EXT.map(async id => { if (await chrome.runtime.sendMessage(id, msg) !== true) throw 0; }));

// 소제목을 누르면 나무위키처럼 그 밑 내용을 접고 편다. 번호 링크는 목차로 간다.
for (const h of document.querySelectorAll('h2')) h.onclick = e => { if (!e.target.closest('a')) h.nextElementSibling.hidden = h.classList.toggle('folded'); };

// 각주 [1]에 마우스를 올리면 나무위키처럼 각주 글을 말풍선으로 보여 준다. 참조 위 가운데, 5px 위(자리가 없으면 아래).
const refs = document.querySelectorAll('.ref');
if (refs.length) {
  const pop = Object.assign(document.createElement('div'), { className: 'popper', hidden: true });
  document.body.append(pop);
  let hideTimer;
  const hidePop = () => { hideTimer = setTimeout(() => { pop.hidden = true; }, 100); };
  for (const ref of refs) {
    ref.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      pop.innerHTML = document.querySelector(ref.getAttribute('href'))?.innerHTML || ''; pop.hidden = false;
      const r = ref.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, cx = r.left + r.width / 2;
      const left = Math.min(Math.max(5, cx - w / 2), document.documentElement.clientWidth - w - 5), below = r.top - h - 5 < 0;
      pop.classList.toggle('below', below);
      pop.style.left = `${left + scrollX}px`;
      pop.style.top = `${(below ? r.bottom + 5 : r.top - h - 5) + scrollY}px`;
      pop.style.setProperty('--arrow', `${cx - left}px`);
    });
    ref.addEventListener('mouseleave', hidePop);
  }
  pop.addEventListener('mouseenter', () => clearTimeout(hideTimer));   // 말풍선 위로 옮겨 가는 동안은 닫지 않는다
  pop.addEventListener('mouseleave', hidePop);
}

// 시작 버튼: 확장이 이 탭을 나무위키 대문으로 보내고 팝업을 연다(background.js startOnNamu). 확장이 없거나 옛 버전이면 여기서 나무위키로만 간다.
const startOnNamu = () => ask('startOnNamu').catch(() => { location.href = 'https://namu.wiki/'; });

// 환영 페이지: 두 버튼이 설명을 본 것으로 확장에 알린다(introSeen, 팝업의 첫 설명이 또 뜨지 않게). 탭 X로 닫으면 팝업을 처음 열 때 짧은 설명이 한 번 뜬다.
const startBtn = document.getElementById('go'), closeBtn = document.getElementById('close');
const seen = () => ask('introSeen').catch(() => {});
if (startBtn) startBtn.onclick = async () => { await seen(); startOnNamu(); };
if (closeBtn) closeBtn.onclick = async () => { await seen(); window.close(); };

// 랜딩: 확장이 있으면 설치 버튼이 "나무위키에서 시작하기"가 되고, 누르면 환영 페이지와 같이 나무위키로 가서 팝업을 연다.
const installLinks = document.querySelectorAll('.go');
if (installLinks.length) ask('ping').then(() => {
  for (const a of installLinks) {
    a.href = 'https://namu.wiki/'; a.textContent = '나무위키에서 시작하기';
    a.onclick = e => { e.preventDefault(); startOnNamu(); };
  }
}, () => {});

// 개인정보처리방침: 브라우저 언어가 한국어면 한국어, 아니면 영어. ?lang=ko, ?lang=en으로 바꿀 수 있다.
const ko = document.getElementById('ko'), en = document.getElementById('en');
if (ko && en) {
  const pick = new URLSearchParams(location.search).get('lang');
  if (pick ? pick === 'en' : !/^ko\b/i.test(navigator.language)) {
    ko.hidden = true; en.hidden = false;
    document.documentElement.lang = 'en'; document.title = 'Namutagi/Privacy Policy';
  }
}
