<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import {
  PhArrowsOut,
  PhFastForward,
  PhPause,
  PhPlay,
  PhRewind,
  PhSpeakerHigh,
  PhSpeakerSlash,
} from "@phosphor-icons/vue";

defineProps({
  src: { type: String, required: true },
  title: { type: String, default: "Video de la receta" },
  compact: { type: Boolean, default: false },
});

const player = ref(null);
const video = ref(null);
const playing = ref(false);
const muted = ref(false);
const volume = ref(1);
const duration = ref(0);
const currentTime = ref(0);
const speed = ref(1);
const holdingFast = ref(false);
let holdTimer = 0;
let holdActivated = false;

const progress = computed(() => duration.value ? Math.min(100, (currentTime.value / duration.value) * 100) : 0);

const formatTime = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

const sync = () => {
  if (!video.value) return;
  playing.value = !video.value.paused;
  muted.value = video.value.muted;
  volume.value = video.value.volume;
  duration.value = Number.isFinite(video.value.duration) ? video.value.duration : 0;
  currentTime.value = video.value.currentTime || 0;
};

const togglePlay = async () => {
  if (!video.value) return;
  if (video.value.paused) await video.value.play().catch(() => null);
  else video.value.pause();
  sync();
};

const seek = (seconds) => {
  if (!video.value) return;
  video.value.currentTime = Math.max(0, Math.min(video.value.duration || 0, video.value.currentTime + seconds));
  sync();
};

const seekTo = (event) => {
  if (!video.value || !duration.value) return;
  video.value.currentTime = (Number(event.target.value) / 100) * duration.value;
  sync();
};

const toggleMute = () => {
  if (!video.value) return;
  video.value.muted = !video.value.muted;
  if (!video.value.muted && video.value.volume === 0) video.value.volume = 0.8;
  sync();
};

const setVolume = (event) => {
  if (!video.value) return;
  video.value.volume = Number(event.target.value);
  video.value.muted = video.value.volume === 0;
  sync();
};

const cycleSpeed = () => {
  const speeds = [1, 1.5, 2];
  const next = speeds[(speeds.indexOf(speed.value) + 1) % speeds.length];
  speed.value = next;
  if (video.value) video.value.playbackRate = next;
};

const startHold = (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  holdActivated = false;
  window.clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => {
    if (!video.value) return;
    holdActivated = true;
    holdingFast.value = true;
    video.value.playbackRate = 2;
    if (video.value.paused) video.value.play().catch(() => null);
  }, 320);
};

const cancelHold = () => {
  window.clearTimeout(holdTimer);
  if (holdingFast.value && video.value) video.value.playbackRate = speed.value;
  holdingFast.value = false;
  holdActivated = false;
};

const endHold = () => {
  window.clearTimeout(holdTimer);
  if (holdingFast.value && video.value) video.value.playbackRate = speed.value;
  holdingFast.value = false;
  const shouldToggle = !holdActivated;
  holdActivated = false;
  if (shouldToggle) togglePlay();
};

const fullscreen = () => {
  if (player.value?.requestFullscreen) player.value.requestFullscreen();
  else if (video.value?.webkitEnterFullscreen) video.value.webkitEnterFullscreen();
};

const onKeydown = (event) => {
  if (event.key === "ArrowLeft") { event.preventDefault(); seek(-5); }
  if (event.key === "ArrowRight") { event.preventDefault(); seek(5); }
  if (event.key === " ") { event.preventDefault(); togglePlay(); }
};

onBeforeUnmount(() => window.clearTimeout(holdTimer));
</script>

<template>
  <div ref="player" class="group relative h-full w-full overflow-hidden bg-charcoal text-porcelain" tabindex="0" role="group" :aria-label="title" @keydown="onKeydown">
    <video
      ref="video"
      :src="src"
      class="h-full w-full select-none object-contain"
      playsinline
      :preload="compact ? 'none' : 'metadata'"
      @loadedmetadata="sync"
      @timeupdate="sync"
      @play="sync"
      @pause="sync"
      @ended="sync"
      @pointerdown.prevent="startHold"
      @pointerup.prevent="endHold"
      @pointercancel="cancelHold"
      @contextmenu.prevent
    />

    <div v-if="holdingFast" class="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 bg-charcoal/85 px-4 py-2 text-sm font-bold backdrop-blur-sm">2× · soltá para volver</div>

    <button v-if="!playing" type="button" class="focus-ring absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-porcelain/92 text-charcoal shadow-xl" aria-label="Reproducir video" @click.stop="togglePlay">
      <PhPlay :size="29" weight="fill" class="translate-x-0.5" aria-hidden="true" />
    </button>

    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/95 via-charcoal/68 to-transparent px-3 pb-3 pt-10 sm:px-4">
      <label class="block">
        <span class="sr-only">Progreso del video</span>
        <input :value="progress" type="range" min="0" max="100" step="0.1" class="video-progress w-full" @input="seekTo" />
      </label>
      <div class="mt-2 flex items-center gap-1.5">
        <button type="button" class="video-control" :aria-label="playing ? 'Pausar' : 'Reproducir'" @click.stop="togglePlay"><PhPause v-if="playing" :size="20" weight="fill" /><PhPlay v-else :size="20" weight="fill" /></button>
        <button type="button" class="video-control" aria-label="Retroceder 5 segundos" @click.stop="seek(-5)"><PhRewind :size="20" weight="fill" /></button>
        <button type="button" class="video-control" aria-label="Avanzar 5 segundos" @click.stop="seek(5)"><PhFastForward :size="20" weight="fill" /></button>
        <span class="ml-1 whitespace-nowrap text-xs font-semibold tabular-nums">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        <span class="flex-1" />
        <button type="button" class="video-control min-w-10 px-2 text-xs font-bold" :aria-label="`Velocidad ${speed} por`" @click.stop="cycleSpeed">{{ speed }}×</button>
        <button v-if="!compact" type="button" class="video-control" :aria-label="muted ? 'Activar sonido' : 'Silenciar'" @click.stop="toggleMute"><PhSpeakerSlash v-if="muted" :size="20" /><PhSpeakerHigh v-else :size="20" /></button>
        <label v-if="!compact" class="hidden w-24 items-center sm:flex" @click.stop><span class="sr-only">Volumen del video</span><input :value="muted ? 0 : volume" type="range" min="0" max="1" step="0.05" class="video-progress w-full" @input="setVolume" /></label>
        <button type="button" class="video-control" aria-label="Pantalla completa" @click.stop="fullscreen"><PhArrowsOut :size="20" /></button>
      </div>
    </div>
  </div>
</template>
