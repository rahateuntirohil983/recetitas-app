<script setup>
import { computed, ref } from "vue";
import { PhHash, PhMagnifyingGlass, PhUserPlus } from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";
import RecipeCard from "./RecipeCard.vue";
import DiscoverLiveCard from "./DiscoverLiveCard.vue";

const props = defineProps({
  recipes: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  creators: { type: Array, default: () => [] },
  lives: { type: Array, default: () => [] },
  selectedTag: { type: String, default: "" },
  viewerId: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});

defineEmits(["tag", "profile", "follow", "open", "edit", "like", "save", "comments"]);
const search = ref("");

const term = computed(() => search.value.trim().toLowerCase().replace(/^#/, ""));
const visibleTags = computed(() => !term.value ? props.tags : props.tags.filter((tag) => tag.name.includes(term.value)));
const visibleCreators = computed(() => !term.value ? props.creators : props.creators.filter((person) => [person.displayName, person.handle].some((value) => String(value).toLowerCase().includes(term.value))));
const visibleLives = computed(() => !term.value ? props.lives : props.lives.filter((live) => [
  live.title,
  live.description,
  live.author.displayName,
  live.author.handle,
].some((value) => String(value || "").toLowerCase().includes(term.value))));
const visibleRecipes = computed(() => !term.value ? props.recipes : props.recipes.filter((recipe) => [
  recipe.title,
  recipe.summary,
  recipe.author.displayName,
  recipe.author.handle,
  ...(recipe.tags || []),
  ...(recipe.ingredients || []),
].some((value) => String(value).toLowerCase().includes(term.value))));
</script>

<template>
  <section class="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-7 sm:px-7 lg:pb-16 lg:pt-10">
    <header class="grid gap-6 border-b-2 border-charcoal pb-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
      <div>
        <p class="text-sm font-bold uppercase tracking-[0.17em] text-olive-dark">Más allá de tu mesa</p>
        <h1 class="mt-1 font-display text-[clamp(3.3rem,9vw,6.4rem)] font-bold leading-none tracking-[-0.065em] text-charcoal">Descubrir.</h1>
        <p class="mt-3 max-w-[620px] text-base leading-relaxed text-charcoal/65">Buscá una idea, tocá un hashtag o conocé a quienes están cocinando algo distinto.</p>
      </div>
      <label class="relative block">
        <span class="sr-only">Buscar en Descubrir</span>
        <PhMagnifyingGlass :size="22" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/45" aria-hidden="true" />
        <input v-model="search" type="search" class="min-h-14 w-full border-2 border-charcoal bg-porcelain pl-12 pr-4 outline-none placeholder:text-charcoal/40 focus:bg-cream" placeholder="Receta, persona o #hashtag" />
      </label>
    </header>

    <section v-if="visibleLives.length" class="mt-8">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Ahora mismo</p>
          <h2 class="font-display text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Cocinas en vivo.</h2>
        </div>
        <p class="max-w-[360px] text-sm leading-relaxed text-charcoal/60">Entrá, mirá qué están preparando y sumate al chat mientras cocinan.</p>
      </div>
      <div class="grid gap-7 lg:grid-cols-2">
        <DiscoverLiveCard v-for="live in visibleLives" :key="live.id" :live="live" @open="$emit('profile', $event)" />
      </div>
    </section>

    <section class="mt-8">
      <div class="flex items-end justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Lo que se está cocinando</p><h2 class="font-display text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Hashtags en la mesa.</h2></div>
        <PhHash :size="34" weight="thin" class="text-blush" aria-hidden="true" />
      </div>
      <div class="mt-5 flex flex-wrap gap-2">
        <button type="button" class="focus-ring border-2 border-charcoal px-4 py-2.5 text-sm font-bold transition" :class="!selectedTag ? 'bg-charcoal text-porcelain' : 'bg-porcelain hover:bg-cream'" @click="$emit('tag', '')">Todas</button>
        <button v-for="tag in visibleTags" :key="tag.name" type="button" class="focus-ring inline-flex items-center gap-2 border-2 border-charcoal px-4 py-2.5 text-sm font-bold transition" :class="selectedTag === tag.name ? 'bg-olive' : 'bg-porcelain hover:bg-blush'" @click="$emit('tag', tag.name)">
          #{{ tag.name }} <span class="font-normal opacity-55">{{ tag.recipeCount }}</span>
        </button>
        <p v-if="!visibleTags.length" class="text-sm text-charcoal/55">Los hashtags aparecerán cuando la comunidad publique recetas etiquetadas.</p>
      </div>
    </section>

    <section v-if="visibleCreators.length" class="mt-10 border-y-2 border-charcoal bg-cream px-4 py-7 sm:px-6">
      <div class="mb-5"><p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Nuevas cocinas</p><h2 class="font-display text-3xl font-bold tracking-[-0.04em]">Personas para conocer.</h2></div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="person in visibleCreators" :key="person.id" class="flex min-w-0 items-center gap-3 border-2 border-charcoal bg-porcelain p-3">
          <button type="button" class="focus-ring shrink-0" @click="$emit('profile', person.handle)"><PigAvatar :index="person.avatarIndex" :size="50" :label="`Avatar de ${person.displayName}`" /></button>
          <button type="button" class="focus-ring min-w-0 flex-1 text-left" @click="$emit('profile', person.handle)"><strong class="block truncate">{{ person.displayName }}</strong><span class="block truncate text-sm text-charcoal/55">@{{ person.handle }} · {{ person.recipeCount }} recetas</span></button>
          <button v-if="viewerId !== person.id" type="button" class="focus-ring grid size-10 shrink-0 place-items-center" :class="person.followed ? 'bg-olive' : 'bg-charcoal text-porcelain'" :aria-label="person.followed ? `Dejar de seguir a ${person.displayName}` : `Seguir a ${person.displayName}`" :disabled="busy" @click="$emit('follow', person)"><PhUserPlus :size="19" :weight="person.followed ? 'fill' : 'regular'" /></button>
        </article>
      </div>
    </section>

    <section class="mt-10">
      <div class="mb-6">
        <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">{{ selectedTag ? `Explorando #${selectedTag}` : 'Recetas recientes' }}</p>
        <h2 class="font-display text-4xl font-bold tracking-[-0.045em]">{{ selectedTag ? 'De la misma familia.' : 'Algo nuevo para probar.' }}</h2>
      </div>
      <div v-if="loading" class="border-2 border-charcoal bg-cream px-6 py-16 text-center font-display text-2xl text-charcoal/60" role="status">Buscando nuevas cocinas…</div>
      <div v-else-if="visibleRecipes.length" class="grid gap-7 xl:grid-cols-2">
        <RecipeCard
          v-for="recipe in visibleRecipes"
          :key="recipe.id"
          :recipe="recipe"
          :viewer-id="viewerId"
          @open="$emit('open', $event)"
          @edit="$emit('edit', $event)"
          @tag="$emit('tag', $event)"
          @like="$emit('like', $event)"
          @save="$emit('save', $event)"
          @comments="$emit('comments', $event)"
          @profile="$emit('profile', $event)"
          @follow="$emit('follow', $event)"
        />
      </div>
      <div v-else class="border-2 border-charcoal bg-cream px-6 py-14 text-center"><p class="font-display text-3xl font-bold">No encontramos coincidencias.</p><p class="mt-2 text-charcoal/60">Probá otra búsqueda o volvé a todas las recetas.</p></div>
    </section>
  </section>
</template>
