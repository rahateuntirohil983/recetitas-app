ALTER TABLE recipes ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'easy';
ALTER TABLE recipes ADD COLUMN language TEXT NOT NULL DEFAULT 'es';
ALTER TABLE comments ADD COLUMN image_url TEXT;

CREATE TABLE IF NOT EXISTS recipe_polls (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL UNIQUE REFERENCES recipes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES recipe_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_poll_votes (
  poll_id TEXT NOT NULL REFERENCES recipe_polls(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES recipe_poll_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS recipe_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_collection_items (
  collection_id TEXT NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY (collection_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS recipe_poll_options_poll_idx ON recipe_poll_options(poll_id, position);
CREATE INDEX IF NOT EXISTS recipe_poll_votes_option_idx ON recipe_poll_votes(option_id);
CREATE INDEX IF NOT EXISTS recipe_collections_user_idx ON recipe_collections(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS recipe_collection_items_recipe_idx ON recipe_collection_items(recipe_id);
