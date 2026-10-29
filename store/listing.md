# 크롬 웹스토어 등록 내용 (나무타기 v0.1.0)

대시보드 왼쪽 메뉴 순서대로 적었습니다. 코드 블록 안의 글을 그대로 복사해 붙여 넣으면 됩니다.

---

## 1. 패키지

- 업로드할 파일: `dist/namu-tagi-v0.1.0.zip` (GitHub 릴리스 v0.1.0의 첨부 파일과 같음)

---

## 2. 스토어 등록정보 (Store listing)

### 제품 세부정보

**이름, 요약** (manifest에서 자동으로 채워짐, 따로 입력하지 않음)

```text
나무타기: 나무위키 파도타기 게임
```

```text
시작 문서에서 목표 문서까지 본문 링크만 눌러 가는 나무위키 게임입니다. 오늘의 문제, 무작위 문제, 친구와의 대결을 즐겨 보세요. 나무위키와 관계없는 비공식 확장입니다.
```

**설명** (Description)

```text
나무위키 문서 사이를 링크만 눌러 건너가는 파도타기 게임입니다.
시작 문서에서 목표 문서까지 본문 링크만 눌러서 찾아가 보세요.
더 적은 단계, 더 짧은 시간으로 도착할수록 좋은 기록입니다.

문제 고르기
- 오늘의 문제: 하루에 하나, 모두에게 같은 문제가 나옵니다.
- 직접 출제: 시작 문서와 목표 문서를 직접 정합니다. 비워 두면 무작위로 정해 줍니다.
- 무작위: 쉬움, 보통, 어려움, 랜덤 중에서 난이도만 고르면 됩니다.

게임 중
- 카운트다운이 끝나면 시간이 흐르기 시작합니다.
- 화면 위 진행 막대에서 목표, 단계, 시간을 확인할 수 있습니다.
- 목표 문서 미리보기와 지나온 경로를 볼 수 있습니다.
- 검색창, 랜덤 버튼, 편집 링크처럼 게임을 건너뛰는 길은 막혀 있습니다.

규칙 옵션
뒤로가기 금지, 틀 상자 링크 금지, 분류 링크 금지, 각주 링크 금지, 허브 문서 금지, 재방문 금지, 제한 시간, 최대 단계를 골라 더 어렵게 즐길 수 있습니다.

친구와 대결
도착하면 내 기록과 경로가 담긴 도전장 링크를 복사해 친구에게 보낼 수 있습니다.
친구는 같은 문제, 같은 규칙으로 도전하고, 이기면 상대의 경로를 볼 수 있습니다.

기록
도착률, 평균 단계와 시간, 연속 도착, 난이도별 최고 기록과 최근 판을 팝업에서 확인할 수 있습니다.

개인정보
서버와 계정이 없습니다.
기록은 내 브라우저에만 저장되고 어디에도 보내지 않습니다.
나무위키(namu.wiki)에서만 동작합니다.

시작하기 전에
설치하기 전에 열어 둔 나무위키 탭은 새로고침해 주세요.

나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임입니다.
```

**카테고리** (Category): `게임` (Games, 라이프스타일 묶음)

**언어** (Language): `한국어`

### 그래픽 저장소 (Graphic assets)

| 칸 | 파일 | 필수 |
| --- | --- | --- |
| 스토어 아이콘 128x128 | `extension/icons/icon-128.png` | 필수 |
| 스크린샷 1280x800 (최대 5장, 이 순서대로) | `store/screenshot-1-play.png` 게임 중 진행 막대와 목표 미리보기<br>`store/screenshot-2-path.png` 지나온 경로 목록<br>`store/screenshot-3-result.png` 도착 카드<br>`store/screenshot-4-challenge.png` 도전장 승리와 폭죽<br>`store/screenshot-5-popup.png` 팝업(오늘의 문제, 직접 출제와 규칙, 기록) | 1장 이상 필수 |
| 작은 프로모션 타일 440x280 | `store/promo-small-440x280.png` | 선택 |
| 마키 프로모션 타일 1400x560 | 없음 (추천 노출용, 비워 둠) | 선택 |
| 프로모션 동영상 (YouTube) | 없음 | 선택 |

### 추가 입력란 (Additional fields)

| 칸 | 값 |
| --- | --- |
| 공식 URL (Official URL) | 없음 (인증한 사이트가 없으면 고를 수 없음) |
| 홈페이지 URL (Homepage URL) | 비움. 저장소를 공개하면 `https://github.com/L4N14KE4/namu-tagi` |
| 지원 URL (Support URL) | 비움. 저장소를 공개하면 `https://github.com/L4N14KE4/namu-tagi/issues` |
| 성인용 콘텐츠 (Mature content) | 끔 |

---

## 3. 개인정보 보호 관행 (Privacy practices)

한국어와 영어를 함께 적었습니다. 심사자가 외국인일 수 있으니 칸에는 **영어를 먼저, 그 밑에 한국어**를 붙여 넣는 것을 추천합니다(한 칸에 둘 다 넣어도 글자 수 1,000자 안).

### 단일 목적 (Single purpose)

```text
Namutagi is a wiki race game for namu.wiki. Players start on one namu.wiki article and try to reach a target article by clicking only links in the article body, competing on the number of steps and the time taken.

나무타기는 나무위키(namu.wiki)에서 즐기는 위키 레이스 게임입니다. 시작 문서에서 목표 문서까지 본문 링크만 눌러 도달하며, 단계 수와 걸린 시간으로 겨룹니다.
```

### 권한 사용 이유 (Permission justification)

**activeTab**

```text
When the user opens the popup, the extension reads the address of the current tab only to check whether it is a namu.wiki page. If it is, the popup fills in the current article name and suggests article names while typing. If not, these features are turned off. No other tab information is read.

사용자가 팝업을 열었을 때 지금 탭이 나무위키 페이지인지 확인하려고 그 탭의 주소만 읽습니다. 나무위키 탭이면 지금 보는 문서 이름을 채우고 문서 이름을 추천하며, 아니면 이 기능을 끕니다. 그 밖의 탭 정보는 읽지 않습니다.
```

**contextMenus**

```text
Adds "Start from this article" and "Set this article as the target" to the right-click menu on namu.wiki article pages and links. Choosing one fills that article name into the popup's custom game form and opens the popup. The menu appears only on namu.wiki, and no page content is read beyond the article address that was right-clicked.

나무위키 문서와 링크의 우클릭 메뉴에 "이 문서에서 시작", "이 문서를 목표로"를 더합니다. 고르면 그 문서 이름을 팝업의 직접 출제 칸에 넣고 팝업을 엽니다. 메뉴는 나무위키에서만 보이며, 우클릭한 문서 주소 말고는 페이지 내용을 읽지 않습니다.
```

**storage**

```text
Stores game records, the player's nickname, rule settings, recently used target articles, and short previews of target articles in chrome.storage.local, only on the user's device. The start and target articles being entered in the custom game form are kept in chrome.storage.session until the game starts or Chrome is closed. A random anonymous ID is kept in chrome.storage.sync and sent (hashed on the server) only with a challenge when the user shares.

게임 기록, 닉네임, 규칙 설정, 최근에 나온 목표 문서, 목표 문서의 짧은 미리보기를 chrome.storage.local에 저장합니다. 직접 출제 칸에 입력 중인 시작 문서와 목표 문서는 게임을 시작하거나 크롬을 끌 때까지 chrome.storage.session에 둡니다. 무작위 익명 ID는 chrome.storage.sync에 두고, 사용자가 공유할 때만 도전장과 함께 보냅니다(서버는 해시만 저장).
```

**호스트 권한 (Host permission: https://namu.wiki/\*)**

```text
Namutagi is a game that runs inside namu.wiki pages. The content script must load on every namu.wiki page (at document_start) to check each clicked link against the game rules, block shortcuts such as the search box, show the in-page progress bar and result card, and detect page changes. It also has to start automatically in tabs opened from the popup and from challenge links shared by friends, so activeTab alone is not enough. Access is limited to https://namu.wiki/*. Page data is not collected; the only data sent anywhere is the challenge sent to the developer's short link server when the user presses Share.

게임이 나무위키 페이지 안에서 돌아가서, 모든 나무위키 페이지에 스크립트가 붙어야 링크 판정, 지름길 막기, 진행 막대와 결과 카드 표시, 문서 이동 감지를 할 수 있습니다. 팝업이 연 탭과 친구가 보낸 도전장 링크에서도 바로 시작돼야 해서 activeTab만으로는 부족합니다. 접근은 https://namu.wiki/* 한 곳으로 제한합니다. 페이지 정보는 수집하지 않으며, 밖으로 보내는 것은 사용자가 공유하기를 누를 때 개발자의 짧은 링크 서버로 보내는 도전장뿐입니다.
```

### 원격 코드 (Remote code)

- 선택: **아니요, 원격 코드를 사용하지 않습니다** (No, I am not using remote code)
- 폭죽 라이브러리(canvas-confetti)를 포함한 모든 스크립트는 패키지 안에 들어 있습니다.

### 데이터 사용 (Data usage)

웹스토어 안내(User Data FAQ)에 따르면 **기기 안에서만 처리하거나 저장하는 정보도 밝혀야 합니다.** 그래서 실제로 다루는 네 가지에 체크합니다. 공유할 때 보내는 도전장(닉네임, 익명 ID, 경로, 시간)은 개발자 서버(Cloudflare)로 가고 팔거나 넘기지 않습니다.

| 항목 | 체크 | 이유 |
| --- | --- | --- |
| 개인 식별 정보 (Personally identifiable information) | **체크** | 공유할 때 닉네임과 익명 ID(무작위 값의 해시)를 짧은 링크 서버로 보냄. 실명, 이메일은 받지 않음 |
| 건강 정보 (Health information) | 안 함 | |
| 금융 및 결제 정보 (Financial and payment information) | 안 함 | |
| 인증 정보 (Authentication information) | 안 함 | |
| 개인 커뮤니케이션 (Personal communications) | 안 함 | |
| 위치 (Location) | 안 함 | |
| 웹 기록 (Web history) | **체크** | 게임 중 지나간 나무위키 문서 이름과 시간을 기록으로 저장. 공유할 때 그 판의 경로와 시간을 짧은 링크 서버로 보냄 |
| 사용자 활동 (User activity) | **체크** | 클릭, 키 입력, 마우스 움직임 여부로 링크 판정과 자리 비움 확인(저장하지 않음) |
| 웹사이트 콘텐츠 (Website content) | **체크** | 페이지의 링크와 목표 문서의 소개 글, 그림 주소를 읽음 |

**인증 (세 칸 모두 체크)**

- 승인된 사용 사례 외에 사용자 데이터를 제3자에게 판매하거나 전송하지 않습니다. (I do not sell or transfer user data to third parties, outside of the approved use cases)
- 항목의 단일 목적과 관련 없는 목적으로 사용자 데이터를 사용하거나 전송하지 않습니다. (I do not use or transfer user data for purposes that are unrelated to my item's single purpose)
- 신용도를 판단하거나 대출 목적으로 사용자 데이터를 사용하거나 전송하지 않습니다. (I do not use or transfer user data to determine creditworthiness or for lending purposes)

### 개인정보처리방침 URL (Privacy policy)

- 내용은 저장소 맨 위 `PRIVACY.md`(한국어, 영어)에 썼습니다.
- 저장소가 비공개라 지금은 링크가 열리지 않습니다. 공개된 주소가 필요합니다.
  - 저장소를 공개하면: `https://github.com/L4N14KE4/namu-tagi/blob/main/PRIVACY.md`
  - 비공개로 두면: `PRIVACY.md`를 공개 Gist로 올리고 그 주소를 넣습니다.

---

## 4. 배포 (Distribution)

| 칸 | 값 |
| --- | --- |
| 결제 (Payments) | 무료 (Free of charge) |
| 공개 상태 (Visibility) | 공개 (Public) |
| 배포 지역 (Distribution) | 모든 지역 (All regions) |

---

## 5. 테스트 안내 (Test instructions, 심사자용)

로그인이나 유료 기능이 없어서 비워 둬도 되지만, 심사를 빠르게 하려면 아래를 넣습니다.

```text
No account or login is needed.
1. Install the extension, then open https://namu.wiki/w/사과 (or reload it if it was already open).
2. Click the toolbar icon. In the "직접 출제" (Custom) tab, enter 사과 as the start article and 사과나무 as the target article, then click "게임 시작" (Start).
3. A new tab opens and a countdown appears. After "시작!", click the link "사과나무" in the first line of the article body.
4. The "도착!" (Arrived) card appears with the steps and time. Records can be seen with the "기록" button in the popup.
The "오늘의 문제" (Daily) tab starts today's puzzle, and the "무작위" (Random) tab picks random articles.
```
