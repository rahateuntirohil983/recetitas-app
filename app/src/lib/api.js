import { demoComments, demoRecipes, demoUser } from "../data/demo.js";

const useDemo = import.meta.env.DEV && import.meta.env.VITE_USE_REAL_API !== "true";
let demoAuthenticated = false;
let demoCurrentUser = structuredClone(demoUser);
let recipes = structuredClone(demoRecipes);
let comments = structuredClone(demoComments);
let recipeEdits = {};
let demoLive = null;
let demoLiveComments = [];
let demoLiveLiked = false;
const followedUsers = new Set();

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
      avatarIndex: Math.floor(Math.random() * 64),
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

  async discover(tag = "") {
    if (!useDemo) return request(`/api/discover${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`);
    await pause();
    const counts = new Map();
    recipes.forEach((recipe) => (recipe.tags || []).forEach((name) => counts.set(name, (counts.get(name) || 0) + 1)));
    const people = new Map();
    recipes.forEach((recipe) => people.set(recipe.author.id, recipe.author));
    return {
      selectedTag: tag || null,
      tags: [...counts.entries()].map(([name, recipeCount]) => ({ name, recipeCount, engagement: 0 })),
      creators: [...people.values()].filter((person) => person.id !== demoCurrentUser.id).map((person) => ({ ...person, recipeCount: recipes.filter((recipe) => recipe.author.id === person.id).length, followerCount: 0, followed: followedUsers.has(person.id) })),
      lives: demoLive ? [demoLive] : [],
      items: tag ? recipes.filter((recipe) => (recipe.tags || []).includes(tag)) : recipes,
    };
  },

  async saved() {
    if (!useDemo) return request("/api/saved");
    await pause();
    return { items: recipes.filter((recipe) => recipe.saved) };
  },

  async profile(handle) {
    if (!useDemo) return request(`/api/profiles/${encodeURIComponent(handle)}`);
    await pause();
    const authored = recipes.filter((recipe) => recipe.author.handle === handle);
    const person = handle === demoCurrentUser.handle ? demoCurrentUser : authored[0]?.author;
    if (!person) throw Object.assign(new Error("No encontramos ese perfil."), { status: 404 });
    return {
      profile: {
        ...person,
        bio: person.bio || "",
        recipeCount: authored.length,
        followerCount: followedUsers.has(person.id) ? 1 : 0,
        followingCount: 0,
        followed: followedUsers.has(person.id),
        isOwnProfile: person.id === demoCurrentUser.id && demoAuthenticated,
      },
      recipes: authored,
    };
  },

  async updateProfile(payload) {
    if (!useDemo) return request("/api/profile", { method: "PATCH", body: JSON.stringify(payload) });
    demoCurrentUser = { ...demoCurrentUser, ...payload };
    recipes = recipes.map((recipe) => recipe.author.id === demoCurrentUser.id
      ? { ...recipe, author: demoCurrentUser }
      : recipe);
    await pause(220);
    return { user: demoCurrentUser };
  },

  async toggleFollow(userId) {
    if (!useDemo) return request(`/api/users/${userId}/follow`, { method: "POST", body: "{}" });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para seguir personas."), { status: 401 });
    followedUsers.has(userId) ? followedUsers.delete(userId) : followedUsers.add(userId);
    await pause(120);
    return { active: followedUsers.has(userId) };
  },

  async connections(handle, type) {
    if (!useDemo) return request(`/api/profiles/${encodeURIComponent(handle)}/${type}`);
    await pause();
    return { type, people: [] };
  },

  async createRecipe(payload) {
    if (!useDemo) return request("/api/recipes", { method: "POST", body: JSON.stringify(payload) });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para publicar."), { status: 401 });
    const recipe = {
      id: `recipe_${crypto.randomUUID()}`,
      ...payload,
      imageUrl: payload.imageUrl || null,
      videoUrl: payload.videoUrl || null,
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

  async updateRecipe(recipeId, payload) {
    if (!useDemo) return request(`/api/recipes/${encodeURIComponent(recipeId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para modificar recetas."), { status: 401 });
    const recipe = findRecipe(recipeId);
    if (!recipe || recipe.author.id !== demoCurrentUser.id) throw Object.assign(new Error("Solo podés modificar tus recetas."), { status: 403 });
    Object.assign(recipe, payload, { updatedAt: new Date().toISOString(), editCount: Number(recipe.editCount || 0) + 1, lastEditNote: payload.editNote });
    recipeEdits[recipeId] = [{ id: `edit_${crypto.randomUUID()}`, note: payload.editNote, createdAt: recipe.updatedAt }, ...(recipeEdits[recipeId] || [])];
    await pause(220);
    return { recipe };
  },

  async recipeEdits(recipeId) {
    if (!useDemo) return request(`/api/recipes/${encodeURIComponent(recipeId)}/edits`);
    await pause(120);
    return { edits: recipeEdits[recipeId] || [] };
  },

  async recipe(recipeId) {
    if (!useDemo) return request(`/api/recipes/${encodeURIComponent(recipeId)}`);
    await pause();
    const recipe = findRecipe(recipeId);
    if (!recipe) throw Object.assign(new Error("No encontramos esa receta."), { status: 404 });
    return { recipe };
  },

  async uploadImage(file) {
    if (!useDemo) return request("/api/uploads", {
      method: "POST",
      headers: { "content-type": file.type },
      body: file,
    });
    await pause(320);
    return { imageUrl: URL.createObjectURL(file) };
  },

  async uploadVideo(file) {
    if (!useDemo) return request("/api/uploads", {
      method: "POST",
      headers: { "content-type": file.type },
      body: file,
    });
    await pause(420);
    return { videoUrl: URL.createObjectURL(file) };
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
      author: demoCurrentUser,
    };
    comments[recipeId] = [...(comments[recipeId] || []), comment];
    await pause(180);
    return { id: comment.id };
  },

  async deleteComment(recipeId, commentId) {
    if (!useDemo) return request(`/api/recipes/${encodeURIComponent(recipeId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para eliminar comentarios."), { status: 401 });
    const existing = (comments[recipeId] || []).find((comment) => comment.id === commentId);
    if (!existing) throw Object.assign(new Error("No encontramos ese comentario."), { status: 404 });
    if (existing.author.id !== demoCurrentUser.id) throw Object.assign(new Error("Solo podés borrar tus comentarios."), { status: 403 });
    comments[recipeId] = (comments[recipeId] || []).filter((comment) => comment.id !== commentId);
    await pause(140);
    return null;
  },

  async deleteRecipe(recipeId) {
    if (!useDemo) return request(`/api/recipes/${recipeId}`, { method: "DELETE" });
    recipes = recipes.filter((recipe) => recipe.id !== recipeId);
    delete comments[recipeId];
    await pause(160);
    return null;
  },

  async startLive(payload) {
    if (!useDemo) return request("/api/live/start", { method: "POST", body: JSON.stringify(payload) });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para transmitir."), { status: 401 });
    demoLive = {
      id: `live_${crypto.randomUUID()}`,
      ...payload,
      status: "live",
      playbackUrl: "http://127.0.0.1:8889/demo/whep",
      viewerCount: 0,
      likeCount: 0,
      liked: false,
      startedAt: new Date().toISOString(),
      author: demoCurrentUser,
    };
    return { live: demoLive, publishUrl: "http://127.0.0.1:8889/demo/whip", publishToken: "demo", comments: [] };
  },

  async endLive(liveId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/end`, { method: "POST", body: "{}" });
    if (demoLive?.id === liveId) demoLive.status = "ended";
    return { live: demoLive };
  },

  async liveBroadcasterHeartbeat(liveId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/broadcaster-heartbeat`, { method: "POST", body: "{}" });
    return { ok: true };
  },

  async liveHeartbeat(liveId, viewerKey) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/heartbeat`, { method: "POST", body: JSON.stringify({ viewerKey }) });
    return { viewerCount: demoLive?.id === liveId ? 1 : 0 };
  },

  async liveEvents(liveId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/events`);
    if (!demoLive || demoLive.id !== liveId) throw Object.assign(new Error("El directo terminó."), { status: 404 });
    return { live: { ...demoLive, liked: demoLiveLiked, likeCount: demoLiveLiked ? 1 : 0 }, comments: demoLiveComments };
  },

  async toggleLiveLike(liveId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/like`, { method: "POST", body: "{}" });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para dar me gusta."), { status: 401 });
    demoLiveLiked = !demoLiveLiked;
    return { active: demoLiveLiked, likeCount: demoLiveLiked ? 1 : 0 };
  },

  async addLiveComment(liveId, body) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/comments`, { method: "POST", body: JSON.stringify({ body }) });
    if (!demoAuthenticated) throw Object.assign(new Error("Iniciá sesión para comentar."), { status: 401 });
    const comment = { id: `lvc_${crypto.randomUUID()}`, body, createdAt: new Date().toISOString(), author: demoCurrentUser };
    demoLiveComments = [...demoLiveComments, comment];
    return { comment };
  },

  async deleteLiveComment(liveId, commentId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
    demoLiveComments = demoLiveComments.filter((comment) => comment.id !== commentId);
    return null;
  },

  async toggleLiveBan(liveId, userId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/users/${encodeURIComponent(userId)}/ban`, { method: "POST", body: "{}" });
    demoLiveComments = demoLiveComments.filter((comment) => comment.author.id !== userId);
    return { active: true };
  },

  async toggleLiveModerator(liveId, userId) {
    if (!useDemo) return request(`/api/live/${encodeURIComponent(liveId)}/users/${encodeURIComponent(userId)}/moderator`, { method: "POST", body: "{}" });
    return { active: true };
  },

  async notifications() {
    if (!useDemo) return request("/api/notifications");
    await pause(120);
    return { unreadCount: 0, items: [] };
  },

  async notificationCount() {
    if (!useDemo) return request("/api/notifications/count");
    return { unreadCount: 0 };
  },

  async readNotification(notificationId) {
    if (!useDemo) return request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST", body: "{}" });
    await pause(80);
    return { unreadCount: 0 };
  },

  async readAllNotifications() {
    if (!useDemo) return request("/api/notifications/read-all", { method: "POST", body: "{}" });
    await pause(80);
    return { unreadCount: 0 };
  },
};
