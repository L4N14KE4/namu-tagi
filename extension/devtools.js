// 개발자 도구가 열려 있는 동안 1초마다 그 탭의 나무타기에 알린다. 메뉴로 열었거나 게임 전에 열어 둔 경우도 잡는다.
// 콘텐츠 스크립트 세계에서 실행하므로 나무위키 페이지는 window.ngDevtools를 볼 수 없다(content.js).
// 나무위키를 보고 있을 때만 돈다. 처음 한 번 주소를 묻고, 그 뒤로는 탭이 다른 페이지로 갈 때만 다시 판단한다(나무위키 안 이동은 도메인이 그대로라 괜찮다).
const { inspectedWindow, network } = chrome.devtools;
let onNamu = false;
const ping = () => { if (onNamu) inspectedWindow.eval('window.ngDevtools?.()', { useContentScriptContext: true }, () => {}); };
const setHost = host => { onNamu = host === 'namu.wiki'; ping(); };
inspectedWindow.eval('location.hostname', setHost);
network.onNavigated.addListener(url => setHost(new URL(url).hostname));
setInterval(ping, 1000);
