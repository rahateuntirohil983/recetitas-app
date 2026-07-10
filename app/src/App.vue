<script setup>
import { computed, onMounted, ref, watch } from "vue";
import {
  PhBookmarkSimple,
  PhCompass,
  PhHouse,
  PhMagnifyingGlass,
  PhPlus,
  PhSignOut,
  PhUserCircle,
} from "@phosphor-icons/vue";
import AppBrand from "./components/AppBrand.vue";
import CommentsPanel from "./components/CommentsPanel.vue";
import ComposerModal from "./components/ComposerModal.vue";
import ConnectionsPanel from "./components/ConnectionsPanel.vue";
import EditProfileModal from "./components/EditProfileModal.vue";
import LoginPanel from "./components/LoginPanel.vue";
import ProfileView from "./components/ProfileView.vue";
import RecipeCard from "./components/RecipeCard.vue";
import { api } from "./lib/api.js";

const loading = ref(true);
const session = ref({ authenticated: false, user: null, loginUrl: "/app/?login=1" });
const recipes = ref([]);
const search = ref("");
const activeView = ref("feed");
const loginOpen = ref(false);
const composerOpen = ref(false);
const composerKey = ref(0);
const commentsOpen = ref(false);
const selectedRecipe = ref(null);
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
  ].some((value) => String(value).toLowerCase().includes(term)));
});

const flash = (message) => {
  toast.value = message;
  window.setTimeout(() => { if (toast.value === message) toast.value = ""; }, 2800);
};

const loadView = async (view = activeView.value, updateUrl = true) => {
  loading.value = true;
  activeView.value = view;
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
  busy.value = true;
  try {
    await api.addComment(selectedRecipe.value.id, body);
    comments.value = (await api.comments(selectedRecipe.value.id)).comments;
    const recipe = { ...selectedRecipe.value, commentCount: selectedRecipe.value.commentCount + 1 };
    replaceRecipe(recipe);
  } catch (failure) {
    flash(failure.message);
  } finally {
    busy.value = false;
  }
};

const publishRecipe = async (payload) => {
  busy.value = true;
  try {
    const { imageFile, ...recipePayload } = payload;
    if (imageFile) recipePayload.imageUrl = (await api.uploadImage(imageFile)).imageUrl;
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
    session.value = await api.session();
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view") === "saved" ? "saved" : "feed";
    const profileRoute = window.location.pathname.match(/^\/app\/u\/([a-z0-9_]{3,24})\/?$/i);
    if (profileRoute) await openProfile(profileRoute[1], false);
    else await loadView(requestedView, false);
    if (["1", "register"].includes(params.get("login"))) loginOpen.value = true;
    if (params.get("compose") === "1") startPublishing();

    window.addEventListener("popstate", () => {
      const match = window.location.pathname.match(/^\/app\/u\/([a-z0-9_]{3,24})\/?$/i);
      if (match) openProfile(match[1], false);
      else loadView(new URLSearchParams(window.location.search).get("view") === "saved" ? "saved" : "feed", false);
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
        <button type="button" class="side-nav" @click="search = ''; activeView = 'feed'"><PhCompass :size="22" /> Descubrir</button>
        <button type="button" class="side-nav" :class="activeView === 'saved' && 'side-nav--active'" @click="loadView('saved')"><PhBookmarkSimple :size="22" /> Guardadas</button>
        <button type="button" class="side-nav" :class="activeView === 'profile' && profile?.isOwnProfile && 'side-nav--active'" @click="openOwnProfile"><PhUserCircle :size="22" /> Mi perfil</button>
      </nav>

      <button type="button" class="focus-ring mt-8 inline-flex min-h-13 items-center justify-between bg-blush px-5 font-semibold text-charcoal hover:bg-olive" @click="startPublishing">
        Compartir receta <PhPlus :size="20" weight="bold" />
      </button>

      <div class="mt-auto border-t border-porcelain/18 pt-5">
        <template v-if="session.authenticated">
          <p class="font-semibold">{{ session.user.displayName }}</p>
          <p class="text-sm text-porcelain/55">@{{ session.user.handle }}</p>
          <button type="button" class="mt-4 inline-flex items-center gap-2 text-sm text-porcelain/65 hover:text-blush" @click="logout"><PhSignOut :size="18" /> Salir</button>
        </template>
        <button v-else type="button" class="text-left text-sm font-semibold text-blush hover:text-olive" @click="loginOpen = true">Entrar a la comunidad</button>
      </div>
    </aside>

    <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b-2 border-charcoal bg-charcoal px-4 text-porcelain lg:hidden">
      <AppBrand compact />
      <button type="button" class="focus-ring grid size-11 place-items-center bg-blush text-charcoal" aria-label="Compartir una receta" @click="startPublishing"><PhPlus :size="22" weight="bold" /></button>
    </header>

    <main class="lg:ml-[255px]">
      <div v-if="activeView !== 'profile'" class="mx-auto grid max-w-[1320px] lg:grid-cols-[minmax(0,760px)_320px] xl:gap-10">
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
            <span class="grid size-12 shrink-0 place-items-center rounded-full bg-charcoal font-display text-xl font-bold text-porcelain">{{ session.user?.displayName?.slice(0, 1) || '+' }}</span>
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
            <RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" :viewer-id="session.user?.id || ''" @like="actOnRecipe($event, 'like')" @save="actOnRecipe($event, 'save')" @comments="openComments" @profile="openProfile" @follow="toggleFollow" />
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

          <section class="mt-7 border-2 border-charcoal bg-porcelain px-6 py-6">
            <h2 class="font-display text-2xl font-bold">En temporada</h2>
            <div class="mt-4 flex flex-wrap gap-2">
              <button v-for="tag in ['calabaza', 'limón', 'pastas', 'merienda', 'sin vueltas']" :key="tag" type="button" class="border border-charcoal/25 px-3 py-2 text-sm hover:bg-olive" @click="search = tag">#{{ tag }}</button>
            </div>
          </section>

          <a href="/" class="mt-7 block text-sm font-semibold text-charcoal/60 underline decoration-2 underline-offset-4 hover:text-charcoal">Volver a la landing</a>
        </aside>
      </div>

      <ProfileView
        v-else
        :profile="profile"
        :recipes="profileRecipes"
        :viewer-id="session.user?.id || ''"
        :loading="profileLoading"
        :busy="busy"
        @back="loadView('feed')"
        @edit="editProfileOpen = true"
        @follow="toggleFollow"
        @connections="openConnections"
        @like="actOnRecipe($event, 'like')"
        @save="actOnRecipe($event, 'save')"
        @comments="openComments"
        @profile="openProfile"
        @delete="deleteRecipe"
      />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-2 border-charcoal bg-porcelain px-2 py-2 lg:hidden" aria-label="Navegación móvil">
      <button type="button" class="mobile-nav" :class="activeView === 'feed' && 'mobile-nav--active'" @click="loadView('feed')"><PhHouse :size="22" /><span>Inicio</span></button>
      <button type="button" class="mobile-nav" @click="search = ''; activeView = 'feed'"><PhCompass :size="22" /><span>Descubrir</span></button>
      <button type="button" class="mobile-nav" :class="activeView === 'saved' && 'mobile-nav--active'" @click="loadView('saved')"><PhBookmarkSimple :size="22" /><span>Guardadas</span></button>
      <button type="button" class="mobile-nav" :class="activeView === 'profile' && profile?.isOwnProfile && 'mobile-nav--active'" @click="openOwnProfile"><PhUserCircle :size="22" /><span>Perfil</span></button>
    </nav>

    <p v-if="toast" class="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 bg-charcoal px-5 py-3 text-center text-sm font-semibold text-porcelain shadow-xl lg:bottom-8" role="status" aria-live="polite">{{ toast }}</p>

    <LoginPanel :open="loginOpen" :busy="busy" :error-message="authError" @close="loginOpen = false" @submit="authenticate" />
    <ComposerModal :key="composerKey" :open="composerOpen" :busy="busy" @close="composerOpen = false" @submit="publishRecipe" />
    <CommentsPanel :open="commentsOpen" :recipe="selectedRecipe" :comments="comments" :authenticated="session.authenticated" :busy="busy" @close="commentsOpen = false" @login="loginOpen = true" @submit="addComment" />
    <EditProfileModal :open="editProfileOpen" :profile="profile" :busy="busy" :error-message="editProfileError" @close="editProfileOpen = false" @submit="saveProfile" />
    <ConnectionsPanel :open="connectionsOpen" :type="connectionsType" :people="connectionsPeople" :loading="connectionsLoading" @close="connectionsOpen = false" @profile="connectionsOpen = false; openProfile($event)" />
  </div>
</template>
