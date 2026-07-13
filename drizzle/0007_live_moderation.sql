CREATE TABLE IF NOT EXISTS live_moderators (
  live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (live_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_bans (
  live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (live_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_bans_live_idx ON live_bans(live_id, created_at DESC);
