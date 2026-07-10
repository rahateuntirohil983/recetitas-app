<script setup>
import { computed, onMounted, ref } from "vue";
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
import LoginPanel from "./components/LoginPanel.vue";
import RecipeCard from "./components/RecipeCard.vue";
import { api } from "./lib/api.js";

const loading = ref(true);
const session = ref({ authenticated: false, user: null, loginUrl: "/signin-with-chatgpt?return_to=/app/" });
const recipes = ref([]);
const search = ref("");
const activeView = ref("feed");
const loginOpen = ref(false);
const composerOpen = ref(false);
const commentsOpen = ref(false);
const selectedRecipe = ref(null);
const comments = ref([]);
const busy = ref(false);
const toast = ref("");

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

const loadView = async (view = activeView.value) => {
  loading.value = true;
  activeView.value = view;
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

const demoLogin = async () => {
  busy.value = true;
  try {
    session.value = await api.demoLogin();
    loginOpen.value = false;
    flash("Tu lugar en la mesa está listo.");
  } finally {
    busy.value = false;
  }
};

const logout = async () => {
  session.value = await api.logout();
  flash("Cerraste sesión.");
  if (activeView.value === "saved") await loadView("feed");
};

const replaceRecipe = (nextRecipe) => {
  const index = recipes.value.findIndex((recipe) => recipe.id === nextRecipe.id);
  if (index >= 0) recipes.value[index] = nextRecipe;
  if (selectedRecipe.value?.id === nextRecipe.id) selectedRecipe.value = nextRecipe;
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
    const response = await api.createRecipe(payload);
    recipes.value = [response.recipe, ...recipes.value];
    composerOpen.value = false;
    activeView.value = "feed";
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
    await loadView(requestedView);
    if (params.get("compose") === "1") startPublishing();
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
        <button type="button" class="side-nav" @click="session.authenticated ? flash('El perfil completo llega en la próxima iteración.') : loginOpen = true"><PhUserCircle :size="22" /> Mi perfil</button>
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
      <div class="mx-auto grid max-w-[1320px] lg:grid-cols-[minmax(0,760px)_320px] xl:gap-10">
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
            <RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" @like="actOnRecipe($event, 'like')" @save="actOnRecipe($event, 'save')" @comments="openComments" />
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
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-2 border-charcoal bg-porcelain px-2 py-2 lg:hidden" aria-label="Navegación móvil">
      <button type="button" class="mobile-nav" :class="activeView === 'feed' && 'mobile-nav--active'" @click="loadView('feed')"><PhHouse :size="22" /><span>Inicio</span></button>
      <button type="button" class="mobile-nav" @click="search = ''; activeView = 'feed'"><PhCompass :size="22" /><span>Descubrir</span></button>
      <button type="button" class="mobile-nav" :class="activeView === 'saved' && 'mobile-nav--active'" @click="loadView('saved')"><PhBookmarkSimple :size="22" /><span>Guardadas</span></button>
      <button type="button" class="mobile-nav" @click="session.authenticated ? flash('El perfil completo llega en la próxima iteración.') : loginOpen = true"><PhUserCircle :size="22" /><span>Perfil</span></button>
    </nav>

    <p v-if="toast" class="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 bg-charcoal px-5 py-3 text-center text-sm font-semibold text-porcelain shadow-xl lg:bottom-8" role="status" aria-live="polite">{{ toast }}</p>

    <LoginPanel :open="loginOpen" :demo-mode="api.isDemo" :busy="busy" @close="loginOpen = false" @demo-login="demoLogin" />
    <ComposerModal :open="composerOpen" :busy="busy" @close="composerOpen = false" @submit="publishRecipe" />
    <CommentsPanel :open="commentsOpen" :recipe="selectedRecipe" :comments="comments" :authenticated="session.authenticated" :busy="busy" @close="commentsOpen = false" @login="loginOpen = true" @submit="addComment" />
  </div>
</template>
