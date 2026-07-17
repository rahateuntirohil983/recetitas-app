import test from "node:test";
import assert from "node:assert/strict";
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
const apiRequest = (path, { authorization = "", body, ip = "203.0.113.10", method = "GET" } = {}) => new Request(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(method === "GET" ? {} : { origin: baseUrl }),
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    ...(authorization ? { authorization: `Bearer ${authorization}` } : {}),
    "cf-connecting-ip": ip,
    "user-agent": "recetitas-api-test",
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const register = (env, { displayName, email, handle, password, ip }) => handleApiRequest(apiRequest("/api/auth/register", {
  method: "POST",
  ip,
  body: { displayName, email, handle, password },
}), env);

test("team members administer users and answer banned-account appeals", async (context) => {
  const database = new DatabaseSync(":memory:");
  context.after(() => database.close());
  database.exec("PRAGMA foreign_keys = ON");
  const env = { DB: new D1Mock(database), SUPPORT_URL: "https://support.example.test" };

  assert.equal((await handleApiRequest(apiRequest("/api/health"), env)).status, 200);
  assert.equal((await register(env, {
    displayName: "Martina Villarreal",
    email: "waddles@example.test",
    handle: "waddles",
    password: "martipipe123",
    ip: "203.0.113.11",
  })).status, 201);
  assert.equal((await register(env, {
    displayName: "Persona de prueba",
    email: "person@example.test",
    handle: "personatest",
    password: "persona12345",
    ip: "203.0.113.20",
  })).status, 201);

  const adminLoginResponse = await handleApiRequest(apiRequest("/api/admin/login", {
    method: "POST",
    ip: "203.0.113.11",
    body: { identifier: "waddles", password: "martipipe123" },
  }), env);
  assert.equal(adminLoginResponse.status, 200);
  const adminLogin = await adminLoginResponse.json();
  assert.equal(adminLogin.user.isTeam, true);

  const contentAuthor = database.prepare("SELECT id FROM users WHERE handle = 'personatest'").get();
  database.prepare(`INSERT INTO recipes (
      id, author_id, title, summary, image_key, cook_minutes, servings, ingredients_json, steps_json, created_at
    ) VALUES (?, ?, ?, ?, 'pumpkin', 20, 2, '["harina"]', '["mezclar"]', ?)`)
    .run("rcp_admin_test", contentAuthor.id, "Publicación para moderar", "Contenido creado para probar la moderación.", new Date().toISOString());
  database.prepare("INSERT INTO comments (id, recipe_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .run("cmt_admin_test", "rcp_admin_test", contentAuthor.id, "Comentario para moderar", new Date().toISOString());

  const contentResponse = await handleApiRequest(apiRequest("/api/admin/content?search=personatest", {
    authorization: adminLogin.token,
  }), env);
  assert.equal(contentResponse.status, 200);
  const content = await contentResponse.json();
  assert.equal(content.recipes[0].id, "rcp_admin_test");
  assert.equal(content.comments[0].id, "cmt_admin_test");

  const deleteCommentResponse = await handleApiRequest(apiRequest("/api/admin/comments/cmt_admin_test", {
    method: "DELETE",
    authorization: adminLogin.token,
  }), env);
  assert.equal(deleteCommentResponse.status, 204);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM comments WHERE id = 'cmt_admin_test'").get().count, 0);

  const deleteRecipeResponse = await handleApiRequest(apiRequest("/api/admin/recipes/rcp_admin_test", {
    method: "DELETE",
    authorization: adminLogin.token,
  }), env);
  assert.equal(deleteRecipeResponse.status, 204);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM recipes WHERE id = 'rcp_admin_test'").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM admin_audit_logs WHERE action IN ('recipe_deleted', 'comment_deleted')").get().count, 2);

  const usersResponse = await handleApiRequest(apiRequest("/api/admin/users?search=personatest", {
    authorization: adminLogin.token,
  }), env);
  assert.equal(usersResponse.status, 200);
  const users = await usersResponse.json();
  assert.equal(users.users.length, 1);
  assert.equal(users.users[0].lastIpAddress, "203.0.113.20");
  const target = users.users[0];

  const banResponse = await handleApiRequest(apiRequest(`/api/admin/users/${target.id}/ban`, {
    method: "POST",
    authorization: adminLogin.token,
    body: { banned: true, reason: "Incumplimiento de las reglas de convivencia." },
  }), env);
  assert.equal(banResponse.status, 200);
  assert.equal((await banResponse.json()).user.isBanned, true);

  const blockedLogin = await handleApiRequest(apiRequest("/api/auth/login", {
    method: "POST",
    body: { identifier: "personatest", password: "persona12345" },
  }), env);
  assert.equal(blockedLogin.status, 403);
  assert.equal((await blockedLogin.json()).error.code, "ACCOUNT_BANNED");

  const supportLoginResponse = await handleApiRequest(apiRequest("/api/support/login", {
    method: "POST",
    ip: "203.0.113.21",
    body: { identifier: "personatest", password: "persona12345" },
  }), env);
  assert.equal(supportLoginResponse.status, 200);
  const supportLogin = await supportLoginResponse.json();
  assert.equal(supportLogin.user.isBanned, true);

  const ticketResponse = await handleApiRequest(apiRequest("/api/support/tickets", {
    method: "POST",
    authorization: supportLogin.token,
    body: {
      category: "appeal",
      subject: "Quiero apelar el bloqueo",
      body: "Quisiera explicar lo sucedido y solicitar una revisión del bloqueo.",
    },
  }), env);
  assert.equal(ticketResponse.status, 201);
  const createdTicket = await ticketResponse.json();
  assert.equal(createdTicket.ticket.priority, "high");

  const replyResponse = await handleApiRequest(apiRequest(`/api/admin/tickets/${createdTicket.ticket.id}/messages`, {
    method: "POST",
    authorization: adminLogin.token,
    body: { body: "Recibimos tu apelación y ya la estamos revisando." },
  }), env);
  assert.equal(replyResponse.status, 201);
  assert.equal((await replyResponse.json()).messages.length, 2);

  const ticketDetailResponse = await handleApiRequest(apiRequest(`/api/support/tickets/${createdTicket.ticket.id}`, {
    authorization: supportLogin.token,
  }), env);
  assert.equal(ticketDetailResponse.status, 200);
  const ticketDetail = await ticketDetailResponse.json();
  assert.equal(ticketDetail.ticket.status, "waiting_user");
  assert.equal(ticketDetail.messages.at(-1).role, "team");
});
