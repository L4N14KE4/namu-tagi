// 팝업의 설명 글과 모양. html은 전체 설명(? 버튼), short는 처음 연 팝업에서 먼저 보이는 짧은 설명이다(확인이 스크롤 없이 보이게).
// 나무위키 문서처럼 보이게 했다: 소제목 밑에 가는 줄, 소제목 앞 번호는 링크색, 점 목록, 테두리 있는 표.
// 색은 쓰는 쪽이 정해 둔 변수(--text --muted --border --soft --link)를 따른다.
// 문장마다 줄을 바꾸고, 한글은 낱말 중간에서 끊지 않는다(word-break: keep-all).
var LR_INTRO = {
  css: `
    .li { line-height: 1.6; word-break: keep-all; overflow-wrap: anywhere; }
    .li h3 { margin: 18px 0 8px; padding-bottom: 4px; font-size: 17px; line-height: 1.4; border-bottom: 1px solid var(--border); }
    .li h3 .n { margin-right: 6px; color: var(--link, #0275d8); }
    .li p { margin: 0 0 6px; }
    .li ul { margin: 0; padding-left: 20px; }
    .li li { margin: 2px 0; }
    .li table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .li th, .li td { padding: 6px 10px; border: 1px solid var(--border); text-align: left; vertical-align: top; }
    .li th { width: 5em; white-space: nowrap; background: var(--soft); }
    .li .li-note { margin: 18px 0 4px; color: var(--muted); font-size: 12px; }
  `,
  html: `
    <div class="li">
      <p>시작 문서에서 목표 문서까지 <b>본문 링크만 눌러서</b> 가는 나무위키 게임이에요.<br>적은 단계, 짧은 시간으로 도착할수록 잘한 거예요.</p>

      <h3><span class="n">1.</span>하는 법</h3>
      <ul>
        <li>오늘의 문제, 직접 출제, 무작위 중에서 골라요.</li>
        <li>무작위는 난이도와 목표 분야를 골라요.</li>
        <li>새 탭이 열리고, 카운트다운이 끝나면 시간이 흘러요.</li>
        <li>본문 링크를 눌러 목표 문서까지 이동해요.</li>
        <li>링크 하나가 1단계예요.</li>
        <li>도착하면 공유하기로 친구에게 도전장을 보내요.<br>지난 판도 기록 화면에서 보낼 수 있어요.</li>
      </ul>

      <h3><span class="n">2.</span>규칙</h3>
      <table>
        <tr><th>기본</th><td>금지하는 링크가 없어요.</td></tr>
        <tr><th>하드</th><td>뒤로가기 금지<br>틀 상자 링크 금지<br>허브 문서(대한민국 등) 금지</td></tr>
        <tr><th>익스트림</th><td>하드 규칙 전부<br>분류, 각주 링크 금지<br>지나간 문서 재방문 금지</td></tr>
        <tr><th>추가 옵션</th><td>제한 시간, 최대 단계<br>넘기면 게임이 끝나요.</td></tr>
      </table>

      <h3><span class="n">3.</span>게임 중에는 쓸 수 없어요</h3>
      <ul>
        <li>검색창, 랜덤 버튼, 실시간 검색어, 최근 변경</li>
        <li>편집, 토론, 역사 링크</li>
        <li>외부 링크, 없는 문서, 파일이나 사용자 같은 다른 이름공간 문서</li>
        <li>새 탭으로 열기, 찾기(Ctrl+F), 나무위키 단축키 A,&nbsp;E,&nbsp;D</li>
      </ul>

      <h3><span class="n">4.</span>이러면 져요</h3>
      <ul>
        <li>다른 탭이나 창으로 가면 경고가 떠요.<br>한 번 더 가면 실격이에요.</li>
        <li>30초 넘게 게임 화면을 떠나 있으면 바로 져요.</li>
        <li>개발자 도구를 열면 져요.</li>
        <li>주소창에 직접 입력해서 다른 문서로 가면 져요.</li>
      </ul>

      <h3><span class="n">5.</span>단계 세는 법</h3>
      <ul>
        <li>뒤로가기와 앞으로가기도 1단계예요.<br>하드와 익스트림에서는 뒤로가기가 막혀요.</li>
        <li>목차와 각주 이동은 세지 않아요.</li>
        <li>분류 줄의 링크도 눌러서 이동할 수 있어요.<br>익스트림에서는 막혀요.</li>
        <li>새로고침은 그대로 이어져요.</li>
      </ul>

      <p class="li-note">나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임이에요.</p>
    </div>
  `,
  short: `
    <div class="li">
      <p>시작 문서에서 목표 문서까지 <b>본문 링크만 눌러서</b> 가는 나무위키 게임이에요.<br>적은 단계, 짧은 시간으로 도착할수록 잘한 거예요.</p>
      <ul>
        <li>오늘의 문제, 직접 출제, 무작위 중에서 골라 시작해요.</li>
        <li>카운트다운이 끝나면 시간이 흘러요.</li>
        <li>게임 중에 다른 탭이나 창으로 가거나 개발자 도구를 열면 질 수 있어요.</li>
      </ul>
    </div>
  `,
};
