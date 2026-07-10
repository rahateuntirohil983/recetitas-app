const IMAGE_KEYS = new Set(["pumpkin", "gnocchi", "baking"]);
const SESSION_COOKIE = "recetitas_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100_000;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    image_key TEXT NOT NULL DEFAULT 'pumpkin',
    image_url TEXT,
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
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
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
  "CREATE INDEX IF NOT EXISTS recipes_created_at_idx ON recipes(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS recipes_author_id_idx ON recipes(author_id)",
  "CREATE INDEX IF NOT EXISTS comments_recipe_id_idx ON comments(recipe_id, created_at)",
  "CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)",
  "CREATE INDEX IF NOT EXISTS auth_attempts_key_created_idx ON auth_attempts(attempt_key, created_at)",
];

let schemaReady;
let demoCleanupReady;

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

const hasValidOrigin = (request) => {
  if (!isWriteRequest(request)) return true;
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
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

const userDto = (row, { includeEmail = true } = {}) => ({
  id: row.id,
  ...(includeEmail ? { email: row.email } : {}),
  handle: row.handle,
  displayName: row.display_name,
  bio: row.bio || "",
  avatarUrl: row.avatar_url || null,
});

const recipeDto = (row) => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  imageKey: row.image_key,
  imageUrl: row.image_url || null,
  cookMinutes: Number(row.cook_minutes),
  servings: Number(row.servings),
  ingredients: parseJsonArray(row.ingredients_json),
  steps: parseJsonArray(row.steps_json),
  createdAt: row.created_at,
  likeCount: Number(row.like_count || 0),
  commentCount: Number(row.comment_count || 0),
  liked: Boolean(row.liked_by_me),
  saved: Boolean(row.saved_by_me),
  author: {
    id: row.author_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || null,
    followed: Boolean(row.author_followed),
  },
});

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

const cleanupDemoData = async (db) => {
  if (!demoCleanupReady) {
    const statements = [
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

const getSessionUser = async (request, db) => {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!/^[a-f0-9]{64}$/i.test(token || "")) return null;
  const tokenHash = await sha256(token);
  return db.prepare(`SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(tokenHash, now())
    .first();
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

const getFeed = async (db, viewerId = "", limit = 20, authorId = null) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 40);
  const where = authorId ? "WHERE r.author_id = ?" : "";
  const bindings = authorId
    ? [viewerId, viewerId, viewerId, authorId, safeLimit]
    : [viewerId, viewerId, viewerId, safeLimit];
  const result = await db.prepare(`SELECT
      r.*,
      u.handle,
      u.display_name,
      u.avatar_url,
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
  return row ? recipeDto(row) : null;
};

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

const validateRecipe = (body) => {
  const title = cleanText(body.title, 90);
  const summary = cleanText(body.summary, 280);
  const ingredients = cleanLines(body.ingredients, 40, 120);
  const steps = cleanLines(body.steps, 30, 500);
  const cookMinutes = Number(body.cookMinutes);
  const servings = Number(body.servings);
  const imageKey = IMAGE_KEYS.has(body.imageKey) ? body.imageKey : "pumpkin";
  const rawImageUrl = cleanText(body.imageUrl, 500);
  const imageUrl = rawImageUrl && /^https:\/\//i.test(rawImageUrl) ? rawImageUrl : null;

  if (title.length < 3) return { error: "El nombre de la receta debe tener al menos 3 caracteres." };
  if (summary.length < 10) return { error: "La historia corta debe tener al menos 10 caracteres." };
  if (ingredients.length === 0) return { error: "Agregá al menos un ingrediente." };
  if (steps.length === 0) return { error: "Agregá al menos un paso." };
  if (!Number.isInteger(cookMinutes) || cookMinutes < 1 || cookMinutes > 1440) {
    return { error: "El tiempo de cocción no es válido." };
  }
  if (!Number.isInteger(servings) || servings < 1 || servings > 24) {
    return { error: "La cantidad de porciones no es válida." };
  }

  return { title, summary, ingredients, steps, cookMinutes, servings, imageKey, imageUrl };
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
    await ensureSchema(env.DB);
    await cleanupDemoData(env.DB);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/api";
    const viewer = await getSessionUser(request, env.DB);

    if (request.method === "GET" && path === "/api/health") {
      return json({ ok: true, service: "recetitas-api", database: "ready" });
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
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id, email, handle, display_name, bio, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(userId, registration.email, registration.handle, registration.displayName, "", null, createdAt),
        env.DB.prepare("INSERT INTO credentials (user_id, password_hash, password_salt, password_iterations, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(userId, password.hash, password.salt, password.iterations, createdAt),
      ]);
      const token = await createSession(env.DB, userId);
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      return json(
        { authenticated: true, user: userDto(user) },
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

      await env.DB.batch([
        env.DB.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(attemptKey),
        env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now()),
      ]);
      const token = await createSession(env.DB, credential.id);
      return json(
        { authenticated: true, user: userDto(credential) },
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
        ? { authenticated: true, user: userDto(viewer) }
        : { authenticated: false, user: null, loginUrl: "/app/?login=1" });
    }

    if (request.method === "GET" && path === "/api/feed") {
      return json({ items: await getFeed(env.DB, viewer?.id || "", url.searchParams.get("limit")) });
    }

    if (request.method === "GET" && path === "/api/saved") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const result = await env.DB.prepare(`SELECT
          r.*, u.handle, u.display_name, u.avatar_url,
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

    if (["POST", "PATCH"].includes(request.method) && path === "/api/profile") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const body = await readBody(request);
      const displayName = cleanText(body.displayName, 60);
      const handle = cleanText(body.handle, 24).toLowerCase();
      const bio = cleanText(body.bio, 180);

      if (displayName.length < 2 || !/^[a-z0-9_]{3,24}$/.test(handle)) {
        return error(422, "INVALID_PROFILE", "Revisá tu nombre y usuario.");
      }

      const conflict = await env.DB.prepare("SELECT id FROM users WHERE handle = ? AND id <> ?")
        .bind(handle, auth.user.id)
        .first();
      if (conflict) return error(409, "HANDLE_TAKEN", "Ese usuario ya está ocupado.");

      await env.DB.prepare("UPDATE users SET display_name = ?, handle = ?, bio = ? WHERE id = ?")
        .bind(displayName, handle, bio, auth.user.id)
        .run();
      const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(auth.user.id).first();
      return json({ user: userDto(updated) });
    }

    if (request.method === "POST" && path === "/api/recipes") {
      const auth = await requireUser(request, env.DB);
      if (auth.response) return auth.response;
      const body = await readBody(request);
      const recipe = validateRecipe(body);
      if (recipe.error) return error(422, "INVALID_RECIPE", recipe.error);

      const recipeId = createId("rcp");
      await env.DB.prepare(`INSERT INTO recipes (
          id, author_id, title, summary, image_key, image_url, cook_minutes,
          servings, ingredients_json, steps_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          recipeId,
          auth.user.id,
          recipe.title,
          recipe.summary,
          recipe.imageKey,
          recipe.imageUrl,
          recipe.cookMinutes,
          recipe.servings,
          JSON.stringify(recipe.ingredients),
          JSON.stringify(recipe.steps),
          now(),
        )
        .run();

      return json({ recipe: await getRecipe(env.DB, recipeId, auth.user.id) }, 201);
    }

    const recipeMatch = path.match(/^\/api\/recipes\/([^/]+)(?:\/(like|save|comments))?$/);
    if (recipeMatch) {
      const [, recipeId, action] = recipeMatch;
      const recipe = await getRecipe(env.DB, recipeId, viewer?.id || "");
      if (!recipe) return error(404, "RECIPE_NOT_FOUND", "No encontramos esa receta.");

      if (request.method === "GET" && !action) return json({ recipe });

      if (request.method === "POST" && ["like", "save"].includes(action)) {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const active = await toggleRelation(env.DB, action === "like" ? "likes" : "bookmarks", auth.user.id, recipeId);
        return json({ active, recipe: await getRecipe(env.DB, recipeId, auth.user.id) });
      }

      if (request.method === "GET" && action === "comments") {
        const result = await env.DB.prepare(`SELECT
            c.id, c.body, c.created_at, u.id AS author_id, u.handle,
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
          createdAt: row.created_at,
          author: {
            id: row.author_id,
            handle: row.handle,
            displayName: row.display_name,
            avatarUrl: row.avatar_url || null,
          },
        })) });
      }

      if (request.method === "POST" && action === "comments") {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        const body = await readBody(request);
        const comment = cleanText(body.body, 500);
        if (!comment) return error(422, "INVALID_COMMENT", "Escribí un comentario antes de publicar.");
        const commentId = createId("cmt");
        await env.DB.prepare("INSERT INTO comments (id, recipe_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(commentId, recipeId, auth.user.id, comment, now())
          .run();
        return json({ id: commentId }, 201);
      }

      if (request.method === "DELETE" && !action) {
        const auth = await requireUser(request, env.DB);
        if (auth.response) return auth.response;
        if (recipe.author.id !== auth.user.id) return error(403, "NOT_OWNER", "Solo podés borrar tus recetas.");
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
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following_count,
          EXISTS(SELECT 1 FROM follows mf WHERE mf.followed_id = u.id AND mf.follower_id = ?) AS followed_by_me
        FROM users u
        WHERE u.handle = ?`)
        .bind(viewer?.id || "", profileMatch[1])
        .first();
      if (!profile) return error(404, "PROFILE_NOT_FOUND", "No encontramos ese perfil.");
      return json({
        profile: {
          ...userDto(profile, { includeEmail: false }),
          recipeCount: Number(profile.recipe_count || 0),
          followerCount: Number(profile.follower_count || 0),
          followingCount: Number(profile.following_count || 0),
          followed: Boolean(profile.followed_by_me),
          isOwnProfile: profile.id === viewer?.id,
        },
        recipes: await getFeed(env.DB, viewer?.id || "", 20, profile.id),
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
        return json({ active: false });
      }
      await env.DB.prepare("INSERT INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)")
        .bind(auth.user.id, followedId, now())
        .run();
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
  cleanText,
  cleanLines,
  hashPassword,
  hasValidOrigin,
  parseCookies,
  sessionCookie,
  validateLogin,
  validateRegistration,
  validateRecipe,
  verifyPassword,
};
