import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handleApiRequest } from "../src/handler.js";

class D1StatementMock {
  constructor(database, sql, bindings = []) { this.database = database; this.sql = sql; this.bindings = bindings; }
  bind(...bindings) { return new D1StatementMock(this.database, this.sql, bindings); }
  async run() { const result = this.database.prepare(this.sql).run(...this.bindings); return { meta: { changes: Number(result.changes) } }; }
  async first() { return this.database.prepare(this.sql).get(...this.bindings) || null; }
  async all() { return { results: this.database.prepare(this.sql).all(...this.bindings) }; }
}
class D1Mock {
  constructor(database) { this.database = database; }
  prepare(sql) { return new D1StatementMock(this.database, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
}

const baseUrl = "https://recetitas.app";
const request = (path, { method = "GET", body, cookie = "" } = {}) => new Request(`${baseUrl}${path}`, {
  method,
  headers: {
    ...(method === "GET" ? {} : { origin: baseUrl }),
    ...(body === undefined ? {} : { "content-type": "application/json" }),
    ...(cookie ? { cookie } : {}),
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test("persists assisted-cooking and social recipe features", async (context) => {
  const database = new DatabaseSync(":memory:");
  context.after(() => database.close());
  database.exec("PRAGMA foreign_keys = ON");
  const env = { DB: new D1Mock(database), MEDIA_UPLOAD_URL: "https://media.example/upload" };
  await handleApiRequest(request("/api/health"), env);

  const registration = await handleApiRequest(request("/api/auth/register", {
    method: "POST",
    body: { displayName: "Cocinera Test", handle: "cocineratest", email: "cook@example.test", password: "cocina12345" },
  }), env);
  assert.equal(registration.status, 201);
  const cookie = registration.headers.get("set-cookie").split(";")[0];

  const createdResponse = await handleApiRequest(request("/api/recipes", {
    method: "POST",
    cookie,
    body: {
      title: "Panqueques de prueba",
      summary: "Una receta completa para validar la cocina asistida.",
      cookMinutes: 20,
      timerEnabled: false,
      servings: 4,
      difficulty: "medium",
      language: "es",
      ingredients: ["2 huevos", "200 g de harina", "1 taza de leche"],
      steps: ["Mezclar los ingredientes", "Cocinar de ambos lados"],
      poll: { question: "¿Con qué los acompañás?", options: ["Fruta", "Dulce de leche"] },
    },
  }), env);
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.recipe.difficulty, "medium");
  assert.equal(created.recipe.timerEnabled, false);
  assert.equal(created.recipe.poll.options.length, 2);

  const voteResponse = await handleApiRequest(request(`/api/recipes/${created.recipe.id}/poll`, {
    method: "POST", cookie, body: { optionId: created.recipe.poll.options[0].id },
  }), env);
  assert.equal(voteResponse.status, 200);
  assert.equal((await voteResponse.json()).poll.totalVotes, 1);

  const collectionResponse = await handleApiRequest(request("/api/collections", {
    method: "POST", cookie, body: { title: "Para desayunar", description: "Recetas favoritas de la mañana" },
  }), env);
  assert.equal(collectionResponse.status, 201);
  const collection = (await collectionResponse.json()).collection;
  const addResponse = await handleApiRequest(request(`/api/collections/${collection.id}/recipes/${created.recipe.id}`, {
    method: "POST", cookie, body: {},
  }), env);
  assert.equal((await addResponse.json()).active, true);

  const commentResponse = await handleApiRequest(request(`/api/recipes/${created.recipe.id}/comments`, {
    method: "POST", cookie, body: { body: "Así me quedó", imageUrl: "https://media.example/files/result.webp" },
  }), env);
  assert.equal(commentResponse.status, 201);
  assert.equal((await commentResponse.json()).comment.imageUrl, "https://media.example/files/result.webp");

  const pantryResponse = await handleApiRequest(request("/api/recipes/by-ingredients?q=tengo%20huevo,%20harina%20y%20leche"), env);
  assert.equal(pantryResponse.status, 200);
  assert.equal((await pantryResponse.json()).items[0].recipe.id, created.recipe.id);

  const profileResponse = await handleApiRequest(request("/api/profiles/cocineratest", { cookie }), env);
  const profile = (await profileResponse.json()).profile;
  assert.equal(profile.collections[0].itemCount, 1);
  assert.equal(profile.achievements.find((item) => item.id === "first-recipe").unlocked, true);
});
