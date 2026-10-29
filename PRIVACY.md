# 나무타기 개인정보처리방침 / Privacy Policy

시행일 / Effective date: 2026-10-29

[한국어](#한국어) | [English](#english)

## 한국어

나무타기(이하 "확장")는 나무위키(namu.wiki)에서 즐기는 비공식 파도타기 게임 크롬 확장 프로그램입니다.
확장에는 계정이 없습니다. 공유하기로 도전장 링크를 만들 때만 아래에 적은 정보를 개발자의 짧은 링크 서버로 보내고, 그 밖의 정보는 보내지 않습니다.

### 브라우저 안에만 저장하는 정보

다음 정보는 사용자의 크롬 브라우저 안(`chrome.storage.local`)에만 저장됩니다. 공유하기 때 서버로 보내는 정보는 아래 따로 적었습니다.

- 게임 기록: 시작 문서, 목표 문서, 지나간 나무위키 문서 이름과 문서마다 걸린 시간, 단계, 결과, 켜 둔 규칙 (최근 200판)
- 닉네임: 공유하기에서 직접 입력한 이름, 또는 자동으로 만든 이름("명랑한 다람쥐" 등)
- 설정: 규칙 옵션, 무작위 난이도, 경로 표시 여부, 설명을 봤는지 여부
- 최근에 나온 목표 문서 이름(같은 문제가 반복되지 않게 하는 용도)
- 목표 문서 미리보기: 목표 문서의 짧은 소개 글과 그림 주소

익명 ID는 `chrome.storage.sync`에 저장되어, 크롬 동기화를 켜면 같은 계정의 다른 크롬에서도 같은 값이 쓰입니다.
진행 중인 게임의 상태는 그 탭의 `sessionStorage`에만 저장되고, 탭을 닫으면 사라집니다.
직접 출제 칸에 입력 중인 시작 문서와 목표 문서 이름은 `chrome.storage.session`에 저장되고, 게임을 시작하거나 크롬을 끄면 사라집니다.

### 게임 중에만 처리하는 정보

게임 규칙을 지키기 위해 나무위키 페이지 안에서 다음을 처리합니다. 이 정보는 저장하거나 보내지 않습니다.

- 페이지의 링크와 문서 이름: 누른 링크가 규칙에 맞는지 판정
- 클릭, 키 입력, 마우스 움직임, 스크롤이 있었는지 여부: 자리 비움 확인과 단축키 막기
- 게임 화면을 떠났는지(다른 탭이나 창으로 이동), 개발자 도구가 열렸는지 여부

### 네트워크 요청

확장은 나무위키(namu.wiki) 페이지만 엽니다. 목표 문서를 확인하거나 무작위 목표를 고를 때 나무위키 문서를 보이지 않는 창으로 열 수 있습니다. 이때의 요청은 평소처럼 나무위키를 방문하는 것과 같으며, 나무위키의 개인정보처리방침이 적용됩니다.
그 밖에는 공유하기에서 짧은 링크를 만들 때만 짧은 링크 서버(namutagi.com)로 요청을 보냅니다. 광고, 분석 도구, 원격 코드를 쓰지 않습니다.

### 도전장 링크를 만들 때 서버로 보내는 정보

**공유하기**를 누르면 짧은 도전장 링크(`https://namutagi.com/…`)를 만들기 위해 다음 정보를 개발자가 운영하는 서버로 보냅니다.

- 닉네임, 시작 문서, 목표 문서, 지나간 나무위키 문서 이름과 문서마다 도착한 시각, 단계, 걸린 시간, 켜 둔 규칙, 문제 종류(직접 출제, 무작위, 오늘의 문제), 확장 버전
- 익명 ID: 브라우저마다 무작위로 만든 값입니다. 서버에는 원래 값으로 되돌릴 수 없게 바꾼 값(SHA-256 해시)만 저장합니다. 이름, 이메일 같은 계정 정보는 받지 않습니다.

이 정보는 짧은 링크로 도전장을 열고 메신저 미리보기를 보여 주는 데 씁니다. 링크를 아는 사람은 누구나 그 도전장의 닉네임, 기록, 경로를 볼 수 있습니다.
서버는 Cloudflare, Inc.의 서비스(Workers, D1)를 쓰며, 정보는 국외(미국 등)의 Cloudflare 설비에 저장될 수 있습니다.
서비스를 운영하는 동안 보관하며, 아래 문의 메일로 짧은 링크 주소를 알려 주시면 지웁니다.
서버에 닿지 못하면 정보를 보내지 않고, 내용을 링크 안에 담은 나무위키 주소를 대신 복사합니다.

### 공유

**공유하기**를 누르면 닉네임, 기록, 경로, 규칙이 담긴 도전장 링크가 클립보드에 복사됩니다(위의 짧은 링크, 또는 서버에 닿지 못하면 내용을 담은 나무위키 주소).
이 링크는 사용자가 직접 붙여 넣어 보낼 때만 다른 사람에게 전해집니다.

### 제3자 제공

사용자 정보를 판매하거나 제3자에게 제공하지 않으며, 게임 이외의 목적으로 쓰지 않습니다. 짧은 링크 서버의 운영(저장, 전송)은 Cloudflare, Inc.에 맡깁니다.

### 삭제

- 팝업의 **기록** 화면에서 **기록 지우기**를 누르면 게임 기록이 지워집니다.
- 확장을 삭제하면 브라우저에 저장된 모든 정보가 함께 지워집니다.
- 짧은 링크 서버에 저장된 도전장은 문의 메일로 짧은 링크 주소를 알려 주시면 지웁니다.

### 문의

l4n14ke4.dev@gmail.com

나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임입니다.

## English

Namutagi ("the extension") is an unofficial wiki race game for namu.wiki, provided as a Chrome extension.
The extension has no accounts. Only when you create a challenge link with Share does it send the information described below to the developer's short link server, and nothing else is sent.

### Information stored only in your browser

The following information is stored only in your Chrome browser (`chrome.storage.local`). What is sent to the server when you share is described separately below.

- Game records: start article, target article, the names of the namu.wiki articles visited during a game with the time spent on each, steps, result, and enabled rules (the latest 200 games)
- Nickname: a name you type when sharing, or an automatically generated one (such as "명랑한 다람쥐")
- Settings: rule options, random difficulty, whether the path bar is shown, and whether the introduction has been seen
- Recently used target article names (to avoid repeating the same puzzle)
- Target article previews: a short summary and image address of the target article

The anonymous ID is stored in `chrome.storage.sync`, so if Chrome sync is on, the same value is used in Chrome on your other devices signed in to the same account.
The state of a game in progress is stored only in that tab's `sessionStorage` and is removed when the tab is closed.
The start and target article names you are entering in the custom game form are stored in `chrome.storage.session` and are removed when you start the game or close Chrome.

### Information processed only during a game

To enforce the game rules, the extension processes the following inside namu.wiki pages. This information is neither stored nor transmitted.

- Links and article names on the page, to check whether a clicked link is allowed
- Whether a click, key press, mouse movement, or scroll happened, to detect inactivity and block shortcuts
- Whether you left the game screen (switched to another tab or window) or opened developer tools

### Network requests

The extension only opens namu.wiki pages. To verify a target article or pick a random target, it may load a namu.wiki page in a hidden frame. These requests are the same as visiting namu.wiki normally, and namu.wiki's own privacy policy applies to them.
Otherwise, it sends requests only to the short link server (namutagi.com) when you create a short link with Share. It uses no advertising, no analytics, and no remote code.

### Information sent to the server when you create a challenge link

When you press **공유하기** (Share), the following information is sent to a server operated by the developer to create a short challenge link (`https://namutagi.com/…`).

- Nickname, start article, target article, the names of the namu.wiki articles visited with the time you reached each, steps, total time, enabled rules, puzzle type (custom, random, daily), and the extension version
- Anonymous ID: a random value created for each browser. The server stores only a one-way SHA-256 hash of it. No account information such as your name or email is collected.

This information is used to open the challenge from the short link and to show a preview in messengers. Anyone who has the link can see the nickname, record, and path in that challenge.
The server runs on Cloudflare, Inc. services (Workers, D1), and the information may be stored in Cloudflare facilities outside Korea, such as in the United States.
It is kept while the service is operated, and is deleted if you send the short link address to the contact email below.
If the server cannot be reached, nothing is sent, and a namu.wiki link that carries the challenge in the address is copied instead.

### Sharing

When you press **공유하기** (Share), a challenge link containing your nickname, record, path, and rules is copied to your clipboard (the short link above, or a namu.wiki address carrying the challenge if the server cannot be reached).
The link reaches other people only if you paste and send it yourself.

### Third parties

User information is never sold or transferred to third parties, and is not used for any purpose other than the game. Operation of the short link server (storage and transmission) is entrusted to Cloudflare, Inc.

### Deletion

- Press **기록 지우기** (Clear records) on the **기록** (Records) screen of the popup to delete game records.
- Removing the extension deletes all information stored in the browser.
- Challenges stored on the short link server are deleted if you send the short link address to the contact email.

### Contact

l4n14ke4.dev@gmail.com

Namutagi is an unofficial game and is not affiliated with namu.wiki or umanle S.R.L.
