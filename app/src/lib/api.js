import { demoComments, demoRecipes, demoUser } from "../data/demo.js";

const useDemo = import.meta.env.DEV && import.meta.env.VITE_USE_REAL_API !== "true";
let demoAuthenticated = false;
let demoCurrentUser = structuredClone(demoUser);
let recipes = structuredClone(demoRecipes);
let comments = structuredClone(demoComments);

const pause = (duration = 180) => new Promise((resolve) => setTimeout(resolve, duration));

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const failure = new Error(data?.error?.message || "No pudimos completar la acción.");
    failure.status = response.status;
    failure.code = data?.error?.code;
    failure.loginUrl = data?.error?.loginUrl;
    throw failure;
  }
  return data;
};

const findRecipe = (recipeId) => recipes.find((recipe) => recipe.id === recipeId);

export const api = {
  isDemo: useDemo,

  async session() {
    if (!useDemo) return request("/api/session");
    await pause();
    return demoAuthenticated
      ? { authenticated: true, user: demoCurrentUser }
      : { authenticated: false, user: null, loginUrl: "/app/?login=1" };
  },

  async login(payload) {
    if (!useDemo) return request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
    demoAuthenticated = true;
    await pause();
    return { authenticated: true, user: demoCurrentUser };
  },

  async register(payload) {
    if (!useDemo) return request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
    demoCurrentUser = {
      ...demoCurrentUser,
      email: payload.email,
      handle: payload.handle.toLowerCase(),
      displayName: payload.displayName,
    };
    demoAuthenticated = true;
    await pause(260);
    return { authenticated: true, user: demoCurrentUser };
  },

  async logout() {
    if (!useDemo) return request("/api/auth/logout", { method: "POST", body: "{}" });
    demoAuthenticated = false;
    await pause();
    return { authenticated: false, user: null, loginUrl: "/app/?login=1" };
  },

  async feed() {
    if (!useDemo) return request("/api/feed");
    await pause();
    return { items: recipes };
  },

  async saved() {
    if (!useDemo) return request("/api/saved");
    await pause();
    return { items: recipes.filter((recipe) => recipe.saved) };
  },

  async createRecipe(payload) {
    if (!useDemo) return request("/api/recipes", { method: "POST", body: JSON.stringify(payload) });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para publicar."), { status: 401 });
    const recipe = {
      id: `recipe_${crypto.randomUUID()}`,
      ...payload,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      liked: false,
      saved: false,
      author: demoCurrentUser,
    };
    recipes = [recipe, ...recipes];
    await pause(260);
    return { recipe };
  },

  async toggleLike(recipeId) {
    if (!useDemo) return request(`/api/recipes/${recipeId}/like`, { method: "POST", body: "{}" });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para dar me gusta."), { status: 401 });
    const recipe = findRecipe(recipeId);
    recipe.liked = !recipe.liked;
    recipe.likeCount += recipe.liked ? 1 : -1;
    await pause(120);
    return { active: recipe.liked, recipe };
  },

  async toggleSave(recipeId) {
    if (!useDemo) return request(`/api/recipes/${recipeId}/save`, { method: "POST", body: "{}" });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para guardar recetas."), { status: 401 });
    const recipe = findRecipe(recipeId);
    recipe.saved = !recipe.saved;
    await pause(120);
    return { active: recipe.saved, recipe };
  },

  async comments(recipeId) {
    if (!useDemo) return request(`/api/recipes/${recipeId}/comments`);
    await pause();
    return { comments: comments[recipeId] || [] };
  },

  async addComment(recipeId, body) {
    if (!useDemo) return request(`/api/recipes/${recipeId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para comentar."), { status: 401 });
    const comment = {
      id: `comment_${crypto.randomUUID()}`,
      body,
      createdAt: new Date().toISOString(),
      author: demoUser,
    };
    comments[recipeId] = [...(comments[recipeId] || []), comment];
    const recipe = findRecipe(recipeId);
    recipe.commentCount += 1;
    await pause(180);
    return { id: comment.id };
  },
};
