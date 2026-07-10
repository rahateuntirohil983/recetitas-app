<script setup>
import logo from "../assets/chef-pig-logo.webp";

defineProps({ compact: { type: Boolean, default: false } });
</script>

<template>
  <a href="/" class="brand-link" aria-label="Ir a la portada de recetitas.app">
    <span :class="['brand-logo', compact && 'brand-logo--compact']">
      <img :src="logo" alt="" decoding="async" />
    </span>
    <span v-if="!compact" class="font-display text-[1.65rem] font-bold tracking-[-0.04em] text-porcelain">
      recetitas.app
    </span>
  </a>
</template>
