<script setup>
import { computed } from "vue";
import {
  PhArrowLeft,
  PhBookmarkSimple,
  PhChatCircleDots,
  PhClock,
  PhCookingPot,
  PhHeart,
  PhTrash,
  PhUsers,
} from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";
import RecipeVideo from "./RecipeVideo.vue";

const props = defineProps({
  recipe: { type: Object, default: null },
  viewerId: { type: String, default: "" },
  loading: { type: Boolean, default: false },
});

defineEmits(["back", "profile", "like", "save", "comments", "delete"]);

const canDelete = computed(() => Boolean(props.viewerId && props.recipe?.author?.id === props.viewerId));
</script>

<template>
  <section class="mx-auto w-full max-w-[1100px] px-4 pb-28 pt-7 sm:px-7 lg:pb-16 lg:pt-10">
    <button type="button" class="focus-ring inline-flex min-h-11 items-center gap-2 font-semibold text-charcoal/65 hover:text-charcoal" @click="$emit('back')">
      <PhArrowLeft :size="21" weight="bold" aria-hidden="true" /> Volver a la mesa
    </button>

    <div v-if="loading && !recipe" class="mt-5 border-2 border-charcoal bg-cream px-6 py-20 text-center font-display text-2xl text-charcoal/60" role="status">
      Sirviendo la receta…
    </div>

    <article v-else-if="recipe" class="mt-5 min-w-0 overflow-hidden border-2 border-charcoal bg-porcelain shadow-[8px_8px_0_#242421] sm:shadow-[12px_12px_0_#242421]">
      <header class="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <button type="button" class="focus-ring flex min-w-0 items-center gap-3 text-left" @click="$emit('profile', recipe.author.handle)">
          <PigAvatar :index="recipe.author.avatarIndex" :size="48" :label="`Avatar de ${recipe.author.displayName}`" class="ring-2 ring-charcoal/15" />
          <span class="min-w-0">
            <strong class="block truncate text-base text-charcoal">{{ recipe.author.displayName }}</strong>
            <span class="block truncate text-sm text-charcoal/55">@{{ recipe.author.handle }}</span>
          </span>
        </button>
        <span class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Receta compartida</span>
      </header>

      <figure class="aspect-[4/3] overflow-hidden bg-olive/40 sm:aspect-[16/9]">
        <RecipeVideo v-if="recipe.videoUrl" :src="recipe.videoUrl" :title="`Video de ${recipe.title}`" />
        <img v-else-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.title" class="h-full w-full object-cover" decoding="async" />
        <div v-else class="grid h-full place-items-center text-center text-charcoal" role="img" :aria-label="`${recipe.title}, sin foto`">
          <div><PhCookingPot :size="88" weight="thin" class="mx-auto" aria-hidden="true" /><p class="mt-3 font-display text-3xl font-bold">Receta sin foto.</p></div>
        </div>
      </figure>

      <div class="px-5 py-6 sm:px-8 sm:py-9">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-2 bg-cream px-4 py-2.5 font-semibold text-charcoal"><PhClock :size="20" aria-hidden="true" /> {{ recipe.cookMinutes }} min</span>
          <span class="inline-flex items-center gap-2 bg-olive px-4 py-2.5 font-semibold text-charcoal"><PhUsers :size="20" aria-hidden="true" /> {{ recipe.servings }} porciones</span>
        </div>

        <h1 class="mt-5 min-w-0 break-words [overflow-wrap:anywhere] font-display text-[clamp(2.8rem,9vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.055em] text-charcoal">{{ recipe.title }}</h1>
        <p class="mt-5 min-w-0 max-w-[780px] break-words [overflow-wrap:anywhere] text-lg leading-relaxed text-charcoal/72">{{ recipe.summary }}</p>

        <div class="mt-8 grid gap-8 border-t-2 border-charcoal/15 pt-8 md:grid-cols-2 md:gap-12">
          <section>
            <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Lo que vas a usar</p>
            <h2 class="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Ingredientes.</h2>
            <ul class="mt-5 grid min-w-0 gap-3">
              <li v-for="ingredient in recipe.ingredients" :key="ingredient" class="flex min-w-0 gap-3 border-b border-charcoal/12 pb-3 leading-relaxed">
                <span class="mt-2 size-2 shrink-0 rounded-full bg-blush" aria-hidden="true" /><span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ ingredient }}</span>
              </li>
            </ul>
          </section>

          <section>
            <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Manos a la obra</p>
            <h2 class="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Paso a paso.</h2>
            <ol class="mt-5 grid min-w-0 gap-5">
              <li v-for="(step, index) in recipe.steps" :key="`${index}-${step}`" class="grid min-w-0 grid-cols-[2.3rem_minmax(0,1fr)] gap-3 leading-relaxed">
                <span class="grid size-9 place-items-center bg-charcoal font-display font-bold text-porcelain">{{ index + 1 }}</span>
                <span class="min-w-0 break-words [overflow-wrap:anywhere] pt-1.5">{{ step }}</span>
              </li>
            </ol>
          </section>
        </div>

        <div class="mt-9 flex flex-wrap items-center justify-between gap-3 border-t-2 border-charcoal/15 pt-5">
          <div class="flex items-center gap-2">
            <button type="button" :aria-pressed="recipe.liked" class="social-action focus-ring" :class="recipe.liked && 'social-action--active'" @click="$emit('like', recipe)">
              <PhHeart :size="22" :weight="recipe.liked ? 'fill' : 'regular'" aria-hidden="true" /> {{ recipe.likeCount }}
            </button>
            <button type="button" class="social-action focus-ring" @click="$emit('comments', recipe)">
              <PhChatCircleDots :size="22" aria-hidden="true" /> {{ recipe.commentCount }} comentarios
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="canDelete" type="button" class="social-action focus-ring hover:!bg-blush" @click="$emit('delete', recipe)"><PhTrash :size="21" aria-hidden="true" /> Eliminar</button>
            <button type="button" :aria-pressed="recipe.saved" class="social-action focus-ring" :class="recipe.saved && 'social-action--saved'" @click="$emit('save', recipe)">
              <PhBookmarkSimple :size="22" :weight="recipe.saved ? 'fill' : 'regular'" aria-hidden="true" /> {{ recipe.saved ? "Guardada" : "Guardar" }}
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
