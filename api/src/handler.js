const IMAGE_KEYS = new Set(["pumpkin", "gnocchi", "baking"]);
const SESSION_COOKIE = "recetitas_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const RECIPE_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const RECIPE_LANGUAGES = new Set(["es", "en", "pt"]);
const LIVE_ACTIVE_WINDOW_MS = 45_000;
const LIVE_VIEWER_WINDOW_MS = 25_000;
const LIVE_RESUME_WINDOW_MS = 10 * 60_000;
const LIVE_STICKER_IDS = new Set(["hello", "heart", "delicious", "laugh", "applause", "surprised"]);
const TEAM_HANDLES = new Set(["waddles", "balng"]);
const ADMIN_SESSION_HOURS = 12;
const SUPPORT_SESSION_DAYS = 30;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    is_banned INTEGER NOT NULL DEFAULT 0,
    banned_at TEXT,
    banned_reason TEXT NOT NULL DEFAULT '',
    banned_by TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    image_key TEXT NOT NULL DEFAULT 'pumpkin',
    image_url TEXT,
    video_url TEXT,
    updated_at TEXT,
    edit_count INTEGER NOT NULL DEFAULT 0,
    difficulty TEXT NOT NULL DEFAULT 'easy',
    language TEXT NOT NULL DEFAULT 'es',
    cook_minutes INTEGER NOT NULL,
    servings INTEGER NOT NULL,
    ingredients_json TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, recipe_id)
  )`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, recipe_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (recipe_id, tag)
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_edits (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_polls (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL UNIQUE REFERENCES recipes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_poll_options (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES recipe_polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_poll_votes (
    poll_id TEXT NOT NULL REFERENCES recipe_polls(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL REFERENCES recipe_poll_options(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (poll_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_collections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_collection_items (
    collection_id TEXT NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL,
    PRIMARY KEY (collection_id, recipe_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
    recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
    comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    read_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
  )`,
  `CREATE TABLE IF NOT EXISTS live_streams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_path TEXT NOT NULL UNIQUE,
    publish_token_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
    published_at TEXT,
    started_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    ended_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS live_comments (
    id TEXT PRIMARY KEY,
    live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS live_likes (
    live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (live_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS live_viewers (
    live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    viewer_key TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    last_seen_at TEXT NOT NULL,
    PRIMARY KEY (live_id, viewer_key)
  )`,
  `CREATE TABLE IF NOT EXISTS live_moderators (
    live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (live_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS live_bans (
    live_id TEXT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (live_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS credentials (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_attempts (
    id TEXT PRIMARY KEY,
    attempt_key TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS support_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS account_access_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('appeal', 'bug', 'account', 'other')),
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_role TEXT NOT NULL CHECK (author_role IN ('user', 'team')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS recipes_created_at_idx ON recipes(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS recipes_author_id_idx ON recipes(author_id)",
  "CREATE INDEX IF NOT EXISTS comments_recipe_id_idx ON comments(recipe_id, created_at)",
  "CREATE INDEX IF NOT EXISTS recipe_tags_tag_idx ON recipe_tags(tag, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS recipe_edits_recipe_idx ON recipe_edits(recipe_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS recipe_poll_options_poll_idx ON recipe_poll_options(poll_id, position)",
  "CREATE INDEX IF NOT EXISTS recipe_poll_votes_option_idx ON recipe_poll_votes(option_id)",
  "CREATE INDEX IF NOT EXISTS recipe_collections_user_idx ON recipe_collections(user_id, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS recipe_collection_items_recipe_idx ON recipe_collection_items(recipe_id)",
  "CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read_at, created_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS live_streams_one_active_user_idx ON live_streams(user_id) WHERE status = 'live'",
  "CREATE INDEX IF NOT EXISTS live_streams_status_seen_idx ON live_streams(status, last_seen_at DESC)",
  "CREATE INDEX IF NOT EXISTS live_comments_live_idx ON live_comments(live_id, created_at)",
  "CREATE INDEX IF NOT EXISTS live_viewers_seen_idx ON live_viewers(live_id, last_seen_at)",
  "CREATE INDEX IF NOT EXISTS live_bans_live_idx ON live_bans(live_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)",
  "CREATE INDEX IF NOT EXISTS auth_attempts_key_created_idx ON auth_attempts(attempt_key, created_at)",
  "CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions(expires_at)",
  "CREATE INDEX IF NOT EXISTS support_sessions_expires_idx ON support_sessions(expires_at)",
  "CREATE INDEX IF NOT EXISTS account_access_user_idx ON account_access_logs(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS account_access_created_idx ON account_access_logs(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_logs(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets(user_id, updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages(ticket_id, created_at ASC)",
];

let schemaReady;
let recipeColumnsReady;
let liveColumnsReady;
let demoCleanupReady;
const sessionUserCache = new WeakMap();

const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  },
});

const error = (status, code, message, extra = {}) => json({
  error: { code, message, ...extra },
}, status);

const now = () => new Date().toISOString();
const createId = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;

const cleanText = (value, maxLength) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

const cleanLines = (values, maxItems, maxLength) => (Array.isArray(values) ? values : [])
  .slice(0, maxItems)
  .map((value) => cleanText(value, maxLength))
  .filter(Boolean);

const normalizeTag = (value) => String(value ?? "")
  .trim()
  .replace(/^#+/, "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9_]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 24);

const cleanTags = (values) => [...new Set((Array.isArray(values) ? values : [])
  .map(normalizeTag)
  .filter((tag) => tag.length >= 2))]
  .slice(0, 5);

const normalizePantryText = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const parsePantryInput = (value) => {
  const normalized = cleanText(value, 240)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,;+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:yo\s+)?(?:tengo|hay|me\s+queda(?:n)?|cuento\s+con|dispongo\s+de)\s+/, "")
    .replace(/\b(?:en\s+casa|en\s+la\s+heladera|en\s+la\s+despensa)\b/g, "");
  return [...new Set(normalized
    .split(/\s*(?:,|;|\+|\by\b|\be\b)\s*/)
    .map((item) => item
      .replace(/^(?:con|de|del|la|las|el|los|un|una|unos|unas)\s+/, "")
      .replace(/\s+(?:y\s+)?(?:nada\s+mas|solamente|nomás)$/g, "")
      .trim())
    .filter((item) => item.length >= 2))]
    .slice(0, 20);
};

const scoreRecipeByPantry = (recipe, pantry) => {
  const normalizedIngredients = (recipe.ingredients || []).map(normalizePantryText);
  const matchedPantry = pantry.filter((item) => normalizedIngredients.some((ingredient) => (
    ingredient.includes(item) || item.includes(ingredient)
  )));
  const missingIngredients = (recipe.ingredients || []).filter((ingredient, index) => !pantry.some((item) => (
    normalizedIngredients[index].includes(item) || item.includes(normalizedIngredients[index])
  )));
  return {
    matchedPantry,
    missingIngredients,
    matchPercent: pantry.length ? Math.round((matchedPantry.length / pantry.length) * 100) : 0,
    canMake: missingIngredients.length === 0,
  };
};

const parseJsonArray = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readBody = async (request) => {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
};

const isWriteRequest = (request) => !["GET", "HEAD", "OPTIONS"].includes(request.method);

const PORTAL_ORIGINS = new Set([
  "https://recetitas-admin.stherling53.chatgpt.site",
  "https://recetitas-soporte.stherling53.chatgpt.site",
]);

const hasValidOrigin = (request) => {
  if (!isWriteRequest(request)) return true;
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin || PORTAL_ORIGINS.has(origin);
};

const bytesToHex = (bytes) => [...new Uint8Array(bytes)]
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

const hexToBytes = (hex) => {
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2 !== 0) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g).map((pair) => Number.parseInt(pair, 16)));
};

const randomHex = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const sha256 = async (value) => bytesToHex(await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(value),
));

const derivePassword = async (password, salt, iterations = PASSWORD_ITERATIONS) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  return bytesToHex(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations,
  }, key, 256));
};

const hashPassword = async (password) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    hash: await derivePassword(password, salt),
    salt: bytesToHex(salt),
    iterations: PASSWORD_ITERATIONS,
  };
};

const constantTimeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const verifyPassword = async (password, credential) => {
  const salt = hexToBytes(credential.password_salt);
  if (salt.length !== 16) return false;
  const derived = await derivePassword(password, salt, Number(credential.password_iterations));
  return constantTimeEqual(derived, credential.password_hash);
};

const parseCookies = (request) => Object.fromEntries(
  (request.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator === -1) return [part, ""];
      const value = part.slice(separator + 1);
      try {
        return [part.slice(0, separator), decodeURIComponent(value)];
      } catch {
        return [part.slice(0, separator), ""];
      }
    }),
);

const sessionCookie = (request, token, maxAge = SESSION_DAYS * 24 * 60 * 60) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

const validateRegistration = (body) => {
  const displayName = cleanText(body.displayName, 60);
  const email = cleanText(body.email, 254).toLowerCase();
  const handle = cleanText(body.handle, 24).toLowerCase().replace(/^@/, "");
  const password = String(body.password || "");

  if (displayName.length < 2) return { error: "Escribí tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Ingresá un correo válido." };
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) return { error: "El usuario debe tener entre 3 y 24 letras, números o guiones bajos." };
  if (password.length < 10 || password.length > 128 || !/[a-záéíóúñ]/i.test(password) || !/\d/.test(password)) {
    return { error: "La contraseña debe tener al menos 10 caracteres, una letra y un número." };
  }

  return { displayName, email, handle, password };
};

const validateLogin = (body) => {
  const identifier = cleanText(body.identifier, 254).toLowerCase().replace(/^@/, "");
  const password = String(body.password || "");
  if (!identifier || !password || password.length > 128) return { error: "Completá tu usuario y contraseña." };
  return { identifier, password };
};

const avatarIndexForRow = (row) => {
  const stored = String(row?.avatar_url || "").match(/^pig:(\d{1,2})$/);
  if (stored && Number(stored[1]) >= 0 && Number(stored[1]) < 64) return Number(stored[1]);
  let hash = 2166136261;
  for (const character of String(row?.id || row?.email || "recetitas")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 64;
};

const publicAvatarUrl = (value) => /^https:\/\//i.test(String(value || "")) ? value : null;
const isTeamMember = (row) => TEAM_HANDLES.has(String(row?.handle || "").toLowerCase());

const userDto = (row, { includeEmail = true } = {}) => ({
  id: row.id,
  ...(includeEmail ? { email: row.email } : {}),
  handle: row.handle,
  displayName: row.display_name,
  bio: row.bio || "",
  avatarUrl: publicAvatarUrl(row.avatar_url),
  avatarIndex: avatarIndexForRow(row),
  isTeam: isTeamMember(row),
  teamLabel: isTeamMember(row) ? "Equipo de recetitas" : null,
});

const isVideoMediaUrl = (value) => /\.mp4(?:$|[?#])/i.test(String(value || ""));

const recipeDto = (row) => {
  const legacyMediaUrl = row.image_url || null;
  const legacyVideo = isVideoMediaUrl(legacyMediaUrl);
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    imageKey: row.image_key,
    imageUrl: legacyVideo ? null : legacyMediaUrl,
    videoUrl: row.video_url || (legacyVideo ? legacyMediaUrl : null),
    updatedAt: row.updated_at || null,
    editCount: Number(row.edit_count || 0),
    lastEditNote: row.last_edit_note || "",
    difficulty: RECIPE_DIFFICULTIES.has(row.difficulty) ? row.difficulty : "easy",
    language: RECIPE_LANGUAGES.has(row.language) ? row.language : "es",
    cookMinutes: Number(row.cook_minutes),
    servings: Number(row.servings),
    ingredients: parseJsonArray(row.ingredients_json),
    steps: parseJsonArray(row.steps_json),
    tags: parseJsonArray(row.tags_json),
    createdAt: row.created_at,
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
    liked: Boolean(row.liked_by_me),
    saved: Boolean(row.saved_by_me),
    author: {
      id: row.author_id,
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: publicAvatarUrl(row.avatar_url),
      avatarIndex: avatarIndexForRow({ id: row.author_id, avatar_url: row.avatar_url }),
      followed: Boolean(row.author_followed),
      isTeam: TEAM_HANDLES.has(String(row.handle || "").toLowerCase()),
      teamLabel: TEAM_HANDLES.has(String(row.handle || "").toLowerCase()) ? "Equipo de recetitas" : null,
    },
  };
};

const ensureSchema = async (db) => {
  if (!schemaReady) {
    schemaReady = db.batch(SCHEMA_STATEMENTS.map((statement) => db.prepare(statement)))
      .catch((cause) => {
        schemaReady = null;
        throw cause;
      });
  }
  await schemaReady;
};

const ensureRecipeColumns = async (db) => {
  if (!recipeColumnsReady) {
    recipeColumnsReady = (async () => {
      const columns = await db.prepare("PRAGMA table_info(recipes)").all();
      if (!(columns.results || []).some((column) => column.name === "video_url")) {
        await db.prepare("ALTER TABLE recipes ADD COLUMN video_url TEXT").run();
      }
      if (!(columns.results || []).some((column) => column.name === "updated_at")) {
        await db.prepare("ALTER TABLE recipes ADD COLUMN updated_at TEXT").run();
      }
      if (!(columns.results || []).some((column) => column.name === "edit_count")) {
        await db.prepare("ALTER TABLE recipes ADD COLUMN edit_count INTEGER NOT NULL DEFAULT 0").run();
      }
      if (!(columns.results || []).some((column) => column.name === "difficulty")) {
        await db.prepare("ALTER TABLE recipes ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'easy'").run();
      }
      if (!(columns.results || []).some((column) => column.name === "language")) {
        await db.prepare("ALTER TABLE recipes ADD COLUMN language TEXT NOT NULL DEFAULT 'es'").run();
      }
      const commentColumns = await db.prepare("PRAGMA table_info(comments)").all();
      if (!(commentColumns.results || []).some((column) => column.name === "image_url")) {
        await db.prepare("ALTER TABLE comments ADD COLUMN image_url TEXT").run();
      }
    })().catch((cause) => {
      recipeColumnsReady = null;
      throw cause;
    });
  }
  await recipeColumnsReady;
};

const ensureLiveColumns = async (db) => {
  if (!liveColumnsReady) {
    liveColumnsReady = (async () => {
      const columns = await db.prepare("PRAGMA table_info(live_streams)").all();
      if (!(columns.results || []).some((column) => column.name === "published_at")) {
        await db.prepare("ALTER TABLE live_streams ADD COLUMN published_at TEXT").run();
      }
    })().catch((cause) => {
      liveColumnsReady = null;
      throw cause;
    });
  }
  await liveColumnsReady;
};

const cleanupDemoData = async (db) => {
  if (!demoCleanupReady) {
    const statements = [
      db.prepare("DELETE FROM notifications WHERE user_id LIKE 'user_demo_%' OR actor_id LIKE 'user_demo_%' OR recipe_id LIKE 'recipe_demo_%'"),
      db.prepare("DELETE FROM recipe_edits WHERE recipe_id LIKE 'recipe_demo_%' OR author_id LIKE 'user_demo_%'"),
      db.prepare("DELETE FROM recipe_tags WHERE recipe_id LIKE 'recipe_demo_%'"),
      db.prepare("DELETE FROM comments WHERE recipe_id LIKE 'recipe_demo_%' OR author_id LIKE 'user_demo_%'"),
      db.prepare("DELETE FROM likes WHERE recipe_id LIKE 'recipe_demo_%' OR user_id LIKE 'user_demo_%'"),
      db.prepare("DELETE FROM bookmarks WHERE recipe_id LIKE 'recipe_demo_%' OR user_id LIKE 'user_demo_%'"),
      db.prepare("DELETE FROM follows WHERE follower_id LIKE 'user_demo_%' OR followed_id LIKE 'user_demo_%'"),
      db.prepare("DELETE FROM recipes WHERE id LIKE 'recipe_demo_%' OR author_id LIKE 'user_demo_%'"),
      db.prepare("DELETE FROM users WHERE id LIKE 'user_demo_%' OR email LIKE '%@demo.recetitas.app'"),
    ];

    demoCleanupReady = db.batch(statements).catch((cause) => {
      demoCleanupReady = null;
      throw cause;
    });
  }

  await demoCleanupReady;
};

const createSession = async (db, userId) => {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const createdAt = now();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, userId, createdAt, expiresAt)
    .run();

  return token;
};

const bearerToken = (request) => {
  const match = String(request.headers.get("authorization") || "").match(/^Bearer\s+([a-f0-9]{64})$/i);
  return match?.[1] || "";
};

const createPortalSession = async (db, userId, type) => {
  const table = type === "admin" ? "admin_sessions" : "support_sessions";
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const createdAt = now();
  const duration = type === "admin"
    ? ADMIN_SESSION_HOURS * 60 * 60 * 1000
    : SUPPORT_SESSION_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + duration).toISOString();
  await db.prepare(`INSERT INTO ${table} (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(tokenHash, userId, createdAt, expiresAt)
    .run();
  return { token, expiresAt };
};

const getPortalUser = async (request, db, type) => {
  const token = bearerToken(request);
  if (!token) return null;
  const table = type === "admin" ? "admin_sessions" : "support_sessions";
  const user = await db.prepare(`SELECT u.* FROM ${table} ps
    JOIN users u ON u.id = ps.user_id
    WHERE ps.token_hash = ? AND ps.expires_at > ?`)
    .bind(await sha256(token), now())
    .first();
  if (!user) return null;
  if (type === "admin" && (!isTeamMember(user) || Boolean(user.is_banned))) return null;
  return user;
};

const requirePortalUser = async (request, db, type) => {
  const user = await getPortalUser(request, db, type);
  if (!user) {
    return { response: error(401, "PORTAL_AUTH_REQUIRED", type === "admin" ? "Iniciá sesión con una cuenta del equipo." : "Iniciá sesión para acceder a soporte.") };
  }
  return { user };
};

const removePortalSession = async (request, db, type) => {
  const token = bearerToken(request);
  if (!token) return;
  const table = type === "admin" ? "admin_sessions" : "support_sessions";
  await db.prepare(`DELETE FROM ${table} WHERE token_hash = ?`).bind(await sha256(token)).run();
};

const clientMetadata = (request, env) => {
  const suppliedSecret = String(request.headers.get("x-recetitas-proxy-token") || "");
  const trustedProxy = Boolean(env.PORTAL_PROXY_TOKEN)
    && constantTimeEqual(suppliedSecret, String(env.PORTAL_PROXY_TOKEN));
  const forwardedIp = cleanText(request.headers.get("x-recetitas-client-ip"), 64);
  const directIp = cleanText(request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0], 64);
  const forwardedAgent = cleanText(request.headers.get("x-recetitas-client-user-agent"), 300);
  return {
    ipAddress: trustedProxy && forwardedIp ? forwardedIp : (directIp || "unknown"),
    userAgent: trustedProxy && forwardedAgent ? forwardedAgent : cleanText(request.headers.get("user-agent"), 300),
  };
};

const recordAccess = async (db, userId, action, metadata) => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM account_access_logs WHERE created_at < ?").bind(cutoff),
    db.prepare("INSERT INTO account_access_logs (id, user_id, ip_address, user_agent, action, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(createId("acl"), userId, metadata.ipAddress, metadata.userAgent, action, now()),
  ]);
};

const auditAdmin = async (db, adminId, action, { targetUserId = null, detail = "" } = {}) => {
  await db.prepare("INSERT INTO admin_audit_logs (id, admin_id, target_user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(createId("aud"), adminId, targetUserId, action, cleanText(detail, 500), now())
    .run();
};

const adminUserDto = (row) => ({
  ...userDto(row),
  isBanned: Boolean(row.is_banned),
  bannedAt: row.banned_at || null,
  bannedReason: row.banned_reason || "",
  createdAt: row.created_at,
  recipeCount: Number(row.recipe_count || 0),
  commentCount: Number(row.comment_count || 0),
  followerCount: Number(row.follower_count || 0),
  ticketCount: Number(row.ticket_count || 0),
  lastAccessAt: row.last_access_at || null,
  lastIpAddress: row.last_ip_address || null,
  lastUserAgent: row.last_user_agent || null,
});

const ticketDto = (row) => ({
  id: row.id,
  category: row.category,
  subject: row.subject,
  status: row.status,
  priority: row.priority,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  closedAt: row.closed_at || null,
  messageCount: Number(row.message_count || 0),
  user: row.user_id ? {
    id: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    email: row.email,
    avatarUrl: publicAvatarUrl(row.avatar_url),
    avatarIndex: avatarIndexForRow({ id: row.user_id, avatar_url: row.avatar_url }),
    isBanned: Boolean(row.is_banned),
  } : null,
});

const getTicketMessages = async (db, ticketId) => {
  const result = await db.prepare(`SELECT sm.*, u.handle, u.display_name, u.avatar_url
    FROM support_messages sm
    JOIN users u ON u.id = sm.author_id
    WHERE sm.ticket_id = ?
    ORDER BY sm.created_at ASC
    LIMIT 250`)
    .bind(ticketId)
    .all();
  return (result.results || []).map((row) => ({
    id: row.id,
    body: row.body,
    role: row.author_role,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: publicAvatarUrl(row.avatar_url),
      avatarIndex: avatarIndexForRow({ id: row.author_id, avatar_url: row.avatar_url }),
      isTeam: row.author_role === "team",
    },
  }));
};

const getTicket = async (db, ticketId, userId = "") => {
  const row = await db.prepare(`SELECT st.*, u.handle, u.display_name, u.email, u.avatar_url, u.is_banned,
      (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = st.id) AS message_count
    FROM support_tickets st
    JOIN users u ON u.id = st.user_id
    WHERE st.id = ? AND (? = '' OR st.user_id = ?)`)
    .bind(ticketId, userId, userId)
    .first();
  return row ? ticketDto(row) : null;
};

const getSessionUser = (request, db) => {
  const cached = sessionUserCache.get(request);
  if (cached) return cached;

  const lookup = (async () => {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (!/^[a-f0-9]{64}$/i.test(token || "")) return null;
    const tokenHash = await sha256(token);
    return db.prepare(`SELECT u.*
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND COALESCE(u.is_banned, 0) = 0`)
      .bind(tokenHash, now())
      .first();
  })();

  sessionUserCache.set(request, lookup);
  return lookup;
};

const removeSession = async (request, db) => {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!/^[a-f0-9]{64}$/i.test(token || "")) return;
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
};

const authAttemptKey = async (request, identifier) => sha256(
  `${request.headers.get("cf-connecting-ip") || "local"}|${identifier}`,
);

const isLoginRateLimited = async (db, attemptKey) => {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const row = await db.prepare("SELECT COUNT(*) AS count FROM auth_attempts WHERE attempt_key = ? AND created_at > ?")
    .bind(attemptKey, cutoff)
    .first();
  return Number(row?.count || 0) >= 5;
};

const recordFailedLogin = async (db, attemptKey) => {
  const oldCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM auth_attempts WHERE created_at < ?").bind(oldCutoff),
    db.prepare("INSERT INTO auth_attempts (id, attempt_key, created_at) VALUES (?, ?, ?)")
      .bind(createId("att"), attemptKey, now()),
  ]);
};

const requireUser = async (request, db) => {
  const user = await getSessionUser(request, db);
  if (!user) {
    return { response: error(401, "AUTH_REQUIRED", "Iniciá sesión para continuar.", { loginUrl: "/app/?login=1" }) };
  }
  return { user };
};

const getFeed = async (db, viewerId = "", limit = 20, authorId = null, tag = null, language = null) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 40);
  const conditions = [];
  const filters = [];
  if (authorId) {
    conditions.push("r.author_id = ?");
    filters.push(authorId);
  }
  if (tag) {
    conditions.push("EXISTS(SELECT 1 FROM recipe_tags ft WHERE ft.recipe_id = r.id AND ft.tag = ?)");
    filters.push(tag);
  }
  if (language && RECIPE_LANGUAGES.has(language)) {
    conditions.push("r.language = ?");
    filters.push(language);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const bindings = [viewerId, viewerId, viewerId, ...filters, safeLimit];
  const result = await db.prepare(`SELECT
      r.*,
      u.handle,
      u.display_name,
      u.avatar_url,
      COALESCE((SELECT json_group_array(rt.tag) FROM recipe_tags rt WHERE rt.recipe_id = r.id), '[]') AS tags_json,
      (SELECT re.note FROM recipe_edits re WHERE re.recipe_id = r.id ORDER BY re.created_at DESC LIMIT 1) AS last_edit_note,
      (SELECT COUNT(*) FROM likes l WHERE l.recipe_id = r.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
      EXISTS(SELECT 1 FROM likes ml WHERE ml.recipe_id = r.id AND ml.user_id = ?) AS liked_by_me,
      EXISTS(SELECT 1 FROM bookmarks mb WHERE mb.recipe_id = r.id AND mb.user_id = ?) AS saved_by_me,
      EXISTS(SELECT 1 FROM follows af WHERE af.follower_id = ? AND af.followed_id = r.author_id) AS author_followed
    FROM recipes r
    JOIN users u ON u.id = r.author_id
    ${where}
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ?`)
    .bind(...bindings)
    .all();

  return (result.results || []).map(recipeDto);
};

const getRecipe = async (db, recipeId, viewerId = "") => {
  const row = await db.prepare(`SELECT
      r.*,
      u.handle,
      u.display_name,
      u.avatar_url,
      COALESCE((SELECT json_group_array(rt.tag) FROM recipe_tags rt WHERE rt.recipe_id = r.id), '[]') AS tags_json,
      (SELECT re.note FROM recipe_edits re WHERE re.recipe_id = r.id ORDER BY re.created_at DESC LIMIT 1) AS last_edit_note,
      (SELECT COUNT(*) FROM likes l WHERE l.recipe_id = r.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
      EXISTS(SELECT 1 FROM likes ml WHERE ml.recipe_id = r.id AND ml.user_id = ?) AS liked_by_me,
      EXISTS(SELECT 1 FROM bookmarks mb WHERE mb.recipe_id = r.id AND mb.user_id = ?) AS saved_by_me,
      EXISTS(SELECT 1 FROM follows af WHERE af.follower_id = ? AND af.followed_id = r.author_id) AS author_followed
    FROM recipes r
    JOIN users u ON u.id = r.author_id
    WHERE r.id = ?`)
    .bind(viewerId, viewerId, viewerId, recipeId)
    .first();
  if (!row) return null;
  const recipe = recipeDto(row);
  recipe.poll = await getRecipePoll(db, recipeId, viewerId);
  return recipe;
};

async function getRecipePoll(db, recipeId, viewerId = "") {
  const poll = await db.prepare("SELECT id, question, created_at FROM recipe_polls WHERE recipe_id = ?")
    .bind(recipeId)
    .first();
  if (!poll) return null;
  const options = await db.prepare(`SELECT o.id, o.label, o.position,
      (SELECT COUNT(*) FROM recipe_poll_votes v WHERE v.option_id = o.id) AS vote_count,
      EXISTS(SELECT 1 FROM recipe_poll_votes mv WHERE mv.option_id = o.id AND mv.user_id = ?) AS voted_by_me
    FROM recipe_poll_options o
    WHERE o.poll_id = ?
    ORDER BY o.position ASC`)
    .bind(viewerId, poll.id)
    .all();
  const mapped = (options.results || []).map((row) => ({
    id: row.id,
    label: row.label,
    voteCount: Number(row.vote_count || 0),
    voted: Boolean(row.voted_by_me),
  }));
  return {
    id: poll.id,
    question: poll.question,
    createdAt: poll.created_at,
    totalVotes: mapped.reduce((total, option) => total + option.voteCount, 0),
    options: mapped,
  };
}

const collectionDto = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  itemCount: Number(row.item_count || 0),
  coverImageUrl: row.cover_image_url || null,
  containsRecipe: Boolean(row.contains_recipe),
  updatedAt: row.updated_at,
  owner: row.handle ? {
    id: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarIndex: avatarIndexForRow({ id: row.user_id, avatar_url: row.avatar_url }),
  } : undefined,
});

const getUserCollections = async (db, userId, recipeId = "") => {
  const result = await db.prepare(`SELECT c.*,
      (SELECT COUNT(*) FROM recipe_collection_items ci WHERE ci.collection_id = c.id) AS item_count,
      EXISTS(SELECT 1 FROM recipe_collection_items selected WHERE selected.collection_id = c.id AND selected.recipe_id = ?) AS contains_recipe,
      (SELECT COALESCE(r.image_url, '') FROM recipe_collection_items ci
        JOIN recipes r ON r.id = ci.recipe_id
        WHERE ci.collection_id = c.id AND r.image_url IS NOT NULL
        ORDER BY ci.added_at DESC LIMIT 1) AS cover_image_url
    FROM recipe_collections c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC, c.created_at DESC`)
    .bind(recipeId, userId)
    .all();
  return (result.results || []).map(collectionDto);
};

const profileAchievements = (counts) => [
  { id: "first-recipe", title: "Primera recetita", description: "Compartió su primera receta.", unlocked: counts.recipes >= 1, progress: Math.min(counts.recipes, 1), target: 1 },
  { id: "five-recipes", title: "Cocina en marcha", description: "Compartió 5 recetas.", unlocked: counts.recipes >= 5, progress: Math.min(counts.recipes, 5), target: 5 },
  { id: "ten-comments", title: "Sobremesa larga", description: "Publicó 10 comentarios.", unlocked: counts.comments >= 10, progress: Math.min(counts.comments, 10), target: 10 },
  { id: "three-collections", title: "Recetario ordenado", description: "Creó 3 carpetas públicas.", unlocked: counts.collections >= 3, progress: Math.min(counts.collections, 3), target: 3 },
  { id: "twenty-five-likes", title: "Plato querido", description: "Recibió 25 me gusta en sus recetas.", unlocked: counts.receivedLikes >= 25, progress: Math.min(counts.receivedLikes, 25), target: 25 },
  { id: "ten-followers", title: "Mesa grande", description: "Llegó a 10 seguidores.", unlocked: counts.followers >= 10, progress: Math.min(counts.followers, 10), target: 10 },
];

const toggleRelation = async (db, table, userId, recipeId) => {
  const existing = await db.prepare(`SELECT 1 AS found FROM ${table} WHERE user_id = ? AND recipe_id = ?`)
    .bind(userId, recipeId)
    .first();

  if (existing) {
    await db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND recipe_id = ?`)
      .bind(userId, recipeId)
      .run();
    return false;
  }

  await db.prepare(`INSERT INTO ${table} (user_id, recipe_id, created_at) VALUES (?, ?, ?)`)
    .bind(userId, recipeId, now())
    .run();
  return true;
};

const canDeleteOwnedComment = (comment, user) => Boolean(comment && user && comment.author_id === user.id);

const createNotification = async (db, { userId, actorId, type, recipeId = null, commentId = null }) => {
  if (!userId || !actorId || userId === actorId) return;
  const createdAt = now();
  await db.batch([
    db.prepare(`DELETE FROM notifications
      WHERE user_id = ? AND actor_id = ? AND type = ? AND recipe_id IS ?`)
      .bind(userId, actorId, type, recipeId),
    db.prepare(`INSERT INTO notifications
      (id, user_id, actor_id, type, recipe_id, comment_id, created_at, read_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`)
      .bind(createId("ntf"), userId, actorId, type, recipeId, commentId, createdAt),
  ]);
};

const unreadNotificationCount = async (db, userId) => {
  if (!userId) return 0;
  const row = await db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .bind(userId)
    .first();
  return Number(row?.count || 0);
};

const liveActiveCutoff = () => new Date(Date.now() - LIVE_ACTIVE_WINDOW_MS).toISOString();
const liveViewerCutoff = () => new Date(Date.now() - LIVE_VIEWER_WINDOW_MS).toISOString();
const liveResumeCutoff = () => new Date(Date.now() - LIVE_RESUME_WINDOW_MS).toISOString();

const normalizeLiveComment = (value) => {
  const body = cleanText(value, 180);
  const sticker = body.match(/^\[\[sticker:([a-z-]+)\]\]$/);
  if (sticker && !LIVE_STICKER_IDS.has(sticker[1])) return "";
  return body;
};

const liveDto = (row, liveBaseUrl = "") => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  status: row.status === "live" && !row.published_at ? "starting" : row.status,
  startedAt: row.started_at,
  endedAt: row.ended_at || null,
  playbackUrl: row.status === "live" && row.published_at && liveBaseUrl ? `${String(liveBaseUrl).replace(/\/$/, "")}/${row.stream_path}/whep` : null,
  viewerCount: Number(row.viewer_count || 0),
  likeCount: Number(row.like_count || 0),
  commentCount: Number(row.comment_count || 0),
  liked: Boolean(row.liked_by_me),
  permissions: {
    isOwner: Boolean(row.viewer_is_owner),
    isModerator: Boolean(row.viewer_is_moderator),
    banned: Boolean(row.viewer_is_banned),
    canModerate: Boolean(row.viewer_is_owner || row.viewer_is_moderator),
  },
  author: {
    id: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: publicAvatarUrl(row.avatar_url),
    avatarIndex: avatarIndexForRow({ id: row.user_id, avatar_url: row.avatar_url }),
  },
});

const getLiveStream = async (db, { liveId = null, userId = null, viewerId = "", liveBaseUrl = "", includeEnded = false } = {}) => {
  const identityColumn = liveId ? "ls.id" : "ls.user_id";
  const identity = liveId || userId;
  if (!identity) return null;
  const row = await db.prepare(`SELECT
      ls.*, u.handle, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM live_likes ll WHERE ll.live_id = ls.id) AS like_count,
      (SELECT COUNT(*) FROM live_comments lc WHERE lc.live_id = ls.id) AS comment_count,
      (SELECT COUNT(*) FROM live_viewers lv WHERE lv.live_id = ls.id AND lv.last_seen_at > ?) AS viewer_count,
      EXISTS(SELECT 1 FROM live_likes ml WHERE ml.live_id = ls.id AND ml.user_id = ?) AS liked_by_me,
      (ls.user_id = ?) AS viewer_is_owner,
      EXISTS(SELECT 1 FROM live_moderators lm WHERE lm.live_id = ls.id AND lm.user_id = ?) AS viewer_is_moderator,
      EXISTS(SELECT 1 FROM live_bans lb WHERE lb.live_id = ls.id AND lb.user_id = ?) AS viewer_is_banned
    FROM live_streams ls
    JOIN users u ON u.id = ls.user_id
    WHERE ${identityColumn} = ?
      ${includeEnded ? "" : "AND ls.status = 'live' AND ls.published_at IS NOT NULL AND ls.last_seen_at > ?"}
    ORDER BY ls.started_at DESC
    LIMIT 1`)
    .bind(liveViewerCutoff(), viewerId, viewerId, viewerId, viewerId, identity, ...(!includeEnded ? [liveActiveCutoff()] : []))
    .first();
  return row ? liveDto(row, liveBaseUrl) : null;
};

const getDiscoverLiveStreams = async (db, { viewerId = "", liveBaseUrl = "", limit = 8 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 12);
  const result = await db.prepare(`SELECT
      ls.*, u.handle, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM live_likes ll WHERE ll.live_id = ls.id) AS like_count,
      (SELECT COUNT(*) FROM live_comments lc WHERE lc.live_id = ls.id) AS comment_count,
      (SELECT COUNT(*) FROM live_viewers lv WHERE lv.live_id = ls.id AND lv.last_seen_at > ?) AS viewer_count,
      EXISTS(SELECT 1 FROM live_likes ml WHERE ml.live_id = ls.id AND ml.user_id = ?) AS liked_by_me,
      (ls.user_id = ?) AS viewer_is_owner,
      EXISTS(SELECT 1 FROM live_moderators lm WHERE lm.live_id = ls.id AND lm.user_id = ?) AS viewer_is_moderator,
      EXISTS(SELECT 1 FROM live_bans lb WHERE lb.live_id = ls.id AND lb.user_id = ?) AS viewer_is_banned
    FROM live_streams ls
    JOIN users u ON u.id = ls.user_id
    WHERE ls.status = 'live' AND ls.published_at IS NOT NULL AND ls.last_seen_at > ?
    ORDER BY viewer_count DESC, ls.started_at DESC
    LIMIT ?`)
    .bind(liveViewerCutoff(), viewerId, viewerId, viewerId, viewerId, liveActiveCutoff(), safeLimit)
    .all();
  return (result.results || []).map((row) => liveDto(row, liveBaseUrl));
};

const getLiveComments = async (db, liveId) => {
  const result = await db.prepare(`SELECT lc.id, lc.body, lc.created_at, u.id AS author_id, u.handle, u.display_name, u.avatar_url,
      (ls.user_id = u.id) AS author_is_owner,
      EXISTS(SELECT 1 FROM live_moderators lm WHERE lm.live_id = lc.live_id AND lm.user_id = u.id) AS author_is_moderator,
      EXISTS(SELECT 1 FROM live_bans lb WHERE lb.live_id = lc.live_id AND lb.user_id = u.id) AS author_is_banned
    FROM live_comments lc
    JOIN users u ON u.id = lc.author_id
    JOIN live_streams ls ON ls.id = lc.live_id
    WHERE lc.live_id = ?
    ORDER BY lc.created_at ASC
    LIMIT 120`)
    .bind(liveId)
    .all();
  return (result.results || []).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      handle: row.handle,
      displayName: row.display_name,
      avatarUrl: publicAvatarUrl(row.avatar_url),
      avatarIndex: avatarIndexForRow({ id: row.author_id, avatar_url: row.avatar_url }),
      isOwner: Boolean(row.author_is_owner),
      isModerator: Boolean(row.author_is_moderator),
      isBanned: Boolean(row.author_is_banned),
    },
  }));
};

const getLiveRole = async (db, liveId, userId) => {
  if (!userId) return { isOwner: false, isModerator: false, banned: false };
  const row = await db.prepare(`SELECT
      (ls.user_id = ?) AS is_owner,
      EXISTS(SELECT 1 FROM live_moderators lm WHERE lm.live_id = ls.id AND lm.user_id = ?) AS is_moderator,
      EXISTS(SELECT 1 FROM live_bans lb WHERE lb.live_id = ls.id AND lb.user_id = ?) AS is_banned
    FROM live_streams ls WHERE ls.id = ?`)
    .bind(userId, userId, userId, liveId)
    .first();
  return {
    isOwner: Boolean(row?.is_owner),
    isModerator: Boolean(row?.is_moderator),
    banned: Boolean(row?.is_banned),
  };
};

const getLiveModeration = async (db, liveId) => {
  const [moderators, bannedUsers] = await Promise.all([
    db.prepare(`SELECT u.* FROM live_moderators lm JOIN users u ON u.id = lm.user_id
      WHERE lm.live_id = ? ORDER BY lm.created_at ASC`).bind(liveId).all(),
    db.prepare(`SELECT u.* FROM live_bans lb JOIN users u ON u.id = lb.user_id
      WHERE lb.live_id = ? ORDER BY lb.created_at DESC`).bind(liveId).all(),
  ]);
  return {
    moderators: (moderators.results || []).map((row) => userDto(row, { includeEmail: false })),
    bannedUsers: (bannedUsers.results || []).map((row) => userDto(row, { includeEmail: false })),
  };
};

const validateLive = (body) => {
  const title = cleanText(body?.title, 80);
  const description = cleanText(body?.description, 280);
  if (title.length < 3) return { error: "El título debe tener al menos 3 caracteres." };
  return { title, description };
};

const validateRecipePoll = (value) => {
  if (!value || (!value.question && !value.options?.length)) return null;
  const question = cleanText(value.question, 140);
  const rawOptions = cleanLines(value.options, 4, 60);
  const seen = new Set();
  const options = rawOptions.filter((option) => {
    const normalized = normalizePantryText(option);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  if (question.length < 5) return { error: "La pregunta de la encuesta debe tener al menos 5 caracteres." };
  if (options.length < 2) return { error: "Agregá al menos dos opciones distintas a la encuesta." };
  return { question, options };
};

const validateRecipe = (body, mediaBaseUrl = "") => {
  const title = cleanText(body.title, 90);
  const summary = cleanText(body.summary, 280);
  const ingredients = cleanLines(body.ingredients, 40, 120);
  const steps = cleanLines(body.steps, 30, 500);
  const tags = cleanTags(body.tags);
  const cookMinutes = Number(body.cookMinutes);
  const servings = Number(body.servings);
  const difficulty = RECIPE_DIFFICULTIES.has(body.difficulty) ? body.difficulty : "easy";
  const language = RECIPE_LANGUAGES.has(body.language) ? body.language : "es";
  const poll = validateRecipePoll(body.poll);
  const imageKey = IMAGE_KEYS.has(body.imageKey) ? body.imageKey : "pumpkin";
  const rawImageUrl = cleanText(body.imageUrl, 500);
  const rawVideoUrl = cleanText(body.videoUrl, 500);
  const normalizedMediaBase = String(mediaBaseUrl || "").replace(/\/$/, "");
  const imageUrl = rawImageUrl
    && /^https:\/\//i.test(rawImageUrl)
    && (!normalizedMediaBase || rawImageUrl.startsWith(`${normalizedMediaBase}/files/`))
    ? rawImageUrl
    : null;
  const videoUrl = rawVideoUrl
    && /^https:\/\//i.test(rawVideoUrl)
    && /\.mp4(?:$|[?#])/i.test(rawVideoUrl)
    && (!normalizedMediaBase || rawVideoUrl.startsWith(`${normalizedMediaBase}/files/`))
    ? rawVideoUrl
    : null;

  if (title.length < 3) return { error: "El nombre de la receta debe tener al menos 3 caracteres." };
  if (summary.length < 10) return { error: "La historia corta debe tener al menos 10 caracteres." };
  if (ingredients.length === 0) return { error: "Agregá al menos un ingrediente." };
  if (steps.length === 0) return { error: "Agregá al menos un paso." };
  if (poll?.error) return { error: poll.error };
  if (rawImageUrl && !imageUrl) return { error: "La imagen de la receta no es válida." };
  if (rawVideoUrl && !videoUrl) return { error: "El video de la receta no es válido." };
  if (!Number.isInteger(cookMinutes) || cookMinutes < 1 || cookMinutes > 1440) {
    return { error: "El tiempo de cocción no es válido." };
  }
  if (!Number.isInteger(servings) || servings < 1 || servings > 24) {
    return { error: "La cantidad de porciones no es válida." };
  }

  return { title, summary, ingredients, steps, tags, cookMinutes, servings, difficulty, language, imageKey, imageUrl, videoUrl, poll };
};

export async function handleApiRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "GET,POST,PATCH,DELETE,OPTIONS" } });
  }

  if (!hasValidOrigin(request)) {
    return error(403, "INVALID_ORIGIN", "La solicitud no pertenece a este sitio.");
  }

  if (!env.DB) {
    return error(503, "DATABASE_UNAVAILABLE", "La base de datos todavía no está disponible.");
  }

  try {
    // Sites applies the checked-in D1 migrations before serving production traffic.
    // Keep the runtime bootstrap for isolated tests and standalone API deployments.
    if (!env.ASSETS) {
      await ensureSchema(env.DB);
      await ensureRecipeColumns(env.DB);
      await ensureLiveColumns(env.DB);
      await cleanupDemoData(env.DB);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/api";
    const viewer = await getSessionUser(request, env.DB);

    if (request.method === "GET" && path === "/api/health") {
      return json({ ok: true, service: "recetitas-api", database: "ready" });
    }

    if (request.method === "POST" && path === "/api/admin/login") {
      const login = validateLogin(await readBody(request));
      if (login.error) return error(422, "INVALID_LOGIN", login.error);
      const attemptKey = await authAttemptKey(request, `admin:${login.identifier}`);
      if (await isLoginRateLimited(env.DB, attemptKey)) {
        return error(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Esperá 15 minutos y probá de nuevo.");
      }
      const credential = await env.DB.prepare(`SELECT u.*, c.password_hash, c.password_salt, c.password_iterations
        FROM users u JOIN credentials c ON c.user_id = u.id
        WHERE u.email = ? OR u.handle = ? LIMIT 1`)
        .bind(login.identifier, login.identifier)
        .first();
      const validPassword = credential
        ? await verifyPassword(login.password, credential)
        : (await derivePassword(login.password, hexToBytes("00112233445566778899aabbccddeeff")), false);
      if (!credential || !validPassword) {
        await recordFailedLogin(env.DB, attemptKey);
        return error(401, "INVALID_CREDENTIALS", "El usuario o la contraseña no coinciden.");
      }
      if (!isTeamMember(credential)) return error(403, "ADMIN_FORBIDDEN", "Esta cuenta no pertenece al equipo de recetitas.");
      if (credential.is_banned) return error(403, "ACCOUNT_BANNED", "Esta cuenta del equipo está bloqueada.");
      await env.DB.batch([
        env.DB.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(attemptKey),
        env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now()),
      ]);
      const [session] = await Promise.all([
        createPortalSession(env.DB, credential.id, "admin"),
        recordAccess(env.DB, credential.id, "admin_login", clientMetadata(request, env)),
      ]);
      return json({ authenticated: true, token: session.token, expiresAt: session.expiresAt, user: adminUserDto(credential) });
    }

    if (request.method === "POST" && path === "/api/admin/logout") {
      await removePortalSession(request, env.DB, "admin");
      return json({ authenticated: false, user: null });
    }

    if (request.method === "GET" && path === "/api/admin/session") {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      return json({ authenticated: true, user: adminUserDto(auth.user) });
    }

    if (request.method === "GET" && path === "/api/admin/overview") {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const accessCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [usersCount, bannedCount, recipesCount, commentsCount, liveCount, accessCount, ticketsCount, livesResult, ticketsResult] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS count FROM users").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE is_banned = 1").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM recipes").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM comments").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM live_streams WHERE status = 'live'").first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM account_access_logs WHERE created_at > ?").bind(accessCutoff).first(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM support_tickets WHERE status NOT IN ('resolved', 'closed')").first(),
        env.DB.prepare(`SELECT ls.id, ls.title, ls.description, ls.status, ls.started_at, ls.last_seen_at,
            u.id AS user_id, u.handle, u.display_name,
            (SELECT COUNT(*) FROM live_viewers lv WHERE lv.live_id = ls.id AND lv.last_seen_at > ?) AS viewer_count
          FROM live_streams ls JOIN users u ON u.id = ls.user_id
          WHERE ls.status = 'live' ORDER BY ls.started_at DESC LIMIT 12`)
          .bind(liveViewerCutoff()).all(),
        env.DB.prepare(`SELECT st.*, u.handle, u.display_name, u.email, u.avatar_url, u.is_banned,
            (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = st.id) AS message_count
          FROM support_tickets st JOIN users u ON u.id = st.user_id
          ORDER BY CASE st.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
            st.updated_at DESC LIMIT 8`).all(),
      ]);
      return json({
        stats: {
          users: Number(usersCount?.count || 0),
          banned: Number(bannedCount?.count || 0),
          recipes: Number(recipesCount?.count || 0),
          comments: Number(commentsCount?.count || 0),
          live: Number(liveCount?.count || 0),
          accessLast24h: Number(accessCount?.count || 0),
          pendingTickets: Number(ticketsCount?.count || 0),
        },
        lives: (livesResult.results || []).map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description || "",
          status: row.status,
          startedAt: row.started_at,
          lastSeenAt: row.last_seen_at,
          viewerCount: Number(row.viewer_count || 0),
          author: { id: row.user_id, handle: row.handle, displayName: row.display_name },
        })),
        tickets: (ticketsResult.results || []).map(ticketDto),
      });
    }

    if (request.method === "GET" && path === "/api/admin/users") {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const search = cleanText(url.searchParams.get("search"), 80);
      const pattern = `%${search}%`;
      const result = await env.DB.prepare(`SELECT u.*,
          (SELECT COUNT(*) FROM recipes r WHERE r.author_id = u.id) AS recipe_count,
          (SELECT COUNT(*) FROM comments c WHERE c.author_id = u.id) AS comment_count,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM support_tickets st WHERE st.user_id = u.id) AS ticket_count,
          (SELECT al.created_at FROM account_access_logs al WHERE al.user_id = u.id ORDER BY al.created_at DESC LIMIT 1) AS last_access_at,
          (SELECT al.ip_address FROM account_access_logs al WHERE al.user_id = u.id ORDER BY al.created_at DESC LIMIT 1) AS last_ip_address,
          (SELECT al.user_agent FROM account_access_logs al WHERE al.user_id = u.id ORDER BY al.created_at DESC LIMIT 1) AS last_user_agent
        FROM users u
        WHERE (? = '' OR u.handle LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?)
        ORDER BY u.created_at DESC LIMIT 100`)
        .bind(search, pattern, pattern, pattern)
        .all();
      return json({ users: (result.results || []).map(adminUserDto), search });
    }

    const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (request.method === "GET" && adminUserMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const user = await env.DB.prepare(`SELECT u.*,
          (SELECT COUNT(*) FROM recipes r WHERE r.author_id = u.id) AS recipe_count,
          (SELECT COUNT(*) FROM comments c WHERE c.author_id = u.id) AS comment_count,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM support_tickets st WHERE st.user_id = u.id) AS ticket_count,
          (SELECT al.created_at FROM account_access_logs al WHERE al.user_id = u.id ORDER BY al.created_at DESC LIMIT 1) AS last_access_at,
          (SELECT al.ip_address FROM account_access_logs al WHERE al.user_id = u.id ORDER BY al.created_at DESC LIMIT 1) AS last_ip_address,
          (SELECT al.user_agent FROM account_access_logs al WHERE al.user_id = u.id ORDER BY al.created_at DESC LIMIT 1) AS last_user_agent
        FROM users u WHERE u.id = ?`)
        .bind(adminUserMatch[1]).first();
      if (!user) return error(404, "USER_NOT_FOUND", "No encontramos esa cuenta.");
      const access = await env.DB.prepare(`SELECT id, ip_address, user_agent, action, created_at
        FROM account_access_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
        .bind(user.id).all();
      return json({
        user: adminUserDto(user),
        access: (access.results || []).map((row) => ({ id: row.id, ipAddress: row.ip_address, userAgent: row.user_agent, action: row.action, createdAt: row.created_at })),
      });
    }

    const adminBanMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/ban$/);
    if (request.method === "POST" && adminBanMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(adminBanMatch[1]).first();
      if (!target) return error(404, "USER_NOT_FOUND", "No encontramos esa cuenta.");
      if (isTeamMember(target)) return error(422, "TEAM_ACCOUNT_PROTECTED", "Las cuentas del equipo no se pueden bloquear desde el panel.");
      const body = await readBody(request);
      const banned = Boolean(body.banned);
      const reason = cleanText(body.reason, 300);
      if (banned && reason.length < 3) return error(422, "BAN_REASON_REQUIRED", "Escribí el motivo del bloqueo.");
      const changedAt = now();
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET is_banned = ?, banned_at = ?, banned_reason = ?, banned_by = ? WHERE id = ?")
          .bind(banned ? 1 : 0, banned ? changedAt : null, banned ? reason : "", banned ? auth.user.id : null, target.id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(target.id),
      ]);
      await auditAdmin(env.DB, auth.user.id, banned ? "user_banned" : "user_unbanned", { targetUserId: target.id, detail: reason });
      const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(target.id).first();
      return json({ user: adminUserDto(updated) });
    }

    const adminEndLiveMatch = path.match(/^\/api\/admin\/live\/([^/]+)\/end$/);
    if (request.method === "POST" && adminEndLiveMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const active = await env.DB.prepare("SELECT id, user_id, title FROM live_streams WHERE id = ? AND status = 'live'")
        .bind(adminEndLiveMatch[1]).first();
      if (!active) return error(404, "LIVE_NOT_FOUND", "Ese directo ya terminó.");
      const endedAt = now();
      await env.DB.prepare("UPDATE live_streams SET status = 'ended', ended_at = ?, last_seen_at = ? WHERE id = ?")
        .bind(endedAt, endedAt, active.id).run();
      await auditAdmin(env.DB, auth.user.id, "live_ended", { targetUserId: active.user_id, detail: active.title });
      return json({ ended: true, liveId: active.id });
    }

    if (request.method === "GET" && path === "/api/admin/content") {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const search = cleanText(url.searchParams.get("search"), 80);
      const pattern = `%${search}%`;
      const [recipesResult, commentsResult] = await Promise.all([
        env.DB.prepare(`SELECT r.id, r.title, r.summary, r.image_url, r.video_url, r.created_at,
            u.id AS user_id, u.handle, u.display_name
          FROM recipes r JOIN users u ON u.id = r.author_id
          WHERE (? = '' OR r.title LIKE ? OR r.summary LIKE ? OR u.handle LIKE ? OR u.display_name LIKE ?)
          ORDER BY r.created_at DESC LIMIT 80`)
          .bind(search, pattern, pattern, pattern, pattern).all(),
        env.DB.prepare(`SELECT c.id, c.body, c.created_at, c.recipe_id, r.title AS recipe_title,
            u.id AS user_id, u.handle, u.display_name
          FROM comments c
          JOIN users u ON u.id = c.author_id
          JOIN recipes r ON r.id = c.recipe_id
          WHERE (? = '' OR c.body LIKE ? OR u.handle LIKE ? OR u.display_name LIKE ? OR r.title LIKE ?)
          ORDER BY c.created_at DESC LIMIT 120`)
          .bind(search, pattern, pattern, pattern, pattern).all(),
      ]);
      return json({
        search,
        recipes: (recipesResult.results || []).map((row) => ({
          id: row.id,
          kind: "recipe",
          title: row.title,
          summary: row.summary,
          imageUrl: row.image_url || null,
          videoUrl: row.video_url || null,
          createdAt: row.created_at,
          author: { id: row.user_id, handle: row.handle, displayName: row.display_name },
        })),
        comments: (commentsResult.results || []).map((row) => ({
          id: row.id,
          kind: "comment",
          body: row.body,
          recipe: { id: row.recipe_id, title: row.recipe_title },
          createdAt: row.created_at,
          author: { id: row.user_id, handle: row.handle, displayName: row.display_name },
        })),
      });
    }

    const adminRecipeMatch = path.match(/^\/api\/admin\/recipes\/([^/]+)$/);
    if (request.method === "DELETE" && adminRecipeMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const recipe = await env.DB.prepare(`SELECT r.id, r.author_id, r.title, r.image_url, r.video_url, u.handle
        FROM recipes r JOIN users u ON u.id = r.author_id WHERE r.id = ?`)
        .bind(adminRecipeMatch[1]).first();
      if (!recipe) return error(404, "RECIPE_NOT_FOUND", "No encontramos esa receta.");
      const mediaUrls = [recipe.image_url, recipe.video_url].filter(Boolean);
      if (mediaUrls.length && env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
        for (const mediaUrl of mediaUrls) {
          const deleted = await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), {
            method: "DELETE",
            headers: {
              authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`,
              "x-user-id": recipe.author_id,
              "x-file-url": mediaUrl,
            },
          });
          if (!deleted.ok) return error(502, "MEDIA_DELETE_FAILED", "No pudimos eliminar uno de los archivos de la publicación.");
        }
      }
      if (env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
        const commentMedia = await env.DB.prepare("SELECT author_id, image_url FROM comments WHERE recipe_id = ? AND image_url IS NOT NULL")
          .bind(recipe.id).all();
        for (const item of commentMedia.results || []) {
          await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), { method: "DELETE", headers: { authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`, "x-user-id": item.author_id, "x-file-url": item.image_url } }).catch(() => null);
        }
      }
      await env.DB.prepare("DELETE FROM recipes WHERE id = ?").bind(recipe.id).run();
      await auditAdmin(env.DB, auth.user.id, "recipe_deleted", {
        targetUserId: recipe.author_id,
        detail: `${recipe.title} · @${recipe.handle} · ${recipe.id}`,
      });
      return new Response(null, { status: 204 });
    }

    const adminCommentMatch = path.match(/^\/api\/admin\/comments\/([^/]+)$/);
    if (request.method === "DELETE" && adminCommentMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const comment = await env.DB.prepare(`SELECT c.id, c.author_id, c.body, c.image_url, c.recipe_id, u.handle, r.title AS recipe_title
        FROM comments c
        JOIN users u ON u.id = c.author_id
        JOIN recipes r ON r.id = c.recipe_id
        WHERE c.id = ?`)
        .bind(adminCommentMatch[1]).first();
      if (!comment) return error(404, "COMMENT_NOT_FOUND", "No encontramos ese comentario.");
      if (comment.image_url && env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
        await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`,
            "x-user-id": comment.author_id,
            "x-file-url": comment.image_url,
          },
        }).catch(() => null);
      }
      await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(comment.id).run();
      await auditAdmin(env.DB, auth.user.id, "comment_deleted", {
        targetUserId: comment.author_id,
        detail: `${cleanText(comment.body, 140)} · ${comment.recipe_title} · @${comment.handle}`,
      });
      return new Response(null, { status: 204 });
    }

    if (request.method === "GET" && path === "/api/admin/audit") {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const result = await env.DB.prepare(`SELECT al.*, a.handle AS admin_handle, a.display_name AS admin_name,
          t.handle AS target_handle, t.display_name AS target_name
        FROM admin_audit_logs al
        JOIN users a ON a.id = al.admin_id
        LEFT JOIN users t ON t.id = al.target_user_id
        ORDER BY al.created_at DESC LIMIT 100`).all();
      return json({
        items: (result.results || []).map((row) => ({
          id: row.id,
          action: row.action,
          detail: row.detail,
          createdAt: row.created_at,
          admin: { handle: row.admin_handle, displayName: row.admin_name },
          target: row.target_user_id ? { id: row.target_user_id, handle: row.target_handle, displayName: row.target_name } : null,
        })),
      });
    }

    if (request.method === "GET" && path === "/api/admin/tickets") {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const status = cleanText(url.searchParams.get("status"), 24);
      const result = await env.DB.prepare(`SELECT st.*, u.handle, u.display_name, u.email, u.avatar_url, u.is_banned,
          (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = st.id) AS message_count
        FROM support_tickets st JOIN users u ON u.id = st.user_id
        WHERE (? = '' OR st.status = ?)
        ORDER BY CASE st.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          st.updated_at DESC LIMIT 100`)
        .bind(status, status).all();
      return json({ tickets: (result.results || []).map(ticketDto), status: status || null });
    }

    const adminTicketMessageMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)\/messages$/);
    if (request.method === "POST" && adminTicketMessageMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const ticket = await getTicket(env.DB, adminTicketMessageMatch[1]);
      if (!ticket) return error(404, "TICKET_NOT_FOUND", "No encontramos ese ticket.");
      const body = cleanText((await readBody(request)).body, 2000);
      if (body.length < 2) return error(422, "MESSAGE_REQUIRED", "Escribí una respuesta.");
      const createdAt = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO support_messages (id, ticket_id, author_id, author_role, body, created_at) VALUES (?, ?, ?, 'team', ?, ?)")
          .bind(createId("msg"), ticket.id, auth.user.id, body, createdAt),
        env.DB.prepare("UPDATE support_tickets SET status = 'waiting_user', updated_at = ?, closed_at = NULL WHERE id = ?")
          .bind(createdAt, ticket.id),
      ]);
      await auditAdmin(env.DB, auth.user.id, "ticket_replied", { targetUserId: ticket.user.id, detail: ticket.subject });
      return json({ ticket: await getTicket(env.DB, ticket.id), messages: await getTicketMessages(env.DB, ticket.id) }, 201);
    }

    const adminTicketMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)$/);
    if (request.method === "GET" && adminTicketMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const ticket = await getTicket(env.DB, adminTicketMatch[1]);
      if (!ticket) return error(404, "TICKET_NOT_FOUND", "No encontramos ese ticket.");
      return json({ ticket, messages: await getTicketMessages(env.DB, ticket.id) });
    }

    if (request.method === "PATCH" && adminTicketMatch) {
      const auth = await requirePortalUser(request, env.DB, "admin");
      if (auth.response) return auth.response;
      const ticket = await getTicket(env.DB, adminTicketMatch[1]);
      if (!ticket) return error(404, "TICKET_NOT_FOUND", "No encontramos ese ticket.");
      const input = await readBody(request);
      const status = cleanText(input.status || ticket.status, 24);
      const priority = cleanText(input.priority || ticket.priority, 16);
      if (!["open", "in_progress", "waiting_user", "resolved", "closed"].includes(status)) return error(422, "INVALID_TICKET_STATUS", "El estado del ticket no es válido.");
      if (!["low", "normal", "high", "urgent"].includes(priority)) return error(422, "INVALID_TICKET_PRIORITY", "La prioridad no es válida.");
      const updatedAt = now();
      const closedAt = ["resolved", "closed"].includes(status) ? updatedAt : null;
      await env.DB.prepare("UPDATE support_tickets SET status = ?, priority = ?, updated_at = ?, closed_at = ? WHERE id = ?")
        .bind(status, priority, updatedAt, closedAt, ticket.id).run();
      await auditAdmin(env.DB, auth.user.id, "ticket_updated", { targetUserId: ticket.user.id, detail: `${ticket.subject} · ${status} · ${priority}` });
      return json({ ticket: await getTicket(env.DB, ticket.id) });
    }

    if (request.method === "POST" && path === "/api/support/login") {
      const login = validateLogin(await readBody(request));
      if (login.error) return error(422, "INVALID_LOGIN", login.error);
      const attemptKey = await authAttemptKey(request, `support:${login.identifier}`);
      if (await isLoginRateLimited(env.DB, attemptKey)) {
        return error(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Esperá 15 minutos y probá de nuevo.");
      }
      const credential = await env.DB.prepare(`SELECT u.*, c.password_hash, c.password_salt, c.password_iterations
        FROM users u JOIN credentials c ON c.user_id = u.id
        WHERE u.email = ? OR u.handle = ? LIMIT 1`)
        .bind(login.identifier, login.identifier).first();
      const validPassword = credential
        ? await verifyPassword(login.password, credential)
        : (await derivePassword(login.password, hexToBytes("00112233445566778899aabbccddeeff")), false);
      if (!credential || !validPassword) {
        await recordFailedLogin(env.DB, attemptKey);
        return error(401, "INVALID_CREDENTIALS", "El usuario o la contraseña no coinciden.");
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(attemptKey),
        env.DB.prepare("DELETE FROM support_sessions WHERE expires_at <= ?").bind(now()),
      ]);
      const [session] = await Promise.all([
        createPortalSession(env.DB, credential.id, "support"),
        recordAccess(env.DB, credential.id, "support_login", clientMetadata(request, env)),
      ]);
      return json({
        authenticated: true,
        token: session.token,
        expiresAt: session.expiresAt,
        user: { ...userDto(credential), isBanned: Boolean(credential.is_banned), bannedReason: credential.banned_reason || "" },
      });
    }

    if (request.method === "POST" && path === "/api/support/logout") {
      await removePortalSession(request, env.DB, "support");
      return json({ authenticated: false, user: null });
    }

    if (request.method === "GET" && path === "/api/support/session") {
      const auth = await requirePortalUser(request, env.DB, "support");
      if (auth.response) return auth.response;
      return json({ authenticated: true, user: { ...userDto(auth.user), isBanned: Boolean(auth.user.is_banned), bannedReason: auth.user.banned_reason || "" } });
    }

    if (request.method === "GET" && path === "/api/support/tickets") {
      const auth = await requirePortalUser(request, env.DB, "support");
      if (auth.response) return auth.response;
      const result = await env.DB.prepare(`SELECT st.*, u.handle, u.display_name, u.email, u.avatar_url, u.is_banned,
          (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = st.id) AS message_count
        FROM support_tickets st JOIN users u ON u.id = st.user_id
        WHERE st.user_id = ? ORDER BY st.updated_at DESC LIMIT 100`)
        .bind(auth.user.id).all();
      return json({ tickets: (result.results || []).map(ticketDto) });
    }

    if (request.method === "POST" && path === "/api/support/tickets") {
      const auth = await requirePortalUser(request, env.DB, "support");
      if (auth.response) return auth.response;
      const input = await readBody(request);
      const category = cleanText(input.category, 20);
      const subject = cleanText(input.subject, 100);
      const body = cleanText(input.body, 2000);
      if (!["appeal", "bug", "account", "other"].includes(category)) return error(422, "INVALID_TICKET_CATEGORY", "Elegí un tipo de consulta.");
      if (subject.length < 5) return error(422, "TICKET_SUBJECT_REQUIRED", "Escribí un asunto más claro.");
      if (body.length < 15) return error(422, "TICKET_BODY_REQUIRED", "Contanos un poco más para poder ayudarte.");
      const ticketId = createId("tkt");
      const createdAt = now();
      const priority = category === "appeal" && auth.user.is_banned ? "high" : "normal";
      await env.DB.batch([
        env.DB.prepare("INSERT INTO support_tickets (id, user_id, category, subject, status, priority, created_at, updated_at, closed_at) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, NULL)")
          .bind(ticketId, auth.user.id, category, subject, priority, createdAt, createdAt),
        env.DB.prepare("INSERT INTO support_messages (id, ticket_id, author_id, author_role, body, created_at) VALUES (?, ?, ?, 'user', ?, ?)")
          .bind(createId("msg"), ticketId, auth.user.id, body, createdAt),
      ]);
      return json({ ticket: await getTicket(env.DB, ticketId, auth.user.id), messages: await getTicketMessages(env.DB, ticketId) }, 201);
    }

    const supportTicketMessageMatch = path.match(/^\/api\/support\/tickets\/([^/]+)\/messages$/);
    if (request.method === "POST" && supportTicketMessageMatch) {
      const auth = await requirePortalUser(request, env.DB, "support");
      if (auth.response) return auth.response;
      const ticket = await getTicket(env.DB, supportTicketMessageMatch[1], auth.user.id);
      if (!ticket) return error(404, "TICKET_NOT_FOUND", "No encontramos ese ticket.");
      const body = cleanText((await readBody(request)).body, 2000);
      if (body.length < 2) return error(422, "MESSAGE_REQUIRED", "Escribí un mensaje.");
      const createdAt = now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO support_messages (id, ticket_id, author_id, author_role, body, created_at) VALUES (?, ?, ?, 'user', ?, ?)")
          .bind(createId("msg"), ticket.id, auth.user.id, body, createdAt),
        env.DB.prepare("UPDATE support_tickets SET status = 'open', updated_at = ?, closed_at = NULL WHERE id = ?")
          .bind(createdAt, ticket.id),
      ]);
      return json({ ticket: await getTicket(env.DB, ticket.id, auth.user.id), messages: await getTicketMessages(env.DB, ticket.id) }, 201);
    }

    const supportTicketMatch = path.match(/^\/api\/support\/tickets\/([^/]+)$/);
    if (request.method === "GET" && supportTicketMatch) {
      const auth = await requirePortalUser(request, env.DB, "support");
      if (auth.response) return auth.response;
      const ticket = await getTicket(env.DB, supportTicketMatch[1], auth.user.id);
      if (!ticket) return error(404, "TICKET_NOT_FOUND", "No encontramos ese ticket.");
      return json({ ticket, messages: await getTicketMessages(env.DB, ticket.id) });
    }

    if (request.method === "POST" && path === "/api/live/media-auth") {
      const suppliedSecret = request.headers.get("x-live-auth-token") || "";
      if (!env.LIVE_AUTH_TOKEN || !constantTimeEqual(suppliedSecret, env.LIVE_AUTH_TOKEN)) {
        return error(401, "LIVE_AUTH_DENIED", "No autorizado.");
      }
      const body = await readBody(request);
      const action = cleanText(body.action, 20).toLowerCase();
      const streamPath = cleanText(body.path, 100).replace(/^\/+|\/+$/g, "");
      if (!/^(publish|read)$/.test(action) || !/^stream_[a-f0-9]{24}$/.test(streamPath)) {
        return error(401, "LIVE_AUTH_DENIED", "No autorizado.");
      }
      const active = await env.DB.prepare(`SELECT publish_token_hash, status, published_at FROM live_streams
        WHERE stream_path = ? AND status = 'live' AND last_seen_at > ?`)
        .bind(streamPath, liveActiveCutoff())
        .first();
      if (!active) return error(401, "LIVE_NOT_ACTIVE", "El directo no está activo.");
      if (action === "read" && !active.published_at) return error(401, "LIVE_NOT_READY", "El directo todavía no está listo.");
      if (action === "publish") {
        const publishToken = String(body.token || body.password || "");
        const receivedHash = await sha256(publishToken);
        if (!constantTimeEqual(receivedHash, active.publish_token_hash)) return error(401, "LIVE_AUTH_DENIED", "No autorizado.");
      }
      return json({ ok: true });
    }

    if (request.method === "POST" && path === "/api/live/start") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      if (!env.LIVE_WEBRTC_BASE_URL || !env.LIVE_AUTH_TOKEN) {
        return error(503, "LIVE_UNAVAILABLE", "Los directos todavía no están disponibles.");
      }
      const liveInput = validateLive(await readBody(request));
      if (liveInput.error) return error(422, "INVALID_LIVE_TITLE", liveInput.error);
      const liveId = createId("live");
      const streamPath = `stream_${randomHex(12)}`;
      const publishToken = randomHex(32);
      const timestamp = now();
      await env.DB.batch([
        env.DB.prepare("UPDATE live_streams SET status = 'ended', ended_at = COALESCE(ended_at, ?) WHERE user_id = ? AND status = 'live'")
          .bind(timestamp, auth.user.id),
        env.DB.prepare(`INSERT INTO live_streams
          (id, user_id, stream_path, publish_token_hash, title, description, status, published_at, started_at, last_seen_at, ended_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'live', NULL, ?, ?, NULL, ?)`)
          .bind(liveId, auth.user.id, streamPath, await sha256(publishToken), liveInput.title, liveInput.description, timestamp, timestamp, timestamp),
      ]);
      const live = await getLiveStream(env.DB, { liveId, viewerId: auth.user.id, liveBaseUrl: env.LIVE_WEBRTC_BASE_URL, includeEnded: true });
      return json({
        live,
        comments: [],
        publishUrl: `${String(env.LIVE_WEBRTC_BASE_URL).replace(/\/$/, "")}/${streamPath}/whip`,
        publishToken,
      }, 201);
    }

    if (request.method === "POST" && path === "/api/live/resume") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      if (!env.LIVE_WEBRTC_BASE_URL || !env.LIVE_AUTH_TOKEN) {
        return error(503, "LIVE_UNAVAILABLE", "Los directos todavía no están disponibles.");
      }
      const resumable = await env.DB.prepare(`SELECT id FROM live_streams
        WHERE user_id = ? AND status = 'live' AND last_seen_at > ?
        ORDER BY started_at DESC LIMIT 1`)
        .bind(auth.user.id, liveResumeCutoff())
        .first();
      if (!resumable) return error(404, "LIVE_RESUME_NOT_FOUND", "No hay un directo reciente para reanudar.");

      const streamPath = `stream_${randomHex(12)}`;
      const publishToken = randomHex(32);
      const timestamp = now();
      await env.DB.prepare(`UPDATE live_streams
        SET stream_path = ?, publish_token_hash = ?, published_at = NULL, last_seen_at = ?, ended_at = NULL
        WHERE id = ? AND user_id = ? AND status = 'live'`)
        .bind(streamPath, await sha256(publishToken), timestamp, resumable.id, auth.user.id)
        .run();
      const live = await getLiveStream(env.DB, { liveId: resumable.id, viewerId: auth.user.id, liveBaseUrl: env.LIVE_WEBRTC_BASE_URL, includeEnded: true });
      return json({
        live,
        comments: await getLiveComments(env.DB, resumable.id),
        publishUrl: `${String(env.LIVE_WEBRTC_BASE_URL).replace(/\/$/, "")}/${streamPath}/whip`,
        publishToken,
        resumed: true,
      });
    }

    const liveCommentDeleteMatch = path.match(/^\/api\/live\/([^/]+)\/comments\/([^/]+)$/);
    if (request.method === "DELETE" && liveCommentDeleteMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const [liveId, commentId] = liveCommentDeleteMatch.slice(1);
      const comment = await env.DB.prepare("SELECT author_id FROM live_comments WHERE id = ? AND live_id = ?")
        .bind(commentId, liveId)
        .first();
      if (!comment) return error(404, "LIVE_COMMENT_NOT_FOUND", "No encontramos ese comentario.");
      const role = await getLiveRole(env.DB, liveId, auth.user.id);
      if (comment.author_id !== auth.user.id && !role.isOwner && !role.isModerator) {
        return error(403, "LIVE_COMMENT_FORBIDDEN", "No tenés permiso para moderar este chat.");
      }
      await env.DB.prepare("DELETE FROM live_comments WHERE id = ? AND live_id = ?")
        .bind(commentId, liveId)
        .run();
      return new Response(null, { status: 204 });
    }

    const liveUserActionMatch = path.match(/^\/api\/live\/([^/]+)\/users\/([^/]+)\/(ban|moderator)$/);
    if (request.method === "POST" && liveUserActionMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const [, liveId, targetUserId, action] = liveUserActionMatch;
      const actorRole = await getLiveRole(env.DB, liveId, auth.user.id);
      if (!actorRole.isOwner && !(action === "ban" && actorRole.isModerator)) {
        return error(403, "LIVE_MODERATION_FORBIDDEN", "No tenés permiso para hacer eso.");
      }
      const liveOwner = await env.DB.prepare("SELECT user_id FROM live_streams WHERE id = ?").bind(liveId).first();
      if (!liveOwner) return error(404, "LIVE_NOT_FOUND", "No encontramos ese directo.");
      if (targetUserId === liveOwner.user_id) return error(422, "LIVE_OWNER_PROTECTED", "No se puede moderar al dueño del directo.");
      const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(targetUserId).first();
      if (!target) return error(404, "PROFILE_NOT_FOUND", "No encontramos a esa persona.");

      if (action === "moderator") {
        const existing = await env.DB.prepare("SELECT 1 AS found FROM live_moderators WHERE live_id = ? AND user_id = ?")
          .bind(liveId, targetUserId)
          .first();
        if (existing) await env.DB.prepare("DELETE FROM live_moderators WHERE live_id = ? AND user_id = ?").bind(liveId, targetUserId).run();
        else await env.DB.prepare("INSERT INTO live_moderators (live_id, user_id, granted_by, created_at) VALUES (?, ?, ?, ?)")
          .bind(liveId, targetUserId, auth.user.id, now())
          .run();
        return json({ active: !existing });
      }

      const targetRole = await getLiveRole(env.DB, liveId, targetUserId);
      if (actorRole.isModerator && targetRole.isModerator) {
        return error(403, "LIVE_MODERATOR_PROTECTED", "Solo el dueño puede moderar a otro moderador.");
      }
      const existing = await env.DB.prepare("SELECT 1 AS found FROM live_bans WHERE live_id = ? AND user_id = ?")
        .bind(liveId, targetUserId)
        .first();
      if (existing) {
        await env.DB.prepare("DELETE FROM live_bans WHERE live_id = ? AND user_id = ?").bind(liveId, targetUserId).run();
      } else {
        await env.DB.batch([
          env.DB.prepare("INSERT INTO live_bans (live_id, user_id, banned_by, created_at) VALUES (?, ?, ?, ?)")
            .bind(liveId, targetUserId, auth.user.id, now()),
          env.DB.prepare("DELETE FROM live_comments WHERE live_id = ? AND author_id = ?").bind(liveId, targetUserId),
          env.DB.prepare("DELETE FROM live_viewers WHERE live_id = ? AND user_id = ?").bind(liveId, targetUserId),
        ]);
      }
      return json({ active: !existing });
    }

    const liveMatch = path.match(/^\/api\/live\/([^/]+)\/(events|ready|suspend|end|heartbeat|broadcaster-heartbeat|like|comments)$/);
    if (liveMatch) {
      const [, liveId, action] = liveMatch;

      if (request.method === "POST" && action === "ready") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const timestamp = now();
        const result = await env.DB.prepare("UPDATE live_streams SET published_at = COALESCE(published_at, ?), last_seen_at = ? WHERE id = ? AND user_id = ? AND status = 'live'")
          .bind(timestamp, timestamp, liveId, auth.user.id)
          .run();
        if (!result.meta?.changes) {
          const current = await env.DB.prepare("SELECT status, published_at FROM live_streams WHERE id = ? AND user_id = ?").bind(liveId, auth.user.id).first();
          if (current?.status !== "live" || !current?.published_at) return error(404, "LIVE_NOT_FOUND", "No encontramos tu directo.");
        }
        const live = await getLiveStream(env.DB, { liveId, viewerId: auth.user.id, liveBaseUrl: env.LIVE_WEBRTC_BASE_URL });
        return json({ live });
      }

      if (request.method === "POST" && action === "suspend") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const result = await env.DB.prepare("UPDATE live_streams SET published_at = NULL, last_seen_at = ? WHERE id = ? AND user_id = ? AND status = 'live'")
          .bind(now(), liveId, auth.user.id)
          .run();
        if (!result.meta?.changes) return error(404, "LIVE_NOT_FOUND", "No encontramos tu directo.");
        const live = await getLiveStream(env.DB, { liveId, viewerId: auth.user.id, liveBaseUrl: env.LIVE_WEBRTC_BASE_URL, includeEnded: true });
        return json({ live });
      }

      if (request.method === "GET" && action === "events") {
        const timestamp = now();
        await env.DB.prepare("UPDATE live_streams SET status = 'ended', ended_at = COALESCE(ended_at, ?) WHERE id = ? AND status = 'live' AND last_seen_at <= ?")
          .bind(timestamp, liveId, liveResumeCutoff())
          .run();
        const live = await getLiveStream(env.DB, { liveId, viewerId: viewer?.id || "", liveBaseUrl: env.LIVE_WEBRTC_BASE_URL, includeEnded: true });
        if (!live) return error(404, "LIVE_NOT_FOUND", "No encontramos ese directo.");
        const moderation = live.permissions.canModerate ? await getLiveModeration(env.DB, liveId) : null;
        return json({ live, comments: await getLiveComments(env.DB, liveId), moderation });
      }

      if (request.method === "POST" && action === "heartbeat") {
        const body = await readBody(request);
        const viewerKey = cleanText(body.viewerKey, 40).toLowerCase();
        if (!/^[a-f0-9]{32}$/.test(viewerKey)) return error(422, "INVALID_VIEWER", "No pudimos registrar al espectador.");
        const active = await env.DB.prepare("SELECT id FROM live_streams WHERE id = ? AND status = 'live' AND published_at IS NOT NULL AND last_seen_at > ?")
          .bind(liveId, liveActiveCutoff())
          .first();
        if (!active) return error(404, "LIVE_ENDED", "El directo terminó.");
        if (viewer && (await getLiveRole(env.DB, liveId, viewer.id)).banned) {
          return error(403, "LIVE_CHAT_BANNED", "Fuiste bloqueado de este chat.");
        }
        const timestamp = now();
        await env.DB.batch([
          env.DB.prepare("DELETE FROM live_viewers WHERE last_seen_at < ?")
            .bind(new Date(Date.now() - 5 * 60_000).toISOString()),
          env.DB.prepare(`INSERT INTO live_viewers (live_id, viewer_key, user_id, last_seen_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(live_id, viewer_key) DO UPDATE SET user_id = excluded.user_id, last_seen_at = excluded.last_seen_at`)
            .bind(liveId, viewerKey, viewer?.id || null, timestamp),
        ]);
        const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM live_viewers WHERE live_id = ? AND last_seen_at > ?")
          .bind(liveId, liveViewerCutoff())
          .first();
        return json({ viewerCount: Number(count?.count || 0) });
      }

      if (request.method === "POST" && action === "broadcaster-heartbeat") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const result = await env.DB.prepare("UPDATE live_streams SET last_seen_at = ? WHERE id = ? AND user_id = ? AND status = 'live'")
          .bind(now(), liveId, auth.user.id)
          .run();
        if (!result.meta?.changes) return error(404, "LIVE_NOT_FOUND", "No encontramos tu directo.");
        return json({ ok: true });
      }

      if (request.method === "POST" && action === "end") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const timestamp = now();
        const result = await env.DB.prepare("UPDATE live_streams SET status = 'ended', ended_at = COALESCE(ended_at, ?), last_seen_at = ? WHERE id = ? AND user_id = ?")
          .bind(timestamp, timestamp, liveId, auth.user.id)
          .run();
        if (!result.meta?.changes) return error(404, "LIVE_NOT_FOUND", "No encontramos tu directo.");
        const live = await getLiveStream(env.DB, { liveId, viewerId: auth.user.id, liveBaseUrl: env.LIVE_WEBRTC_BASE_URL, includeEnded: true });
        return json({ live });
      }

      if (request.method === "POST" && action === "like") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const active = await env.DB.prepare("SELECT id FROM live_streams WHERE id = ? AND status = 'live' AND published_at IS NOT NULL AND last_seen_at > ?")
          .bind(liveId, liveActiveCutoff())
          .first();
        if (!active) return error(404, "LIVE_ENDED", "El directo terminó.");
        if ((await getLiveRole(env.DB, liveId, auth.user.id)).banned) return error(403, "LIVE_CHAT_BANNED", "Fuiste bloqueado de este chat.");
        const existing = await env.DB.prepare("SELECT 1 AS found FROM live_likes WHERE live_id = ? AND user_id = ?")
          .bind(liveId, auth.user.id)
          .first();
        if (existing) await env.DB.prepare("DELETE FROM live_likes WHERE live_id = ? AND user_id = ?").bind(liveId, auth.user.id).run();
        else await env.DB.prepare("INSERT INTO live_likes (live_id, user_id, created_at) VALUES (?, ?, ?)").bind(liveId, auth.user.id, now()).run();
        const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM live_likes WHERE live_id = ?").bind(liveId).first();
        return json({ active: !existing, likeCount: Number(count?.count || 0) });
      }

      if (request.method === "POST" && action === "comments") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const active = await env.DB.prepare("SELECT id FROM live_streams WHERE id = ? AND status = 'live' AND published_at IS NOT NULL AND last_seen_at > ?")
          .bind(liveId, liveActiveCutoff())
          .first();
        if (!active) return error(404, "LIVE_ENDED", "El directo terminó.");
        const authorRole = await getLiveRole(env.DB, liveId, auth.user.id);
        if (authorRole.banned) return error(403, "LIVE_CHAT_BANNED", "Fuiste bloqueado de este chat.");
        const body = normalizeLiveComment((await readBody(request)).body);
        if (!body) return error(422, "EMPTY_LIVE_COMMENT", "Escribí un comentario.");
        const commentId = createId("lvc");
        const createdAt = now();
        await env.DB.prepare("INSERT INTO live_comments (id, live_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(commentId, liveId, auth.user.id, body, createdAt)
          .run();
        const author = userDto(auth.user, { includeEmail: false });
        return json({
          comment: {
            id: commentId,
            body,
            createdAt,
            author: {
              id: author.id,
              handle: author.handle,
              displayName: author.displayName,
              avatarUrl: author.avatarUrl,
              avatarIndex: author.avatarIndex,
              isOwner: authorRole.isOwner,
              isModerator: authorRole.isModerator,
              isBanned: false,
            },
          },
        }, 201);
      }
    }

    if (request.method === "POST" && path === "/api/uploads") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      if (!env.MEDIA_UPLOAD_URL || !env.MEDIA_UPLOAD_TOKEN) {
        return error(503, "MEDIA_UNAVAILABLE", "La subida de archivos todavía no está disponible.");
      }

      const contentType = String(request.headers.get("content-type") || "").split(";")[0].toLowerCase();
      const contentLength = Number(request.headers.get("content-length") || 0);
      const mediaType = ALLOWED_IMAGE_TYPES.has(contentType) ? "image" : ALLOWED_VIDEO_TYPES.has(contentType) ? "video" : "";
      const maxBytes = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (!mediaType) return error(415, "UNSUPPORTED_MEDIA", "Usá una foto JPG, PNG o WebP, o un video MP4, WebM o MOV.");
      if (contentLength > maxBytes) return error(413, "MEDIA_TOO_LARGE", mediaType === "video" ? "El video puede pesar hasta 50 MB." : "La imagen puede pesar hasta 8 MB.");

      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength) return error(422, "EMPTY_MEDIA", "Elegí un archivo antes de subirlo.");
      if (bytes.byteLength > maxBytes) return error(413, "MEDIA_TOO_LARGE", mediaType === "video" ? "El video puede pesar hasta 50 MB." : "La imagen puede pesar hasta 8 MB.");

      const upstream = await fetch(env.MEDIA_UPLOAD_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`,
          "content-type": contentType,
          "x-user-id": auth.user.id,
        },
        body: bytes,
      });
      const uploaded = await upstream.json().catch(() => null);
      if (!upstream.ok || !uploaded?.url) {
        if (uploaded?.error === "video_too_long") return error(422, "VIDEO_TOO_LONG", "El video puede durar hasta 35 segundos.");
        return error(502, "UPLOAD_FAILED", mediaType === "video" ? "No pudimos procesar el video. Probá nuevamente." : "No pudimos guardar la imagen. Probá nuevamente.");
      }

      const mediaOrigin = new URL(env.MEDIA_UPLOAD_URL).origin;
      if (!String(uploaded.url).startsWith(`${mediaOrigin}/files/`)) {
        return error(502, "INVALID_MEDIA_RESPONSE", "El servidor de archivos devolvió una respuesta inválida.");
      }
      return json(mediaType === "video" ? { videoUrl: uploaded.url } : { imageUrl: uploaded.url }, 201);
    }

    if (request.method === "POST" && path === "/api/auth/register") {
      const registration = validateRegistration(await readBody(request));
      if (registration.error) return error(422, "INVALID_REGISTRATION", registration.error);

      const conflict = await env.DB.prepare("SELECT email, handle FROM users WHERE email = ? OR handle = ?")
        .bind(registration.email, registration.handle)
        .first();
      if (conflict?.email?.toLowerCase() === registration.email) {
        return error(409, "EMAIL_TAKEN", "Ya existe una cuenta con ese correo.");
      }
      if (conflict) return error(409, "HANDLE_TAKEN", "Ese usuario ya está ocupado.");

      const userId = createId("usr");
      const createdAt = now();
      const password = await hashPassword(registration.password);
      const avatarValue = `pig:${Number.parseInt(randomHex(1), 16) % 64}`;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id, email, handle, display_name, bio, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(userId, registration.email, registration.handle, registration.displayName, "", avatarValue, createdAt),
        env.DB.prepare("INSERT INTO credentials (user_id, password_hash, password_salt, password_iterations, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(userId, password.hash, password.salt, password.iterations, createdAt),
      ]);
      const token = await createSession(env.DB, userId);
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      await recordAccess(env.DB, userId, "register", clientMetadata(request, env));
      return json(
        { authenticated: true, user: userDto(user), unreadNotifications: 0 },
        201,
        { "set-cookie": sessionCookie(request, token) },
      );
    }

    if (request.method === "POST" && path === "/api/auth/login") {
      const login = validateLogin(await readBody(request));
      if (login.error) return error(422, "INVALID_LOGIN", login.error);

      const attemptKey = await authAttemptKey(request, login.identifier);
      if (await isLoginRateLimited(env.DB, attemptKey)) {
        return error(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Esperá 15 minutos y probá de nuevo.");
      }

      const credential = await env.DB.prepare(`SELECT u.*, c.password_hash, c.password_salt, c.password_iterations
        FROM users u
        JOIN credentials c ON c.user_id = u.id
        WHERE u.email = ? OR u.handle = ?
        LIMIT 1`)
        .bind(login.identifier, login.identifier)
        .first();
      let validPassword = false;
      if (credential) {
        validPassword = await verifyPassword(login.password, credential);
      } else {
        await derivePassword(login.password, hexToBytes("00112233445566778899aabbccddeeff"));
      }

      if (!credential || !validPassword) {
        await recordFailedLogin(env.DB, attemptKey);
        return error(401, "INVALID_CREDENTIALS", "El usuario o la contraseña no coinciden.");
      }

      if (credential.is_banned) {
        return error(403, "ACCOUNT_BANNED", credential.banned_reason || "Esta cuenta está bloqueada.", {
          supportUrl: env.SUPPORT_URL || "https://recetitas-soporte.stherling53.chatgpt.site",
        });
      }

      await env.DB.batch([
        env.DB.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(attemptKey),
        env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now()),
      ]);
      const [token, , unreadNotifications] = await Promise.all([
        createSession(env.DB, credential.id),
        recordAccess(env.DB, credential.id, "login", clientMetadata(request, env)),
        unreadNotificationCount(env.DB, credential.id),
      ]);
      return json(
        { authenticated: true, user: userDto(credential), unreadNotifications },
        200,
        { "set-cookie": sessionCookie(request, token) },
      );
    }

    if (request.method === "POST" && path === "/api/auth/logout") {
      await removeSession(request, env.DB);
      return json(
        { authenticated: false, user: null },
        200,
        { "set-cookie": sessionCookie(request, "", 0) },
      );
    }

    if (request.method === "GET" && path === "/api/session") {
      return json(viewer
        ? { authenticated: true, user: userDto(viewer), unreadNotifications: await unreadNotificationCount(env.DB, viewer.id) }
        : { authenticated: false, user: null, loginUrl: "/app/?login=1" });
    }

    if (request.method === "GET" && path === "/api/notifications/count") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      return json({ unreadCount: await unreadNotificationCount(env.DB, auth.user.id) });
    }

    if (request.method === "GET" && path === "/api/notifications") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const result = await env.DB.prepare(`SELECT
          n.*, a.handle, a.display_name, a.avatar_url, r.title AS recipe_title
        FROM notifications n
        JOIN users a ON a.id = n.actor_id
        LEFT JOIN recipes r ON r.id = n.recipe_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50`)
        .bind(auth.user.id)
        .all();
      return json({
        unreadCount: await unreadNotificationCount(env.DB, auth.user.id),
        items: (result.results || []).map((row) => ({
          id: row.id,
          type: row.type,
          recipeId: row.recipe_id || null,
          recipeTitle: row.recipe_title || "",
          commentId: row.comment_id || null,
          createdAt: row.created_at,
          read: Boolean(row.read_at),
          actor: {
            id: row.actor_id,
            handle: row.handle,
            displayName: row.display_name,
            avatarUrl: publicAvatarUrl(row.avatar_url),
            avatarIndex: avatarIndexForRow({ id: row.actor_id, avatar_url: row.avatar_url }),
          },
        })),
      });
    }

    if (request.method === "POST" && path === "/api/notifications/read-all") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      await env.DB.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE user_id = ?")
        .bind(now(), auth.user.id)
        .run();
      return json({ unreadCount: 0 });
    }

    const notificationReadMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (request.method === "POST" && notificationReadMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      await env.DB.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?")
        .bind(now(), notificationReadMatch[1], auth.user.id)
        .run();
      return json({ unreadCount: await unreadNotificationCount(env.DB, auth.user.id) });
    }

    if (request.method === "GET" && path === "/api/feed") {
      return json({ items: await getFeed(env.DB, viewer?.id || "", url.searchParams.get("limit")) });
    }

    if (request.method === "GET" && path === "/api/recipes/daily") {
      const language = RECIPE_LANGUAGES.has(url.searchParams.get("language")) ? url.searchParams.get("language") : null;
      const items = await getFeed(env.DB, viewer?.id || "", 40, null, null, language);
      const date = now().slice(0, 10);
      const seed = Number(date.replaceAll("-", ""));
      return json({ date, recipe: items.length ? items[seed % items.length] : null });
    }

    if (request.method === "GET" && path === "/api/recipes/by-ingredients") {
      const query = cleanText(url.searchParams.get("q"), 240);
      const language = RECIPE_LANGUAGES.has(url.searchParams.get("language")) ? url.searchParams.get("language") : null;
      const pantry = parsePantryInput(query);
      if (!pantry.length) return error(422, "PANTRY_REQUIRED", "Contanos qué ingredientes tenés.");
      const items = await getFeed(env.DB, viewer?.id || "", 40, null, null, language);
      const matches = items
        .map((recipe) => ({ recipe, ...scoreRecipeByPantry(recipe, pantry) }))
        .filter((match) => match.matchedPantry.length)
        .sort((first, second) => (
          Number(second.canMake) - Number(first.canMake)
          || second.matchedPantry.length - first.matchedPantry.length
          || first.missingIngredients.length - second.missingIngredients.length
          || second.recipe.likeCount - first.recipe.likeCount
        ))
        .slice(0, 12);
      return json({ query, pantry, items: matches });
    }

    if (request.method === "GET" && path === "/api/discover") {
      const selectedTag = normalizeTag(url.searchParams.get("tag"));
      const selectedLanguage = RECIPE_LANGUAGES.has(url.searchParams.get("language")) ? url.searchParams.get("language") : "";
      const [tagResult, creatorResult, items, lives] = await Promise.all([
        env.DB.prepare(`SELECT
            rt.tag,
            COUNT(DISTINCT rt.recipe_id) AS recipe_count,
            COALESCE(SUM(
              (SELECT COUNT(*) FROM likes l WHERE l.recipe_id = rt.recipe_id) +
              (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = rt.recipe_id)
            ), 0) AS engagement
          FROM recipe_tags rt
          GROUP BY rt.tag
          ORDER BY recipe_count DESC, engagement DESC, rt.tag ASC
          LIMIT 16`).all(),
        env.DB.prepare(`SELECT
            u.*,
            COUNT(DISTINCT r.id) AS recipe_count,
            (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS follower_count,
            EXISTS(SELECT 1 FROM follows mf WHERE mf.follower_id = ? AND mf.followed_id = u.id) AS followed_by_me
          FROM users u
          JOIN recipes r ON r.author_id = u.id
          WHERE (? = '' OR u.id <> ?)
          GROUP BY u.id
          ORDER BY recipe_count DESC, follower_count DESC, u.created_at DESC
          LIMIT 8`)
          .bind(viewer?.id || "", viewer?.id || "", viewer?.id || "")
          .all(),
        getFeed(env.DB, viewer?.id || "", 30, null, selectedTag || null, selectedLanguage || null),
        getDiscoverLiveStreams(env.DB, {
          viewerId: viewer?.id || "",
          liveBaseUrl: env.LIVE_WEBRTC_BASE_URL,
        }),
      ]);

      return json({
        selectedTag: selectedTag || null,
        selectedLanguage: selectedLanguage || null,
        tags: (tagResult.results || []).map((row) => ({
          name: row.tag,
          recipeCount: Number(row.recipe_count || 0),
          engagement: Number(row.engagement || 0),
        })),
        creators: (creatorResult.results || []).map((row) => ({
          ...userDto(row, { includeEmail: false }),
          recipeCount: Number(row.recipe_count || 0),
          followerCount: Number(row.follower_count || 0),
          followed: Boolean(row.followed_by_me),
        })),
        lives,
        items,
      });
    }

    if (request.method === "GET" && path === "/api/saved") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const result = await env.DB.prepare(`SELECT
          r.*, u.handle, u.display_name, u.avatar_url,
          COALESCE((SELECT json_group_array(rt.tag) FROM recipe_tags rt WHERE rt.recipe_id = r.id), '[]') AS tags_json,
          (SELECT re.note FROM recipe_edits re WHERE re.recipe_id = r.id ORDER BY re.created_at DESC LIMIT 1) AS last_edit_note,
          (SELECT COUNT(*) FROM likes l WHERE l.recipe_id = r.id) AS like_count,
          (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
          EXISTS(SELECT 1 FROM likes ml WHERE ml.recipe_id = r.id AND ml.user_id = ?) AS liked_by_me,
          EXISTS(SELECT 1 FROM follows af WHERE af.follower_id = ? AND af.followed_id = r.author_id) AS author_followed,
          1 AS saved_by_me
        FROM bookmarks b
        JOIN recipes r ON r.id = b.recipe_id
        JOIN users u ON u.id = r.author_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC`)
        .bind(auth.user.id, auth.user.id, auth.user.id)
        .all();
      return json({ items: (result.results || []).map(recipeDto) });
    }

    if (request.method === "GET" && path === "/api/collections/mine") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      return json({ collections: await getUserCollections(env.DB, auth.user.id, cleanText(url.searchParams.get("recipeId"), 80)) });
    }

    if (request.method === "POST" && path === "/api/collections") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const body = await readBody(request);
      const title = cleanText(body.title, 60);
      const description = cleanText(body.description, 180);
      if (title.length < 2) return error(422, "INVALID_COLLECTION", "El nombre de la carpeta debe tener al menos 2 caracteres.");
      const existingCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM recipe_collections WHERE user_id = ?")
        .bind(auth.user.id)
        .first();
      if (Number(existingCount?.count || 0) >= 30) return error(422, "COLLECTION_LIMIT", "Podés crear hasta 30 carpetas.");
      const collectionId = createId("col");
      const createdAt = now();
      await env.DB.prepare("INSERT INTO recipe_collections (id, user_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(collectionId, auth.user.id, title, description, createdAt, createdAt)
        .run();
      return json({ collection: collectionDto({ id: collectionId, user_id: auth.user.id, title, description, created_at: createdAt, updated_at: createdAt, item_count: 0 }) }, 201);
    }

    const collectionRecipeMatch = path.match(/^\/api\/collections\/([^/]+)\/recipes\/([^/]+)$/);
    if (request.method === "POST" && collectionRecipeMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const [, collectionId, recipeId] = collectionRecipeMatch;
      const collection = await env.DB.prepare("SELECT id FROM recipe_collections WHERE id = ? AND user_id = ?")
        .bind(collectionId, auth.user.id)
        .first();
      if (!collection) return error(404, "COLLECTION_NOT_FOUND", "No encontramos esa carpeta.");
      const recipe = await env.DB.prepare("SELECT id FROM recipes WHERE id = ?").bind(recipeId).first();
      if (!recipe) return error(404, "RECIPE_NOT_FOUND", "No encontramos esa receta.");
      const existing = await env.DB.prepare("SELECT 1 AS found FROM recipe_collection_items WHERE collection_id = ? AND recipe_id = ?")
        .bind(collectionId, recipeId)
        .first();
      if (existing) {
        await env.DB.batch([
          env.DB.prepare("DELETE FROM recipe_collection_items WHERE collection_id = ? AND recipe_id = ?").bind(collectionId, recipeId),
          env.DB.prepare("UPDATE recipe_collections SET updated_at = ? WHERE id = ?").bind(now(), collectionId),
        ]);
        return json({ active: false });
      }
      await env.DB.batch([
        env.DB.prepare("INSERT INTO recipe_collection_items (collection_id, recipe_id, added_at) VALUES (?, ?, ?)").bind(collectionId, recipeId, now()),
        env.DB.prepare("UPDATE recipe_collections SET updated_at = ? WHERE id = ?").bind(now(), collectionId),
      ]);
      return json({ active: true });
    }

    const collectionMatch = path.match(/^\/api\/collections\/([^/]+)$/);
    if (request.method === "GET" && collectionMatch) {
      const collection = await env.DB.prepare(`SELECT c.*, u.handle, u.display_name, u.avatar_url,
          (SELECT COUNT(*) FROM recipe_collection_items ci WHERE ci.collection_id = c.id) AS item_count
        FROM recipe_collections c JOIN users u ON u.id = c.user_id WHERE c.id = ?`)
        .bind(collectionMatch[1])
        .first();
      if (!collection) return error(404, "COLLECTION_NOT_FOUND", "No encontramos esa carpeta.");
      const itemIds = await env.DB.prepare("SELECT recipe_id FROM recipe_collection_items WHERE collection_id = ? ORDER BY added_at DESC LIMIT 60")
        .bind(collection.id)
        .all();
      const recipes = (await Promise.all((itemIds.results || []).map((item) => getRecipe(env.DB, item.recipe_id, viewer?.id || "")))).filter(Boolean);
      return json({ collection: collectionDto(collection), recipes });
    }

    if (request.method === "DELETE" && collectionMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const collection = await env.DB.prepare("SELECT id FROM recipe_collections WHERE id = ? AND user_id = ?")
        .bind(collectionMatch[1], auth.user.id)
        .first();
      if (!collection) return error(404, "COLLECTION_NOT_FOUND", "No encontramos esa carpeta.");
      await env.DB.prepare("DELETE FROM recipe_collections WHERE id = ? AND user_id = ?")
        .bind(collection.id, auth.user.id)
        .run();
      return new Response(null, { status: 204 });
    }

    if (["POST", "PATCH"].includes(request.method) && path === "/api/profile") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const body = await readBody(request);
      const displayName = cleanText(body.displayName, 60);
      const handle = cleanText(body.handle, 24).toLowerCase();
      const bio = cleanText(body.bio, 180);
      const requestedAvatarIndex = Number(body.avatarIndex);
      const hasAvatarIndex = body.avatarIndex !== undefined && body.avatarIndex !== null;

      if (displayName.length < 2 || !/^[a-z0-9_]{3,24}$/.test(handle)) {
        return error(422, "INVALID_PROFILE", "Revisá tu nombre y usuario.");
      }
      if (hasAvatarIndex && (!Number.isInteger(requestedAvatarIndex) || requestedAvatarIndex < 0 || requestedAvatarIndex > 63)) {
        return error(422, "INVALID_AVATAR", "Elegí un avatar válido.");
      }

      const conflict = await env.DB.prepare("SELECT id FROM users WHERE handle = ? AND id <> ?")
        .bind(handle, auth.user.id)
        .first();
      if (conflict) return error(409, "HANDLE_TAKEN", "Ese usuario ya está ocupado.");

      const avatarValue = `pig:${hasAvatarIndex ? requestedAvatarIndex : avatarIndexForRow(auth.user)}`;
      await env.DB.prepare("UPDATE users SET display_name = ?, handle = ?, bio = ?, avatar_url = ? WHERE id = ?")
        .bind(displayName, handle, bio, avatarValue, auth.user.id)
        .run();
      const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.user.id).first();
      return json({ user: userDto(updated) });
    }

    if (request.method === "POST" && path === "/api/recipes") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const body = await readBody(request);
      const mediaBaseUrl = env.MEDIA_UPLOAD_URL ? new URL(env.MEDIA_UPLOAD_URL).origin : "";
      const recipe = validateRecipe(body, mediaBaseUrl);
      if (recipe.error) return error(422, "INVALID_RECIPE", recipe.error);

      const recipeId = createId("rcp");
      const createdAt = now();
      const recipeInsert = env.DB.prepare(`INSERT INTO recipes (
          id, author_id, title, summary, image_key, image_url, video_url, cook_minutes,
          servings, difficulty, language, ingredients_json, steps_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          recipeId,
          auth.user.id,
          recipe.title,
          recipe.summary,
          recipe.imageKey,
          recipe.imageUrl,
          recipe.videoUrl,
          recipe.cookMinutes,
          recipe.servings,
          recipe.difficulty,
          recipe.language,
          JSON.stringify(recipe.ingredients),
          JSON.stringify(recipe.steps),
          createdAt,
        );
      const tagInserts = recipe.tags.map((tag) => env.DB.prepare("INSERT INTO recipe_tags (recipe_id, tag, created_at) VALUES (?, ?, ?)")
        .bind(recipeId, tag, createdAt));
      const pollId = recipe.poll ? createId("pol") : null;
      const pollInserts = recipe.poll ? [
        env.DB.prepare("INSERT INTO recipe_polls (id, recipe_id, question, created_at) VALUES (?, ?, ?, ?)")
          .bind(pollId, recipeId, recipe.poll.question, createdAt),
        ...recipe.poll.options.map((option, index) => env.DB.prepare("INSERT INTO recipe_poll_options (id, poll_id, label, position) VALUES (?, ?, ?, ?)")
          .bind(createId("opt"), pollId, option, index)),
      ] : [];
      await env.DB.batch([recipeInsert, ...tagInserts, ...pollInserts]);

      return json({ recipe: await getRecipe(env.DB, recipeId, auth.user.id) }, 201);
    }

    const commentMatch = path.match(/^\/api\/recipes\/([^/]+)\/comments\/([^/]+)$/);
    if (request.method === "DELETE" && commentMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const [, recipeId, commentId] = commentMatch;
      const comment = await env.DB.prepare("SELECT id, recipe_id, author_id, image_url FROM comments WHERE id = ? AND recipe_id = ?")
        .bind(commentId, recipeId)
        .first();
      if (!comment) return error(404, "COMMENT_NOT_FOUND", "No encontramos ese comentario.");
      if (!canDeleteOwnedComment(comment, auth.user)) return error(403, "NOT_OWNER", "Solo podés borrar tus comentarios.");
      if (comment.image_url && env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
        await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`,
            "x-user-id": auth.user.id,
            "x-file-url": comment.image_url,
          },
        }).catch(() => null);
      }
      await env.DB.prepare("DELETE FROM comments WHERE id = ? AND recipe_id = ? AND author_id = ?")
        .bind(commentId, recipeId, auth.user.id)
        .run();
      return new Response(null, { status: 204 });
    }

    const recipeMatch = path.match(/^\/api\/recipes\/([^/]+)(?:\/(like|save|comments|edits|poll))?$/);
    if (recipeMatch) {
      const [, recipeId, action] = recipeMatch;
      const recipe = await getRecipe(env.DB, recipeId, viewer?.id || "");
      if (!recipe) return error(404, "RECIPE_NOT_FOUND", "No encontramos esa receta.");

      if (request.method === "GET" && !action) return json({ recipe });

      if (request.method === "GET" && action === "edits") {
        const result = await env.DB.prepare(`SELECT id, note, created_at
          FROM recipe_edits
          WHERE recipe_id = ?
          ORDER BY created_at DESC
          LIMIT 30`)
          .bind(recipeId)
          .all();
        return json({ edits: (result.results || []).map((row) => ({ id: row.id, note: row.note, createdAt: row.created_at })) });
      }

      if (request.method === "PATCH" && !action) {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        if (recipe.author.id !== auth.user.id) return error(403, "NOT_OWNER", "Solo podés modificar tus recetas.");
        const body = await readBody(request);
        const mediaBaseUrl = env.MEDIA_UPLOAD_URL ? new URL(env.MEDIA_UPLOAD_URL).origin : "";
        const updatedRecipe = validateRecipe(body, mediaBaseUrl);
        if (updatedRecipe.error) return error(422, "INVALID_RECIPE", updatedRecipe.error);
        const editNote = cleanText(body.editNote, 180);
        if (editNote.length < 3) return error(422, "EDIT_NOTE_REQUIRED", "Contá brevemente qué modificaste.");

        const updatedAt = now();
        const statements = [
          env.DB.prepare(`UPDATE recipes SET
              title = ?, summary = ?, image_key = ?, image_url = ?, video_url = ?, cook_minutes = ?,
              servings = ?, difficulty = ?, language = ?, ingredients_json = ?, steps_json = ?, updated_at = ?, edit_count = edit_count + 1
            WHERE id = ? AND author_id = ?`)
            .bind(
              updatedRecipe.title,
              updatedRecipe.summary,
              updatedRecipe.imageKey,
              updatedRecipe.imageUrl,
              updatedRecipe.videoUrl,
              updatedRecipe.cookMinutes,
              updatedRecipe.servings,
              updatedRecipe.difficulty,
              updatedRecipe.language,
              JSON.stringify(updatedRecipe.ingredients),
              JSON.stringify(updatedRecipe.steps),
              updatedAt,
              recipeId,
              auth.user.id,
            ),
          env.DB.prepare("DELETE FROM recipe_tags WHERE recipe_id = ?").bind(recipeId),
          env.DB.prepare("INSERT INTO recipe_edits (id, recipe_id, author_id, note, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(createId("edt"), recipeId, auth.user.id, editNote, updatedAt),
          ...updatedRecipe.tags.map((tag) => env.DB.prepare("INSERT INTO recipe_tags (recipe_id, tag, created_at) VALUES (?, ?, ?)")
            .bind(recipeId, tag, updatedAt)),
        ];
        await env.DB.batch(statements);

        const replacedMedia = [
          recipe.imageUrl && recipe.imageUrl !== updatedRecipe.imageUrl ? recipe.imageUrl : null,
          recipe.videoUrl && recipe.videoUrl !== updatedRecipe.videoUrl ? recipe.videoUrl : null,
        ].filter(Boolean);
        if (replacedMedia.length && env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
          for (const mediaUrl of replacedMedia) {
            await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), {
              method: "DELETE",
              headers: {
                authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`,
                "x-user-id": auth.user.id,
                "x-file-url": mediaUrl,
              },
            }).catch(() => null);
          }
        }
        return json({ recipe: await getRecipe(env.DB, recipeId, auth.user.id) });
      }

      if (request.method === "POST" && ["like", "save"].includes(action)) {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const active = await toggleRelation(env.DB, action === "like" ? "likes" : "bookmarks", auth.user.id, recipeId);
        if (action === "like" && active) {
          await createNotification(env.DB, { userId: recipe.author.id, actorId: auth.user.id, type: "like", recipeId });
        } else if (action === "like") {
          await env.DB.prepare("DELETE FROM notifications WHERE user_id = ? AND actor_id = ? AND type = 'like' AND recipe_id = ?")
            .bind(recipe.author.id, auth.user.id, recipeId)
            .run();
        }
        return json({ active, recipe: await getRecipe(env.DB, recipeId, auth.user.id) });
      }

      if (request.method === "POST" && action === "poll") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const body = await readBody(request);
        const optionId = cleanText(body.optionId, 80);
        const option = await env.DB.prepare(`SELECT o.id, o.poll_id FROM recipe_poll_options o
          JOIN recipe_polls p ON p.id = o.poll_id
          WHERE o.id = ? AND p.recipe_id = ?`)
          .bind(optionId, recipeId)
          .first();
        if (!option) return error(422, "INVALID_POLL_OPTION", "Elegí una opción válida.");
        await env.DB.batch([
          env.DB.prepare("DELETE FROM recipe_poll_votes WHERE poll_id = ? AND user_id = ?").bind(option.poll_id, auth.user.id),
          env.DB.prepare("INSERT INTO recipe_poll_votes (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?)")
            .bind(option.poll_id, option.id, auth.user.id, now()),
        ]);
        return json({ poll: await getRecipePoll(env.DB, recipeId, auth.user.id) });
      }

      if (request.method === "GET" && action === "comments") {
        const result = await env.DB.prepare(`SELECT
            c.id, c.body, c.image_url, c.created_at, u.id AS author_id, u.handle,
            u.display_name, u.avatar_url
          FROM comments c
          JOIN users u ON u.id = c.author_id
          WHERE c.recipe_id = ?
          ORDER BY c.created_at ASC
          LIMIT 100`)
          .bind(recipeId)
          .all();
        return json({ comments: (result.results || []).map((row) => ({
          id: row.id,
          body: row.body,
          imageUrl: row.image_url || null,
          createdAt: row.created_at,
          author: {
            id: row.author_id,
            handle: row.handle,
            displayName: row.display_name,
            avatarUrl: publicAvatarUrl(row.avatar_url),
            avatarIndex: avatarIndexForRow({ id: row.author_id, avatar_url: row.avatar_url }),
          },
        })) });
      }

      if (request.method === "POST" && action === "comments") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const body = await readBody(request);
        const comment = cleanText(body.body, 500);
        const rawImageUrl = cleanText(body.imageUrl, 500);
        const mediaBaseUrl = env.MEDIA_UPLOAD_URL ? new URL(env.MEDIA_UPLOAD_URL).origin.replace(/\/$/, "") : "";
        const imageUrl = rawImageUrl
          && /^https:\/\//i.test(rawImageUrl)
          && (!mediaBaseUrl || rawImageUrl.startsWith(`${mediaBaseUrl}/files/`))
          ? rawImageUrl
          : null;
        if (rawImageUrl && !imageUrl) return error(422, "INVALID_COMMENT_IMAGE", "La foto del comentario no es válida.");
        if (!comment && !imageUrl) return error(422, "INVALID_COMMENT", "Escribí algo o agregá una foto antes de publicar.");
        const commentId = createId("cmt");
        const createdAt = now();
        await env.DB.prepare("INSERT INTO comments (id, recipe_id, author_id, body, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(commentId, recipeId, auth.user.id, comment, imageUrl, createdAt)
          .run();
        await createNotification(env.DB, { userId: recipe.author.id, actorId: auth.user.id, type: "comment", recipeId, commentId });
        return json({
          comment: {
            id: commentId,
            body: comment,
            imageUrl,
            createdAt,
            author: userDto(auth.user, { includeEmail: false }),
          },
        }, 201);
      }

      if (request.method === "DELETE" && !action) {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        if (recipe.author.id !== auth.user.id) return error(403, "NOT_OWNER", "Solo podés borrar tus recetas.");
        const mediaUrls = [recipe.imageUrl, recipe.videoUrl].filter(Boolean);
        if (mediaUrls.length && env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
          for (const mediaUrl of mediaUrls) {
            const deleted = await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), {
              method: "DELETE",
              headers: {
                authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`,
                "x-user-id": auth.user.id,
                "x-file-url": mediaUrl,
              },
            });
            if (!deleted.ok) return error(502, "MEDIA_DELETE_FAILED", "No pudimos eliminar uno de los archivos. Probá nuevamente.");
          }
        }
        if (env.MEDIA_UPLOAD_URL && env.MEDIA_UPLOAD_TOKEN) {
          const commentMedia = await env.DB.prepare("SELECT author_id, image_url FROM comments WHERE recipe_id = ? AND image_url IS NOT NULL")
            .bind(recipeId).all();
          for (const item of commentMedia.results || []) {
            await fetch(new URL("/delete", env.MEDIA_UPLOAD_URL), { method: "DELETE", headers: { authorization: `Bearer ${env.MEDIA_UPLOAD_TOKEN}`, "x-user-id": item.author_id, "x-file-url": item.image_url } }).catch(() => null);
          }
        }
        await env.DB.prepare("DELETE FROM recipes WHERE id = ?").bind(recipeId).run();
        return new Response(null, { status: 204 });
      }
    }

    const connectionsMatch = path.match(/^\/api\/profiles\/([a-z0-9_]{3,24})\/(followers|following)$/);
    if (request.method === "GET" && connectionsMatch) {
      const [, handle, connectionType] = connectionsMatch;
      const owner = await env.DB.prepare("SELECT id FROM users WHERE handle = ?").bind(handle).first();
      if (!owner) return error(404, "PROFILE_NOT_FOUND", "No encontramos ese perfil.");

      const sql = connectionType === "followers"
        ? `SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id
          WHERE f.followed_id = ? ORDER BY f.created_at DESC LIMIT 100`
        : `SELECT u.* FROM follows f JOIN users u ON u.id = f.followed_id
          WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`;
      const result = await env.DB.prepare(sql).bind(owner.id).all();
      return json({
        type: connectionType,
        people: (result.results || []).map((row) => userDto(row, { includeEmail: false })),
      });
    }

    const profileMatch = path.match(/^\/api\/profiles\/([a-z0-9_]{3,24})$/);
    if (request.method === "GET" && profileMatch) {
      const profile = await env.DB.prepare(`SELECT
          u.*,
          (SELECT COUNT(*) FROM recipes r WHERE r.author_id = u.id) AS recipe_count,
          (SELECT COUNT(*) FROM comments c WHERE c.author_id = u.id) AS authored_comment_count,
          (SELECT COUNT(*) FROM recipe_collections rc WHERE rc.user_id = u.id) AS collection_count,
          (SELECT COUNT(*) FROM likes l JOIN recipes r ON r.id = l.recipe_id WHERE r.author_id = u.id) AS received_like_count,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following_count,
          EXISTS(SELECT 1 FROM follows mf WHERE mf.followed_id = u.id AND mf.follower_id = ?) AS followed_by_me
        FROM users u
        WHERE u.handle = ?`)
        .bind(viewer?.id || "", profileMatch[1])
        .first();
      if (!profile) return error(404, "PROFILE_NOT_FOUND", "No encontramos ese perfil.");
      const [activeLive, collections, recipes] = await Promise.all([
        getLiveStream(env.DB, {
          userId: profile.id,
          viewerId: viewer?.id || "",
          liveBaseUrl: env.LIVE_WEBRTC_BASE_URL,
        }),
        getUserCollections(env.DB, profile.id),
        getFeed(env.DB, viewer?.id || "", 20, profile.id),
      ]);
      const achievements = profileAchievements({
        recipes: Number(profile.recipe_count || 0),
        comments: Number(profile.authored_comment_count || 0),
        collections: Number(profile.collection_count || 0),
        receivedLikes: Number(profile.received_like_count || 0),
        followers: Number(profile.follower_count || 0),
      });
      return json({
        profile: {
          ...userDto(profile, { includeEmail: false }),
          recipeCount: Number(profile.recipe_count || 0),
          followerCount: Number(profile.follower_count || 0),
          followingCount: Number(profile.following_count || 0),
          followed: Boolean(profile.followed_by_me),
          isOwnProfile: profile.id === viewer?.id,
          live: activeLive,
          collections,
          achievements,
        },
        recipes,
      });
    }

    const followMatch = path.match(/^\/api\/users\/([^/]+)\/follow$/);
    if (request.method === "POST" && followMatch) {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const followedId = followMatch[1];
      if (followedId === auth.user.id) return error(422, "SELF_FOLLOW", "No podés seguirte a vos mismo.");
      const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(followedId).first();
      if (!target) return error(404, "PROFILE_NOT_FOUND", "No encontramos ese perfil.");
      const existing = await env.DB.prepare("SELECT 1 AS found FROM follows WHERE follower_id = ? AND followed_id = ?")
        .bind(auth.user.id, followedId)
        .first();
      if (existing) {
        await env.DB.prepare("DELETE FROM follows WHERE follower_id = ? AND followed_id = ?")
          .bind(auth.user.id, followedId)
          .run();
        await env.DB.prepare("DELETE FROM notifications WHERE user_id = ? AND actor_id = ? AND type = 'follow'")
          .bind(followedId, auth.user.id)
          .run();
        return json({ active: false });
      }
      await env.DB.prepare("INSERT INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)")
        .bind(auth.user.id, followedId, now())
        .run();
      await createNotification(env.DB, { userId: followedId, actorId: auth.user.id, type: "follow" });
      return json({ active: true });
    }

    return error(404, "NOT_FOUND", "No existe ese endpoint.");
  } catch (cause) {
    if (cause?.message === "PAYLOAD_TOO_LARGE") return error(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande.");
    if (cause?.message === "INVALID_JSON") return error(400, "INVALID_JSON", "El contenido enviado no es válido.");
    console.error("recetitas-api", cause);
    return error(500, "INTERNAL_ERROR", "Tuvimos un problema. Probá de nuevo en unos segundos.");
  }
}

export const __test = {
  canDeleteOwnedComment,
  cleanText,
  cleanLines,
  hashPassword,
  normalizeLiveComment,
  parsePantryInput,
  scoreRecipeByPantry,
  avatarIndexForRow,
  hasValidOrigin,
  parseCookies,
  sessionCookie,
  validateLogin,
  validateLive,
  validateRecipePoll,
  validateRegistration,
  validateRecipe,
  verifyPassword,
};
