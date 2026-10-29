-- 도전장 짧은 링크. 리더보드에 그대로 쓸 수 있게 칸을 나눠 둔다.
-- player는 확장의 익명 ID(chrome.storage.sync의 pid)를 SHA-256 한 값이다. 원래 값은 저장하지 않는다(나중에 로그인과 연결할 때 확장이 원래 값으로 증명한다).
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,          -- 짧은 링크 6자(base62)
  created_at INTEGER NOT NULL,  -- ms
  player TEXT NOT NULL,
  start TEXT NOT NULL,
  goal TEXT NOT NULL,
  mode TEXT NOT NULL,           -- custom | random | daily
  diff TEXT,                    -- 무작위 난이도
  day INTEGER,                  -- 오늘의 문제 회차
  rules TEXT NOT NULL,          -- JSON {nb, nt, nc, nf, nh, nr, tl, ms}
  by TEXT NOT NULL,             -- 닉네임
  steps INTEGER NOT NULL,
  ms INTEGER NOT NULL,
  path TEXT NOT NULL,           -- JSON 문서 이름 배열(시작~목표)
  times TEXT NOT NULL,          -- JSON 문서마다 도착한 시각(ms)
  ver TEXT                      -- 확장 버전
);
CREATE INDEX IF NOT EXISTS challenges_problem ON challenges (goal, start);
CREATE INDEX IF NOT EXISTS challenges_daily ON challenges (mode, day);
CREATE INDEX IF NOT EXISTS challenges_player ON challenges (player);
