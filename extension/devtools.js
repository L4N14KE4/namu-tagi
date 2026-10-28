// 개발자 도구가 열려 있는 동안 1초마다 그 탭의 나무타기에 알린다. 메뉴로 열었거나 게임 전에 열어 둔 경우도 잡는다.
// 콘텐츠 스크립트 세계에서 실행하므로 나무위키 페이지는 window.ngDevtools를 볼 수 없다(content.js). 게임 중이 아니거나 나무위키가 아닌 탭에서는 아무 일도 없다.
const ping = () => chrome.devtools.inspectedWindow.eval('window.ngDevtools?.()', { useContentScriptContext: true }, () => {});
ping();
setInterval(ping, 1000);
