<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { PhArrowRight, PhArrowsClockwise, PhCookingPot } from "@phosphor-icons/vue";

const props = defineProps({ recipes: { type: Array, default: () => [] } });
const emit = defineEmits(["open"]);
const spinning = ref(false);
const selected = ref(null);
let timer = 0;

const label = computed(() => selected.value?.title || "Dejá que la suerte elija.");
const spin = () => {
  if (!props.recipes.length || spinning.value) return;
  spinning.value = true;
  let turns = 0;
  timer = window.setInterval(() => {
    selected.value = props.recipes[Math.floor(Math.random() * props.recipes.length)];
    turns += 1;
    if (turns >= 14) {
      window.clearInterval(timer);
      spinning.value = false;
    }
  }, 85 + turns * 8);
};
onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
  <section class="border-2 border-charcoal bg-blush p-5 sm:p-6">
    <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">No sé qué cocinar</p><h2 class="mt-1 font-display text-3xl font-bold tracking-[-0.045em]">Ruleta de recetas.</h2></div><PhCookingPot :size="38" weight="thin" /></div>
    <div class="mt-5 grid min-h-28 place-items-center border-2 border-charcoal bg-porcelain px-4 py-5 text-center"><p class="break-words font-display text-2xl font-bold" :class="spinning && 'opacity-60'">{{ label }}</p></div>
    <div class="mt-4 grid gap-2 sm:grid-cols-2">
      <button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-charcoal px-4 font-bold text-porcelain" :disabled="spinning || !recipes.length" @click="spin"><PhArrowsClockwise :size="20" :class="spinning && 'animate-spin'" /> {{ spinning ? 'Girando…' : 'Girar ruleta' }}</button>
      <button v-if="selected && !spinning" type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-olive px-4 font-bold" @click="$emit('open', selected)">Ver receta <PhArrowRight :size="20" /></button>
    </div>
  </section>
</template>
