<script setup>
import { ref } from "vue";
import { PhArrowLeft, PhFolder, PhPencilSimple, PhPlus, PhShieldCheck, PhTrophy, PhUserPlus, PhVideoCamera } from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";
import ProfileLive from "./ProfileLive.vue";
import RecipeCard from "./RecipeCard.vue";

defineProps({
  profile: { type: Object, default: null },
  recipes: { type: Array, default: () => [] },
  viewerId: { type: String, default: "" },
  viewer: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  authenticated: { type: Boolean, default: false },
});

const emit = defineEmits(["back", "edit", "edit-recipe", "follow", "connections", "open", "tag", "like", "save", "comments", "profile", "delete", "start-live", "live-ended", "login", "collection", "create-collection"]);
const creatingCollection = ref(false);
const collectionTitle = ref("");
const collectionDescription = ref("");
const submitCollection = () => {
  if (collectionTitle.value.trim().length < 2) return;
  emit("create-collection", { title: collectionTitle.value.trim(), description: collectionDescription.value.trim() });
  collectionTitle.value = "";
  collectionDescription.value = "";
  creatingCollection.value = false;
};
</script>

<template>
  <section class="mx-auto w-full max-w-[1040px] px-4 pb-28 pt-7 sm:px-7 lg:pb-16 lg:pt-10">
    <button type="button" class="focus-ring inline-flex min-h-11 items-center gap-2 font-semibold text-charcoal/65 hover:text-charcoal" @click="$emit('back')">
      <PhArrowLeft :size="21" weight="bold" aria-hidden="true" /> Volver a la mesa
    </button>

    <div v-if="loading" class="mt-6 border-2 border-charcoal bg-cream px-6 py-20 text-center font-display text-2xl text-charcoal/60" role="status">Buscando el recetario…</div>

    <template v-else-if="profile">
      <header class="profile-hero mt-5 overflow-hidden border-2 border-charcoal bg-porcelain shadow-[10px_10px_0_#242421]">
        <div class="profile-cover-grid relative h-32 overflow-hidden bg-charcoal sm:h-40" aria-hidden="true">
          <div class="absolute -right-8 -top-16 size-52 rounded-full bg-blush" />
          <div class="absolute -bottom-20 left-[42%] size-44 rounded-full bg-olive" />
          <p class="absolute left-5 top-5 font-display text-lg font-bold text-porcelain/85 sm:left-8">La cocina de @{{ profile.handle }}</p>
        </div>

        <div class="relative px-5 pb-6 sm:px-8 sm:pb-8">
          <div class="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <PigAvatar :index="profile.avatarIndex" :size="128" :label="`Avatar de ${profile.displayName}`" class="border-4 border-porcelain shadow-[0_0_0_2px_#242421]" />
            <div v-if="profile.isOwnProfile" class="grid gap-2 sm:flex">
              <button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-blush px-5 font-semibold transition hover:bg-olive" @click="$emit('start-live')">
                <PhVideoCamera :size="21" weight="fill" aria-hidden="true" /> {{ profile.live ? "Reanudar directo" : "Iniciar o reanudar" }}
              </button>
              <button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-porcelain px-5 font-semibold transition hover:bg-blush" @click="$emit('edit')">
                <PhPencilSimple :size="20" aria-hidden="true" /> Editar perfil
              </button>
            </div>
            <button v-else type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal px-5 font-semibold transition" :class="profile.followed ? 'bg-olive' : 'bg-charcoal text-porcelain'" :disabled="busy" @click="$emit('follow', profile)">
              <PhUserPlus :size="20" :weight="profile.followed ? 'fill' : 'regular'" aria-hidden="true" /> {{ profile.followed ? "Siguiendo" : "Seguir" }}
            </button>
          </div>

          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-olive-dark">Recetario personal</p>
              <h1 class="mt-1 break-words font-display text-[clamp(2.7rem,8vw,4.5rem)] font-bold leading-[0.94] tracking-[-0.055em] text-charcoal">{{ profile.displayName }}</h1>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <p class="font-semibold text-charcoal/55">@{{ profile.handle }}</p>
                <span v-if="profile.isTeam" class="inline-flex items-center gap-1.5 border-2 border-charcoal bg-olive px-2.5 py-1 text-xs font-bold text-charcoal"><PhShieldCheck :size="16" weight="fill" /> Equipo de recetitas</span>
              </div>
              <p class="mt-5 max-w-[620px] border-l-4 border-blush pl-4 text-base leading-relaxed text-charcoal/75">{{ profile.bio || "Todavía no escribió su historia de cocina." }}</p>
            </div>

            <div class="grid grid-cols-3 border-2 border-charcoal bg-cream text-center">
              <div class="px-2 py-4"><strong class="block font-display text-3xl leading-none">{{ profile.recipeCount }}</strong><span class="mt-1 block text-xs font-semibold text-charcoal/60">recetas</span></div>
              <button type="button" class="focus-ring border-x-2 border-charcoal px-2 py-4 transition hover:bg-blush" @click="$emit('connections', 'followers')"><strong class="block font-display text-3xl leading-none">{{ profile.followerCount }}</strong><span class="mt-1 block text-xs font-semibold text-charcoal/60">seguidores</span></button>
              <button type="button" class="focus-ring px-2 py-4 transition hover:bg-olive" @click="$emit('connections', 'following')"><strong class="block font-display text-3xl leading-none">{{ profile.followingCount }}</strong><span class="mt-1 block text-xs font-semibold text-charcoal/60">siguiendo</span></button>
            </div>
          </div>
        </div>
      </header>

      <ProfileLive
        v-if="profile.live"
        :live="profile.live"
        :authenticated="authenticated"
        :viewer-id="viewerId"
        :viewer="viewer"
        @login="$emit('login')"
        @ended="$emit('live-ended')"
      />

      <section class="mt-10 border-2 border-charcoal bg-cream p-5 sm:p-7">
        <div class="flex flex-wrap items-end justify-between gap-4"><div><p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-olive-dark"><PhFolder :size="18" weight="fill" /> Recetarios públicos</p><h2 class="mt-1 font-display text-4xl font-bold tracking-[-0.045em]">Carpetas.</h2></div><button v-if="profile.isOwnProfile" type="button" class="focus-ring inline-flex min-h-11 items-center gap-2 bg-charcoal px-4 font-bold text-porcelain" @click="creatingCollection = !creatingCollection"><PhPlus :size="19" weight="bold" /> Nueva carpeta</button></div>
        <form v-if="creatingCollection" class="mt-5 grid gap-3 border-2 border-charcoal bg-porcelain p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end" @submit.prevent="submitCollection"><label class="field-label">Nombre<input v-model="collectionTitle" maxlength="60" class="field-input" placeholder="Para los domingos" /></label><label class="field-label">Descripción<input v-model="collectionDescription" maxlength="180" class="field-input" placeholder="Recetas para cocinar sin apuro" /></label><button type="submit" class="focus-ring min-h-13 bg-olive px-5 font-bold" :disabled="busy || collectionTitle.trim().length < 2">Crear</button></form>
        <div v-if="profile.collections?.length" class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><button v-for="collection in profile.collections" :key="collection.id" type="button" class="focus-ring overflow-hidden border-2 border-charcoal bg-porcelain text-left hover:bg-blush" @click="$emit('collection', collection)"><img v-if="collection.coverImageUrl" :src="collection.coverImageUrl" :alt="collection.title" class="h-28 w-full object-cover" loading="lazy" /><div v-else class="grid h-28 place-items-center bg-olive/45"><PhFolder :size="44" weight="thin" /></div><div class="p-4"><h3 class="break-words font-display text-2xl font-bold leading-tight">{{ collection.title }}</h3><p class="mt-1 text-sm text-charcoal/55">{{ collection.itemCount }} {{ collection.itemCount === 1 ? 'receta' : 'recetas' }}</p></div></button></div>
        <p v-else class="mt-5 border border-charcoal/15 bg-porcelain px-5 py-7 text-center text-charcoal/55">Todavía no hay carpetas públicas.</p>
      </section>

      <section v-if="profile.achievements?.length" class="mt-10">
        <div><p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-olive-dark"><PhTrophy :size="18" weight="fill" /> Camino recorrido</p><h2 class="mt-1 font-display text-4xl font-bold tracking-[-0.045em]">Logros.</h2></div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><article v-for="achievement in profile.achievements" :key="achievement.id" class="border-2 border-charcoal p-4" :class="achievement.unlocked ? 'bg-blush' : 'bg-cream opacity-65'"><div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center bg-charcoal text-porcelain"><PhTrophy :size="21" :weight="achievement.unlocked ? 'fill' : 'regular'" /></span><div class="min-w-0"><h3 class="font-bold">{{ achievement.title }}</h3><p class="mt-1 text-sm leading-relaxed text-charcoal/65">{{ achievement.description }}</p></div></div><div class="mt-4 h-2 bg-porcelain"><div class="h-full bg-olive-dark" :style="{ width: `${Math.round(achievement.progress / achievement.target * 100)}%` }" /></div><p class="mt-2 text-xs font-semibold text-charcoal/55">{{ achievement.progress }} / {{ achievement.target }}</p></article></div>
      </section>

      <div class="mb-6 mt-10 flex items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">{{ profile.isOwnProfile ? "Tu cocina" : "Su cocina" }}</p>
          <h2 class="font-display text-4xl font-bold tracking-[-0.045em]">Recetas publicadas.</h2>
        </div>
      </div>

      <div v-if="!recipes.length" class="border-2 border-charcoal bg-cream px-6 py-14 text-center">
        <p class="font-display text-3xl font-bold">Este recetario todavía está vacío.</p>
        <p class="mt-2 text-charcoal/65">La primera receta va a aparecer acá.</p>
      </div>
      <div v-else class="grid gap-7">
        <RecipeCard
          v-for="recipe in recipes"
          :key="recipe.id"
          :recipe="recipe"
          :viewer-id="viewerId"
          :show-follow="false"
          :can-delete="profile.isOwnProfile"
          @open="$emit('open', $event)"
          @edit="$emit('edit-recipe', $event)"
          @tag="$emit('tag', $event)"
          @like="$emit('like', $event)"
          @save="$emit('save', $event)"
          @comments="$emit('comments', $event)"
          @profile="$emit('profile', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </template>
  </section>
</template>
