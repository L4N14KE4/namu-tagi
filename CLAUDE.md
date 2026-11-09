# 나무타기 (구 링크런)

나무위키에서 시작 문서부터 목표 문서까지 **본문 링크만** 눌러 도달하는 위키 레이스 크롬 확장(MV3, 비공식). 계정 없음, 기록은 브라우저에만 저장. 서버는 도전장 짧은 링크와 환영 페이지용 하나뿐(`server/`, Cloudflare Workers + D1, 도메인 namutagi.com, 2026-10-29 사용자가 도메인 구입. 나중에 리더보드의 바탕). 코드는 전부 `extension/`에 있다. 사용자용 설명은 저장소 맨 위 `README.md`, 기능의 자세한 동작과 이력은 `docs/DEVELOPMENT.md`(개발 노트, 로컬 전용: `.gitignore`로 저장소에서 뺐다. 2026-10-29 사용자 결정)에 있다(이 파일은 거기 없는 작업 맥락 위주). 웹스토어 이름은 "나무타기: 나무위키 위키레이싱 게임"(사용자 결정. 2026-11-02에 "파도타기"를 모든 곳에서 "위키레이싱"으로 바꿨다).

현재 버전: manifest 0.2.0 (2026-11-03). 0.1.0은 2026-11-03에 웹스토어에 올렸고, 0.2.0(규칙 모드, 기록 화면 공유, 도착 카드)은 사용자 선택(0.1.1이 아니라 기능이 늘어 0.2.0). 이제 바꿀 때마다 올리고(고침은 0.2.x), 환영 페이지의 "최근 버전"(`server/public/welcome.html`)도 같이 고쳐 배포한다. 아래 이력의 0.33.x, 0.34.x는 출시 전 개발 번호다. 이름은 링크런에서 나무타기로 바꿨다(사용자 결정).

git 저장소: GitHub `L4N14KE4/namu-tagi`(비공개, 2026-10-29에 namu-game에서 이름을 바꿈. 로컬 폴더는 메모리 경로 때문에 `dev/namu-game` 그대로), 브랜치 main. 2026-10-28에 0.33.4 상태로 첫 커밋했다. 참고용 다른 확장(zip과 풀어 둔 폴더)과 `scripts/*-cache.json`(조회 캐시)은 `.gitignore`로 뺐다.

## 새 대화에서 먼저 할 것

1. 이 파일과 `docs/DEVELOPMENT.md`를 읽는다.
2. 메모리(`~/.claude/projects/-Users-laniakea-dev-namu-game/memory/`)의 `namu-game-prototype-status.md`에 버전별 변경 이력과 결정 이유가 더 자세히 있다.
3. 사용자 요청이 애매하면 "질문이면 답만, 요청이면 구현"으로 가른다(아래 작업 방식).
4. 아래 "남은 일"을 확인한다.

## 남은 일 (2026-11-03 대화를 마치며)

main은 2026-11-03에 푸시(v0.2.0 릴리스 커밋). 서버는 namutagi.com에 배포돼 동작 중(버전 f55dc782, 2026-11-03 사용자가 직접: v0.2.0 페이지까지).

- **v0.2.0 릴리스(2026-11-03)**: 태그 `v0.2.0`과 GitHub 릴리스(설명은 바뀐 점, zip은 `git archive --format=zip -o dist/namu-tagi-v0.2.0.zip HEAD:extension`). 같은 날 웹스토어에 올리기 전이라 기록 화면 모드 탭과 점검 뒤 고침까지 넣어 다시 맞췄다(zip 다시 올리고 받아서 같음 확인, 설명에 기록 화면 탭 줄 더함, 태그는 사용자가 `git tag -f v0.2.0 HEAD && git push -f origin v0.2.0`). v0.1.0 릴리스와 태그는 그대로 둔다(웹스토어에 올린 판). 웹스토어에 올린 뒤에는 새 태그와 새 릴리스로(강제 푸시 없이).
- **서버 배포됨(v0.2.0, 2026-11-03, 버전 f55dc782)**: 도전장 페이지 난이도 줄과 규칙 줄, 캐시 키 `?page7`, 환영 페이지 v0.2.0과 규칙 모드 문구, 랜딩 사진 `?v=4`와 기록 공유 줄, 개인정보처리방침 시행일 2026-11-03. 실제 서버에서 세 페이지 확인, `node e2e/release-test.mjs extension` 32/32(시험 도전장은 원격 D1에서 스스로 지움).
- **사용자가 할 일(v0.2.0)**: 웹스토어 패키지 화면에 `dist/namu-tagi-v0.2.0.zip` 올리기, 스토어 등록정보의 설명(규칙, 기록 줄)과 스크린샷 2~5 바꾸기(`store/listing.md`, `store/images/`). 서버를 먼저 배포해서 웹스토어 심사 중에도 환영 페이지가 v0.2.0으로 보인다.
- **사용자 확인 대기**: 미리보기 카드는 글자는 뜨는 것을 사용자가 확인했고, 그림(og:image)을 넣었다. 새 도전장 링크로 카카오톡, 디스코드에 그림이 뜨는지.
- **요청 제한**: `POST /c`는 Worker ratelimit 바인딩(IP당 60초 10번, 느슨함)으로 걸었다. 정확히 막으려면 Cloudflare 대시보드 규칙(무료는 10초 기간)을 더한다.
- **서버 보안 수정 배포됨(2026-10-30, 버전 8ea81d1d, 사용자가 직접 배포)**: 실제 서버에서 Origin 없음·다른 출처 403, `..\`·`../`·방향 문자 문서 400, 운영자·폭 없는 공백 이름 400, 봇 카드 200(og:image), 브라우저 302, og.png 200 확인. `npx wrangler deploy`는 Claude Code 자동 승인이 [Production Deploy]로 막으니 다음에도 사용자가 돌리거나 허용 규칙을 넣는다.
- **서비스 멈추기 대비**: 2026-10-30 Cloudflare 대시보드 Security rules에 요청 제한 규칙 "짧은 링크 폭주 막기"(IP당 10초 10번, Block 10초, 무료라 규칙 1개가 꽉 참)를 걸었다(사용자 허락 뒤 Claude in Chrome으로). 2026-11-02에 식을 `not cf.bot_management.verified_bot and not http.request.uri.path in {실제 글꼴 2개, shots 사진 12개}`로 고쳤다. 2026-11-03에 `/site.css`, `/site.js`, `/wordmark.svg`, `/og.png`도 더했다(도전장 한 번 보기가 5번으로 세어져 공유하고 두 번 열면 1015가 떴다. 이제 페이지 한 번 보기가 1번. 정적 파일은 Worker 한도를 안 쓴다). 폴더(`starts_with`)로 빼면 없는 파일 주소가 Worker 한도를 쓰면서 제한을 피하므로 파일 이름을 하나씩 적었다. 사진 이름이 바뀌면 이 목록도 고친다(안 고쳐도 세어질 뿐 안전하다). 대시보드에서 식을 칠 때는 입력칸 포커스를 먼저 확인한다: 포커스가 없으면 글자가 대시보드 단축키로 들어가 테마가 바뀌고 클립보드가 덮인 적이 있다. 확인: 없는 id GET을 연달아 보내면 13번째쯤부터 429, 12초 뒤 풀림. Worker 하루 무료 한도(10만, UTC 0시 초기화)는 IP 여러 개로 나눠 오면 여전히 바닥날 수 있다. 확실히는 Workers 유료, 급할 때 Under Attack Mode(켜는 동안 메신저 미리보기와 공유 POST가 안 됨).
- **닉네임 변형**: 금지 낱말 목록이라 "운영쟈" 같은 변형은 못 막는다. 문제 도전장은 D1에서 지운다.
- **웹스토어 그림**: `store/images/screenshot-1~5.png`, `promo-440x280.png`, `marquee-1400x560.png`(2026-11-03, 슬라이드 1을 복제해 글자는 새로 만들지 않고 다시 배치. Figma https://www.figma.com/design/tk9gM0HeeGVHzVgyRFOfqj 에서 내보내 투명 채널을 뺌). Figma 쪽 MCP에는 Pretendard가 없어 글자를 고치려면 텍스트 스타일을 잠깐 Noto Sans KR로 바꿔야 한다(사용자에게 알리고 되돌리게). 내보낸 그림은 Pretendard로 그려진다.
- **웹스토어 대시보드(사용자)**: `store/listing.md`대로 contextMenus 권한 이유, 데이터 사용(개인 식별 정보 체크로 바뀜), storage 설명을 옮긴다. 개인정보처리방침 주소는 `https://namutagi.com/privacy`(`server/public/privacy.html`).
- **웹 환영 페이지, 도전장 설치 안내, Pretendard 배포됨(2026-11-02, 버전 96ea14f3, 사용자가 직접 배포)**: 실제 서버와 새 프로필로 `node e2e/release-test.mjs` 21/21, 짧은 링크 3번 연속 확장이 있으면 바로 나무위키 수락 창까지 확인. 첫 번째 시험 한 번은 짧은 링크를 못 받아 긴 링크로 대신했다(D1에 줄이 없음, 원인 모름, 다시 안 나옴). 웹스토어 공개 전이라 설치하러 갔다 돌아오는 길은 시험 못 했다. 웹 환영 페이지의 "최근 버전"은 직접 적어서 출시 뒤 버전을 올릴 때 `server/public/welcome.html`도 고쳐 배포한다.
- **기록 화면 공유(2026-11-03)**: 서버가 확장 출처도 받는다(버전 6a97be43). 실제 크롬에서 기록 화면의 공유하기가 짧은 링크를 받는 것은 사용자가 확인했다.
- **규칙 모드와 도착 카드(2026-11-03)**: 결과 카드, 게임 안 도전장 수락 창, 서버 도전장 페이지 모두 난이도 줄과 규칙 줄(모드 칩, 추가 옵션)로 나눈다(수락 창과 도전장 페이지는 모드 설명 한 줄 더). 도착 카드는 문제 줄, 40px 시간, 비교 한 줄(`state.cmp`), 단계별 시간 막대(목록 시간과 진하기로 이음), 폭죽 판 숫자 올라가기. 사진은 `CROPS=<폴더> node e2e/shots.mjs server/public/shots`로 다시 찍었고(결과, 승리 화면은 카드가 길어 1120x700), Figma 슬라이드 2~5의 사진도 바꿨다. 슬라이드 4 설명 글("뒤로가기 금지, 제한 시간, 허브 문서 금지까지 규칙을 골라 난도를 높여요")은 아직 맞는 말이라 그대로 두었다(글을 고치려면 아래 Pretendard 주의).
- **나중에**: 리더보드(서버 D1의 challenges와 익명 ID `pid` 바탕), 구글 로그인(선택 기능, 익명 ID 기록을 계정에 연결). 사용자와 논의만 했다.
- **주의**: `node e2e/release-test.mjs`는 공유하기 시험으로 "시험 a|b&c+d" 도전장을 만들고 끝날 때 스스로 지운다(실제 서버는 원격 D1, `SHORT_BASE=http://localhost:…`면 로컬 D1. 지운 id를 "정리:" 줄로 알려 준다. 도전장 페이지는 가장자리 캐시에 1시간 남는다). 이 맥은 새 도메인의 DNS "없음" 답을 캐시해 터미널 curl이 한동안 `--resolve namutagi.com:443:172.67.158.67`이 필요했다(크롬은 괜찮음).

## 사용자와 일하는 방식

- 항상 한국어. 짧게, 결론부터. 코드는 설명에 길게 넣지 않는다.
- "바꾸지 말고 알려줘", "어때?", "뭔소리야?" 같은 질문은 구현하지 말고 답만 한다. "해줘"는 구현한다.
- 방식이 여러 갈래면 AskUserQuestion으로 선택지(미리보기 포함)를 주고 사용자가 고르게 한다. 큰 화면 변경은 데모를 먼저 보여 달라고 한 적이 있다(카운트다운은 `demo/countdown.html`로 보여 주고 승인받은 뒤 적용).
- 코드를 바꾸면 개발 노트(`docs/DEVELOPMENT.md`)와 메모리를 같이 고친다. 출시(2026-11-03) 뒤에는 새 기능도 README에 적고 GitHub 릴리스마다 바뀐 점을 적는다(출시 전에는 README에 신기능 문구를 넣지 않고 0.1.0 릴리스 설명도 그대로 두었다). 사용자에게 보이는 동작이 바뀌면 `README.md`(사용자용. 사용자의 다른 저장소 L4N14KE4/cosmate의 README 형식: 로고 그림, 비공식 안내 상자, 기능별 굵은 묶음과 명사형 목록, 설치, 개발, 개인정보, 면책사항, 라이선스. 문장은 친근한 합쇼체, 가운뎃점과 이모지는 쓰지 않음. 스크린샷은 `server/public/shots/`(webp, 밝은/어두운 둘을 `<picture>`로, 랜딩과 환영 페이지와 같은 폴더): `node e2e/shots.mjs <폴더>`로 다시 찍는다(Chrome for Testing 새 프로필, 브라우저 1.25배 확대처럼, 결과와 승리 화면은 카드가 길어 1120x700, 김치 → 아폴로 11호 규칙 없음, 규칙 사진은 하드와 3분, 예시 기록. `CROPS=<폴더>`를 주면 Figma용 팝업과 카드 PNG도 남긴다. 다시 찍으면 index.html, welcome.html의 `?v=`를 올린다). Claude in Chrome은 화면을 1920x968로 고정하고 1556x784로 줄여 찍으며 창 크기 바꾸기가 안 먹으므로, 글자를 키우려면 `document.documentElement.style.zoom = 1.5`로 페이지를 확대해 찍는다(전체 로드마다 다시 적용). 라이선스는 MIT(`LICENSE`, cosmate와 같은 문구))도 고친다. `extension/` 안에는 md를 두지 않는다(웹스토어 zip에 같이 들어간다). `extension/manifest.json`의 version은 바꿀 때마다 올린다(환영 페이지의 "최근 버전"과 release-test가 이 값을 본다). 크롬에 올라간 판은 README·메모리의 변경 이력과 파일 수정 시각으로 구분한다.
- 사용자가 싫어하는 것: 경쟁작과 닮은 "신기록" 배지, 가운뎃점(·) 구분 표기, 둥근 팝업 껍데기, AI 같은 꾸밈(배지, 컬러 카드, 원 번호, 강한 장식), 어색한 줄바꿈, 붉은 경고색 시간 표시(만들었다가 뺐다).
- 사용자가 좋아하는 것: 나무위키 기본 모양(제목·소제목 밑줄, 링크색 번호, 점 목록, 테두리 표), 설명 문구는 본문색으로 크게, 세로 간격 12px 통일, 난이도별 버튼 색, 폭죽.
- UI 문구는 한 문장에 한 줄(`\n` 또는 `<br>`), 한글은 `word-break: keep-all`.
- 색: 나무위키 초록 #00a69c, 다크 링크색 #ec9f19, 위험색 #d64a58, 라이트 링크색 #0275d8.

## 테스트 방법

- **실제 크롬에서 한다.** 확장은 사용자의 Default 프로필에 압축해제로 설치돼 있다(경로 `extension/`, ID `bljboledcipggdpgboobagbhobhlgijb`). Claude in Chrome 도구(`mcp__claude-in-chrome__*`)로 나무위키 탭을 열어 확인한다.
- Claude in Chrome에는 다른 컴퓨터의 크롬(Windows "Browser 2" 등)도 연결돼 있어서, 크롬을 다시 켠 뒤 그쪽에 붙을 수 있다. 해시를 붙여 열었는데 해시가 그대로 남고 `ng-host`가 없으면 `list_connected_browsers`로 macOS(onThisComputer) 쪽을 `select_browser`한다.
- 코드를 바꾸면 **AskUserQuestion으로 사용자에게 확장 새로고침을 요청**한다. Claude in Chrome은 chrome:// 와 chrome-extension:// 페이지를 못 열고 툴바 아이콘도 못 누른다.
- 게임 시작은 주소에 해시를 붙여서 한다. 예: `https://namu.wiki/w/사과#ng-goal=사과나무&mode=custom&nb=1&tl=300` (파라미터 목록은 `content.js` 상단 주석). 도전장 수락 창을 보려면 `&by=이름&s=3&t=7000&p=사과&p=사과나무&pt=0,1400`을 더한다.
- 확장은 격리된 세계에서 돈다. 페이지에서 `chrome.storage`는 못 읽는다. 대신 `sessionStorage`의 `ng_state`와 열린 Shadow DOM(`document.getElementById('ng-host').shadowRoot`)을 읽는다. 링크는 `a.click()`으로 누르면 클릭 가로채기가 그대로 동작한다.
- 게임이 시작된 뒤(카운트다운 약 4초 후 `status === 'playing'`)에 눌러야 한다. 폭죽은 `.fx` 캔버스의 픽셀로 확인한다.
- **환영 페이지의 설치 시 자동 열기(`onInstalled`)는 재설치해야 시험된다.** 확장을 지웠다 다시 올리면 `chrome.storage`의 기록이 모두 사라지므로 사용자의 Default 프로필에서는 하지 않는다. `node e2e/release-test.mjs`가 새 프로필에서 확인한다(`SHORT_BASE`를 주면 확장 사본이라 ID가 달라 도전장 페이지가 확장을 못 찾고 설치 안내가 뜬다. 바로 넘어가는 길은 배포 뒤 저장소의 extension/으로 시험). 화면은 `.claude/launch.json`의 server(wrangler dev, 8787)로 `/welcome`을 연다(로컬 전용 파일, 커밋 안 함). 확장 새로고침은 reason이 `update`라 안 열린다.
- **팝업은 localhost 시험 페이지로 확인한다.** `python3 e2e/popup-harness/build.py <빈 폴더>`로 만들고 그 폴더에서 `python3 -m http.server 8765`를 띄운 뒤 `http://localhost:8765/popup-test.html?theme=dark` 를 연다(`dead=1`은 탭 연결 끊김 화면, `start=`·`goal=`은 남은 직접 출제 입력). `window.__store`(local)와 `window.__session`(session)으로 저장소를 고쳐 기록 화면 등을 시험한다. 내장 브라우저에서 `resize_window`로 좁게 흉내 내면 좌표 클릭이 어긋나니 흉내 없이 ref로 누른다. 우클릭 메뉴는 도구로 못 여니 사용자에게 확인을 부탁한다.
- **크롬 테스트는 사용자의 실제 기록(chrome.storage의 records)에 판을 남긴다.** 끝까지 한 판은 기록이 되므로 오늘의 문제는 `day=99`처럼 실제 날짜와 안 겹치는 값을 쓰고, 남긴 기록이 있으면 사용자에게 알린다. 0.32.0부터 판을 시작하는 순간 "끝내지 않음" 기록이 남으므로 `sessionStorage.clear()`로도 기록을 막을 수 없다(카운트다운이 끝나기 전에 비우면 안 남는다).
- 끝나면 테스트 탭은 닫고 `sessionStorage`를 비운다.
- Claude in Chrome은 활성 탭을 바꾸지 못해 `document.hidden`이 안 바뀐다. 떠남(leave) 경로는 example.com으로 갔다가 `history.back()`으로 시험한다. 진짜 포커스 잃기(메뉴의 찾기 창)와 개발자 도구 열기는 도구로 못 하니 사용자에게 확인을 부탁한다. 숨김 모양은 `data-ng-blur`/`data-blur` 속성을 직접 붙여 본다.

## 파일 지도 (`extension/`)

| 파일 | 역할 |
| --- | --- |
| `manifest.json` | 권한은 activeTab, contextMenus, storage 뿐. `externally_connectable`은 namutagi.com만. 콘텐츠 스크립트: words.js, hubs.js, vendor/confetti.min.js, share.js, content.js, content.css. `devtools_page`: devtools.html |
| `background.js` | 서비스 워커. `onInstalled`에서 reason이 `install`일 때만 `https://namutagi.com/welcome`을 새 탭으로 연다. `onMessageExternal`로 namutagi.com의 `ping`에 답하고 `introSeen`을 저장하고, `startOnNamu`(환영 페이지의 첫 판 시작하기, 랜딩의 나무위키에서 시작하기)면 그 탭을 나무위키 대문으로 보내고 다 열리면 팝업을 연다. 이렇게 연 팝업은 activeTab을 못 받아 탭 주소를 못 읽으므로 `startTab`(session)으로 그 탭을 알려 주고 popup.js가 읽고 지운다. 확장이 없거나 옛 버전이면 페이지가 직접 나무위키로 간다. 우클릭 메뉴(이 문서에서 시작/이 문서를 목표로, 링크 위에서는 링크 문서로)를 만들고, 누르면 `chrome.storage.session`의 `draft`에 넣고 `action.openPopup()` |
| `fonts/` | Pretendard Regular, Bold subset(글자 3728개, 한글 2780자, 한자와 가나 없음, 각 약 270KB). 라이선스는 `vendor/LICENSE-pretendard.txt`(OFL). 500 이하는 Regular, 600 이상은 Bold로 나온다. 팝업은 `Pretendard`, 진행 막대와 결과 카드는 `content.css`에서 `NamutagiPretendard`로 등록한다(`Pretendard`로 등록하면 나무위키 본문도 바뀐다). `web_accessible_resources`로 나무위키에만 연다 |
| `devtools.html`, `devtools.js` | 개발자 도구가 열려 있는 동안 나무위키를 볼 때만 1초마다 `inspectedWindow.eval('window.ngDevtools?.()', {useContentScriptContext})`로 게임 탭에 알린다(게임 중이면 진 판). 다른 사이트에서는 처음 주소를 한 번 묻는 것 말고 돌지 않고, 이동은 `network.onNavigated`로 안다. Chrome for Testing에 `--auto-open-devtools-for-tabs`를 주면 시험할 수 있다 |
| `content.js` | 게임 전부(약 1070줄). 판정, 이동 확정, 진행 막대(HUD, Shadow DOM), 카운트다운, 결과 카드, 기록 저장, 팝업 연결(자동완성·목표 확인) |
| `share.js` | 도전장 공유(`LR_SHARE`): 닉네임 검사 `nameProblem`, 규칙 글 `ruleItems`, `dayLabel`, 짧은 형식 `challengeLink`, 짧은 링크 서버 `shortLink`, 공유 글, 자동 닉네임, 공유 칸(`form`). 결과 카드와 팝업 기록 화면이 같이 쓴다. 콘텐츠 스크립트와 `popup.html` 둘 다 읽는다 |
| `content.css` | 게임 중 탭(`html[data-ng]`)의 우회로 숨김 |
| `popup.html`, `popup.js` | 팝업: 오늘의 문제/직접 출제/무작위 탭, 규칙(모드 셋과 접힌 추가 옵션. 모드 색은 초록 #00a69c → 진한 청록 #00756e → 더 진한 청록 #004d47, 규칙 칸은 setMode가 그 탭의 시작 버튼 위로 옮김), 기록(모드 탭 기본, 하드, 익스트림과 옛 조합이 있으면 기타. 같은 모드에서 추가 옵션 조합이 둘 이상이면 고르는 칸, 무작위 최고 기록도 최근 판과 같은 줄 모양이고 시작과 목표를 따로 줄인다(`whatOf`), 도착한 판마다 공유하기), 설명(?). 직접 출제 입력은 시작 전까지 `draft`(session)에 남고(있으면 직접 출제 탭으로 열림), 직접 출제로 시작하면 비운다. 초기화 버튼, 다시 누르면 전체 선택. 머리글 제목은 `wordmark.svg`(흰색 가로 로고) |
| `icons/`, `wordmark.svg` | 0.34.0에서 넣은 확장 아이콘 PNG 4종(`design/logo-icon.psd`를 줄임)과 팝업 제목 로고(`design/wordmark-white.svg` 복사본, `server/public/`에도 있다). 로고를 고치면 `design/`에서 다시 만들어 세 곳에 복사 |
| `intro.js` | 팝업의 설명 글과 모양. 전체(`html`, ? 버튼)와 처음 여는 팝업의 짧은 설명(`short`, 확인이 스크롤 없이 보임) 둘. 나무위키 안 설명 창(모달)은 0.1.0 직전에 없앴다 |
| `fields.json` | 무작위 모드 분야 목록(48개 분야, 9개 묶음, 분야마다 쉬움/보통/어려움 목표 문서 e·n·h(시작은 나무위키 랜덤이라 시작 전용 문서는 안 담음), 쉬움이 얇으면 t). `scripts/build-fields-json.mjs`가 `scripts/data/fields-merged.json`으로 만든다(여러 분야에 든 문서는 분류가 가장 많이 걸린 분야에만, 틀린 소속은 `scripts/data/fields-wrong.json`으로 뺀다). 팝업과 게임의 새 문제만 읽는다(share.js `fieldsData`, `draw`, `fieldOf`). 분야 이름은 판 상태 `fd`(뽑힌 분야), `fds`(고른 분야), 해시 `fd` `fds`, 도전장 `f`, 서버 `fd` 칸으로 간다 |
| `words.js`, `hubs.js` | 자동 생성 목록(무작위 7169개이고 그중 보통 1174개가 오늘의 문제 풀, 허브 446개). `node scripts/add-field-words.mjs`가 분야 조사 문서를 더했다(2026-11-09, 나무위키 요청 없음, build-words 뒤에 다시 돌린다). 직접 고치지 않는다 |
| `vendor/` | canvas-confetti 1.9.4(ISC). 웹스토어는 원격 코드 금지라 파일로 담았다. `LICENSE-lucide.txt`는 아이콘 라이선스(Lucide ISC + Feather MIT): 진행 막대 ⓘ·경로 아이콘은 Lucide SVG를 인라인으로 넣었다(환영 페이지 줄 아이콘은 0.34.1에서 뺐다. 아이콘을 새로 쓰면 직접 그리지 말고 Lucide에서 가져온다) |
| `../scripts/` | `build-words.mjs`, `build-hubs.mjs`, `suggest-candidates.mjs`(위키백과 조회수로 후보 제안), `suggest-candidates-wikidata.mjs`(Wikidata 링크된 언어판 수로 후보 제안; 둘 다 풀은 안 건드림)와 후보 목록, 보고서, 조회 캐시는 `scripts/data/`(캐시는 git에서 뺌). 나무위키를 요청 사이 1초씩 쉬며 조사한다 |
| `../server/` | 짧은 링크 서버(확장 zip에 안 들어감). `src/index.js` 하나(의존 없음): `POST /c`(Origin이 `https://namu.wiki`이거나 확장 ID 두 개(웹스토어, 개발용. `public/site.js`의 EXT와 같음)의 `chrome-extension://`일 때만. 결과 카드는 나무위키 출처, 팝업 기록 화면은 확장 출처로 보낸다. CORS는 그 출처를 돌려준다, 도전장 검사 뒤 D1에 저장, 6자 id 반환. 닉네임은 `nameProblem`: 보이지 않는 글자와 운영자, 공식, 나무위키 같은 낱말 금지, `share.js`와 같은 목록. 카드 설명의 문서 이름은 30자에서 자름), `GET /:id`(도전장 페이지 하나, 나무위키 문서 모양. OG 태그는 미리보기 봇용. 스크립트가 확장에 `ping`을 물어 있으면 바로 `#ng=` 짧은 형식 나무위키 링크로, 없으면 설치 안내, 폰과 크롬 계열이 아닌 브라우저(`userAgentData.mobile`이 false가 아님)는 PC 안내와 링크 복사. 설치하러 갔다 돌아오면 다시 불러 확인. 문서 이름은 30자에서 자른다. 없는 도전장과 없는 주소는 모두 "없는 페이지예요" 404(버튼은 홈으로 가기). 모든 페이지의 위 막대 로고는 `/`(랜딩)로 간다. Cloudflare 가장자리에 1시간 캐시, 캐시 키 `?page7`는 모양을 바꾸면 올린다. 규칙은 게임 안처럼 난이도 줄(무작위)과 규칙 줄(모드 칩, 추가 옵션, 모드 설명)로 나눈다(서버에 `MODES`, `modeOf` 사본). 대시보드 요청 제한(IP당 10초 10번)이 전체에 걸리므로 CSS와 스크립트를 안에 담아 첫 방문 요청을 5번으로 줄였다(2026-11-03부터 공통 파일 4개는 제한에서 빠져 문서만 센다). 글자 조각 글꼴을 쓰지 않는 이유도 같다), `public/`(assets, Worker보다 먼저 나감): `index.html`(`/`, 랜딩 페이지. README와 일부러 다르게 짧은 해요체. 그림은 `shots/`: 게임 화면 960x600 2배, 밝은, 어두운 둘, 기록 화면은 예시 기록. 확장이 있으면 버튼이 "나무위키에서 시작하기"로 바뀌고 누르면 환영 페이지와 같이 나무위키로 가서 팝업을 엶), `site.css`와 `site.js`(모든 페이지 공통 모양과 스크립트: 확장 ID 목록과 `ask`, 소제목 접기, 각주 말풍선, 환영 페이지 버튼, 랜딩 버튼, 개인정보 언어. 도전장 페이지도 쓴다. 페이지마다 다른 것만 각 페이지의 `<style>`에), `welcome.html`(`/welcome`, 설치 환영 페이지. 나무위키 문서 모양: 사과 문서에서 잰 본문 15px, 제목 36px 등, 위 막대 56px, 1024px 미만 48px, 로고 img 27.5px, 720px 이하 24.4px는 나무위키에서 잰 값이고 랜딩 페이지도 같게. 최근 버전은 직접 적음, 내용은 기능 소개가 아니라 첫 판 시작 방법, 게임 규칙, 도전장으로 온 사람 안내, 랜딩 링크. 두 버튼(첫 판 시작하기, 닫기)이 확장에 `introSeen`을 알림, 탭 X로 닫으면 팝업의 짧은 첫 설명이 대신 뜸), `privacy.html`(`/privacy`, 제목 "나무타기/개인정보처리방침", 브라우저 언어가 한국어가 아니면 영어, `?lang=`으로 바꿈, 모양은 환영 페이지와 같고 내용은 저장소의 `PRIVACY.md`와 같아야 한다: 고치면 둘 다, 시행일도), `og-card.png`(미리보기 카드 그림 1200×630: 위 막대 색에 흰 `design/wordmark-white.svg`를 헤드리스 크롬으로 찍음), `og.png`(탭 아이콘), `wordmark.svg`, `fonts/`, `_headers`, `.assetsignore`(Mac의 `.DS_Store`가 공개로 올라간 적이 있어 뺐다). `POST /c`는 ratelimit 바인딩 `LIMIT`(IP당, IPv6는 앞 64비트, 60초 10번, 넘으면 429). `schema.sql`(challenges 표, player는 익명 ID의 SHA-256), `wrangler.toml`. 2026-10-29 배포: Cloudflare 계정 l4n14ke4.dev@gmail.com, D1 `namutagi`(APAC, id 6f84cf26-…), Worker `namutagi`가 namutagi.com custom domain(도메인도 Cloudflare Registrar). 다시 배포는 `cd server && npx wrangler deploy`. `node e2e/release-test.mjs`가 만드는 시험 도전장(이름 "시험 a|b&c+d")은 끝날 때 스스로 지운다(손으로는 `npx wrangler d1 execute namutagi --remote --command "DELETE FROM challenges WHERE by = '시험 a|b&c+d'"`). 로컬 시험: `npx wrangler d1 execute namutagi --local --file=schema.sql && npx wrangler dev --local` 후 `SHORT_BASE=http://localhost:8787 node e2e/release-test.mjs`. 보관 기한 없음(요청 시 삭제) |
| `../e2e/` | 의존 없음(Node 22+ 내장 WebSocket으로 CDP). `release-test.mjs`(릴리스 zip이나 extension 폴더를 Chrome for Testing 새 프로필에 올려 38항목 확인, `node e2e/release-test.mjs <폴더>`), `shots.mjs`(사이트와 README 사진 다시 찍기), `popup-harness/`(팝업 시험 도구). Chrome for Testing은 `npx @puppeteer/browsers install chrome@stable --path e2e/browsers`(git에서 뺌)나 ~/.cache/puppeteer |
| `../demo/` | 폭죽, 카운트다운, 아이콘 라이브러리 비교(`icons.html`), 로고 후보(`logo.html`: 나무위키 로고를 재서 다시 그린 변형 8가지) 데모(확장 아님) |
| `../design/` | 고른 로고(2번 목표 깃발)의 PSD·SVG·PNG. `logo-icon`은 초록 원 아이콘 1024px, `logo-mark`는 로고만 투명 배경, `wordmark-*`는 마크 + "나무타기" 글자(밝은/어두운 배경용 SVG·PNG, `wordmark.psd`는 글자·고리·마크 14레이어)로 제목에 쓴다. 글자 나·무는 나무위키 로고에서 가장자리를 재서 그대로 다시 그렸고(획 굵기 차이: ㄴ 28, 줄기 23.3, ㅁ 21, ㅋ 가운데 줄 18.6, 둥근 모서리 볼록 4.75·오목 4.2), 타·기는 같은 규칙으로 새로 짰다(고리 높이도 나무위키처럼 낮음·높음·중간). PSD는 부분마다 레이어(래스터). 사용자가 직접 다듬었다(`logo-mark.psd`는 깃발을 왼쪽으로 34px, `logo-icon.psd`는 오른쪽 14px·아래 6px 옮겨서 고리 지름의 약 15% 어긋나 있고 괜찮다고 봄). 2026-10-29에 `logo-icon`·`logo-mark`의 PNG는 PSD 합성 그대로, SVG는 깃발 `<polygon>`을 `translate`로 감싸 PSD와 맞췄다(헤드리스 크롬으로 그려 PSD와 비교해 차이 없음). PSD를 또 고치면 이 넷을 다시 맞추고 `extension/icons/`도 `logo-icon.png`를 줄여 다시 만든다. `wordmark.mjs`는 글자 모양·간격과 마크 위치의 원본(마크 PSD의 깃발 이동량이 안에 상수로 들어 있다. `node design/wordmark.mjs demo/logo.html <폴더>`. `wordmark-white.svg`는 팝업용 흰색 한 색). 아이콘과 팝업 제목은 0.34.0에서 확장에 넣었다 |

`content.js` 구역 순서: 공통 도구 → 팝업 연결(onConnect: suggest/probe) → 게임 상태와 해시 파싱 → 화면 정리(hideChrome) → 판정(verdict, inTemplateBox, inFoldBox, inNoticeBox, inFootnote) → 입력 가로채기 → 이동 확정(check) → 무작위 목표 → 목표 미리보기 → 폭죽 → 기록(record) → 카운트다운, ready/begin → HUD(mount/render) → 공유(openShare, 나머지는 share.js) → 도전장 수락(invite).

## 핵심 설계

- 상태는 탭의 `sessionStorage`(`ng_state`). status: starting, playing, done, invalid. 탭을 닫으면 끝이다.
- 시작은 URL 해시: `ng-goal`(목표), `mode`(custom|random|daily), `diff`, `rs`(무작위 시작), `day`, 규칙 `nb nt nc nf nh nr`(=1), `tl`(초), `ms`(단계), 도전장 `by s t p(여러 개) pt`. 해시는 읽은 뒤 지운다. 같은 문서에서 링크를 붙여 넣으면 `hashchange`로 새로고침해 시작한다.
- 목표 확인(정식 이름, 동음이의어 고르기)은 **팝업**이 나무위키 탭의 숨은 iframe으로 하고, 확인을 마친 목표만 `ng-goal`로 넘어온다. 나무위키가 아닌 탭에서는 직접 입력한 목표로 시작하지 않는다.
- 판정은 클릭 때 `verdict(a)`로 한다: 본문 렌더러 속성이 있는 `/w/` 링크만, 빨간 링크·이름공간(`BANNED_NS`) 금지, 분류는 허용(시작·목표로는 금지). 이동 확정은 `check()`가 canonical 링크 변화로 한다.
- 규칙은 게임 안에서 8가지(뒤로가기 금지, 틀 상자 링크 금지, 분류 링크 금지, 각주 링크 금지, 허브 문서 금지, 같은 문서 재방문 금지, 제한 시간(초), 최대 단계)이고 해시와 저장 모양도 그대로다. 팝업은 2026-11-03부터 모드 셋(기본, 하드: 뒤로가기·틀 상자·허브 금지, 익스트림: 금지 6개 전부. `share.js`의 `MODES`, `modeOf`)과 추가 옵션(제한 시간 없음/1/3/5/10분, 최대 단계 없음/3/5/7/10)만 고른다(사용자 결정, 진입장벽 피드백). 모드에 안 맞는 조합(옛 기록, 도전장)은 규칙을 하나씩 적는다. 규칙 조합 키(`ruleKey`)가 같은 판끼리만 기록 경신을 비교한다.
- 게임은 하나만 돈다(2026-11-02 사용자 결정): 판을 시작하는 탭이 `activeGame`을 적으면 다른 탭의 진행 중, 카운트다운 중인 판이 "다른 탭에서 새 게임을 시작했어요"로 끝난다. 이동 전이면 기록을 지우고 이동 뒤면 진 판. 수락을 기다리는 도전장은 그대로 두고, 도전하기를 누르면 그때 다른 판을 끝낸다.
- 카운트다운(준비됐나요? 3, 2, 1, 시작!)은 처음 시작, 다시하기, 도전장 수락 뒤에만 한다(새로고침 이어가기에는 없음). 시간은 "시작!"이 뜨는 순간부터 재고, 그 순간 어두운 배경은 바로 걷힌다(글자만 잠깐 남음). 그 전에 `watchChrome`(MutationObserver)이 사이드바·검색창을 이미 숨겨 둔다.
- 도전장 승패는 시간 우선(같을 때만 단계). 결과 카드는 "N초 빨라요! 이겼어요" 밑에 단계 차이를 괄호로 덧붙이고, 두 경로 열 제목 밑에 각자 "N단계, 시간"을 보여 준다(0.33.4). 이기면 제목이 "승리!"(1대1이라 "우승"은 안 씀), 단계 줄은 헤드라인 바로 밑에 괄호 없이 흐리게(0.33.5). 진행 막대의 상대 기록(vs)은 한 줄 글이 아니라 알약 안에 이름, 단계, 시간(굵게)을 간격으로 나눠 놓고 막대 간격(14px)만으로 시간과 띄우고 시간 글자는 칸 가운데 정렬(0.33.7: 처음 넣은 margin-left 10px는 간격이 좌우 다르게 보여 뺐다).
- 폭죽(화면 아래 가운데에서 위로 한 번): 내 기록 경신, 도전장 승리, 오늘의 문제 풀이 때. 속도, 조각 수와 크기, 떠 있는 시간을 화면 높이로 계산한다(`burst`, 높이 900px에서 예전 값과 같음. 고정 속도일 때 큰 화면에서 아래쪽만 터졌다). 첫 도착이나 패배에는 없다.
- 도전장: 공유 링크에 내 이름·기록·경로·단계별 시간·규칙이 실린다. 공유하기는 짧은 링크 서버에 맡겨 `https://namutagi.com/<6자>`를 받고(3초. 이때 공유 글에 설치 안내를 안 넣는다: 링크를 열면 나온다), 실패하면(이때만 공유 글에 설치 안내) 짧은 형식 `/w/<시작>#ng=<목표>&r=&b=&p=가운데|경로&t=1/100초 36진수`(한글 그대로, share.js `challengeLink`, content.js `parseShort`, 서버에도 같은 함수)를 복사한다. 예전 `ng-goal` 링크도 열린다. 시간 비교는 1/100초(`csOf`). 받는 쪽은 수락 창에서 어디서 어디로, 상대 기록, 규칙을 보고 도전하기를 눌러야 시작한다. 도전 중에는 새 문제가 막힌다. 결과 카드의 상대 경로는 이겼을 때만 보이고, 졌으면 흐리게 가려 눌러도 안 풀리며 "이기면 볼 수 있어요"를 띄운다(상대의 단계와 시간은 항상 보임, 0.33.9. 0.33.8의 "바로 보임"은 사용자 뜻이 아니어서 고쳤다). 도전장 판의 폭죽은 이겼을 때만(내 기록 경신만으로는 안 터진다).
- 게임 중 UI: 진행 막대, 목표 설명 카드(첫 이동 뒤 자동으로 접힘, ⓘ로 다시), 한 줄 경로(폭 채우기, 누르면 전체 목록, ≡ 버튼으로 켜고 끔), 다시하기(3초 안에 한 번 더 눌러야 함, 기록하지 않음), 그만두기(진 판으로 기록), 자리 비움 창(제한 시간 없는 판에서 5분 입력 없으면 "아직 하고 계세요?" 이어하기·다시하기·닫기. 창이 뜨는 시각 = 마지막 입력 + 5분에 시계를 멈추고(`state.pausedAt`), 이어하기가 `startedAt`을 멈춘 만큼 뒤로 민다. 걸린 시간은 항상 `elapsed()`로 잰다. 닫기는 그만두기와 같다). 탭이나 페이지를 떠났다 돌아와도 시계는 멈추지 않는다(`awayAt`). 30초 넘게 떠났으면 진 판, 짧게 떠난 것은 한 번만 경고 창("떠났어요, 한 번 더 떠나면 실격", `aways`·`warn`, `MAX_AWAY`=1)이고 두 번째에 진 판(0.32.9에서 1단계로 줄였다: 3→2→1). 탭을 떠난 것(visibilitychange, pagehide)뿐 아니라 포커스가 나간 것(window blur)도 같은 `leave()`/`back()`으로 센다. 제한 시간 판도 같고 새로고침은 세지 않는다(0.32.0에서 이어하기 창을 없앴다). 포커스가 페이지 밖으로 가면 `#app`을 숨기고 떠남으로 센다(메뉴 찾기, 옆 창 조사 방지). 뒤로가기 금지 판의 뒤로가기는 실격 대신 되돌린다(popstate를 나무위키보다 먼저 받아 멈추고 `history.forward()`, 전체 로드면 begin이 앞으로 보냄). 단 주소의 문서가 지금 보는 문서와 같은 뒤로가기(목차·각주로 쌓인 해시 기록)는 통과시킨다.
- 저장소 키(`chrome.storage.sync`): pid(익명 ID, 공유할 때 짧은 링크 서버로 보냄. 나중에 로그인과 연결할 증명값이라 공개하지 않는다). (`chrome.storage.session`): draft(직접 출제 칸의 시작·목표, 크롬을 끄면 사라짐). (`chrome.storage.local`): activeGame(지금 도는 판의 run, 새 판을 시작하면 다른 탭의 판이 끝난다), introSeen, diff, rules, records(최근 200판, 단계별 시간 `times` 포함, 0.32.0부터 판마다 `id`. 시작할 때 "끝내지 않음"으로 넣고 끝나면 같은 id를 결과로 바꾼다. 다시하기·새 문제는 이동 전이면 지우고 이동 뒤면 "다시 시작함"), nick, autoNick, used, previews, hudPath.
- 오늘의 문제: 한국 시간, 2026-10-25를 1회차로 센다. 회차 번호가 시드이고 `words.js`의 보통 구간 문서 1174개(허브 목록과 무관. 쉬움 구간으로는 너무 싱겁게 풀렸다)에서 그날 문제를 계산한다(서버 없음, 별도 `daily.js`는 0.32.7에서 없앴다). 목록을 정렬해 고정 씨앗으로 섞은 순서 Q를 만들고, 목표는 Q를 바퀴(N일)마다 다시 섞은 순서대로 하루 하나씩, 시작은 Q에서 목표 위치로부터 s칸 뒤(s는 바퀴마다 1, 2, 3…). 그래서 같은 쌍도 뒤집힌 쌍도 ceil(N/2)-1바퀴 동안 안 겹친다(N=889면 약 1081년, `node scripts/check-daily.mjs`로 확인). `words.js`를 다시 만들어 보통 구간이 바뀌면(문서를 더하거나 경계를 넘나드는 문서가 있으면) 그 뒤 모든 날의 문제가 바뀐다. 사용자가 "나중에 더 넣어도 큰 상관 없다"고 했고(0.32.6), 무작위 목록과 하나로 합치자고 골랐다(0.32.7: 합집합으로 굳히는 안은 안 썼다).

## 나무위키 사정 (실측으로 알게 된 것)

- Vue SPA. 이동은 pushState. `<link rel=canonical>`이 이동 때 갱신되고 `?from=`은 떨어진다. 새 탭 첫 로드는 SSR(없는 문서는 HTTP 404), 같은 출처 이동은 1.1KB 셸 뒤 클라이언트 렌더라 fetch로는 존재 여부를 못 안다. 서버 HTML에는 본문 링크가 없다.
- 클래스명과 `data-v-*` 값은 배포마다 바뀐다. 그래서 구조로 찾는다: 기사 영역은 `<h1>`과 같은 scoped 속성을 가진 최상위 조상, 본문 렌더러 속성은 기사 영역 안 `a[title][href^="/w/"]`가 가장 많이 공유하는 scoped 속성. 사이드바 링크도 title이 있지만 기사 영역 밖이다. 사이드바는 본문보다 늦게 그려진다.
- 문서 데이터(`window.INITIAL_STATE`)와 추천 API는 암호화돼 있고 `/raw/`도 셸이다. **복호화 역공학은 하지 않기로 했다.** 틀 정보를 얻을 방법이 없어서 틀은 모양으로 짐작한다.
- 틀 판정(한계 있음): 접는 상자(`<details>`)와 그 제목 줄, 접기 버튼이나 `틀:` 링크가 든 최상위 표, 한두 줄 안내 상자("…문서를 참고하십시오" 등, `innerText`로 판단. 문서 맨 위의 다른 뜻 안내 "…에 대한 내용은 …", "여기로 연결됩니다"는 `DISAMBIG_NOTICE`로 뺀다: 일반 사용자는 이걸 틀로 안 느끼고 동음이의어로 가는 길이라서), `틀:` 문서. 목차는 `<details>`지만 `#s-N` 링크로 제외한다. 못 잡는 것: 표식 없는 목록형 상자, 접기 없는 정보 상자. 링크 밀도로 상자를 짐작하는 방법은 본문 목록까지 잡아서(중학생 문서 링크 581개 중 289개) 폐기했다.
- 각주 링크는 되돌아가기 링크(`#rfn-N`)를 직접 자식으로 가진 요소 안의 링크다. 동음이의어 문서는 `분류:동음이의어` 링크를 가진다. 외부 링크는 `/jump/`. 나무위키 단축키 A/E/D를 막아야 한다. 테마 클래스는 `theseed-dark-mode`/`theseed-light-mode`.
- Claude in Chrome의 JS 도구에서 문자열 속 정규식 백슬래시는 한 번만 쓴다(`\s`). 배치 호출(JSON) 안에서는 `\\s`.

## 알려진 한계와 보류

- 경유 문서 규칙(A를 거쳐 B로)은 사용자가 나중에 하겠다고 했다.
- 오늘의 문제 꼼수(지난 문제를 나중에 풀어도 연속 일수에 들어감, `mode=daily&day=N`만 붙이면 아무 문제나 오늘의 문제로 기록, 다시 풀기 무제한)는 사용자가 "일단 남겨둬"라고 했다(2026-10-26). 추천안은 게임 쪽이 회차로 문제를 계산해 확인, 연속 일수는 그날 푼 판만, 첫 판만 공식.
- 알려진 문제(2026-10-28 조사, 아직 안 고침): 탭 복제는 sessionStorage가 복사돼 판 id와 run을 같이 쓴다(그래서 복제한 탭끼리는 서로 안 끝난다). (좁은 창 진행 막대 깨짐과 창 나란히 놓고 조사는 0.32.9에서 고쳤다.)
- 이동 검증(이전 문서의 링크 목록에 목적지가 있었는지)은 순위 서버를 만들 때로 미뤘다. 지금은 클릭 가로채기로 이미 막는다.
- 리더보드는 짧은 링크 서버(Cloudflare Workers + D1, 익명 ID `pid`)를 바탕으로 나중에. 구글 로그인은 리더보드 때 선택 기능으로(만 14세 미만 동의 등 개인정보 부담, 2026-10-29 논의). 로그인 때 익명 ID 기록을 계정에 연결한다. 서버를 만들면 단계별 시간(`times`)과 링크 정보를 보내 이상 기록을 거를 수 있다. 티어 이름 아이디어: 새싹에서 세계수까지.
- 웹스토어 확장 ID는 `fiadjnefijhjdngbdcaoahcdhkbnckfi`(2026-10-29 초안 등록, 로컬 압축해제 ID와 다르다). `STORE_URL`(`content.js`)과 README 설치 링크가 이 ID를 쓴다. 심사를 통과해 공개되기 전에는 링크가 열리지 않는다. 개인정보처리방침 주소는 `https://namutagi.com/privacy`.
- 허브 목록과 틀 판정은 확장 버전마다 다를 수 있어, 버전이 다른 두 사용자의 "같은 규칙"은 경계가 조금 다를 수 있다.
- 자동 시험은 `e2e/release-test.mjs`(38항목)뿐이고 나머지 화면은 손으로 확인한다.

## 참고 자료 (읽기 전용)

- `jogdlkcjfodcoiicdneelonihooakkkj/`와 `.zip`: 사용자가 가져다 둔 다른 위키게임 확장. 기능 아이디어와 개선점 검토에 썼다.
- `faffobpaphhjekoohfanifpkgangjlpo.zip`: "namuwiki-rush"(서버, 구글 로그인, 1대1 레이팅, 4인 방, 리더보드, 신고). 라이선스 표기가 없으니 **코드는 복사하지 않고 아이디어만** 참고한다. 우리 장점은 최소 권한, 계정 없음, 클라이언트 단 우회 차단이다.
- 풀어 볼 때는 새 빈 폴더에 풀고 코드는 실행하지 않는다.
