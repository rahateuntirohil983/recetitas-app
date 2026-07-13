<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { PhChatCircleDots, PhEye, PhHeart, PhPause, PhPlay, PhShieldCheck, PhSpeakerHigh, PhSpeakerSlash, PhTrash, PhUserMinus } from "@phosphor-icons/vue";
import { api } from "../lib/api.js";
import { WhepReader } from "../lib/live-webrtc.js";
import { liveStickerFromBody } from "../lib/live-stickers.js";
import LiveStickerPicker from "./LiveStickerPicker.vue";
import PigAvatar from "./PigAvatar.vue";

const props = defineProps({
  live: { type: Object, required: true },
  authenticated: { type: Boolean, default: false },
  viewerId: { type: String, default: "" },
});

const emit = defineEmits(["login", "ended"]);
const video = ref(null);
const chatScroll = ref(null);
const currentLive = ref({ ...props.live });
const comments = ref([]);
const commentBody = ref("");
const connecting = ref(true);
const playbackError = ref("");
const muted = ref(true);
const paused = ref(false);
const volume = ref(0.8);
const quality = ref("auto");
const sending = ref(false);
const chatFollowsLatest = ref(true);
const hasNewComments = ref(false);

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
  if (!currentLive.value.playbackUrl) {
    connecting.value = true;
    return;
  }
  await reader?.close();
  reader = new WhepReader({
    endpoint: currentLive.value.playbackUrl,
    videoQuality: quality.value,
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
      video.value.muted = muted.value;
      video.value.volume = volume.value;
      if (!paused.value) video.value.play().catch(() => null);
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
  if (stopped || reconnectTimer || !currentLive.value.playbackUrl) return;
  connecting.value = true;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectPlayback();
  }, 2500);
};

const refreshEvents = async () => {
  try {
    const previousPlaybackUrl = currentLive.value.playbackUrl;
    const response = await api.liveEvents(currentLive.value.id);
    currentLive.value = { ...currentLive.value, ...response.live };
    comments.value = response.comments;
    if (response.live.status === "ended") {
      stopped = true;
      await reader?.close();
      emit("ended");
    } else if (response.live.status === "starting") {
      connecting.value = true;
    } else if (response.live.playbackUrl && response.live.playbackUrl !== previousPlaybackUrl) {
      connecting.value = true;
      await connectPlayback();
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
  await sendComment(commentBody.value.trim());
};

const sendComment = async (body) => {
  if (!body || sending.value) return;
  sending.value = true;
  try {
    await api.addLiveComment(currentLive.value.id, body);
    commentBody.value = "";
    chatFollowsLatest.value = true;
    await refreshEvents();
  } finally {
    sending.value = false;
  }
};

const sendSticker = async (marker) => {
  if (!props.authenticated) {
    emit("login");
    return;
  }
  await sendComment(marker);
};

const deleteComment = async (comment) => {
  if (!window.confirm("¿Eliminar tu comentario del directo?")) return;
  await api.deleteLiveComment(currentLive.value.id, comment.id).catch(() => null);
  await refreshEvents();
};

const toggleModerator = async (comment) => {
  await api.toggleLiveModerator(currentLive.value.id, comment.author.id).catch(() => null);
  await refreshEvents();
};

const toggleBan = async (comment) => {
  const action = comment.author.isBanned ? "desbloquear" : "bloquear";
  if (!window.confirm(`¿${action[0].toUpperCase()}${action.slice(1)} a @${comment.author.handle} del chat?`)) return;
  await api.toggleLiveBan(currentLive.value.id, comment.author.id).catch(() => null);
  await refreshEvents();
};

const toggleSound = () => {
  muted.value = !muted.value;
  if (video.value) {
    video.value.muted = muted.value;
    if (!muted.value && volume.value === 0) volume.value = 0.8;
    video.value.volume = volume.value;
    video.value.play().catch(() => null);
  }
};

const setVolume = (event) => {
  volume.value = Number(event.target.value);
  muted.value = volume.value === 0;
  if (video.value) {
    video.value.volume = volume.value;
    video.value.muted = muted.value;
  }
};

const togglePlayback = () => {
  if (!video.value) return;
  paused.value = !video.value.paused;
  if (paused.value) video.value.pause();
  else video.value.play().catch(() => null);
};

const setQuality = async (event) => {
  quality.value = event.target.value;
  await reader?.setVideoQuality(quality.value);
};

const updateChatPosition = () => {
  const element = chatScroll.value;
  if (!element) return;
  chatFollowsLatest.value = element.scrollHeight - element.scrollTop - element.clientHeight < 72;
  if (chatFollowsLatest.value) hasNewComments.value = false;
};

const scrollToLatest = async (force = false) => {
  await nextTick();
  const element = chatScroll.value;
  if (!element || (!force && !chatFollowsLatest.value)) return;
  element.scrollTo({ top: element.scrollHeight, behavior: force ? "smooth" : "auto" });
  chatFollowsLatest.value = true;
  hasNewComments.value = false;
};

watch(() => comments.value.at(-1)?.id, (next, previous) => {
  if (!next || next === previous) return;
  if (chatFollowsLatest.value) scrollToLatest();
  else hasNewComments.value = true;
});

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
      <span class="inline-flex items-center gap-2 bg-blush px-3 py-2 text-sm font-bold text-charcoal"><span class="size-2 rounded-full bg-charcoal" /> {{ currentLive.status === "starting" ? "RECONECTANDO" : "EN DIRECTO" }}</span>
    </header>

    <div class="grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="relative min-w-0 border-porcelain/20 lg:border-r">
        <div class="relative aspect-[9/16] max-h-[76vh] bg-black sm:aspect-video">
          <video ref="video" autoplay muted playsinline class="h-full w-full object-contain" @play="paused = false" @pause="paused = true" />
          <div v-if="connecting" class="absolute inset-0 grid place-items-center bg-charcoal/85 text-center"><div><p class="font-display text-3xl font-bold">{{ currentLive.status === "starting" ? "El streamer está volviendo…" : "Entrando a la cocina…" }}</p><p v-if="playbackError" class="mt-2 px-5 text-sm text-porcelain/60">{{ playbackError }}</p></div></div>
          <div class="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 bg-charcoal/88 p-2 backdrop-blur-sm sm:inset-x-4">
            <button type="button" class="focus-ring grid size-10 place-items-center bg-porcelain text-charcoal" :aria-label="paused ? 'Reproducir directo' : 'Pausar directo'" @click="togglePlayback"><PhPlay v-if="paused" :size="21" weight="fill" /><PhPause v-else :size="21" weight="fill" /></button>
            <button type="button" class="focus-ring grid size-10 place-items-center border border-porcelain/30 text-porcelain" :aria-label="muted ? 'Activar sonido' : 'Silenciar'" @click="toggleSound"><PhSpeakerSlash v-if="muted" :size="21" /><PhSpeakerHigh v-else :size="21" /></button>
            <label class="flex min-w-[110px] flex-1 items-center gap-2 text-xs font-bold"><span class="sr-only">Volumen del directo</span><input :value="muted ? 0 : volume" type="range" min="0" max="1" step="0.05" class="video-progress w-full" @input="setVolume" /></label>
            <label><span class="sr-only">Calidad del directo</span><select :value="quality" class="min-h-10 border border-porcelain/30 bg-charcoal px-2 text-xs font-bold text-porcelain" @change="setQuality"><option value="auto">Auto</option><option value="data">Ahorro</option><option value="balanced">480p</option><option value="high">720p</option></select></label>
          </div>
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
        <div ref="chatScroll" class="mt-4 max-h-[390px] flex-1 space-y-4 overflow-y-auto overscroll-contain border-y border-porcelain/20 py-4 pr-1" aria-live="polite" @scroll.passive="updateChatPosition">
          <p v-if="!comments.length" class="text-sm text-porcelain/50">Sé la primera persona en saludar.</p>
          <div v-for="comment in comments" :key="comment.id" class="group flex gap-3">
            <PigAvatar :index="comment.author.avatarIndex" :size="34" :label="`Avatar de ${comment.author.displayName}`" class="shrink-0" />
            <div class="min-w-0 flex-1 text-sm"><strong class="mr-1">@{{ comment.author.handle }}</strong><img v-if="liveStickerFromBody(comment.body)" :src="liveStickerFromBody(comment.body).src" :alt="liveStickerFromBody(comment.body).label" class="mt-1 h-28 w-28 object-contain" width="112" height="112" /><span v-else class="break-words [overflow-wrap:anywhere] text-porcelain/75">{{ comment.body }}</span></div>
            <div v-if="comment.author.id === viewerId || (currentLive.permissions?.canModerate && comment.author.id !== currentLive.author.id)" class="flex shrink-0 gap-1">
              <button type="button" class="focus-ring self-start p-1 text-porcelain/45 hover:text-blush" aria-label="Eliminar comentario" @click="deleteComment(comment)"><PhTrash :size="18" /></button>
              <button v-if="currentLive.permissions?.isOwner && comment.author.id !== currentLive.author.id" type="button" class="focus-ring self-start p-1 text-porcelain/45 hover:text-olive" :aria-label="comment.author.isModerator ? 'Quitar moderador' : 'Dar moderador'" @click="toggleModerator(comment)"><PhShieldCheck :size="18" :weight="comment.author.isModerator ? 'fill' : 'regular'" /></button>
              <button v-if="currentLive.permissions?.canModerate && comment.author.id !== currentLive.author.id && (!comment.author.isModerator || currentLive.permissions?.isOwner)" type="button" class="focus-ring self-start p-1 text-porcelain/45 hover:text-blush" :aria-label="comment.author.isBanned ? 'Desbloquear del chat' : 'Bloquear del chat'" @click="toggleBan(comment)"><PhUserMinus :size="18" /></button>
            </div>
          </div>
        </div>
        <button v-if="hasNewComments" type="button" class="focus-ring mt-2 w-full bg-olive px-3 py-2 text-sm font-bold text-charcoal" @click="scrollToLatest(true)">Ver comentarios nuevos ↓</button>
        <form class="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2" @submit.prevent="addComment">
          <LiveStickerPicker :disabled="sending" dark @select="sendSticker" />
          <input v-model="commentBody" maxlength="180" class="min-h-12 min-w-0 border border-porcelain/35 bg-transparent px-3 text-porcelain placeholder:text-porcelain/40" :placeholder="authenticated ? 'Comentá en vivo' : 'Iniciá sesión para comentar'" @focus="!authenticated && $emit('login')" />
          <button type="submit" class="min-h-12 bg-blush px-4 font-bold text-charcoal" :disabled="sending">{{ sending ? "…" : "Enviar" }}</button>
        </form>
      </aside>
    </div>
  </section>
</template>
