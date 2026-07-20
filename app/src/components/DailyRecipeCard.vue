<script setup>
import { PhArrowRight, PhCalendarStar, PhClock } from "@phosphor-icons/vue";
defineProps({ recipe: { type: Object, default: null } });
defineEmits(["open"]);
</script>

<template>
  <button v-if="recipe" type="button" class="focus-ring group relative block w-full overflow-hidden border-2 border-charcoal bg-olive text-left shadow-[7px_7px_0_#242421]" @click="$emit('open', recipe)">
    <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.title" class="h-44 w-full object-cover" loading="lazy" decoding="async" />
    <div class="p-5">
      <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]"><PhCalendarStar :size="18" weight="fill" /> Receta del día</p>
      <h2 class="mt-2 break-words font-display text-3xl font-bold leading-[1.02] tracking-[-0.045em]">{{ recipe.title }}</h2>
      <div class="mt-4 flex items-center justify-between gap-3 text-sm font-semibold"><span class="inline-flex items-center gap-1.5"><PhClock :size="17" /> {{ recipe.cookMinutes }} min</span><span class="inline-flex items-center gap-1">Abrir <PhArrowRight :size="18" /></span></div>
    </div>
  </button>
</template>
