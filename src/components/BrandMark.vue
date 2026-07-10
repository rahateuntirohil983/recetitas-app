<script setup>
import logoSource from "../assets/images/chef-pig-logo.webp";

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  showName: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <a href="#top" class="group inline-flex flex-col items-start" aria-label="Volver al inicio">
    <span :class="['logo-window', compact ? 'logo-window--compact' : '']">
      <img :src="logoSource" alt="Cerdito cocinero de recetitas.app" decoding="async" />
    </span>
    <span
      v-if="showName"
      :class="[
        'font-display font-bold tracking-[-0.035em] text-porcelain transition-colors group-hover:text-blush',
        compact ? 'mt-1 text-lg' : 'mt-2 text-[clamp(1.55rem,2.6vw,2.35rem)]',
      ]"
    >
      recetitas.app
    </span>
  </a>
</template>
