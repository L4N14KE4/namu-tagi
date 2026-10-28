// 환영 페이지의 두 버튼. 어느 쪽을 눌러도 설명을 본 것으로 저장해서(introSeen) 나무위키 안 안내 창과 팝업의 첫 설명이 또 뜨지 않게 한다.
// 탭 X로 그냥 닫으면 저장되지 않아, 나중에 나무위키에 들어갔을 때 안내 창이 한 번 뜬다.
const seen = () => chrome.storage.local.set({ introSeen: true }).catch(() => {});
document.getElementById('go').onclick = async () => { await seen(); location.href = 'https://namu.wiki/'; };
document.getElementById('close').onclick = async () => {
  await seen();
  chrome.tabs.getCurrent(tab => (tab ? chrome.tabs.remove(tab.id) : window.close()));
};
