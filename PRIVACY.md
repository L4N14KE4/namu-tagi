# 나무타기 개인정보처리방침 / Privacy Policy

시행일 / Effective date: 2026-10-29

[한국어](#한국어) | [English](#english)

## 한국어

나무타기(이하 "확장")는 나무위키(namu.wiki)에서 즐기는 비공식 파도타기 게임 크롬 확장 프로그램입니다.
확장에는 서버와 계정이 없으며, 사용자의 정보를 개발자나 다른 누구에게도 보내지 않습니다.

### 브라우저 안에만 저장하는 정보

다음 정보는 사용자의 크롬 브라우저 안(`chrome.storage.local`)에만 저장됩니다. 외부로 보내지 않습니다.

- 게임 기록: 시작 문서, 목표 문서, 지나간 나무위키 문서 이름과 문서마다 걸린 시간, 단계, 결과, 켜 둔 규칙 (최근 200판)
- 닉네임: 공유하기에서 직접 입력한 이름, 또는 자동으로 만든 이름("명랑한 다람쥐" 등)
- 설정: 규칙 옵션, 무작위 난이도, 경로 표시 여부, 설명을 봤는지 여부
- 최근에 나온 목표 문서 이름(같은 문제가 반복되지 않게 하는 용도)
- 목표 문서 미리보기: 목표 문서의 짧은 소개 글과 그림 주소

진행 중인 게임의 상태는 그 탭의 `sessionStorage`에만 저장되고, 탭을 닫으면 사라집니다.
직접 출제 칸에 입력 중인 시작 문서와 목표 문서 이름은 `chrome.storage.session`에 저장되고, 게임을 시작하거나 크롬을 끄면 사라집니다.

### 게임 중에만 처리하는 정보

게임 규칙을 지키기 위해 나무위키 페이지 안에서 다음을 처리합니다. 이 정보는 저장하거나 보내지 않습니다.

- 페이지의 링크와 문서 이름: 누른 링크가 규칙에 맞는지 판정
- 클릭, 키 입력, 마우스 움직임, 스크롤이 있었는지 여부: 자리 비움 확인과 단축키 막기
- 게임 화면을 떠났는지(다른 탭이나 창으로 이동), 개발자 도구가 열렸는지 여부

### 네트워크 요청

확장은 나무위키(namu.wiki) 페이지만 엽니다. 목표 문서를 확인하거나 무작위 목표를 고를 때 나무위키 문서를 보이지 않는 창으로 열 수 있습니다. 이때의 요청은 평소처럼 나무위키를 방문하는 것과 같으며, 나무위키의 개인정보처리방침이 적용됩니다.
그 밖의 서버로는 어떤 요청도 보내지 않습니다. 광고, 분석 도구, 원격 코드를 쓰지 않습니다.

### 공유

**공유하기**를 누르면 닉네임, 기록, 경로, 규칙이 담긴 도전장 링크가 클립보드에 복사됩니다.
이 링크는 사용자가 직접 붙여 넣어 보낼 때만 다른 사람에게 전해집니다.

### 제3자 제공

사용자 정보를 판매하거나 제3자에게 제공하지 않으며, 게임 이외의 목적으로 쓰지 않습니다.

### 삭제

- 팝업의 **기록** 화면에서 **기록 지우기**를 누르면 게임 기록이 지워집니다.
- 확장을 삭제하면 브라우저에 저장된 모든 정보가 함께 지워집니다.

### 문의

l4n14ke4.dev@gmail.com

나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임입니다.

## English

Namutagi ("the extension") is an unofficial wiki race game for namu.wiki, provided as a Chrome extension.
The extension has no server and no accounts. It does not send any user information to the developer or anyone else.

### Information stored only in your browser

The following information is stored only in your Chrome browser (`chrome.storage.local`). It is never transmitted.

- Game records: start article, target article, the names of the namu.wiki articles visited during a game with the time spent on each, steps, result, and enabled rules (the latest 200 games)
- Nickname: a name you type when sharing, or an automatically generated one (such as "명랑한 다람쥐")
- Settings: rule options, random difficulty, whether the path bar is shown, and whether the introduction has been seen
- Recently used target article names (to avoid repeating the same puzzle)
- Target article previews: a short summary and image address of the target article

The state of a game in progress is stored only in that tab's `sessionStorage` and is removed when the tab is closed.
The start and target article names you are entering in the custom game form are stored in `chrome.storage.session` and are removed when you start the game or close Chrome.

### Information processed only during a game

To enforce the game rules, the extension processes the following inside namu.wiki pages. This information is neither stored nor transmitted.

- Links and article names on the page, to check whether a clicked link is allowed
- Whether a click, key press, mouse movement, or scroll happened, to detect inactivity and block shortcuts
- Whether you left the game screen (switched to another tab or window) or opened developer tools

### Network requests

The extension only opens namu.wiki pages. To verify a target article or pick a random target, it may load a namu.wiki page in a hidden frame. These requests are the same as visiting namu.wiki normally, and namu.wiki's own privacy policy applies to them.
The extension sends no requests to any other server. It uses no advertising, no analytics, and no remote code.

### Sharing

When you press **공유하기** (Share), a challenge link containing your nickname, record, path, and rules is copied to your clipboard.
The link reaches other people only if you paste and send it yourself.

### Third parties

User information is never sold or transferred to third parties, and is not used for any purpose other than the game.

### Deletion

- Press **기록 지우기** (Clear records) on the **기록** (Records) screen of the popup to delete game records.
- Removing the extension deletes all information stored in the browser.

### Contact

l4n14ke4.dev@gmail.com

Namutagi is an unofficial game and is not affiliated with namu.wiki or umanle S.R.L.
