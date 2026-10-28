// 설명(팝업의 ? 와 처음 설치했을 때 나무위키 안에 뜨는 안내)에 쓰는 글과 모양. 두 곳이 같은 것을 쓴다.
// 나무위키 문서처럼 보이게 했다: 제목과 소제목 밑에 가는 줄, 소제목 앞 번호는 링크색, 점 목록, 테두리 있는 표.
// 색은 쓰는 쪽이 정해 둔 변수(--text --muted --border --soft --link)를 따른다.
// 문장마다 줄을 바꾸고, 한글은 낱말 중간에서 끊지 않는다(word-break: keep-all).
var LR_INTRO = {
  css: `
    .li { line-height: 1.6; word-break: keep-all; overflow-wrap: anywhere; }
    .li h2 { margin: 0 0 8px; padding-bottom: 6px; font-size: 22px; line-height: 1.3; border-bottom: 1px solid var(--border); }
    .li h3 { margin: 18px 0 8px; padding-bottom: 4px; font-size: 17px; line-height: 1.4; border-bottom: 1px solid var(--border); }
    .li h3 .n { margin-right: 6px; color: var(--link, #0275d8); }
    .li p { margin: 0 0 6px; }
    .li ul { margin: 0; padding-left: 20px; }
    .li li { margin: 2px 0; }
    .li table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .li th, .li td { padding: 6px 10px; border: 1px solid var(--border); text-align: left; vertical-align: top; }
    .li th { width: 7.5em; background: var(--soft); }
    .li .li-note { margin: 18px 0 4px; color: var(--muted); font-size: 12px; }
  `,
  html: `
    <div class="li">
      <h2>나무타기</h2>
      <p>시작 문서에서 목표 문서까지 <b>본문 링크만 눌러서</b> 가는 나무위키 게임이에요.<br>적은 단계, 짧은 시간으로 도착할수록 잘한 거예요.</p>

      <h3><span class="n">1.</span>하는 법</h3>
      <ul>
        <li>오늘의 문제, 직접 출제, 무작위 중에서 골라요.</li>
        <li>새 탭이 열리고, 카운트다운이 끝나면 시간이 흘러요.</li>
        <li>본문 링크를 눌러 목표 문서까지 이동해요.</li>
        <li>링크 하나가 1단계예요.</li>
        <li>도착하면 공유하기로 친구에게 도전장을 보내요.</li>
      </ul>

      <h3><span class="n">2.</span>규칙 옵션</h3>
      <table>
        <tr><th>뒤로가기 금지</th><td>뒤로가기나 앞으로가기를 쓰면 게임이 끝나요.</td></tr>
        <tr><th>틀 상자 링크 금지</th><td>접는 상자(틀) 안의 링크와 틀 문서는 누를 수 없어요.</td></tr>
        <tr><th>분류 링크 금지</th><td>분류 줄과 분류 문서로는 이동할 수 없어요.</td></tr>
        <tr><th>각주 링크 금지</th><td>각주 속 링크는 누를 수 없어요.</td></tr>
        <tr><th>허브 문서 금지</th><td>대한민국, 미국처럼 어디서나 닿는 문서는 지나갈 수 없어요.</td></tr>
        <tr><th>재방문 금지</th><td>한 번 지나간 문서에는 다시 갈 수 없어요.</td></tr>
        <tr><th>제한 시간</th><td>분 단위로 정해요.<br>시간이 지나면 게임이 끝나요.</td></tr>
        <tr><th>최대 단계</th><td>정한 단계 안에 도착해야 해요.</td></tr>
      </table>

      <h3><span class="n">3.</span>게임 중에는 쓸 수 없어요</h3>
      <ul>
        <li>검색창, 랜덤 버튼, 실시간 검색어, 최근 변경</li>
        <li>편집, 토론, 역사 링크</li>
        <li>외부 링크, 없는 문서, 파일이나 사용자 같은 다른 이름공간 문서</li>
        <li>새 탭으로 열기, 찾기(Ctrl+F), 나무위키 단축키 A,&nbsp;E,&nbsp;D</li>
      </ul>

      <h3><span class="n">4.</span>단계 세는 법</h3>
      <ul>
        <li>뒤로가기와 앞으로가기도 1단계예요.</li>
        <li>목차와 각주 이동은 세지 않아요.</li>
        <li>분류 줄의 링크도 눌러서 이동할 수 있어요.</li>
        <li>새로고침은 그대로 이어져요.</li>
        <li>주소창에 직접 입력하면 게임이 끝나요.</li>
      </ul>

      <p class="li-note">나무타기는 나무위키 및 umanle S.R.L.과 관계없는 비공식 게임이에요.</p>
    </div>
  `,
};
