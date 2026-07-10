import test from "node:test";
import assert from "node:assert/strict";
import { __test } from "../src/handler.js";

test("only accepts development identity headers on localhost", () => {
  const local = new Request("http://localhost/api/session", {
    headers: { "x-dev-user-email": "Marti@Example.com" },
  });
  const production = new Request("https://recetitas.app/api/session", {
    headers: { "x-dev-user-email": "marti@example.com" },
  });

  assert.equal(__test.getIdentity(local)?.email, "marti@example.com");
  assert.equal(__test.getIdentity(production), null);
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
