# 크롬 웹스토어 등록 내용 (나무타기 v0.3.0)

대시보드 왼쪽 메뉴 순서대로 적었습니다. 칸마다 **English**와 **한국어**를 같이 적었고, 내용은 같습니다.

- 스토어 등록정보의 설명은 등록 언어가 한국어라서 **한국어**를 붙여 넣습니다. English는 확인용 번역입니다.
- 심사자가 읽는 칸(단일 목적, 권한 사용 이유, 원격 코드, 테스트 안내)은 **English**를 붙여 넣습니다. 한국어는 확인용입니다.
- 코드 블록 안의 글을 그대로 복사해 붙여 넣으면 됩니다.

---

## 1. 패키지 (Package)

- 업로드할 파일: `dist/namu-tagi-v0.3.0.zip` (GitHub 릴리스 v0.3.0의 첨부 파일과 같음). 0.1.0은 2026-11-03에 올렸다. 새 버전은 같은 항목의 패키지 화면에서 새 zip을 올린다(버전이 더 높아야 받아 준다).
- 반드시 이미 만든 초안 항목(ID `fiadjnefijhjdngbdcaoahcdhkbnckfi`)에 올린다. 새 항목을 만들면 ID가 바뀌어 `content.js`의 `STORE_URL`, README, 랜딩, 도전장 설치 안내, `server/public/site.js`의 확장 ID 목록이 모두 틀어진다.

---

## 2. 스토어 등록정보 (Store listing)

### 이름, 요약 (Title, Summary)

manifest에서 자동으로 채워지고 대시보드에서는 고칠 수 없습니다. 확장에 `_locales`가 없어서 한국어 하나만 나갑니다.

**이름 (Title)**

```text
나무타기: 나무위키 위키레이싱 게임
```

English (확인용): Namutagi: NamuWiki Wiki Racing Game

**요약 (Summary)**

```text
시작 문서에서 목표 문서까지 본문 링크만 눌러 가는 나무위키 위키레이싱 게임입니다. 오늘의 문제, 무작위 문제, 친구와의 대결을 즐겨 보세요. 나무위키와 관계없는 비공식 확장입니다.
```

English (확인용): A NamuWiki wiki racing game where you go from a start article to a target article by clicking only links in the article body. Enjoy the daily puzzle, random puzzles, and challenges with friends. An unofficial extension not affiliated with NamuWiki.

### 설명 (Description)

**한국어 (붙여 넣기)**

```text
나무위키 문서 사이를 링크만 눌러 건너가는 위키레이싱 게임입니다.
시작 문서에서 목표 문서까지 본문 링크만 눌러서 찾아가 보세요.
더 적은 단계, 더 짧은 시간으로 도착할수록 좋은 기록입니다.

문제 고르기
- 오늘의 문제: 하루에 하나, 모두에게 같은 문제가 나옵니다.
- 직접 출제: 시작 문서와 목표 문서를 직접 정합니다. 비워 두면 무작위로 정해 줍니다.
- 무작위: 쉬움, 보통, 어려움, 랜덤 중에서 난이도를 고르고, 원하면 목표 분야(사람, 장소, 음식 등 48개, 여러 개 선택 가능)도 고릅니다. 시작은 나무위키 랜덤 문서입니다.

게임 중
- 카운트다운이 끝나면 시간이 흐르기 시작합니다.
- 화면 위 진행 막대에서 목표, 단계, 시간을 확인할 수 있습니다.
- 목표 문서 미리보기와 지나온 경로를 볼 수 있습니다.
- 검색창, 랜덤 버튼, 편집 링크처럼 게임을 건너뛰는 길은 막혀 있습니다.
- 게임 중에 다른 탭이나 창으로 떠나면 한 번은 경고하고, 다시 떠나거나 30초 넘게 떠나 있으면 진 판이 됩니다. 개발자 도구를 열어도 진 판이 됩니다.

규칙
기본, 하드, 익스트림 중에서 골라 더 어렵게 즐길 수 있습니다.
- 하드: 뒤로가기, 틀 상자 링크, 허브 문서를 쓸 수 없습니다.
- 익스트림: 하드에 더해 분류, 각주 링크도 쓸 수 없고, 지나간 문서로 다시 갈 수 없습니다.
- 추가 옵션으로 제한 시간과 최대 단계를 걸 수 있습니다.

친구와 대결
도착하면 내 기록과 경로가 담긴 도전장 링크를 복사해 친구에게 보낼 수 있습니다.
친구는 같은 문제, 같은 규칙으로 도전하고, 이기면 상대의 경로를 볼 수 있습니다.

기록
도착률, 평균 단계와 시간, 연속 도착, 난이도별 최고 기록과 최근 판을 팝업에서 확인할 수 있습니다.
지난 판도 기록 화면에서 도전장으로 공유할 수 있습니다.

개인정보
계정이 없습니다.
기록은 내 브라우저에 저장되고, 공유하기를 누를 때만 그 판의 정보를 짧은 링크 서버로 보냅니다.
나무위키(namu.wiki)에서만 동작합니다.

시작하기 전에
설치하기 전에 열어 둔 나무위키 탭은 새로고침해 주세요.

나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임입니다.
```

**English (확인용)**

```text
Namutagi is a wiki racing game where you move between NamuWiki articles by clicking links.
Start from one article and find your way to the target article by clicking only links in the article body.
The fewer steps and the shorter the time, the better your record.

Choose a puzzle
- Daily puzzle: one puzzle a day, the same for everyone.
- Custom: choose the start and target articles yourself. Leave them blank to get random ones.
- Random: pick a difficulty (easy, normal, hard, or random) and, if you like, target fields (48 fields such as people, places, and food; multiple allowed). The start is a random namu.wiki article.

During a game
- The clock starts when the countdown ends.
- The progress bar at the top shows the target, steps, and time.
- You can preview the target article and see the path you have taken.
- Shortcuts that skip the game, such as the search box, random button, and edit links, are blocked.
- If you leave for another tab or window during a game, you get one warning. Leaving again, or staying away for more than 30 seconds, ends the game as a loss. Opening developer tools also ends the game as a loss.

Rules
Make it harder by choosing basic, hard, or extreme.
- Hard: no going back, no links in template boxes, and no hub articles.
- Extreme: everything in hard, plus no category or footnote links and no revisiting articles.
- Optionally add a time limit or a maximum number of steps.

Challenge a friend
When you arrive, you can copy a challenge link with your record and path and send it to a friend.
Your friend plays the same puzzle with the same rules, and can see your path if they win.

Records
See your arrival rate, average steps and time, arrival streak, best records by difficulty, and recent games in the popup.
You can also share past games as challenges from the records screen.

Privacy
No account is needed.
Records are stored in your browser. Only when you press Share is that game's information sent to the short link server.
Works only on NamuWiki (namu.wiki).

Before you start
Please reload any NamuWiki tabs that were open before you installed the extension.

Namutagi is an unofficial game and is not affiliated with NamuWiki or umanle S.R.L.
```

### 카테고리, 언어 (Category, Language)

| 칸 | 값 |
| --- | --- |
| 카테고리 (Category) | `게임` (Games, 라이프스타일 묶음) |
| 언어 (Language) | `한국어` (Korean) |

### 그래픽 저장소 (Graphic assets)

| 칸 | 파일 | 필수 |
| --- | --- | --- |
| 스토어 아이콘 (Store icon) 128x128 | `extension/icons/icon-128.png` | 필수 (Required) |
| 스크린샷 (Screenshots) 1280x800, 최대 5장, 이 순서대로 | `store/images/screenshot-1.png` 개요 (Overview)<br>`screenshot-2.png` 문제 고르기 (Choose a puzzle)<br>`screenshot-3.png` 게임 방법 (How to play)<br>`screenshot-4.png` 규칙 (Rules)<br>`screenshot-5.png` 친구와 겨루기 (Challenge a friend)<br>원본은 Figma https://www.figma.com/design/tk9gM0HeeGVHzVgyRFOfqj (고치면 다시 내보내고 투명 채널을 뺀다) | 1장 이상 필수 (At least one) |
| 작은 프로모션 타일 (Small promo tile) 440x280 | `store/images/promo-440x280.png` (원본은 같은 Figma 파일의 "작은 프로모션 타일 440x280", 부제는 텍스트 스타일 "프로모션/부제") | 선택 (Optional) |
| 마키 프로모션 타일 (Marquee promo tile) 1400x560 | `store/images/marquee-1400x560.png` (원본은 같은 Figma 파일의 "마키 프로모션 타일 1400x560", 슬라이드 1을 복제해 다시 배치. 웹스토어가 추천 자리에 쓸 때 보인다) | 선택 (Optional) |
| 프로모션 동영상 (YouTube video) | 없음 | 선택 (Optional) |

### 추가 입력란 (Additional fields)

| 칸 | 값 |
| --- | --- |
| 공식 URL (Official URL) | 없음 (Search Console에서 인증한 사이트만 고를 수 있음) |
| 홈페이지 URL (Homepage URL) | `https://namutagi.com` |
| 지원 URL (Support URL) | 비움 (문의는 개인정보처리방침의 메일). 저장소를 공개하면 `https://github.com/L4N14KE4/namu-tagi/issues` |
| 성인용 콘텐츠 (Mature content) | 끔 (Off) |

---

## 3. 개인정보 보호 관행 (Privacy practices)

칸마다 1,000자 안입니다. English만 붙여 넣습니다.

### 단일 목적 (Single purpose)

**English (붙여 넣기)**

```text
Namutagi is a wiki race game for namu.wiki. Players start on one namu.wiki article and try to reach a target article by clicking only links in the article body, competing on the number of steps and the time taken.
```

**한국어 (확인용)**

```text
나무타기는 나무위키(namu.wiki)에서 즐기는 위키 레이스 게임입니다. 시작 문서에서 목표 문서까지 본문 링크만 눌러 도달하며, 단계 수와 걸린 시간으로 겨룹니다.
```

### 권한 사용 이유 (Permission justification)

**activeTab**

English (붙여 넣기)

```text
When the user opens the popup, the extension reads the address of the current tab only to check whether it is a namu.wiki page. If it is, the popup fills in the current article name and suggests article names while typing. If not, these features are turned off. No other tab information is read.
```

한국어 (확인용)

```text
사용자가 팝업을 열었을 때 지금 탭이 나무위키 페이지인지 확인하려고 그 탭의 주소만 읽습니다. 나무위키 탭이면 지금 보는 문서 이름을 채우고 문서 이름을 추천하며, 아니면 이 기능을 끕니다. 그 밖의 탭 정보는 읽지 않습니다.
```

**contextMenus**

English (붙여 넣기)

```text
Adds "Start from this article" and "Set this article as the target" to the right-click menu on namu.wiki article pages, and the same two items for a namu.wiki article link under the cursor. Choosing one fills that article name into the popup's custom game form and opens the popup. The menu appears only on namu.wiki, and no page content is read beyond the article address that was right-clicked.
```

한국어 (확인용)

```text
나무위키 문서의 우클릭 메뉴에 "이 문서에서 시작", "이 문서를 목표로"를 더하고, 나무위키 문서 링크 위에서는 같은 두 메뉴를 그 링크 문서로 더합니다. 고르면 그 문서 이름을 팝업의 직접 출제 칸에 넣고 팝업을 엽니다. 메뉴는 나무위키에서만 보이며, 우클릭한 문서 주소 말고는 페이지 내용을 읽지 않습니다.
```

**storage**

English (붙여 넣기)

```text
Stores game records, the player's nickname, rule settings, the chosen target fields, which game is currently running (so that starting a new game ends the previous one), recently used target articles, and short previews of target articles in chrome.storage.local, only on the user's device. The start and target articles being entered in the custom game form are kept in chrome.storage.session until the game starts or Chrome is closed. A random anonymous ID is kept in chrome.storage.sync and sent (hashed on the server) only with a challenge when the user shares.
```

한국어 (확인용)

```text
게임 기록, 닉네임, 규칙 설정, 고른 목표 분야, 지금 진행 중인 게임(새 게임을 시작하면 이전 게임을 끝내기 위해), 최근에 나온 목표 문서, 목표 문서의 짧은 미리보기를 chrome.storage.local에 저장하며, 사용자의 기기 안에만 있습니다. 직접 출제 칸에 입력 중인 시작 문서와 목표 문서는 게임을 시작하거나 크롬을 끌 때까지 chrome.storage.session에 둡니다. 무작위 익명 ID는 chrome.storage.sync에 두고, 사용자가 공유할 때만 도전장과 함께 보냅니다(서버는 해시만 저장).
```

**호스트 권한 (Host permission: https://namu.wiki/\*)**

English (붙여 넣기)

```text
Namutagi is a game that runs inside namu.wiki pages. The content script must load on every namu.wiki page (at document_start) to check each clicked link against the game rules, block shortcuts such as the search box, show the in-page progress bar and result card, and detect page changes. It also has to start automatically in tabs opened from the popup and from challenge links shared by friends, so activeTab alone is not enough. Access is limited to https://namu.wiki/*. Page data is not collected; the only data sent anywhere is the challenge sent to the developer's short link server when the user presses Share. Separately, the extension's own website (https://namutagi.com, listed in externally_connectable) can only ask whether the extension is installed, mark the welcome page as read, and, when the user clicks its start button, move that tab to namu.wiki and open the popup.
```

한국어 (확인용)

```text
게임이 나무위키 페이지 안에서 돌아가서, 모든 나무위키 페이지에 스크립트가 붙어야(document_start) 링크 판정, 검색창 같은 지름길 막기, 진행 막대와 결과 카드 표시, 문서 이동 감지를 할 수 있습니다. 팝업이 연 탭과 친구가 보낸 도전장 링크에서도 바로 시작돼야 해서 activeTab만으로는 부족합니다. 접근은 https://namu.wiki/* 한 곳으로 제한합니다. 페이지 정보는 수집하지 않으며, 밖으로 보내는 것은 사용자가 공유하기를 누를 때 개발자의 짧은 링크 서버로 보내는 도전장뿐입니다. 이와 별도로 확장의 웹사이트(https://namutagi.com, externally_connectable)는 확장이 설치돼 있는지 묻고, 환영 페이지를 읽었다고 알리고, 사용자가 시작 버튼을 누르면 그 탭을 나무위키로 옮기고 팝업을 여는 것만 할 수 있습니다.
```

### 원격 코드 (Remote code)

- 선택 (Select): **아니요, 원격 코드를 사용하지 않습니다** (No, I am not using remote code)
- 이유 칸은 나오지 않습니다. 폭죽 라이브러리(canvas-confetti)를 포함한 모든 스크립트는 패키지 안에 들어 있습니다. (No reason field appears. All scripts, including the confetti library canvas-confetti, are bundled in the package.)

### 데이터 사용 (Data usage)

웹스토어 안내(User Data FAQ)에 따르면 **기기 안에서만 처리하거나 저장하는 정보도 밝혀야 합니다.** 그래서 실제로 다루는 네 가지에 체크합니다. 공유할 때 보내는 도전장(닉네임, 익명 ID, 경로, 시간)은 개발자 서버(Cloudflare)로 가고 팔거나 넘기지 않습니다.
(The Chrome Web Store User Data FAQ says data processed or stored only on the device must also be disclosed, so the four types actually handled are checked. The challenge sent on Share goes to the developer's server on Cloudflare and is never sold or transferred.)

| 항목 (Type) | 체크 | 이유 | Reason |
| --- | --- | --- | --- |
| 개인 식별 정보 (Personally identifiable information) | **체크** | 공유할 때 닉네임, 기록, 익명 ID(무작위 값의 해시)를 짧은 링크 서버로 보냄. 실명, 이메일은 받지 않음 | On Share, the nickname, the record, and the anonymous ID (hash of a random value) are sent to the short link server. No real name or email |
| 건강 정보 (Health information) | 안 함 | | |
| 금융 및 결제 정보 (Financial and payment information) | 안 함 | | |
| 인증 정보 (Authentication information) | 안 함 | | |
| 개인 커뮤니케이션 (Personal communications) | 안 함 | | |
| 위치 (Location) | 안 함 | | |
| 웹 기록 (Web history) | **체크** | 게임 중 지나간 나무위키 문서 이름과 시간을 기록으로 저장. 공유할 때 그 판의 경로와 시간을 짧은 링크 서버로 보냄 | Names of namu.wiki articles visited during a game and their times are stored as records. On Share, that game's path and times are sent to the short link server |
| 사용자 활동 (User activity) | **체크** | 클릭, 키 입력, 마우스 움직임 여부로 링크 판정과 자리 비움 확인(저장하지 않음) | Clicks, key presses, and whether the mouse moved are used to judge links and detect inactivity (not stored) |
| 웹사이트 콘텐츠 (Website content) | **체크** | 페이지의 링크와 목표 문서의 소개 글, 그림 주소를 읽음 | Reads links on the page and the target article's summary and image address |

**인증 (Certifications, 세 칸 모두 체크)**

- I do not sell or transfer user data to third parties, outside of the approved use cases
  (승인된 사용 사례 외에 사용자 데이터를 제3자에게 판매하거나 전송하지 않습니다.)
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
  (항목의 단일 목적과 관련 없는 목적으로 사용자 데이터를 사용하거나 전송하지 않습니다.)
- I do not use or transfer user data to determine creditworthiness or for lending purposes
  (신용도를 판단하거나 대출 목적으로 사용자 데이터를 사용하거나 전송하지 않습니다.)

### 개인정보처리방침 URL (Privacy policy)

```text
https://namutagi.com/privacy
```

한국어와 영어가 같이 있습니다(브라우저 언어가 한국어가 아니면 영어). 원문은 저장소 맨 위 `PRIVACY.md`이고 `server/public/privacy.html`과 같아야 합니다.
(Korean and English are both on the page; English is shown when the browser language is not Korean.)

---

## 4. 배포 (Distribution)

| 칸 | 값 |
| --- | --- |
| 결제 (Payments) | 무료 (Free of charge) |
| 공개 상태 (Visibility) | 공개 (Public) |
| 배포 지역 (Distribution) | 모든 지역 (All regions) |

---

## 5. 테스트 안내 (Test instructions, 심사자용)

로그인이 없어서 사용자 이름과 비밀번호 칸은 비웁니다. 추가 안내 칸에 English를 붙여 넣습니다(약 1,400자. 글자 수 제한에 걸리면 Notes 아래를 뺍니다).

**English (붙여 넣기)**

```text
No account or login is needed. The game screens are in Korean.
1. Install the extension. A welcome page (https://namutagi.com/welcome) opens in a new tab. Its "첫 판 시작하기" (Start your first game) button moves that tab to namu.wiki and opens the extension popup. You can also open https://namu.wiki/w/사과 yourself (reload it if it was open before installing) and click the toolbar icon.
2. In the popup's "직접 출제" (Custom) tab, enter 사과 as the start article and 사과나무 as the target article, then click "게임 시작" (Start game).
3. A new tab opens and a countdown appears. After "시작!" (Start!), click the link "사과나무" in the first line of the article body.
4. The "도착!" (Arrived) card appears with the steps and time. Records are under the "기록" (Records) button in the popup.
The "오늘의 문제" (Daily) tab starts today's puzzle, and the "무작위" (Random) tab picks random articles.

Notes
- Anti-cheat: during a game, switching to another tab or window shows a warning the first time and ends the game as a loss the second time. Opening developer tools also ends the game. Starting a new game ends any game running in another tab.
- The devtools page (devtools_page) only tells the game, while developer tools are open on namu.wiki, that they are open. It does nothing on other sites.
- The only server is the developer's short link server (namutagi.com), used when "공유하기" (Share) is pressed.
```

**한국어 (확인용)**

```text
계정이나 로그인이 필요 없습니다. 게임 화면은 한국어입니다.
1. 확장을 설치하면 환영 페이지(https://namutagi.com/welcome)가 새 탭으로 열립니다. "첫 판 시작하기" 버튼을 누르면 그 탭이 나무위키로 이동하고 확장 팝업이 열립니다. https://namu.wiki/w/사과 를 직접 열고(설치 전에 열려 있었다면 새로고침) 툴바 아이콘을 눌러도 됩니다.
2. 팝업의 "직접 출제" 탭에서 시작 문서에 사과, 목표 문서에 사과나무를 입력하고 "게임 시작"을 누릅니다.
3. 새 탭이 열리고 카운트다운이 나옵니다. "시작!" 뒤에 본문 첫 줄의 "사과나무" 링크를 누릅니다.
4. 단계와 시간이 적힌 "도착!" 카드가 나옵니다. 기록은 팝업의 "기록" 버튼에 있습니다.
"오늘의 문제" 탭은 오늘의 문제를, "무작위" 탭은 무작위 문서를 고릅니다.

참고
- 부정행위 방지: 게임 중 다른 탭이나 창으로 옮기면 처음에는 경고하고, 두 번째에는 진 판이 됩니다. 개발자 도구를 열어도 게임이 끝납니다. 새 게임을 시작하면 다른 탭에서 진행 중인 게임이 끝납니다.
- 개발자 도구 페이지(devtools_page)는 나무위키에서 개발자 도구가 열려 있는 동안 열려 있다는 것만 게임에 알립니다. 다른 사이트에서는 아무것도 하지 않습니다.
- 서버는 개발자의 짧은 링크 서버(namutagi.com) 하나뿐이고, "공유하기"를 누를 때만 씁니다.
```
