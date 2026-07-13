<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { PhChatCircleDots, PhEye, PhHeart, PhSpeakerHigh, PhSpeakerSlash, PhTrash } from "@phosphor-icons/vue";
import { api } from "../lib/api.js";
import { WhepReader } from "../lib/live-webrtc.js";
import PigAvatar from "./PigAvatar.vue";

const props = defineProps({
  live: { type: Object, required: true },
  authenticated: { type: Boolean, default: false },
  viewerId: { type: String, default: "" },
});

const emit = defineEmits(["login", "ended"]);
const video = ref(null);
const currentLive = ref({ ...props.live });
const comments = ref([]);
const commentBody = ref("");
const connecting = ref(true);
const playbackError = ref("");
const muted = ref(true);
const sending = ref(false);

let reader = null;
let eventsTimer = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let stopped = false;

const viewerKey = (() => {
  const storageKey = `recetitas_live_viewer_${props.live.id}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (/^[a-f0-9]{32}$/i.test(existing || "")) return existing;
    const created = crypto.randomUUID().replaceAll("-", "");
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return crypto.randomUUID().replaceAll("-", "");
  }
})();

const connectPlayback = async () => {
  if (stopped) return;
  await reader?.close();
  reader = new WhepReader({
    endpoint: currentLive.value.playbackUrl,
    onState: (state) => {
      if (state === "connected") {
        connecting.value = false;
        playbackError.value = "";
      }
      if (["failed", "disconnected"].includes(state) && !stopped) scheduleReconnect();
    },
    onTrack: (stream) => {
      if (!video.value) return;
      video.value.srcObject = stream;
      video.value.play().catch(() => null);
    },
  });
  try {
    await reader.connect();
  } catch (failure) {
    playbackError.value = failure.message;
    scheduleReconnect();
  }
};

const scheduleReconnect = () => {
  if (stopped || reconnectTimer) return;
  connecting.value = true;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectPlayback();
  }, 2500);
};

const refreshEvents = async () => {
  try {
    const response = await api.liveEvents(currentLive.value.id);
    currentLive.value = { ...currentLive.value, ...response.live };
    comments.value = response.comments;
    if (response.live.status !== "live") {
      stopped = true;
      await reader?.close();
      emit("ended");
    }
  } catch {
    // Short polling recovers automatically on the next request.
  }
};

const sendHeartbeat = () => api.liveHeartbeat(currentLive.value.id, viewerKey).catch(() => null);

const toggleLike = async () => {
  if (!props.authenticated) {
    emit("login");
    return;
  }
  try {
    const response = await api.toggleLiveLike(currentLive.value.id);
    currentLive.value = { ...currentLive.value, liked: response.active, likeCount: response.likeCount };
  } catch (failure) {
    if (failure.status === 401) emit("login");
  }
};

const addComment = async () => {
  if (!props.authenticated) {
    emit("login");
    return;
  }
  const body = commentBody.value.trim();
  if (!body || sending.value) return;
  sending.value = true;
  try {
    await api.addLiveComment(currentLive.value.id, body);
    commentBody.value = "";
    await refreshEvents();
  } finally {
    sending.value = false;
  }
};

const deleteComment = async (comment) => {
  if (!window.confirm("¿Eliminar tu comentario del directo?")) return;
  await api.deleteLiveComment(currentLive.value.id, comment.id).catch(() => null);
  await refreshEvents();
};

const toggleSound = () => {
  muted.value = !muted.value;
  if (video.value) {
    video.value.muted = muted.value;
    video.value.play().catch(() => null);
  }
};

onMounted(async () => {
  await Promise.all([connectPlayback(), refreshEvents(), sendHeartbeat()]);
  eventsTimer = window.setInterval(refreshEvents, 1800);
  heartbeatTimer = window.setInterval(sendHeartbeat, 8000);
});

onBeforeUnmount(() => {
  stopped = true;
  window.clearInterval(eventsTimer);
  window.clearInterval(heartbeatTimer);
  window.clearTimeout(reconnectTimer);
  reader?.close();
});
</script>

<template>
  <section class="mt-10 overflow-hidden border-2 border-charcoal bg-charcoal text-porcelain shadow-[9px_9px_0_#e3b4b9]">
    <header class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7">
      <div class="flex min-w-0 items-center gap-3">
        <PigAvatar :index="currentLive.author.avatarIndex" :size="48" :label="`Avatar de ${currentLive.author.displayName}`" class="ring-2 ring-porcelain/30" />
        <div class="min-w-0"><p class="truncate font-bold">{{ currentLive.author.displayName }}</p><p class="truncate text-sm text-porcelain/55">@{{ currentLive.author.handle }}</p></div>
      </div>
      <span class="inline-flex items-center gap-2 bg-blush px-3 py-2 text-sm font-bold text-charcoal"><span class="size-2 rounded-full bg-charcoal" /> EN DIRECTO</span>
    </header>

    <div class="grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="relative min-w-0 border-porcelain/20 lg:border-r">
        <div class="relative aspect-[9/16] max-h-[76vh] bg-black sm:aspect-video">
          <video ref="video" autoplay muted playsinline class="h-full w-full object-contain" />
          <div v-if="connecting" class="absolute inset-0 grid place-items-center bg-charcoal/85 text-center"><div><p class="font-display text-3xl font-bold">Entrando a la cocina…</p><p v-if="playbackError" class="mt-2 px-5 text-sm text-porcelain/60">{{ playbackError }}</p></div></div>
          <button type="button" class="focus-ring absolute bottom-4 right-4 grid size-12 place-items-center bg-porcelain text-charcoal" :aria-label="muted ? 'Activar sonido' : 'Silenciar'" @click="toggleSound"><PhSpeakerSlash v-if="muted" :size="23" /><PhSpeakerHigh v-else :size="23" /></button>
        </div>
        <div class="p-5 sm:p-7">
          <h2 class="break-words font-display text-3xl font-bold sm:text-4xl">{{ currentLive.title }}</h2>
          <p v-if="currentLive.description" class="mt-3 max-w-[760px] break-words leading-relaxed text-porcelain/70">{{ currentLive.description }}</p>
          <div class="mt-5 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-2 border border-porcelain/25 px-3 py-2 text-sm"><PhEye :size="19" /> {{ currentLive.viewerCount }} mirando</span>
            <button type="button" class="focus-ring inline-flex items-center gap-2 px-3 py-2 text-sm font-bold" :class="currentLive.liked ? 'bg-blush text-charcoal' : 'border border-porcelain/25'" @click="toggleLike"><PhHeart :size="20" :weight="currentLive.liked ? 'fill' : 'regular'" /> {{ currentLive.likeCount }}</button>
          </div>
        </div>
      </div>

      <aside class="flex min-h-[390px] flex-col p-5 sm:p-6">
        <h3 class="flex items-center gap-2 font-display text-2xl font-bold"><PhChatCircleDots :size="25" /> Comentarios</h3>
        <div class="mt-4 max-h-[390px] flex-1 space-y-4 overflow-y-auto border-y border-porcelain/20 py-4" aria-live="polite">
          <p v-if="!comments.length" class="text-sm text-porcelain/50">Sé la primera persona en saludar.</p>
          <div v-for="comment in comments" :key="comment.id" class="group flex gap-3">
            <PigAvatar :index="comment.author.avatarIndex" :size="34" :label="`Avatar de ${comment.author.displayName}`" class="shrink-0" />
            <p class="min-w-0 flex-1 text-sm"><strong class="mr-1">@{{ comment.author.handle }}</strong><span class="break-words [overflow-wrap:anywhere] text-porcelain/75">{{ comment.body }}</span></p>
            <button v-if="comment.author.id === viewerId" type="button" class="focus-ring self-start p-1 text-porcelain/45 hover:text-blush" aria-label="Eliminar comentario" @click="deleteComment(comment)"><PhTrash :size="18" /></button>
          </div>
        </div>
        <form class="mt-4 grid gap-2" @submit.prevent="addComment">
          <input v-model="commentBody" maxlength="180" class="min-h-12 min-w-0 border border-porcelain/35 bg-transparent px-3 text-porcelain placeholder:text-porcelain/40" :placeholder="authenticated ? 'Comentá en vivo' : 'Iniciá sesión para comentar'" @focus="!authenticated && $emit('login')" />
          <button type="submit" class="min-h-11 bg-blush px-4 font-bold text-charcoal" :disabled="sending">{{ sending ? "Enviando…" : "Enviar" }}</button>
        </form>
      </aside>
    </div>
  </section>
</template>
