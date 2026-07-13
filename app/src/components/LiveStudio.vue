<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
  PhArrowsClockwise,
  PhCamera,
  PhChatCircleDots,
  PhEye,
  PhFlashlight,
  PhHeart,
  PhMicrophone,
  PhMicrophoneSlash,
  PhStop,
  PhVideoCamera,
  PhVideoCameraSlash,
  PhX,
} from "@phosphor-icons/vue";
import { api } from "../lib/api.js";
import { WhipPublisher } from "../lib/live-webrtc.js";

const emit = defineEmits(["close", "started", "ended", "login"]);

const preview = ref(null);
const title = ref("");
const description = ref("");
const cameras = ref([]);
const selectedCamera = ref("");
const facing = ref("user");
const requestingCamera = ref(true);
const connecting = ref(false);
const isLive = ref(false);
const muted = ref(false);
const cameraPaused = ref(false);
const torchAvailable = ref(false);
const torchOn = ref(false);
const hasMedia = ref(false);
const errorMessage = ref("");
const live = ref(null);
const comments = ref([]);
const commentBody = ref("");

let mediaStream = null;
let publisher = null;
let heartbeatTimer = null;
let eventsTimer = null;

const canStart = computed(() => Boolean(mediaStream?.getVideoTracks().length && title.value.trim().length >= 3 && !connecting.value));

const attachPreview = async () => {
  await nextTick();
  if (preview.value) {
    preview.value.srcObject = mediaStream;
    preview.value.play().catch(() => null);
  }
};

const refreshDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameras.value = devices.filter((device) => device.kind === "videoinput");
  const current = mediaStream?.getVideoTracks()[0]?.getSettings()?.deviceId;
  if (current) selectedCamera.value = current;
};

const updateTorchSupport = () => {
  const track = mediaStream?.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() || {};
  torchAvailable.value = Boolean(capabilities.torch);
  if (!torchAvailable.value) torchOn.value = false;
};

const requestInitialCamera = async () => {
  requestingCamera.value = true;
  errorMessage.value = "";
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing.value }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    hasMedia.value = true;
    await attachPreview();
    await refreshDevices();
    updateTorchSupport();
  } catch (failure) {
    errorMessage.value = failure?.name === "NotAllowedError"
      ? "Necesitamos permiso para usar tu cámara y micrófono. Habilitalos en el navegador y probá otra vez."
      : "No pudimos abrir la cámara de este dispositivo.";
  } finally {
    requestingCamera.value = false;
  }
};

const replaceCamera = async (constraints) => {
  errorMessage.value = "";
  try {
    const replacement = await navigator.mediaDevices.getUserMedia({
      video: { ...constraints, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const nextTrack = replacement.getVideoTracks()[0];
    const previous = mediaStream.getVideoTracks()[0];
    if (publisher) await publisher.replaceVideoTrack(nextTrack);
    mediaStream.removeTrack(previous);
    previous.stop();
    mediaStream.addTrack(nextTrack);
    cameraPaused.value = false;
    await attachPreview();
    await refreshDevices();
    updateTorchSupport();
  } catch {
    errorMessage.value = "No pudimos cambiar de cámara.";
  }
};

const switchCamera = async () => {
  torchOn.value = false;
  if (cameras.value.length > 1) {
    const index = Math.max(0, cameras.value.findIndex((camera) => camera.deviceId === selectedCamera.value));
    const next = cameras.value[(index + 1) % cameras.value.length];
    await replaceCamera({ deviceId: { exact: next.deviceId } });
    return;
  }
  facing.value = facing.value === "user" ? "environment" : "user";
  await replaceCamera({ facingMode: { exact: facing.value } });
};

const chooseCamera = async () => {
  if (selectedCamera.value) await replaceCamera({ deviceId: { exact: selectedCamera.value } });
};

const toggleTorch = async () => {
  const track = mediaStream?.getVideoTracks()[0];
  if (!track || !torchAvailable.value) return;
  try {
    torchOn.value = !torchOn.value;
    await track.applyConstraints({ advanced: [{ torch: torchOn.value }] });
  } catch {
    torchOn.value = false;
    errorMessage.value = "El flash no está disponible con esta cámara.";
  }
};

const toggleMute = () => {
  muted.value = !muted.value;
  mediaStream?.getAudioTracks().forEach((track) => { track.enabled = !muted.value; });
};

const toggleCamera = () => {
  cameraPaused.value = !cameraPaused.value;
  mediaStream?.getVideoTracks().forEach((track) => { track.enabled = !cameraPaused.value; });
};

const refreshEvents = async () => {
  if (!live.value) return;
  try {
    const response = await api.liveEvents(live.value.id);
    live.value = { ...live.value, ...response.live };
    comments.value = response.comments;
    if (response.live.status !== "live") await finish(false);
  } catch {
    // The next short poll can recover without interrupting the broadcast.
  }
};

const beginTimers = () => {
  heartbeatTimer = window.setInterval(() => api.liveBroadcasterHeartbeat(live.value.id).catch(() => null), 8000);
  eventsTimer = window.setInterval(refreshEvents, 1800);
};

const startLive = async () => {
  if (!canStart.value) return;
  connecting.value = true;
  errorMessage.value = "";
  let started = null;
  try {
    started = await api.startLive({ title: title.value, description: description.value });
    publisher = new WhipPublisher({
      endpoint: started.publishUrl,
      token: started.publishToken,
      onState: (state) => {
        if (["failed", "disconnected"].includes(state) && isLive.value) errorMessage.value = "La conexión del directo se interrumpió. Revisá tu internet.";
      },
    });
    await publisher.connect(mediaStream);
    live.value = started.live;
    comments.value = started.comments || [];
    isLive.value = true;
    beginTimers();
    emit("started", live.value);
  } catch (failure) {
    if (started?.live?.id) await api.endLive(started.live.id).catch(() => null);
    await publisher?.close();
    publisher = null;
    if (failure.status === 401) emit("login");
    errorMessage.value = failure.message || "No pudimos iniciar el directo.";
  } finally {
    connecting.value = false;
  }
};

const addComment = async () => {
  const body = commentBody.value.trim();
  if (!body || !live.value) return;
  try {
    await api.addLiveComment(live.value.id, body);
    commentBody.value = "";
    await refreshEvents();
  } catch (failure) {
    errorMessage.value = failure.message;
  }
};

const stopTimers = () => {
  window.clearInterval(heartbeatTimer);
  window.clearInterval(eventsTimer);
  heartbeatTimer = null;
  eventsTimer = null;
};

const stopMedia = () => {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  hasMedia.value = false;
};

async function finish(callApi = true) {
  stopTimers();
  const finishedLive = live.value;
  isLive.value = false;
  if (callApi && finishedLive) await api.endLive(finishedLive.id).catch(() => null);
  await publisher?.close();
  publisher = null;
  if (finishedLive) emit("ended", finishedLive);
}

const endLive = async () => {
  if (!window.confirm("¿Terminar el directo ahora?")) return;
  connecting.value = true;
  await finish(true);
  connecting.value = false;
  stopMedia();
  emit("close");
};

const closeStudio = async () => {
  if (isLive.value) {
    await endLive();
    return;
  }
  await publisher?.close();
  stopMedia();
  emit("close");
};

onMounted(requestInitialCamera);
onBeforeUnmount(() => {
  stopTimers();
  publisher?.close();
  stopMedia();
});
</script>

<template>
  <div class="fixed inset-0 z-[90] overflow-y-auto bg-charcoal/90 p-0 sm:p-5" role="dialog" aria-modal="true" aria-label="Estudio de directo">
    <section class="mx-auto min-h-full max-w-[1180px] border-charcoal bg-porcelain sm:min-h-0 sm:border-2 sm:shadow-[10px_10px_0_#e3b4b9]">
      <header class="flex items-center justify-between border-b-2 border-charcoal px-4 py-4 sm:px-7">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Tu cocina, ahora</p>
          <h2 class="font-display text-3xl font-bold sm:text-4xl">{{ isLive ? "Estás en directo." : "Prepará el directo." }}</h2>
        </div>
        <button type="button" class="focus-ring grid size-12 place-items-center border-2 border-charcoal hover:bg-blush" aria-label="Cerrar estudio" @click="closeStudio"><PhX :size="24" /></button>
      </header>

      <div class="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="min-w-0 border-charcoal lg:border-r-2">
          <div class="relative aspect-[9/16] max-h-[72vh] overflow-hidden bg-charcoal sm:aspect-video">
            <video ref="preview" autoplay muted playsinline class="h-full w-full object-cover" :class="facing === 'user' && 'scale-x-[-1]'" />
            <div v-if="requestingCamera" class="absolute inset-0 grid place-items-center bg-charcoal text-center text-porcelain"><div><PhCamera :size="52" class="mx-auto" /><p class="mt-3 font-semibold">Esperando permiso para la cámara…</p></div></div>
            <div v-if="isLive" class="absolute left-4 top-4 flex items-center gap-2 bg-blush px-3 py-2 text-sm font-bold text-charcoal"><span class="size-2 rounded-full bg-charcoal" /> EN DIRECTO</div>
            <div v-if="cameraPaused" class="absolute inset-0 grid place-items-center bg-charcoal text-porcelain"><div class="text-center"><PhVideoCameraSlash :size="58" class="mx-auto" /><p class="mt-3 font-semibold">Cámara pausada</p></div></div>
          </div>

          <div class="grid grid-cols-4 border-t-2 border-charcoal sm:grid-cols-5">
            <button type="button" class="live-control focus-ring" :class="muted && 'bg-blush'" @click="toggleMute"><PhMicrophoneSlash v-if="muted" :size="23" /><PhMicrophone v-else :size="23" /><span>{{ muted ? "Activar" : "Silenciar" }}</span></button>
            <button type="button" class="live-control focus-ring" :class="cameraPaused && 'bg-blush'" @click="toggleCamera"><PhVideoCameraSlash v-if="cameraPaused" :size="23" /><PhVideoCamera v-else :size="23" /><span>Cámara</span></button>
            <button type="button" class="live-control focus-ring" @click="switchCamera"><PhArrowsClockwise :size="23" /><span>Cambiar</span></button>
            <button type="button" class="live-control focus-ring" :class="torchOn && 'bg-olive'" :disabled="!torchAvailable" @click="toggleTorch"><PhFlashlight :size="23" /><span>Flash</span></button>
            <label v-if="cameras.length > 1" class="col-span-4 grid gap-1 border-t-2 border-charcoal px-4 py-3 text-xs font-bold sm:col-span-1 sm:border-l-2 sm:border-t-0">
              Cámara
              <select v-model="selectedCamera" class="min-w-0 bg-transparent text-sm font-normal" @change="chooseCamera"><option v-for="(camera, index) in cameras" :key="camera.deviceId" :value="camera.deviceId">{{ camera.label || `Cámara ${index + 1}` }}</option></select>
            </label>
          </div>
        </div>

        <aside class="min-w-0 p-5 sm:p-7">
          <template v-if="!isLive">
            <label class="field-label">Título del directo<input v-model="title" maxlength="80" class="field-input" placeholder="Ej: Ñoquis en familia" /></label>
            <label class="field-label mt-5">Descripción<textarea v-model="description" maxlength="280" rows="5" class="field-input resize-none" placeholder="Contá qué vas a cocinar, para quién o qué pueden preguntarte." /></label>
            <p class="mt-3 text-sm leading-relaxed text-charcoal/60">La cámara y el micrófono solo se activan después de tu permiso. El flash aparece únicamente si la cámara lo admite.</p>
            <button v-if="!hasMedia && !requestingCamera" type="button" class="focus-ring mt-5 w-full border-2 border-charcoal bg-cream px-5 py-4 font-bold" @click="requestInitialCamera">Pedir permiso otra vez</button>
            <button type="button" class="focus-ring mt-6 inline-flex min-h-14 w-full items-center justify-between bg-blush px-5 font-bold disabled:opacity-45" :disabled="!canStart" @click="startLive"><span>{{ connecting ? "Conectando…" : "Empezar directo" }}</span><PhVideoCamera :size="24" weight="fill" /></button>
          </template>

          <template v-else>
            <h3 class="break-words font-display text-3xl font-bold">{{ live.title }}</h3>
            <p v-if="live.description" class="mt-2 break-words text-sm leading-relaxed text-charcoal/65">{{ live.description }}</p>
            <div class="mt-5 grid grid-cols-3 border-2 border-charcoal bg-cream text-center">
              <div class="py-3"><PhEye :size="20" class="mx-auto" /><strong class="mt-1 block">{{ live.viewerCount }}</strong></div>
              <div class="border-x-2 border-charcoal py-3"><PhHeart :size="20" class="mx-auto" /><strong class="mt-1 block">{{ live.likeCount }}</strong></div>
              <div class="py-3"><PhChatCircleDots :size="20" class="mx-auto" /><strong class="mt-1 block">{{ comments.length }}</strong></div>
            </div>
            <div class="mt-5 max-h-56 space-y-3 overflow-y-auto border-y-2 border-charcoal/15 py-4" aria-live="polite">
              <p v-if="!comments.length" class="text-sm text-charcoal/50">Los comentarios van a aparecer acá.</p>
              <div v-for="comment in comments" :key="comment.id" class="text-sm"><strong>@{{ comment.author.handle }}</strong> <span class="break-words">{{ comment.body }}</span></div>
            </div>
            <form class="mt-4 flex gap-2" @submit.prevent="addComment"><input v-model="commentBody" maxlength="180" class="min-w-0 flex-1 border-2 border-charcoal bg-cream px-3" placeholder="Responder en vivo" /><button class="bg-charcoal px-4 py-3 font-bold text-porcelain">Enviar</button></form>
            <button type="button" class="focus-ring mt-6 inline-flex min-h-14 w-full items-center justify-between bg-charcoal px-5 font-bold text-porcelain" :disabled="connecting" @click="endLive"><span>Terminar directo</span><PhStop :size="23" weight="fill" /></button>
          </template>

          <p v-if="errorMessage" class="mt-5 border-l-4 border-blush bg-cream px-4 py-3 text-sm font-semibold" role="alert">{{ errorMessage }}</p>
        </aside>
      </div>
    </section>
  </div>
</template>
