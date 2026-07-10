<script setup>
import { computed } from "vue";
import avatarAtlas from "../assets/pig-avatar-atlas.webp";

const props = defineProps({
  index: { type: Number, default: 0 },
  size: { type: Number, default: 44 },
  label: { type: String, default: "Avatar de cerdito cocinero" },
});

const avatarStyle = computed(() => {
  const normalized = Math.abs(Number(props.index) || 0) % 64;
  const column = normalized % 8;
  const row = Math.floor(normalized / 8);
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    backgroundImage: `url(${avatarAtlas})`,
    backgroundSize: "800% 800%",
    backgroundPosition: `${(column / 7) * 100}% ${(row / 7) * 100}%`,
  };
});
</script>

<template>
  <span class="inline-block shrink-0 rounded-full bg-cream bg-no-repeat" :style="avatarStyle" role="img" :aria-label="label" />
</template>
