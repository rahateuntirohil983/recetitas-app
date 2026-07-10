const LOGIN_URL = "/signin-with-chatgpt?return_to=/app/";
const IMAGE_KEYS = new Set(["pumpkin", "gnocchi", "baking"]);

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
  "CREATE INDEX IF NOT EXISTS recipes_created_at_idx ON recipes(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS recipes_author_id_idx ON recipes(author_id)",
  "CREATE INDEX IF NOT EXISTS comments_recipe_id_idx ON comments(recipe_id, created_at)",
];

let schemaReady;
let demoCleanupReady;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
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

const getIdentity = (request) => {
  const url = new URL(request.url);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const email = request.headers.get("oai-authenticated-user-email")
    || (isLocal ? request.headers.get("x-dev-user-email") : null);

  if (!email || !email.includes("@")) return null;

  let displayName = "";
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");

  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      displayName = decodeURIComponent(encodedName);
    } catch {
      displayName = "";
    }
  }

  return {
    email: email.trim().toLowerCase(),
    displayName: cleanText(displayName, 60),
  };
};

const userDto = (row) => ({
  id: row.id,
  email: row.email,
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

const uniqueHandle = async (db, email) => {
  const base = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 18) || "cocinero";
  const normalized = base.length >= 3 ? base : `${base}cocina`;
  const existing = await db.prepare("SELECT id FROM users WHERE handle = ?").bind(normalized).first();
  return existing ? `${normalized}_${crypto.randomUUID().slice(0, 4)}` : normalized;
};

const ensureUser = async (db, identity) => {
  const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(identity.email).first();
  if (existing) return existing;

  const user = {
    id: createId("usr"),
    email: identity.email,
    handle: await uniqueHandle(db, identity.email),
    displayName: identity.displayName || cleanText(identity.email.split("@")[0], 60),
    createdAt: now(),
  };

  await db.prepare("INSERT INTO users (id, email, handle, display_name, bio, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(user.id, user.email, user.handle, user.displayName, "", null, user.createdAt)
    .run();

  return db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
};

const requireUser = async (request, db) => {
  const identity = getIdentity(request);
  if (!identity) {
    return { response: error(401, "AUTH_REQUIRED", "Iniciá sesión para continuar.", { loginUrl: LOGIN_URL }) };
  }
  return { user: await ensureUser(db, identity) };
};

const getFeed = async (db, viewerId = "", limit = 20, authorId = null) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 40);
  const where = authorId ? "WHERE r.author_id = ?" : "";
  const bindings = authorId
    ? [viewerId, viewerId, authorId, safeLimit]
    : [viewerId, viewerId, safeLimit];
  const result = await db.prepare(`SELECT
      r.*,
      u.handle,
      u.display_name,
      u.avatar_url,
      (SELECT COUNT(*) FROM likes l WHERE l.recipe_id = r.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
      EXISTS(SELECT 1 FROM likes ml WHERE ml.recipe_id = r.id AND ml.user_id = ?) AS liked_by_me,
      EXISTS(SELECT 1 FROM bookmarks mb WHERE mb.recipe_id = r.id AND mb.user_id = ?) AS saved_by_me
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
      EXISTS(SELECT 1 FROM bookmarks mb WHERE mb.recipe_id = r.id AND mb.user_id = ?) AS saved_by_me
    FROM recipes r
    JOIN users u ON u.id = r.author_id
    WHERE r.id = ?`)
    .bind(viewerId, viewerId, recipeId)
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

  if (title.length < 3 || summary.length < 10 || ingredients.length === 0 || steps.length === 0) {
    return { error: "Completá título, descripción, ingredientes y pasos." };
  }
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
    const identity = getIdentity(request);
    const viewer = identity ? await ensureUser(env.DB, identity) : null;

    if (request.method === "GET" && path === "/api/health") {
      return json({ ok: true, service: "recetitas-api", database: "ready" });
    }

    if (request.method === "GET" && path === "/api/session") {
      return json(viewer
        ? { authenticated: true, user: userDto(viewer), logoutUrl: "/signout-with-chatgpt?return_to=/app/" }
        : { authenticated: false, user: null, loginUrl: LOGIN_URL });
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
          1 AS saved_by_me
        FROM bookmarks b
        JOIN recipes r ON r.id = b.recipe_id
        JOIN users u ON u.id = r.author_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC`)
        .bind(auth.user.id, auth.user.id)
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

    const profileMatch = path.match(/^\/api\/profiles\/([a-z0-9_]{3,24})$/);
    if (request.method === "GET" && profileMatch) {
      const profile = await env.DB.prepare(`SELECT
          u.*,
          (SELECT COUNT(*) FROM recipes r WHERE r.author_id = u.id) AS recipe_count,
          (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS follower_count,
          EXISTS(SELECT 1 FROM follows mf WHERE mf.followed_id = u.id AND mf.follower_id = ?) AS followed_by_me
        FROM users u
        WHERE u.handle = ?`)
        .bind(viewer?.id || "", profileMatch[1])
        .first();
      if (!profile) return error(404, "PROFILE_NOT_FOUND", "No encontramos ese perfil.");
      return json({
        profile: {
          ...userDto(profile),
          recipeCount: Number(profile.recipe_count || 0),
          followerCount: Number(profile.follower_count || 0),
          followed: Boolean(profile.followed_by_me),
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
  getIdentity,
  hasValidOrigin,
  validateRecipe,
};
