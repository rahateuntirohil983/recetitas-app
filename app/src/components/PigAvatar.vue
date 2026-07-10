<script setup>
import { computed } from "vue";

const props = defineProps({
  index: { type: Number, default: 0 },
  size: { type: Number, default: 44 },
  label: { type: String, default: "Avatar de cerdito cocinero" },
});

const avatarIndex = computed(() => Math.abs(Number(props.index) || 0) % 64);
const avatarSrc = computed(() => `${import.meta.env.BASE_URL}avatars/pig-${String(avatarIndex.value).padStart(2, "0")}.webp`);
const avatarStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
  };
});
</script>

<template>
  <img :src="avatarSrc" :alt="label" class="inline-block shrink-0 rounded-full bg-cream object-cover" :style="avatarStyle" loading="lazy" decoding="async" />
</template>
