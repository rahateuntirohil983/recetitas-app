<script setup>
import { ref } from "vue";
import { PhSmileySticker, PhX } from "@phosphor-icons/vue";
import { liveStickers } from "../lib/live-stickers.js";

defineProps({
  disabled: { type: Boolean, default: false },
  dark: { type: Boolean, default: false },
});

const emit = defineEmits(["select"]);
const open = ref(false);

const selectSticker = (sticker) => {
  emit("select", sticker.marker);
  open.value = false;
};
</script>

<template>
  <div class="relative shrink-0">
    <button
      type="button"
      class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border px-3 font-bold"
      :class="dark ? 'border-porcelain/35 text-porcelain hover:bg-porcelain/10' : 'border-2 border-charcoal bg-cream text-charcoal hover:bg-blush'"
      :disabled="disabled"
      :aria-expanded="open"
      aria-label="Abrir stickers de chanchitos"
      @click="open = !open"
    >
      <PhSmileySticker :size="22" aria-hidden="true" />
      <span class="hidden sm:inline">Stickers</span>
    </button>

    <div
      v-if="open"
      class="absolute bottom-[calc(100%+0.55rem)] left-0 z-20 w-[min(18rem,calc(100vw-2.5rem))] border-2 border-charcoal bg-porcelain p-3 text-charcoal shadow-[6px_6px_0_#e3b4b9]"
      role="dialog"
      aria-label="Stickers de chanchitos"
    >
      <div class="mb-2 flex items-center justify-between gap-3">
        <strong class="font-display text-lg">Mandá un chanchito</strong>
        <button type="button" class="focus-ring grid size-8 place-items-center hover:bg-blush" aria-label="Cerrar stickers" @click="open = false"><PhX :size="18" /></button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="sticker in liveStickers"
          :key="sticker.id"
          type="button"
          class="focus-ring aspect-square overflow-hidden border border-charcoal/15 bg-cream p-1 transition hover:-translate-y-0.5 hover:border-charcoal hover:bg-blush"
          :aria-label="sticker.label"
          @click="selectSticker(sticker)"
        >
          <img :src="sticker.src" :alt="sticker.label" class="h-full w-full object-contain" width="92" height="92" />
        </button>
      </div>
    </div>
  </div>
</template>
