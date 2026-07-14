<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import {
  PhBell,
  PhBookmarkSimple,
  PhCompass,
  PhHouse,
  PhMagnifyingGlass,
  PhPlus,
  PhSignOut,
  PhUserCircle,
} from "@phosphor-icons/vue";
import AppBrand from "./components/AppBrand.vue";
import PigAvatar from "./components/PigAvatar.vue";
import RecipeCard from "./components/RecipeCard.vue";
import { api } from "./lib/api.js";

const CommentsPanel = defineAsyncComponent(() => import("./components/CommentsPanel.vue"));
const ComposerModal = defineAsyncComponent(() => import("./components/ComposerModal.vue"));
const ConnectionsPanel = defineAsyncComponent(() => import("./components/ConnectionsPanel.vue"));
const DiscoverView = defineAsyncComponent(() => import("./components/DiscoverView.vue"));
const EditHistoryPanel = defineAsyncComponent(() => import("./components/EditHistoryPanel.vue"));
const EditProfileModal = defineAsyncComponent(() => import("./components/EditProfileModal.vue"));
const LoginPanel = defineAsyncComponent(() => import("./components/LoginPanel.vue"));
const LiveStudio = defineAsyncComponent(() => import("./components/LiveStudio.vue"));
const NotificationsPanel = defineAsyncComponent(() => import("./components/NotificationsPanel.vue"));
const ProfileView = defineAsyncComponent(() => import("./components/ProfileView.vue"));
const RecipeDetailView = defineAsyncComponent(() => import("./components/RecipeDetailView.vue"));

const loading = ref(true);
const session = ref({ authenticated: false, user: null, loginUrl: "/app/?login=1" });
const recipes = ref([]);
const search = ref("");
const activeView = ref("feed");
const lastCollectionView = ref("feed");
const discoverTags = ref([]);
const discoverCreators = ref([]);
const discoverLives = ref([]);
const selectedDiscoverTag = ref("");
const loginOpen = ref(false);
const composerOpen = ref(false);
const composerKey = ref(0);
const editorOpen = ref(false);
const editorKey = ref(0);
const editingRecipe = ref(null);
const commentsOpen = ref(false);
const selectedRecipe = ref(null);
const recipeLoading = ref(false);
const comments = ref([]);
const busy = ref(false);
const toast = ref("");
const authError = ref("");
const profile = ref(null);
const profileRecipes = ref([]);
const profileLoading = ref(false);
const editProfileOpen = ref(false);
const editProfileError = ref("");
const connectionsOpen = ref(false);
const connectionsType = ref("followers");
const connectionsPeople = ref([]);
const connectionsLoading = ref(false);
const notificationsOpen = ref(false);
const notifications = ref([]);
const notificationsLoading = ref(false);
const unreadNotifications = ref(0);
const editHistoryOpen = ref(false);
const editHistory = ref([]);
const editHistoryLoading = ref(false);
const liveStudioOpen = ref(false);

watch(loginOpen, (open) => {
  if (open) authError.value = "";
});

const filteredRecipes = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return recipes.value;
  return recipes.value.filter((recipe) => [
    recipe.title,
    recipe.summary,
    recipe.author.displayName,
    recipe.author.handle,
    ...recipe.ingredients,
    ...(recipe.tags || []),
  ].some((value) => String(value).toLowerCase().includes(term)));
});

const flash = (message) => {
  toast.value = message;
  window.setTimeout(() => { if (toast.value === message) toast.value = ""; }, 2800);
};

const loadDiscover = async (tag = "", updateUrl = true) => {
  loading.value = true;
  activeView.value = "discover";
  lastCollectionView.value = "discover";
  profile.value = null;
  selectedDiscoverTag.value = String(tag || "").replace(/^#/, "");
  if (updateUrl) {
    const params = new URLSearchParams({ view: "discover" });
    if (selectedDiscoverTag.value) params.set("tag", selectedDiscoverTag.value);
    window.history.pushState({}, "", `/app/?${params}`);
  }
  try {
    const response = await api.discover(selectedDiscoverTag.value);
    recipes.value = response.items;
    discoverTags.value = response.tags;
    discoverCreators.value = response.creators;
    discoverLives.value = response.lives || [];
    selectedDiscoverTag.value = response.selectedTag || "";
  } catch (failure) {
    flash(failure.message);
  } finally {
    loading.value = false;
  }
};

const loadView = async (view = activeView.value, updateUrl = true) => {
  if (view === "discover") return loadDiscover(selectedDiscoverTag.value, updateUrl);
  loading.value = true;
  activeView.value = view;
  lastCollectionView.value = view;
  profile.value = null;
  if (updateUrl) window.history.pushState({}, "", view === "saved" ? "/app/?view=saved" : "/app/");
  try {
    const response = view === "saved" ? await api.saved() : await api.feed();
    recipes.value = response.items;
  } catch (failure) {
    if (failure.status === 401) loginOpen.value = true;
    flash(failure.message);
    if (view === "saved") activeView.value = "feed";
  } finally {
    loading.value = false;
  }
};

const startPublishing = () => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  composerOpen.value = true;
};

const authenticate = async ({ mode, payload }) => {
  busy.value = true;
  authError.value = "";
  try {
    session.value = mode === "register" ? await api.register(payload) : await api.login(payload);
    unreadNotifications.value = Number(session.value.unreadNotifications || 0);
    loginOpen.value = false;
    if (activeView.value === "profile" && profile.value) await openProfile(profile.value.handle, false);
    flash(mode === "register" ? "Tu recetario ya está listo." : "Qué bueno verte de nuevo.");
  } catch (failure) {
    authError.value = failure.message;
  } finally {
    busy.value = false;
  }
};

const logout = async () => {
  session.value = await api.logout();
  unreadNotifications.value = 0;
  notifications.value = [];
  flash("Cerraste sesión.");
  if (["saved", "profile"].includes(activeView.value)) await loadView("feed");
};

const replaceRecipe = (nextRecipe) => {
  const index = recipes.value.findIndex((recipe) => recipe.id === nextRecipe.id);
  if (index >= 0) recipes.value[index] = nextRecipe;
  const profileIndex = profileRecipes.value.findIndex((recipe) => recipe.id === nextRecipe.id);
  if (profileIndex >= 0) profileRecipes.value[profileIndex] = nextRecipe;
  if (selectedRecipe.value?.id === nextRecipe.id) selectedRecipe.value = nextRecipe;
};

const openRecipe = async (recipeOrId, updateUrl = true) => {
  const recipeId = typeof recipeOrId === "string" ? recipeOrId : recipeOrId?.id;
  if (!recipeId) return;
  if (["feed", "saved", "discover"].includes(activeView.value)) lastCollectionView.value = activeView.value;
  if (typeof recipeOrId === "object") selectedRecipe.value = recipeOrId;
  activeView.value = "recipe";
  profile.value = null;
  commentsOpen.value = false;
  recipeLoading.value = true;
  if (updateUrl) window.history.pushState({}, "", `/app/r/${encodeURIComponent(recipeId)}`);
  try {
    const response = await api.recipe(recipeId);
    selectedRecipe.value = response.recipe;
    replaceRecipe(response.recipe);
  } catch (failure) {
    flash(failure.message);
    await loadView("feed");
  } finally {
    recipeLoading.value = false;
  }
};

const openProfile = async (handle, updateUrl = true) => {
  if (!handle) return;
  activeView.value = "profile";
  profileLoading.value = true;
  connectionsOpen.value = false;
  if (updateUrl) window.history.pushState({}, "", `/app/u/${encodeURIComponent(handle)}`);
  try {
    const response = await api.profile(handle);
    profile.value = response.profile;
    profileRecipes.value = response.recipes;
  } catch (failure) {
    flash(failure.message);
    await loadView("feed");
  } finally {
    profileLoading.value = false;
  }
};

const openOwnProfile = () => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  openProfile(session.value.user.handle);
};

const openLiveStudio = () => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  liveStudioOpen.value = true;
};

const liveStarted = (nextLive) => {
  if (profile.value?.isOwnProfile) profile.value = { ...profile.value, live: nextLive };
  flash("Ya estás transmitiendo en tu perfil.");
};

const liveEnded = () => {
  if (profile.value?.isOwnProfile) profile.value = { ...profile.value, live: null };
};

const toggleFollow = async (person) => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  if (person.id === session.value.user.id) {
    openOwnProfile();
    return;
  }
  busy.value = true;
  try {
    const wasFollowing = Boolean(person.followed);
    const response = await api.toggleFollow(person.id);
    const updateAuthor = (recipe) => recipe.author.id === person.id
      ? { ...recipe, author: { ...recipe.author, followed: response.active } }
      : recipe;
    recipes.value = recipes.value.map(updateAuthor);
    profileRecipes.value = profileRecipes.value.map(updateAuthor);
    discoverCreators.value = discoverCreators.value.map((creator) => creator.id === person.id
      ? { ...creator, followed: response.active, followerCount: Math.max(0, creator.followerCount + (response.active && !wasFollowing ? 1 : !response.active && wasFollowing ? -1 : 0)) }
      : creator);
    if (profile.value?.id === person.id) {
      profile.value = {
        ...profile.value,
        followed: response.active,
        followerCount: Math.max(0, profile.value.followerCount + (response.active && !wasFollowing ? 1 : !response.active && wasFollowing ? -1 : 0)),
      };
    }
    flash(response.active ? `Ahora seguís a @${person.handle}.` : `Dejaste de seguir a @${person.handle}.`);
  } catch (failure) {
    if (failure.status === 401) loginOpen.value = true;
    else flash(failure.message);
  } finally {
    busy.value = false;
  }
};

const saveProfile = async (payload) => {
  busy.value = true;
  editProfileError.value = "";
  try {
    const response = await api.updateProfile(payload);
    const previousId = session.value.user.id;
    session.value = { ...session.value, user: response.user };
    profile.value = { ...profile.value, ...response.user, isOwnProfile: true };
    const updateAuthor = (recipe) => recipe.author.id === previousId
      ? { ...recipe, author: { ...recipe.author, ...response.user } }
      : recipe;
    recipes.value = recipes.value.map(updateAuthor);
    profileRecipes.value = profileRecipes.value.map(updateAuthor);
    editProfileOpen.value = false;
    window.history.replaceState({}, "", `/app/u/${encodeURIComponent(response.user.handle)}`);
    flash("Tu perfil quedó actualizado.");
  } catch (failure) {
    editProfileError.value = failure.message;
  } finally {
    busy.value = false;
  }
};

const openConnections = async (type) => {
  if (!profile.value) return;
  connectionsType.value = type;
  connectionsPeople.value = [];
  connectionsLoading.value = true;
  connectionsOpen.value = true;
  try {
    connectionsPeople.value = (await api.connections(profile.value.handle, type)).people;
  } catch (failure) {
    flash(failure.message);
    connectionsOpen.value = false;
  } finally {
    connectionsLoading.value = false;
  }
};

const deleteRecipe = async (recipe) => {
  if (!window.confirm(`¿Eliminar “${recipe.title}”? Esta acción no se puede deshacer.`)) return;
  busy.value = true;
  try {
    await api.deleteRecipe(recipe.id);
    recipes.value = recipes.value.filter((item) => item.id !== recipe.id);
    profileRecipes.value = profileRecipes.value.filter((item) => item.id !== recipe.id);
    if (profile.value) profile.value = { ...profile.value, recipeCount: Math.max(0, profile.value.recipeCount - 1) };
    if (activeView.value === "recipe") await loadView("feed");
    flash("La receta fue eliminada.");
  } catch (failure) {
    flash(failure.message);
  } finally {
    busy.value = false;
  }
};

const actOnRecipe = async (recipe, action) => {
  try {
    const response = action === "like" ? await api.toggleLike(recipe.id) : await api.toggleSave(recipe.id);
    replaceRecipe(response.recipe);
    if (action === "save") flash(response.active ? "Receta guardada." : "La sacaste de tus guardadas.");
  } catch (failure) {
    if (failure.status === 401) loginOpen.value = true;
    else flash(failure.message);
  }
};

const openComments = async (recipe) => {
  selectedRecipe.value = recipe;
  commentsOpen.value = true;
  try {
    comments.value = (await api.comments(recipe.id)).comments;
  } catch (failure) {
    flash(failure.message);
  }
};

const addComment = async (body) => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  const recipeId = selectedRecipe.value.id;
  const temporaryId = `pending_${crypto.randomUUID()}`;
  const optimisticComment = {
    id: temporaryId,
    body,
    createdAt: new Date().toISOString(),
    author: session.value.user,
  };
  comments.value = [...comments.value, optimisticComment];
  replaceRecipe({ ...selectedRecipe.value, commentCount: selectedRecipe.value.commentCount + 1 });
  busy.value = true;
  try {
    const response = await api.addComment(recipeId, body);
    comments.value = comments.value.map((comment) => comment.id === temporaryId
      ? (response.comment || optimisticComment)
      : comment);
  } catch (failure) {
    comments.value = comments.value.filter((comment) => comment.id !== temporaryId);
    const recipe = selectedRecipe.value?.id === recipeId
      ? selectedRecipe.value
      : recipes.value.find((item) => item.id === recipeId);
    if (recipe) replaceRecipe({ ...recipe, commentCount: Math.max(0, recipe.commentCount - 1) });
    flash(failure.message);
  } finally {
    busy.value = false;
  }
};

const deleteComment = async (comment) => {
  if (!selectedRecipe.value || !window.confirm("¿Eliminar tu comentario?")) return;
  busy.value = true;
  try {
    await api.deleteComment(selectedRecipe.value.id, comment.id);
    comments.value = comments.value.filter((item) => item.id !== comment.id);
    replaceRecipe({ ...selectedRecipe.value, commentCount: Math.max(0, selectedRecipe.value.commentCount - 1) });
    flash("Tu comentario fue eliminado.");
  } catch (failure) {
    if (failure.status === 401) loginOpen.value = true;
    else flash(failure.message);
  } finally {
    busy.value = false;
  }
};

const startEditingRecipe = (recipe) => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  if (recipe.author.id !== session.value.user.id) return;
  editingRecipe.value = recipe;
  editorKey.value += 1;
  editorOpen.value = true;
};

const uploadRecipeMedia = async (payload) => {
  const { imageFile, videoFile, ...recipePayload } = payload;
  if (videoFile) recipePayload.videoUrl = (await api.uploadVideo(videoFile)).videoUrl;
  if (imageFile) recipePayload.imageUrl = (await api.uploadImage(imageFile)).imageUrl;
  return recipePayload;
};

const saveRecipeEdit = async (payload) => {
  if (!editingRecipe.value) return;
  busy.value = true;
  try {
    const recipePayload = await uploadRecipeMedia(payload);
    const response = await api.updateRecipe(editingRecipe.value.id, recipePayload);
    replaceRecipe(response.recipe);
    editingRecipe.value = response.recipe;
    editorOpen.value = false;
    flash("Los cambios ya están visibles.");
  } catch (failure) {
    if (failure.status === 401) {
      editorOpen.value = false;
      loginOpen.value = true;
    }
    flash(failure.message);
  } finally {
    busy.value = false;
  }
};

const openEditHistory = async (recipe) => {
  selectedRecipe.value = recipe;
  editHistory.value = [];
  editHistoryLoading.value = true;
  editHistoryOpen.value = true;
  try {
    editHistory.value = (await api.recipeEdits(recipe.id)).edits;
  } catch (failure) {
    flash(failure.message);
    editHistoryOpen.value = false;
  } finally {
    editHistoryLoading.value = false;
  }
};

const refreshNotificationCount = async () => {
  if (!session.value.authenticated || document.hidden) return;
  try {
    unreadNotifications.value = Number((await api.notificationCount()).unreadCount || 0);
  } catch {
    // A background refresh should never interrupt the current view.
  }
};

const openNotifications = async () => {
  if (!session.value.authenticated) {
    loginOpen.value = true;
    return;
  }
  notificationsOpen.value = true;
  notificationsLoading.value = true;
  try {
    const response = await api.notifications();
    notifications.value = response.items;
    unreadNotifications.value = response.unreadCount;
  } catch (failure) {
    flash(failure.message);
    notificationsOpen.value = false;
  } finally {
    notificationsLoading.value = false;
  }
};

const readAllNotifications = async () => {
  try {
    await api.readAllNotifications();
    unreadNotifications.value = 0;
    notifications.value = notifications.value.map((item) => ({ ...item, read: true }));
  } catch (failure) {
    flash(failure.message);
  }
};

const openNotification = async (notification) => {
  if (!notification.read) {
    try {
      const response = await api.readNotification(notification.id);
      unreadNotifications.value = response.unreadCount;
      notifications.value = notifications.value.map((item) => item.id === notification.id ? { ...item, read: true } : item);
    } catch (failure) {
      flash(failure.message);
    }
  }
  notificationsOpen.value = false;
  if (notification.recipeId) openRecipe(notification.recipeId);
  else openProfile(notification.actor.handle);
};

const publishRecipe = async (payload) => {
  busy.value = true;
  try {
    const recipePayload = await uploadRecipeMedia(payload);
    const response = await api.createRecipe(recipePayload);
    recipes.value = [response.recipe, ...recipes.value];
    composerOpen.value = false;
    composerKey.value += 1;
    activeView.value = "feed";
    window.history.pushState({}, "", "/app/");
    flash("Tu receta ya está en la mesa.");
  } catch (failure) {
    if (failure.status === 401) {
      composerOpen.value = false;
      loginOpen.value = true;
    }
    flash(failure.message);
  } finally {
    busy.value = false;
  }
};

onMounted(async () => {
  try {
    const sessionRequest = api.session();
    const params = new URLSearchParams(window.location.search);
    const requestedView = ["saved", "discover"].includes(params.get("view")) ? params.get("view") : "feed";
    selectedDiscoverTag.value = params.get("tag") || "";
    const profileRoute = window.location.pathname.match(/^\/app\/u\/([a-z0-9_]{3,24})\/?$/i);
    const recipeRoute = window.location.pathname.match(/^\/app\/r\/([^/]+)\/?$/i);
    const contentRequest = recipeRoute
      ? openRecipe(decodeURIComponent(recipeRoute[1]), false)
      : profileRoute
        ? openProfile(profileRoute[1], false)
        : loadView(requestedView, false);
    const [nextSession] = await Promise.all([sessionRequest, contentRequest]);
    session.value = nextSession;
    unreadNotifications.value = Number(nextSession.unreadNotifications || 0);
    if (["1", "register"].includes(params.get("login"))) loginOpen.value = true;
    if (params.get("compose") === "1") startPublishing();

    window.addEventListener("focus", refreshNotificationCount);
    document.addEventListener("visibilitychange", refreshNotificationCount);

    window.addEventListener("popstate", () => {
      const profileMatch = window.location.pathname.match(/^\/app\/u\/([a-z0-9_]{3,24})\/?$/i);
      const recipeMatch = window.location.pathname.match(/^\/app\/r\/([^/]+)\/?$/i);
      if (recipeMatch) openRecipe(decodeURIComponent(recipeMatch[1]), false);
      else if (profileMatch) openProfile(profileMatch[1], false);
      else {
        const nextParams = new URLSearchParams(window.location.search);
        selectedDiscoverTag.value = nextParams.get("tag") || "";
        loadView(["saved", "discover"].includes(nextParams.get("view")) ? nextParams.get("view") : "feed", false);
      }
    });
  } catch (failure) {
    flash(failure.message);
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-porcelain text-charcoal">
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-[255px] flex-col bg-charcoal px-6 py-7 text-porcelain lg:flex">
      <AppBrand />

      <nav class="mt-14 grid gap-2" aria-label="Navegación principal">
        <button type="button" class="side-nav" :class="activeView === 'feed' && 'side-nav--active'" @click="loadView('feed')"><PhHouse :size="22" /> Para vos</button>
        <button type="button" class="side-nav" :class="activeView === 'discover' && 'side-nav--active'" @click="loadDiscover()"><PhCompass :size="22" /> Descubrir</button>
        <button type="button" class="side-nav" :class="activeView === 'saved' && 'side-nav--active'" @click="loadView('saved')"><PhBookmarkSimple :size="22" /> Guardadas</button>
        <button v-if="session.authenticated" type="button" class="side-nav relative" @click="openNotifications"><PhBell :size="22" /> Notificaciones <span v-if="unreadNotifications" class="ml-auto grid min-w-6 place-items-center rounded-full bg-blush px-1.5 py-0.5 text-xs font-bold text-charcoal">{{ unreadNotifications > 99 ? '99+' : unreadNotifications }}</span></button>
        <button type="button" class="side-nav" :class="activeView === 'profile' && profile?.isOwnProfile && 'side-nav--active'" @click="openOwnProfile"><PhUserCircle :size="22" /> Mi perfil</button>
      </nav>

      <button type="button" class="focus-ring mt-8 inline-flex min-h-13 items-center justify-between bg-blush px-5 font-semibold text-charcoal hover:bg-olive" @click="startPublishing">
        Compartir receta <PhPlus :size="20" weight="bold" />
      </button>

      <div class="mt-auto border-t border-porcelain/18 pt-5">
        <template v-if="session.authenticated">
          <button type="button" class="focus-ring flex w-full items-center gap-3 text-left" @click="openOwnProfile">
            <PigAvatar :index="session.user.avatarIndex" :size="44" :label="`Avatar de ${session.user.displayName}`" class="ring-2 ring-porcelain/30" />
            <span class="min-w-0"><strong class="block truncate">{{ session.user.displayName }}</strong><span class="block truncate text-sm text-porcelain/55">@{{ session.user.handle }}</span></span>
          </button>
          <button type="button" class="mt-4 inline-flex items-center gap-2 text-sm text-porcelain/65 hover:text-blush" @click="logout"><PhSignOut :size="18" /> Salir</button>
        </template>
        <button v-else type="button" class="text-left text-sm font-semibold text-blush hover:text-olive" @click="loginOpen = true">Entrar a la comunidad</button>
      </div>
    </aside>

    <header class="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b-2 border-charcoal bg-charcoal px-4 text-porcelain lg:hidden">
      <AppBrand compact />
      <div class="flex items-center gap-2">
        <button v-if="session.authenticated" type="button" class="focus-ring relative grid size-11 place-items-center border border-porcelain/30 text-porcelain" aria-label="Abrir notificaciones" @click="openNotifications"><PhBell :size="21" /><span v-if="unreadNotifications" class="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-blush px-1 text-[10px] font-bold text-charcoal">{{ unreadNotifications > 9 ? '9+' : unreadNotifications }}</span></button>
        <button type="button" class="focus-ring grid size-11 place-items-center border border-porcelain/30 text-porcelain" :class="activeView === 'discover' && 'bg-olive text-charcoal'" aria-label="Descubrir recetas" @click="loadDiscover()"><PhCompass :size="22" /></button>
        <button type="button" class="focus-ring grid size-11 place-items-center bg-blush text-charcoal" aria-label="Compartir una receta" @click="startPublishing"><PhPlus :size="22" weight="bold" /></button>
      </div>
    </header>

    <main class="lg:ml-[255px]">
      <div v-if="['feed', 'saved'].includes(activeView)" class="mx-auto grid max-w-[1320px] lg:grid-cols-[minmax(0,760px)_320px] xl:gap-10">
        <section class="min-w-0 px-4 pb-28 pt-7 sm:px-7 lg:pb-16 lg:pt-10">
          <header class="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm font-bold uppercase tracking-[0.17em] text-olive-dark">La mesa de hoy</p>
              <h1 class="mt-1 font-display text-[clamp(3.3rem,9vw,6rem)] font-bold leading-none tracking-[-0.065em] text-charcoal">
                {{ activeView === 'saved' ? 'Guardadas.' : 'Para vos.' }}
              </h1>
            </div>
            <label class="relative block sm:w-[280px]">
              <span class="sr-only">Buscar recetas</span>
              <PhMagnifyingGlass :size="20" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/45" aria-hidden="true" />
              <input v-model="search" type="search" class="min-h-12 w-full border-2 border-charcoal bg-porcelain pl-11 pr-4 outline-none placeholder:text-charcoal/40 focus:bg-cream" placeholder="Buscar receta o persona" />
            </label>
          </header>

          <button type="button" class="composer-prompt focus-ring mb-7 flex w-full items-center gap-4 border-2 border-charcoal bg-blush px-5 py-4 text-left hover:bg-olive sm:px-6" @click="startPublishing">
            <PigAvatar v-if="session.user" :index="session.user.avatarIndex" :size="48" :label="`Avatar de ${session.user.displayName}`" class="ring-2 ring-charcoal" />
            <span v-else class="grid size-12 shrink-0 place-items-center rounded-full bg-charcoal font-display text-xl font-bold text-porcelain">+</span>
            <span class="flex-1">
              <strong class="block font-display text-xl text-charcoal">¿Qué cocinaste?</strong>
              <span class="text-sm text-charcoal/65">Compartí una receta, un recuerdo o ese truco que nunca falla.</span>
            </span>
            <PhPlus :size="24" class="shrink-0" weight="bold" aria-hidden="true" />
          </button>

          <div v-if="loading" class="border-2 border-charcoal bg-cream px-6 py-16 text-center font-display text-2xl text-charcoal/60" role="status">
            Preparando la mesa…
          </div>
          <div v-else-if="!filteredRecipes.length" class="border-2 border-charcoal bg-cream px-6 py-16 text-center">
            <p class="font-display text-3xl font-bold">Todavía no hay nada por acá.</p>
            <button type="button" class="mt-5 bg-charcoal px-5 py-3 font-semibold text-porcelain" @click="activeView === 'saved' ? loadView('feed') : startPublishing()">
              {{ activeView === 'saved' ? 'Volver al feed' : 'Publicar la primera' }}
            </button>
          </div>
          <div v-else class="grid gap-7">
            <RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" :viewer-id="session.user?.id || ''" @open="openRecipe" @edit="startEditingRecipe" @tag="loadDiscover" @like="actOnRecipe($event, 'like')" @save="actOnRecipe($event, 'save')" @comments="openComments" @profile="openProfile" @follow="toggleFollow" />
          </div>
        </section>

        <aside class="hidden border-l-2 border-charcoal/15 px-7 pb-10 pt-10 lg:block">
          <section class="profile-note bg-blush px-6 py-7">
            <template v-if="session.authenticated">
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Tu recetario</p>
              <h2 class="mt-2 font-display text-3xl font-bold leading-tight">Hola, {{ session.user.displayName }}.</h2>
              <p class="mt-3 text-sm leading-relaxed text-charcoal/70">Guardá lo que quieras volver a cocinar y compartí lo que merece pasar de mano en mano.</p>
              <button type="button" class="mt-5 w-full bg-charcoal px-4 py-3 font-semibold text-porcelain" @click="loadView('saved')">Ver mis guardadas</button>
            </template>
            <template v-else>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Sumate a la mesa</p>
              <h2 class="mt-2 font-display text-3xl font-bold leading-tight">Tu recetario empieza acá.</h2>
              <p class="mt-3 text-sm leading-relaxed text-charcoal/70">Creá un perfil para guardar, comentar y compartir.</p>
              <button type="button" class="mt-5 w-full bg-charcoal px-4 py-3 font-semibold text-porcelain" @click="loginOpen = true">Entrar</button>
            </template>
          </section>

          <button type="button" class="focus-ring mt-7 w-full border-2 border-charcoal bg-porcelain px-6 py-6 text-left transition hover:bg-olive" @click="loadDiscover()"><span class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Hashtags, personas y recetas</span><strong class="mt-2 block font-display text-2xl">Abrir Descubrir.</strong></button>

          <a href="/" class="mt-7 block text-sm font-semibold text-charcoal/60 underline decoration-2 underline-offset-4 hover:text-charcoal">Volver a la landing</a>
        </aside>
      </div>

      <DiscoverView
        v-else-if="activeView === 'discover'"
        :recipes="recipes"
        :tags="discoverTags"
        :creators="discoverCreators"
        :lives="discoverLives"
        :selected-tag="selectedDiscoverTag"
        :viewer-id="session.user?.id || ''"
        :loading="loading"
        :busy="busy"
        @tag="loadDiscover"
        @profile="openProfile"
        @follow="toggleFollow"
        @open="openRecipe"
        @edit="startEditingRecipe"
        @like="actOnRecipe($event, 'like')"
        @save="actOnRecipe($event, 'save')"
        @comments="openComments"
      />

      <ProfileView
        v-else-if="activeView === 'profile'"
        :profile="profile"
        :recipes="profileRecipes"
        :viewer-id="session.user?.id || ''"
        :viewer="session.user"
        :loading="profileLoading"
        :busy="busy"
        :authenticated="session.authenticated"
        @back="loadView('feed')"
        @edit="editProfileOpen = true"
        @start-live="openLiveStudio"
        @live-ended="liveEnded"
        @login="loginOpen = true"
        @follow="toggleFollow"
        @connections="openConnections"
        @open="openRecipe"
        @edit-recipe="startEditingRecipe"
        @tag="loadDiscover"
        @like="actOnRecipe($event, 'like')"
        @save="actOnRecipe($event, 'save')"
        @comments="openComments"
        @profile="openProfile"
        @delete="deleteRecipe"
      />

      <RecipeDetailView
        v-else-if="activeView === 'recipe'"
        :recipe="selectedRecipe"
        :viewer-id="session.user?.id || ''"
        :loading="recipeLoading"
        @back="loadView(lastCollectionView)"
        @profile="openProfile"
        @tag="loadDiscover"
        @edit="startEditingRecipe"
        @history="openEditHistory"
        @like="actOnRecipe($event, 'like')"
        @save="actOnRecipe($event, 'save')"
        @comments="openComments"
        @delete="deleteRecipe"
      />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t-2 border-charcoal bg-porcelain px-2 py-2 lg:hidden" aria-label="Navegación móvil">
      <button type="button" class="mobile-nav" :class="activeView === 'feed' && 'mobile-nav--active'" @click="loadView('feed')"><PhHouse :size="22" /><span>Inicio</span></button>
      <button type="button" class="mobile-nav" :class="activeView === 'saved' && 'mobile-nav--active'" @click="loadView('saved')"><PhBookmarkSimple :size="22" /><span>Guardadas</span></button>
      <button type="button" class="mobile-nav" :class="activeView === 'profile' && profile?.isOwnProfile && 'mobile-nav--active'" @click="openOwnProfile"><PhUserCircle :size="22" /><span>Perfil</span></button>
    </nav>

    <p v-if="toast" class="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 bg-charcoal px-5 py-3 text-center text-sm font-semibold text-porcelain shadow-xl lg:bottom-8" role="status" aria-live="polite">{{ toast }}</p>

    <LoginPanel v-if="loginOpen" :open="loginOpen" :busy="busy" :error-message="authError" @close="loginOpen = false" @submit="authenticate" />
    <ComposerModal v-if="composerOpen" :key="composerKey" :open="composerOpen" :busy="busy" @close="composerOpen = false" @submit="publishRecipe" />
    <ComposerModal v-if="editorOpen" :key="`edit-${editorKey}`" :open="editorOpen" :busy="busy" :recipe="editingRecipe" @close="editorOpen = false" @submit="saveRecipeEdit" />
    <CommentsPanel v-if="commentsOpen" :open="commentsOpen" :recipe="selectedRecipe" :comments="comments" :authenticated="session.authenticated" :viewer-id="session.user?.id || ''" :busy="busy" @close="commentsOpen = false" @login="loginOpen = true" @submit="addComment" @delete="deleteComment" />
    <EditProfileModal v-if="editProfileOpen" :open="editProfileOpen" :profile="profile" :busy="busy" :error-message="editProfileError" @close="editProfileOpen = false" @submit="saveProfile" />
    <ConnectionsPanel v-if="connectionsOpen" :open="connectionsOpen" :type="connectionsType" :people="connectionsPeople" :loading="connectionsLoading" @close="connectionsOpen = false" @profile="connectionsOpen = false; openProfile($event)" />
    <NotificationsPanel v-if="notificationsOpen" :open="notificationsOpen" :items="notifications" :loading="notificationsLoading" :unread-count="unreadNotifications" @close="notificationsOpen = false" @read-all="readAllNotifications" @open-item="openNotification" />
    <EditHistoryPanel v-if="editHistoryOpen" :open="editHistoryOpen" :recipe="selectedRecipe" :edits="editHistory" :loading="editHistoryLoading" @close="editHistoryOpen = false" />
    <LiveStudio v-if="liveStudioOpen" @close="liveStudioOpen = false" @started="liveStarted" @ended="liveEnded" @login="liveStudioOpen = false; loginOpen = true" />
  </div>
</template>
