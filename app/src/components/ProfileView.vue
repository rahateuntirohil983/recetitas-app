<script setup>
import { PhArrowLeft, PhPencilSimple, PhUserPlus } from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";
import RecipeCard from "./RecipeCard.vue";

defineProps({
  profile: { type: Object, default: null },
  recipes: { type: Array, default: () => [] },
  viewerId: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});

defineEmits(["back", "edit", "follow", "connections", "open", "like", "save", "comments", "profile", "delete"]);
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
            <button v-if="profile.isOwnProfile" type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-porcelain px-5 font-semibold transition hover:bg-blush" @click="$emit('edit')">
              <PhPencilSimple :size="20" aria-hidden="true" /> Editar perfil
            </button>
            <button v-else type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal px-5 font-semibold transition" :class="profile.followed ? 'bg-olive' : 'bg-charcoal text-porcelain'" :disabled="busy" @click="$emit('follow', profile)">
              <PhUserPlus :size="20" :weight="profile.followed ? 'fill' : 'regular'" aria-hidden="true" /> {{ profile.followed ? "Siguiendo" : "Seguir" }}
            </button>
          </div>

          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-olive-dark">Recetario personal</p>
              <h1 class="mt-1 break-words font-display text-[clamp(2.7rem,8vw,4.5rem)] font-bold leading-[0.94] tracking-[-0.055em] text-charcoal">{{ profile.displayName }}</h1>
              <p class="mt-2 font-semibold text-charcoal/55">@{{ profile.handle }}</p>
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
