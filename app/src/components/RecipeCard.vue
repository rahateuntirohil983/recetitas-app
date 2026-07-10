<script setup>
import {
  PhBookmarkSimple,
  PhChatCircleDots,
  PhClock,
  PhCookingPot,
  PhHeart,
  PhTrash,
  PhUsers,
} from "@phosphor-icons/vue";

defineProps({
  recipe: { type: Object, required: true },
  viewerId: { type: String, default: "" },
  showFollow: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: false },
});
defineEmits(["like", "save", "comments", "profile", "follow", "delete"]);

const initials = (name) => String(name || "R").trim().slice(0, 1).toUpperCase();
</script>

<template>
  <article class="recipe-card overflow-hidden border-2 border-charcoal bg-porcelain">
    <header class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
      <button type="button" class="focus-ring flex min-w-0 items-center gap-3 text-left" @click="$emit('profile', recipe.author.handle)">
        <span class="grid size-11 shrink-0 place-items-center rounded-full bg-blush font-display text-xl font-bold text-charcoal" aria-hidden="true">
          {{ initials(recipe.author.displayName) }}
        </span>
        <div class="min-w-0">
          <p class="truncate font-semibold text-charcoal">{{ recipe.author.displayName }}</p>
          <p class="truncate text-sm text-charcoal/55">@{{ recipe.author.handle }}</p>
        </div>
      </button>
      <button v-if="showFollow && viewerId !== recipe.author.id" type="button" class="focus-ring min-h-10 border border-charcoal/20 px-4 text-sm font-semibold text-charcoal hover:bg-blush" :class="recipe.author.followed && 'bg-olive'" @click="$emit('follow', recipe.author)">
        {{ recipe.author.followed ? "Siguiendo" : "Seguir" }}
      </button>
    </header>

    <figure class="relative aspect-[16/10] overflow-hidden bg-cream">
      <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.title" class="h-full w-full object-cover transition duration-500 hover:scale-[1.02]" loading="lazy" decoding="async" />
      <div v-else class="grid h-full place-items-center bg-olive/45 text-center text-charcoal" role="img" :aria-label="`${recipe.title}, sin foto`">
        <div><PhCookingPot :size="72" weight="thin" class="mx-auto" aria-hidden="true" /><p class="mt-3 font-display text-2xl font-bold">Receta sin foto.</p></div>
      </div>
      <figcaption class="absolute bottom-4 left-4 flex gap-2">
        <span class="inline-flex items-center gap-1.5 bg-porcelain px-3 py-2 text-sm font-semibold text-charcoal">
          <PhClock :size="17" aria-hidden="true" /> {{ recipe.cookMinutes }} min
        </span>
        <span class="inline-flex items-center gap-1.5 bg-olive px-3 py-2 text-sm font-semibold text-charcoal">
          <PhUsers :size="17" aria-hidden="true" /> {{ recipe.servings }}
        </span>
      </figcaption>
    </figure>

    <div class="px-5 py-5 sm:px-6 sm:py-6">
      <h2 class="font-display text-[clamp(2rem,5vw,3.35rem)] font-bold leading-[1.02] tracking-[-0.05em] text-charcoal">
        {{ recipe.title }}
      </h2>
      <p class="mt-3 text-base leading-relaxed text-charcoal/72">{{ recipe.summary }}</p>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/15 pt-4">
        <div class="flex items-center gap-2">
          <button type="button" :aria-pressed="recipe.liked" class="social-action focus-ring" :class="recipe.liked && 'social-action--active'" aria-label="Me gusta" @click="$emit('like', recipe)">
            <PhHeart :size="22" :weight="recipe.liked ? 'fill' : 'regular'" aria-hidden="true" />
            <span>{{ recipe.likeCount }}</span>
          </button>
          <button type="button" class="social-action focus-ring" :aria-label="`${recipe.commentCount} comentarios`" @click="$emit('comments', recipe)">
            <PhChatCircleDots :size="22" aria-hidden="true" />
            <span>{{ recipe.commentCount }}</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="canDelete" type="button" class="social-action focus-ring hover:!bg-blush" aria-label="Eliminar receta" @click="$emit('delete', recipe)">
            <PhTrash :size="21" aria-hidden="true" /><span class="hidden sm:inline">Eliminar</span>
          </button>
          <button type="button" :aria-pressed="recipe.saved" class="social-action focus-ring" :class="recipe.saved && 'social-action--saved'" aria-label="Guardar receta" @click="$emit('save', recipe)">
            <PhBookmarkSimple :size="22" :weight="recipe.saved ? 'fill' : 'regular'" aria-hidden="true" />
            <span class="hidden sm:inline">{{ recipe.saved ? "Guardada" : "Guardar" }}</span>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
