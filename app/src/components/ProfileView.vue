<script setup>
import { PhArrowLeft, PhPencilSimple, PhUserPlus } from "@phosphor-icons/vue";
import RecipeCard from "./RecipeCard.vue";

const props = defineProps({
  profile: { type: Object, default: null },
  recipes: { type: Array, default: () => [] },
  viewerId: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});

defineEmits(["back", "edit", "follow", "connections", "like", "save", "comments", "profile", "delete"]);
const initials = (name) => String(name || "R").trim().slice(0, 1).toUpperCase();
</script>

<template>
  <section class="mx-auto w-full max-w-[900px] px-4 pb-28 pt-7 sm:px-7 lg:pb-16 lg:pt-10">
    <button type="button" class="focus-ring inline-flex min-h-11 items-center gap-2 font-semibold text-charcoal/65 hover:text-charcoal" @click="$emit('back')">
      <PhArrowLeft :size="21" weight="bold" aria-hidden="true" /> Volver a la mesa
    </button>

    <div v-if="loading" class="mt-6 border-2 border-charcoal bg-cream px-6 py-20 text-center font-display text-2xl text-charcoal/60" role="status">Buscando el recetario…</div>

    <template v-else-if="profile">
      <header class="profile-hero mt-5 overflow-hidden border-2 border-charcoal bg-blush">
        <div class="h-24 bg-olive sm:h-32" aria-hidden="true" />
        <div class="px-5 pb-7 sm:px-8 sm:pb-9">
          <div class="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex min-w-0 items-end gap-4">
              <span class="grid size-24 shrink-0 place-items-center rounded-full border-4 border-porcelain bg-charcoal font-display text-4xl font-bold text-porcelain sm:size-28">{{ initials(profile.displayName) }}</span>
              <div class="min-w-0 pb-1">
                <h1 class="truncate font-display text-[clamp(2.7rem,7vw,4.8rem)] font-bold leading-none tracking-[-0.055em]">{{ profile.displayName }}</h1>
                <p class="mt-1 font-semibold text-charcoal/60">@{{ profile.handle }}</p>
              </div>
            </div>

            <button v-if="profile.isOwnProfile" type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-porcelain px-5 font-semibold hover:bg-cream" @click="$emit('edit')">
              <PhPencilSimple :size="20" aria-hidden="true" /> Editar perfil
            </button>
            <button v-else type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal px-5 font-semibold" :class="profile.followed ? 'bg-olive' : 'bg-charcoal text-porcelain'" :disabled="busy" @click="$emit('follow', profile)">
              <PhUserPlus :size="20" :weight="profile.followed ? 'fill' : 'regular'" aria-hidden="true" /> {{ profile.followed ? "Siguiendo" : "Seguir" }}
            </button>
          </div>

          <p class="mt-6 max-w-[620px] text-base leading-relaxed text-charcoal/75">{{ profile.bio || "Todavía no escribió su historia de cocina." }}</p>

          <div class="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-charcoal/20 pt-5 text-sm">
            <p><strong class="font-display text-2xl">{{ profile.recipeCount }}</strong> recetas</p>
            <button type="button" class="focus-ring hover:underline" @click="$emit('connections', 'followers')"><strong class="font-display text-2xl">{{ profile.followerCount }}</strong> seguidores</button>
            <button type="button" class="focus-ring hover:underline" @click="$emit('connections', 'following')"><strong class="font-display text-2xl">{{ profile.followingCount }}</strong> siguiendo</button>
          </div>
        </div>
      </header>

      <div class="mb-6 mt-10 flex items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Su cocina</p>
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
