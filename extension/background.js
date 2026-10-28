// 설치하면 환영 페이지(welcome.html)를 새 탭으로 연다.
// 크롬은 확장을 설치할 때 이미 열려 있던 나무위키 탭에 content script를 넣지 않는다(그 탭을 새로고침해야 붙는다).
// 그래서 첫 안내를 나무위키 탭에 의존하면 안 보일 수 있어서, 확장 자신의 페이지로 반드시 보여 준다.
// 확장 새로고침(update)이나 크롬 업데이트에서는 열지 않는다. tabs.create는 별도 권한이 필요 없다.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: 'welcome.html' });
});
