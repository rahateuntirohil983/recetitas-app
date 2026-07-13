<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { PhArrowUpRight, PhChatCircleDots, PhEye, PhHeart } from "@phosphor-icons/vue";
import { WhepReader } from "../lib/live-webrtc.js";
import PigAvatar from "./PigAvatar.vue";

const props = defineProps({
  live: { type: Object, required: true },
});

const emit = defineEmits(["open"]);
const card = ref(null);
const video = ref(null);
const connecting = ref(false);
const unavailable = ref(false);

let observer = null;
let reader = null;
let reconnectTimer = null;
let stopped = false;
let visible = false;

const closePlayback = async () => {
  window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
  await reader?.close();
  reader = null;
  if (video.value) video.value.srcObject = null;
};

const scheduleReconnect = () => {
  if (stopped || !visible || reconnectTimer) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectPlayback();
  }, 3000);
};

const connectPlayback = async () => {
  if (stopped || !visible || reader || !props.live.playbackUrl) return;
  connecting.value = true;
  unavailable.value = false;
  reader = new WhepReader({
    endpoint: props.live.playbackUrl,
    onState: (state) => {
      if (state === "connected") connecting.value = false;
      if (["failed", "disconnected"].includes(state) && !stopped) {
        closePlayback().finally(scheduleReconnect);
      }
    },
    onTrack: (stream) => {
      if (!video.value) return;
      video.value.srcObject = stream;
      video.value.play().catch(() => null);
    },
  });
  try {
    await reader.connect();
  } catch {
    unavailable.value = true;
    await closePlayback();
    scheduleReconnect();
  }
};

const openLive = () => emit("open", props.live.author.handle);

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) connectPlayback();
    else closePlayback();
  }, { rootMargin: "180px 0px", threshold: 0.08 });
  if (card.value) observer.observe(card.value);
});

onBeforeUnmount(() => {
  stopped = true;
  observer?.disconnect();
  closePlayback();
});
</script>

<template>
  <article ref="card" class="group overflow-hidden border-2 border-charcoal bg-charcoal text-porcelain shadow-[7px_7px_0_#e3b4b9]">
    <button type="button" class="focus-ring relative block aspect-video w-full overflow-hidden bg-black text-left" :aria-label="`Ver el directo de ${live.author.displayName}: ${live.title}`" @click="openLive">
      <video ref="video" autoplay muted playsinline class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
      <div v-if="connecting || unavailable" class="absolute inset-0 grid place-items-center bg-charcoal/80 px-6 text-center">
        <p class="font-display text-2xl font-bold">{{ unavailable ? "Entrá para ver el directo" : "Conectando con la cocina…" }}</p>
      </div>
      <span class="absolute left-4 top-4 bg-blush px-3 py-2 text-xs font-extrabold tracking-[0.12em] text-charcoal">EN DIRECTO</span>
      <span class="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-charcoal/90 px-3 py-2 text-sm font-bold"><PhEye :size="18" /> {{ live.viewerCount }}</span>
    </button>

    <div class="p-5 sm:p-6">
      <button type="button" class="focus-ring flex max-w-full items-center gap-3 text-left" @click="openLive">
        <PigAvatar :index="live.author.avatarIndex" :size="46" :label="`Avatar de ${live.author.displayName}`" class="shrink-0 ring-2 ring-porcelain/25" />
        <span class="min-w-0"><strong class="block truncate">{{ live.author.displayName }}</strong><span class="block truncate text-sm text-porcelain/55">@{{ live.author.handle }}</span></span>
      </button>
      <h3 class="mt-5 break-words font-display text-3xl font-bold leading-none tracking-[-0.035em]">{{ live.title }}</h3>
      <p v-if="live.description" class="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-porcelain/65">{{ live.description }}</p>
      <div class="mt-5 flex items-center justify-between gap-4 border-t border-porcelain/20 pt-4">
        <div class="flex items-center gap-4 text-sm text-porcelain/65">
          <span class="inline-flex items-center gap-1.5"><PhHeart :size="19" :weight="live.liked ? 'fill' : 'regular'" /> {{ live.likeCount }}</span>
          <span class="inline-flex items-center gap-1.5"><PhChatCircleDots :size="19" /> {{ live.commentCount }}</span>
        </div>
        <button type="button" class="focus-ring inline-flex items-center gap-2 bg-olive px-4 py-2.5 text-sm font-bold text-charcoal transition hover:bg-blush" @click="openLive">Entrar <PhArrowUpRight :size="18" weight="bold" /></button>
      </div>
    </div>
  </article>
</template>
