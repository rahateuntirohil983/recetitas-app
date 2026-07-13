CREATE TABLE IF NOT EXISTS live_streams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stream_path TEXT NOT NULL UNIQUE,
  publish_token_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS live_comments (
  id TEXT PRIMARY KEY,
  live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS live_likes (
  live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (live_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_viewers (
  live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (live_id, viewer_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS live_streams_one_active_user_idx ON live_streams(user_id) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS live_streams_status_seen_idx ON live_streams(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS live_comments_live_idx ON live_comments(live_id, created_at);
CREATE INDEX IF NOT EXISTS live_viewers_seen_idx ON live_viewers(live_id, last_seen_at);
