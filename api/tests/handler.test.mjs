import test from "node:test";
import assert from "node:assert/strict";
import { __test } from "../src/handler.js";

test("normalizes and validates account registration", () => {
  const registration = __test.validateRegistration({
    displayName: "  Martina Ríos ",
    handle: "@Marti_Cocina",
    email: "MARTI@example.com",
    password: "calabaza2026",
  });

  assert.equal(registration.displayName, "Martina Ríos");
  assert.equal(registration.handle, "marti_cocina");
  assert.equal(registration.email, "marti@example.com");
  assert.equal(registration.error, undefined);
});

test("rejects weak account passwords", () => {
  const registration = __test.validateRegistration({
    displayName: "Martina",
    handle: "marti_cocina",
    email: "marti@example.com",
    password: "sololetras",
  });
  assert.match(registration.error, /contraseña/i);
});

test("hashes passwords with a unique salt and verifies them", async () => {
  const first = await __test.hashPassword("calabaza2026");
  const second = await __test.hashPassword("calabaza2026");

  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await __test.verifyPassword("calabaza2026", {
    password_hash: first.hash,
    password_salt: first.salt,
    password_iterations: first.iterations,
  }), true);
  assert.equal(await __test.verifyPassword("otra-clave2026", {
    password_hash: first.hash,
    password_salt: first.salt,
    password_iterations: first.iterations,
  }), false);
});

test("ignores malformed cookie values", () => {
  const request = new Request("https://recetitas.app/api/session", {
    headers: { cookie: "recetitas_session=%E0%A4%A" },
  });
  assert.equal(__test.parseCookies(request).recetitas_session, "");
});

test("creates secure production session cookies", () => {
  const request = new Request("https://recetitas.app/api/auth/login");
  const cookie = __test.sessionCookie(request, "abc123");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
});

test("rejects cross-origin writes", () => {
  const request = new Request("https://recetitas.app/api/recipes", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  assert.equal(__test.hasValidOrigin(request), false);
});

test("normalizes and validates a complete recipe", () => {
  const recipe = __test.validateRecipe({
    title: "  Ñoquis de calabaza  ",
    summary: "Una receta simple para compartir en familia.",
    imageKey: "pumpkin",
    cookMinutes: 45,
    servings: 4,
    ingredients: ["Calabaza", "Harina"],
    steps: ["Asar", "Formar y hervir"],
  });

  assert.equal(recipe.title, "Ñoquis de calabaza");
  assert.equal(recipe.cookMinutes, 45);
  assert.equal(recipe.error, undefined);
});

test("explains when the recipe story is too short", () => {
  const recipe = __test.validateRecipe({
    title: "Pan casero",
    summary: "Muy rico",
    cookMinutes: 40,
    servings: 4,
    ingredients: ["Harina"],
    steps: ["Amasar"],
  });
  assert.match(recipe.error, /historia corta.*10 caracteres/i);
});

test("only accepts recipe images from the configured media service", () => {
  const recipe = __test.validateRecipe({
    title: "Pan casero",
    summary: "Una receta para todos los domingos.",
    cookMinutes: 40,
    servings: 4,
    ingredients: ["Harina"],
    steps: ["Amasar"],
    imageUrl: "https://attacker.example/foto.jpg",
  }, "https://media-recetitas.hex-rp.com");
  assert.match(recipe.error, /imagen.*no es válida/i);
});

test("accepts a processed recipe video from the configured media service", () => {
  const recipe = __test.validateRecipe({
    title: "Pan casero",
    summary: "Una receta para todos los domingos.",
    cookMinutes: 40,
    servings: 4,
    ingredients: ["Harina"],
    steps: ["Amasar"],
    videoUrl: "https://media-recetitas.hex-rp.com/files/user/video.mp4",
  }, "https://media-recetitas.hex-rp.com");
  assert.equal(recipe.videoUrl, "https://media-recetitas.hex-rp.com/files/user/video.mp4");
  assert.equal(recipe.error, undefined);
});

test("accepts a cover photo and a video on the same recipe", () => {
  const recipe = __test.validateRecipe({
    title: "Pan casero",
    summary: "Una receta para todos los domingos.",
    cookMinutes: 40,
    servings: 4,
    ingredients: ["Harina"],
    steps: ["Amasar"],
    imageUrl: "https://media-recetitas.hex-rp.com/files/user/photo.webp",
    videoUrl: "https://media-recetitas.hex-rp.com/files/user/video.mp4",
  }, "https://media-recetitas.hex-rp.com");
  assert.equal(recipe.imageUrl, "https://media-recetitas.hex-rp.com/files/user/photo.webp");
  assert.equal(recipe.videoUrl, "https://media-recetitas.hex-rp.com/files/user/video.mp4");
  assert.equal(recipe.error, undefined);
});

test("normalizes and deduplicates recipe hashtags", () => {
  const recipe = __test.validateRecipe({
    title: "Pan casero",
    summary: "Una receta para todos los domingos.",
    cookMinutes: 40,
    servings: 4,
    ingredients: ["Harina"],
    steps: ["Amasar"],
    tags: ["#Merienda", "merienda", "Sin horno", "Pan-Casero"],
  });
  assert.deepEqual(recipe.tags, ["merienda", "sin-horno", "pan-casero"]);
});

test("keeps pig avatar assignment stable and within the 64-image atlas", () => {
  assert.equal(__test.avatarIndexForRow({ id: "user-1", avatar_url: "pig:63" }), 63);
  const first = __test.avatarIndexForRow({ id: "legacy-user", avatar_url: null });
  const second = __test.avatarIndexForRow({ id: "legacy-user", avatar_url: null });
  assert.equal(first, second);
  assert.ok(first >= 0 && first < 64);
});

test("only lets a comment author delete their own comment", () => {
  const comment = { id: "comment-1", author_id: "user-1" };
  assert.equal(__test.canDeleteOwnedComment(comment, { id: "user-1" }), true);
  assert.equal(__test.canDeleteOwnedComment(comment, { id: "user-2" }), false);
  assert.equal(__test.canDeleteOwnedComment(null, { id: "user-1" }), false);
});

test("normalizes a live title and description", () => {
  const live = __test.validateLive({
    title: "  Pasta en casa  ",
    description: "  Cocinamos y respondemos preguntas.  ",
  });
  assert.equal(live.title, "Pasta en casa");
  assert.equal(live.description, "Cocinamos y respondemos preguntas.");
  assert.equal(live.error, undefined);
});

test("rejects a live without a useful title", () => {
  assert.match(__test.validateLive({ title: "yo" }).error, /3 caracteres/i);
});
