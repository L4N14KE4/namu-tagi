// 나무위키에서 우클릭하면 "나무타기" 아래에 시작/목표 메뉴가 뜬다(메뉴가 둘 이상이면 크롬이 확장 이름 아래로 묶는다). 링크 위에서는 그 링크 문서로.
// 고른 문서는 팝업 직접 출제 칸의 입력(draft, chrome.storage.session: 크롬을 끄면 사라진다)에 넣고 팝업을 연다.
// 게임 중에는 content.js가 우클릭을 막아서 메뉴가 안 뜬다.
const DOC = 'https://namu.wiki/w/*';
const MENUS = { 'start:page': '이 문서에서 시작', 'goal:page': '이 문서를 목표로', 'start:link': '링크 문서에서 시작', 'goal:link': '링크 문서를 목표로' };

// 설치하면 환영 페이지(welcome.html)를 새 탭으로 연다.
// 크롬은 확장을 설치할 때 이미 열려 있던 나무위키 탭에 content script를 넣지 않는다(그 탭을 새로고침해야 붙는다).
// 그래서 첫 안내를 나무위키 탭에 의존하면 안 보일 수 있어서, 확장 자신의 페이지로 반드시 보여 준다.
// 확장 새로고침(update)이나 크롬 업데이트에서는 열지 않는다. tabs.create는 별도 권한이 필요 없다.
// 우클릭 메뉴는 설치와 업데이트 때마다 다시 만든다(크롬이 기억하므로 서비스 워커가 깰 때마다 만들 필요는 없다).
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: 'welcome.html' });
  chrome.contextMenus.removeAll(() => {
    for (const [id, title] of Object.entries(MENUS)) {
      const link = id.endsWith(':link');
      chrome.contextMenus.create({ id, title, contexts: [link ? 'link' : 'page'], documentUrlPatterns: [link ? 'https://namu.wiki/*' : DOC], ...(link ? { targetUrlPatterns: [DOC] } : {}) });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async ({ menuItemId, linkUrl, pageUrl }) => {
  const [field, where] = menuItemId.split(':');
  const doc = decodeURIComponent(new URL(where === 'link' ? linkUrl : pageUrl).pathname.slice(3));
  const { draft = {} } = await chrome.storage.session.get('draft');
  await chrome.storage.session.set({ draft: { ...draft, [field]: doc } });
  chrome.action.openPopup().catch(() => {}); // ponytail: 크롬 127 미만은 팝업이 안 열린다. 입력은 남아 있어 다음에 열면 채워져 있다
});
