CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (recipe_id, tag)
);

CREATE INDEX IF NOT EXISTS recipe_tags_tag_idx ON recipe_tags(tag, created_at DESC);
