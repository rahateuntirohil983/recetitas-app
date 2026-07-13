import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { handleApiRequest } from "../src/handler.js";

class D1StatementMock {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new D1StatementMock(this.database, this.sql, bindings);
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.bindings);
    return { meta: { changes: Number(result.changes) } };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.bindings) || null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.bindings) };
  }
}

class D1Mock {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new D1StatementMock(this.database, sql);
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

const baseUrl = "https://recetitas.app";

const apiRequest = (path, { body, cookie = "", headers = {}, method = "GET" } = {}) => new Request(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(method === "GET" ? {} : { origin: baseUrl }),
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    ...(cookie ? { cookie } : {}),
    ...headers,
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test("starts, authorizes and publishes a live stream on the existing production schema", async (context) => {
  const database = new DatabaseSync(":memory:");
  context.after(() => database.close());
  database.exec("PRAGMA foreign_keys = ON");

  // Production already had this table before published_at was introduced.
  database.exec(`CREATE TABLE live_streams (
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
  )`);

  const env = {
    DB: new D1Mock(database),
    LIVE_AUTH_TOKEN: "media-auth-secret",
    LIVE_WEBRTC_BASE_URL: "https://media-recetitas.hex-rp.com/live",
  };

  const health = await handleApiRequest(apiRequest("/api/health"), env);
  assert.equal(health.status, 200);
  assert.ok(database.prepare("PRAGMA table_info(live_streams)").all().some((column) => column.name === "published_at"));

  const sessionToken = "a".repeat(64);
  const timestamp = new Date().toISOString();
  database.prepare("INSERT INTO users (id, email, handle, display_name, bio, avatar_url, created_at) VALUES (?, ?, ?, ?, '', NULL, ?)")
    .run("user-live", "live@example.com", "livechef", "Live Chef", timestamp);
  database.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(createHash("sha256").update(sessionToken).digest("hex"), "user-live", timestamp, "2099-01-01T00:00:00.000Z");
  const cookie = `recetitas_session=${sessionToken}`;

  const startResponse = await handleApiRequest(apiRequest("/api/live/start", {
    method: "POST",
    cookie,
    body: { title: "Pasta en vivo", description: "Cocinamos juntos." },
  }), env);
  assert.equal(startResponse.status, 201);
  const started = await startResponse.json();
  assert.equal(started.live.status, "starting");
  assert.equal(started.live.playbackUrl, null);

  const stored = database.prepare("SELECT status, published_at, stream_path FROM live_streams WHERE id = ?").get(started.live.id);
  assert.equal(stored.status, "live");
  assert.equal(stored.published_at, null);

  const mediaHeaders = { "x-live-auth-token": env.LIVE_AUTH_TOKEN };
  const publishAuth = await handleApiRequest(apiRequest("/api/live/media-auth", {
    method: "POST",
    headers: mediaHeaders,
    body: { action: "publish", path: stored.stream_path, token: started.publishToken },
  }), env);
  assert.equal(publishAuth.status, 200);

  const earlyRead = await handleApiRequest(apiRequest("/api/live/media-auth", {
    method: "POST",
    headers: mediaHeaders,
    body: { action: "read", path: stored.stream_path },
  }), env);
  assert.equal(earlyRead.status, 401);

  const readyResponse = await handleApiRequest(apiRequest(`/api/live/${started.live.id}/ready`, {
    method: "POST",
    cookie,
    body: {},
  }), env);
  assert.equal(readyResponse.status, 200);
  const ready = await readyResponse.json();
  assert.equal(ready.live.status, "live");
  assert.match(ready.live.playbackUrl, /\/whep$/);

  const readAuth = await handleApiRequest(apiRequest("/api/live/media-auth", {
    method: "POST",
    headers: mediaHeaders,
    body: { action: "read", path: stored.stream_path },
  }), env);
  assert.equal(readAuth.status, 200);

  const stickerCommentResponse = await handleApiRequest(apiRequest(`/api/live/${started.live.id}/comments`, {
    method: "POST",
    cookie,
    body: { body: "[[sticker:heart]]" },
  }), env);
  assert.equal(stickerCommentResponse.status, 201);

  const suspendResponse = await handleApiRequest(apiRequest(`/api/live/${started.live.id}/suspend`, {
    method: "POST",
    cookie,
    body: {},
  }), env);
  assert.equal(suspendResponse.status, 200);
  const suspended = await suspendResponse.json();
  assert.equal(suspended.live.status, "starting");
  assert.equal(suspended.live.playbackUrl, null);

  const suspendedRead = await handleApiRequest(apiRequest("/api/live/media-auth", {
    method: "POST",
    headers: mediaHeaders,
    body: { action: "read", path: stored.stream_path },
  }), env);
  assert.equal(suspendedRead.status, 401);

  const resumeResponse = await handleApiRequest(apiRequest("/api/live/resume", {
    method: "POST",
    cookie,
    body: {},
  }), env);
  assert.equal(resumeResponse.status, 200);
  const resumed = await resumeResponse.json();
  assert.equal(resumed.live.id, started.live.id);
  assert.equal(resumed.live.status, "starting");
  assert.equal(resumed.comments.length, 1);
  assert.equal(resumed.comments[0].body, "[[sticker:heart]]");
  assert.notEqual(resumed.publishToken, started.publishToken);

  const resumedStored = database.prepare("SELECT stream_path, published_at FROM live_streams WHERE id = ?").get(started.live.id);
  assert.notEqual(resumedStored.stream_path, stored.stream_path);
  assert.equal(resumedStored.published_at, null);

  const stalePublishAuth = await handleApiRequest(apiRequest("/api/live/media-auth", {
    method: "POST",
    headers: mediaHeaders,
    body: { action: "publish", path: resumedStored.stream_path, token: started.publishToken },
  }), env);
  assert.equal(stalePublishAuth.status, 401);

  const resumedPublishAuth = await handleApiRequest(apiRequest("/api/live/media-auth", {
    method: "POST",
    headers: mediaHeaders,
    body: { action: "publish", path: resumedStored.stream_path, token: resumed.publishToken },
  }), env);
  assert.equal(resumedPublishAuth.status, 200);

  const resumedReadyResponse = await handleApiRequest(apiRequest(`/api/live/${started.live.id}/ready`, {
    method: "POST",
    cookie,
    body: {},
  }), env);
  assert.equal(resumedReadyResponse.status, 200);
  const resumedReady = await resumedReadyResponse.json();
  assert.equal(resumedReady.live.status, "live");
  assert.match(resumedReady.live.playbackUrl, new RegExp(`${resumedStored.stream_path}/whep$`));
});
