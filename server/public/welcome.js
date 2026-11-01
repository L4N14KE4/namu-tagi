// namutagi.com/welcome의 스크립트.
// 두 버튼은 설명을 본 것으로 확장에 알려서(externally_connectable, introSeen) 팝업의 첫 설명이 또 뜨지 않게 한다. 탭 X로 닫으면 팝업을 처음 열 때 짧은 설명이 한 번 뜬다.
const EXT = ['fiadjnefijhjdngbdcaoahcdhkbnckfi', 'bljboledcipggdpgboobagbhobhlgijb'];   // 웹스토어, 개발용(압축해제)
const seen = () => Promise.all(EXT.map(async id => { try { await chrome.runtime.sendMessage(id, 'introSeen'); } catch {} }));
// 첫 판 시작하기: 나무타기 팝업을 연다. 확장이 없거나 열지 못하면(크롬 127 미만 등) 나무위키로 보낸다.
const openPopup = () => Promise.any(EXT.map(async id => { if (await chrome.runtime.sendMessage(id, 'openPopup') !== true) throw 0; }));
document.getElementById('go').onclick = async () => { await seen(); openPopup().catch(() => { location.href = 'https://namu.wiki/'; }); };
document.getElementById('close').onclick = async () => { await seen(); window.close(); };

// 소제목을 누르면 나무위키처럼 그 밑 내용(표, 목록)을 접고 편다. 번호 링크는 목차로 간다.
for (const h of document.querySelectorAll('h2')) h.onclick = e => { if (!e.target.closest('a')) h.nextElementSibling.hidden = h.classList.toggle('folded'); };

// 각주 [1]에 마우스를 올리면 나무위키처럼 각주 글을 말풍선으로 보여 준다. 나무위키 popper와 같은 자리: 참조 위 가운데, 5px 위(자리가 없으면 아래).
const ref = document.getElementById('r1'), pop = Object.assign(document.createElement('div'), { className: 'popper', hidden: true, innerHTML: document.getElementById('fn1').innerHTML });
document.body.append(pop);
let hideTimer;
const showPop = () => {
  clearTimeout(hideTimer); pop.hidden = false;
  const r = ref.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, cx = r.left + r.width / 2;
  const left = Math.min(Math.max(5, cx - w / 2), document.documentElement.clientWidth - w - 5), below = r.top - h - 5 < 0;
  pop.classList.toggle('below', below);
  pop.style.left = `${left + scrollX}px`;
  pop.style.top = `${(below ? r.bottom + 5 : r.top - h - 5) + scrollY}px`;
  pop.style.setProperty('--arrow', `${cx - left}px`);
};
for (const el of [ref, pop]) {   // 말풍선 위로 옮겨 가는 동안은 닫지 않는다
  el.addEventListener('mouseenter', showPop);
  el.addEventListener('mouseleave', () => { hideTimer = setTimeout(() => { pop.hidden = true; }, 100); });
}
