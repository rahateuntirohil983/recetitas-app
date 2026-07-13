<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
  PhShieldCheck,
  PhTrash,
  PhUserMinus,
  PhVideoCamera,
  PhVideoCameraSlash,
  PhX,
} from "@phosphor-icons/vue";
import { api } from "../lib/api.js";
import { WhipPublisher } from "../lib/live-webrtc.js";
import { liveStickerFromBody } from "../lib/live-stickers.js";
import LiveStickerPicker from "./LiveStickerPicker.vue";

const emit = defineEmits(["close", "started", "ended", "login"]);

const preview = ref(null);
const chatScroll = ref(null);
const titleInput = ref(null);
const title = ref("");
const description = ref("");
const cameras = ref([]);
const selectedCamera = ref("");
const facing = ref("user");
const requestingCamera = ref(true);
const switchingCamera = ref(false);
const connecting = ref(false);
const reconnecting = ref(false);
const isLive = ref(false);
const mobilePanel = ref("chat");
const muted = ref(false);
const hasAudio = ref(false);
const cameraPaused = ref(false);
const torchAvailable = ref(false);
const torchOn = ref(false);
const hasMedia = ref(false);
const errorMessage = ref("");
const live = ref(null);
const comments = ref([]);
const moderation = ref({ moderators: [], bannedUsers: [] });
const commentBody = ref("");
const chatFollowsLatest = ref(true);
const hasNewComments = ref(false);

let mediaStream = null;
let publisher = null;
let heartbeatTimer = null;
let eventsTimer = null;
let publishDisconnectTimer = null;

const canStart = computed(() => Boolean(hasMedia.value && title.value.trim().length >= 3 && !connecting.value && !requestingCamera.value));
const startHint = computed(() => {
  if (requestingCamera.value) return "Esperando el permiso de la cámara…";
  if (!hasMedia.value) return "Necesitamos una cámara para transmitir.";
  if (title.value.trim().length < 3) return "Escribí un título de al menos 3 caracteres.";
  return "Todo listo para salir en vivo.";
});

const attachPreview = async () => {
  await nextTick();
  if (preview.value) {
    preview.value.srcObject = mediaStream;
    preview.value.play().catch(() => null);
  }
};

const refreshDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameras.value = devices.filter((device) => device.kind === "videoinput");
  const current = mediaStream?.getVideoTracks()[0]?.getSettings()?.deviceId;
  if (current) selectedCamera.value = current;
};

const cameraPosition = (camera) => {
  const label = String(camera?.label || "").toLowerCase();
  if (/front|user|frontal/.test(label)) return "user";
  if (/back|rear|environment|trasera/.test(label)) return "environment";
  return "";
};

const cameraOrder = (camera) => {
  const match = String(camera?.label || "").match(/camera\s*(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const preferredCameras = (position) => cameras.value
  .filter((camera) => cameraPosition(camera) === position)
  .sort((left, right) => cameraOrder(left) - cameraOrder(right));

const updateTorchSupport = () => {
  const track = mediaStream?.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() || {};
  torchAvailable.value = Boolean(capabilities.torch);
  if (!torchAvailable.value) torchOn.value = false;
};

const requestInitialCamera = async () => {
  requestingCamera.value = true;
  errorMessage.value = "";
  stopMedia();
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("MEDIA_UNSUPPORTED"), { name: "NotSupportedError" });
    const video = { facingMode: { ideal: facing.value }, width: { ideal: 1280 }, height: { ideal: 720 } };
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (firstFailure) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch {
        throw firstFailure;
      }
    }
    hasMedia.value = true;
    hasAudio.value = mediaStream.getAudioTracks().length > 0;
    muted.value = !hasAudio.value;
    await attachPreview();
    await refreshDevices();
    updateTorchSupport();
  } catch (failure) {
    hasMedia.value = false;
    hasAudio.value = false;
    errorMessage.value = failure?.name === "NotAllowedError"
      ? "Necesitamos permiso para usar tu cámara. Habilitala en el navegador y probá otra vez."
      : failure?.name === "NotSupportedError"
        ? "Este navegador no permite transmitir con la cámara. Probá con Chrome, Safari o Edge actualizado."
        : "No pudimos abrir la cámara de este dispositivo.";
  } finally {
    requestingCamera.value = false;
  }
};

const acquireVideoTrack = async (constraintOptions) => {
  let lastFailure = null;
  for (const constraints of constraintOptions) {
    try {
      const replacement = await navigator.mediaDevices.getUserMedia({
        video: { ...constraints, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      return replacement.getVideoTracks()[0];
    } catch (failure) {
      lastFailure = failure;
    }
  }
  throw lastFailure || new Error("CAMERA_UNAVAILABLE");
};

const replaceCamera = async (constraintOptions, intendedFacing = "") => {
  if (switchingCamera.value || !mediaStream) return;
  switchingCamera.value = true;
  errorMessage.value = "";
  torchOn.value = false;
  const previous = mediaStream.getVideoTracks()[0];
  const previousSettings = previous?.getSettings?.() || {};
  const previousEnabled = previous?.enabled !== false;
  const restoreOptions = [
    ...(previousSettings.deviceId ? [{ deviceId: { exact: previousSettings.deviceId } }] : []),
    ...(previousSettings.facingMode ? [{ facingMode: { ideal: previousSettings.facingMode } }] : []),
    { facingMode: { ideal: facing.value } },
  ];
  let nextTrack = null;
  try {
    if (previous) {
      mediaStream.removeTrack(previous);
      previous.stop();
    }
    nextTrack = await acquireVideoTrack(constraintOptions);
    nextTrack.enabled = previousEnabled;
    if (publisher) await publisher.replaceVideoTrack(nextTrack);
    mediaStream.addTrack(nextTrack);
    const nextFacing = nextTrack.getSettings?.().facingMode || intendedFacing;
    if (nextFacing) facing.value = nextFacing;
    cameraPaused.value = false;
    hasMedia.value = true;
    await attachPreview();
    await refreshDevices();
    updateTorchSupport();
  } catch {
    nextTrack?.stop();
    try {
      const restoredTrack = await acquireVideoTrack(restoreOptions);
      restoredTrack.enabled = previousEnabled;
      if (publisher) await publisher.replaceVideoTrack(restoredTrack);
      mediaStream.addTrack(restoredTrack);
      hasMedia.value = true;
      await attachPreview();
      await refreshDevices();
      updateTorchSupport();
    } catch {
      hasMedia.value = false;
    }
    errorMessage.value = "No encontramos otra cámara disponible en este dispositivo.";
  } finally {
    switchingCamera.value = false;
  }
};

const switchCamera = async () => {
  const currentSettings = mediaStream?.getVideoTracks()[0]?.getSettings?.() || {};
  const selected = cameras.value.find((camera) => camera.deviceId === currentSettings.deviceId);
  const currentFacing = currentSettings.facingMode || cameraPosition(selected) || facing.value;
  const nextFacing = currentFacing === "environment" ? "user" : "environment";
  const preferred = preferredCameras(nextFacing);
  const constraints = preferred.length
    ? preferred.map((camera) => ({ deviceId: { exact: camera.deviceId } }))
    : [{ facingMode: { exact: nextFacing } }, { facingMode: { ideal: nextFacing } }];
  await replaceCamera(constraints, nextFacing);
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
  if (!hasAudio.value) return;
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
    if (response.moderation) moderation.value = response.moderation;
    if (response.live.status === "ended") await finish(false);
  } catch {
    // The next short poll can recover without interrupting the broadcast.
  }
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

const beginTimers = () => {
  window.clearInterval(heartbeatTimer);
  window.clearInterval(eventsTimer);
  heartbeatTimer = window.setInterval(() => api.liveBroadcasterHeartbeat(live.value.id).catch(() => null), 8000);
  eventsTimer = window.setInterval(refreshEvents, 1800);
};

const handlePublisherState = (state) => {
  if (state === "connected") {
    window.clearTimeout(publishDisconnectTimer);
    publishDisconnectTimer = null;
    reconnecting.value = false;
    return;
  }
  if (!["failed", "disconnected"].includes(state) || !isLive.value) return;
  reconnecting.value = true;
  errorMessage.value = "Se cortó la señal. Estamos intentando reanudar el directo sin perder el chat.";
  window.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  window.clearTimeout(publishDisconnectTimer);
  publishDisconnectTimer = window.setTimeout(() => resumeBroadcast({ automatic: true }), state === "failed" ? 700 : 1800);
};

const publishSession = async (session) => {
  live.value = session.live;
  comments.value = session.comments || [];
  await publisher?.close();
  publisher = new WhipPublisher({ endpoint: session.publishUrl, token: session.publishToken, onState: handlePublisherState });
  await publisher.connect(mediaStream);
  const ready = await api.readyLive(session.live.id);
  live.value = ready.live;
  isLive.value = true;
  reconnecting.value = false;
  errorMessage.value = "";
  beginTimers();
  await refreshEvents();
  emit("started", live.value);
};

const startLive = async () => {
  if (connecting.value || requestingCamera.value) return;
  if (title.value.trim().length < 3) {
    errorMessage.value = "Escribí un título de al menos 3 caracteres para empezar el directo.";
    await nextTick();
    titleInput.value?.focus();
    return;
  }
  if (!hasMedia.value || !mediaStream?.getVideoTracks().some((track) => track.readyState === "live")) {
    await requestInitialCamera();
    if (!hasMedia.value) return;
  }
  connecting.value = true;
  errorMessage.value = "";
  let started = null;
  try {
    started = await api.startLive({ title: title.value, description: description.value });
    await publishSession(started);
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

async function resumeBroadcast({ automatic = false, silentMissing = false } = {}) {
  if (connecting.value || requestingCamera.value) return false;
  if (!hasMedia.value || !mediaStream?.getVideoTracks().some((track) => track.readyState === "live")) {
    await requestInitialCamera();
    if (!hasMedia.value) return false;
  }
  connecting.value = true;
  reconnecting.value = true;
  if (!automatic) errorMessage.value = "Buscando un directo reciente para reanudar…";
  try {
    const resumed = await api.resumeLive();
    title.value = resumed.live.title;
    description.value = resumed.live.description || "";
    await publishSession(resumed);
    return true;
  } catch (failure) {
    if (failure.status === 404 && failure.code === "LIVE_RESUME_NOT_FOUND") {
      reconnecting.value = false;
      if (!silentMissing) errorMessage.value = "Ese directo ya terminó. Podés empezar uno nuevo.";
      else errorMessage.value = "";
      isLive.value = false;
      return false;
    }
    if (failure.status === 401) emit("login");
    errorMessage.value = automatic
      ? "No pudimos recuperar la señal todavía. Tocá Reanudar para intentarlo otra vez."
      : (failure.message || "No pudimos reanudar el directo.");
    if (automatic) {
      window.clearTimeout(publishDisconnectTimer);
      publishDisconnectTimer = window.setTimeout(() => resumeBroadcast({ automatic: true }), 5000);
    }
    return false;
  } finally {
    connecting.value = false;
  }
}

const addComment = async () => {
  await sendChatBody(commentBody.value.trim());
};

const sendChatBody = async (body) => {
  if (!body || !live.value) return;
  try {
    await api.addLiveComment(live.value.id, body);
    commentBody.value = "";
    chatFollowsLatest.value = true;
    await refreshEvents();
  } catch (failure) {
    errorMessage.value = failure.message;
  }
};

const sendSticker = (marker) => sendChatBody(marker);

const deleteChatComment = async (comment) => {
  try {
    await api.deleteLiveComment(live.value.id, comment.id);
    await refreshEvents();
  } catch (failure) {
    errorMessage.value = failure.message;
  }
};

const toggleModerator = async (comment) => {
  try {
    await api.toggleLiveModerator(live.value.id, comment.author.id);
    await refreshEvents();
  } catch (failure) {
    errorMessage.value = failure.message;
  }
};

const toggleBan = async (comment) => {
  const action = comment.author.isBanned ? "desbloquear" : "bloquear";
  if (!window.confirm(`¿${action[0].toUpperCase()}${action.slice(1)} a @${comment.author.handle} del chat?`)) return;
  try {
    await api.toggleLiveBan(live.value.id, comment.author.id);
    await refreshEvents();
  } catch (failure) {
    errorMessage.value = failure.message;
  }
};

const toggleModeratorUser = async (user) => {
  await api.toggleLiveModerator(live.value.id, user.id).catch((failure) => { errorMessage.value = failure.message; });
  await refreshEvents();
};

const unbanUser = async (user) => {
  await api.toggleLiveBan(live.value.id, user.id).catch((failure) => { errorMessage.value = failure.message; });
  await refreshEvents();
};

const stopTimers = () => {
  window.clearInterval(heartbeatTimer);
  window.clearInterval(eventsTimer);
  heartbeatTimer = null;
  eventsTimer = null;
  window.clearTimeout(publishDisconnectTimer);
  publishDisconnectTimer = null;
};

const stopMedia = () => {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  hasMedia.value = false;
  hasAudio.value = false;
  torchAvailable.value = false;
  torchOn.value = false;
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
    if (!window.confirm("¿Pausar el directo y volver al perfil? Vas a poder reanudarlo durante 10 minutos sin perder el chat.")) return;
    connecting.value = true;
    stopTimers();
    isLive.value = false;
    reconnecting.value = false;
    if (live.value) await api.suspendLive(live.value.id).catch(() => null);
    await publisher?.close();
    publisher = null;
    stopMedia();
    connecting.value = false;
    emit("close");
    return;
  }
  await publisher?.close();
  stopMedia();
  emit("close");
};

const handleVisibilityChange = () => {
  if (!document.hidden && isLive.value && reconnecting.value) resumeBroadcast({ automatic: true });
};

onMounted(async () => {
  document.addEventListener("visibilitychange", handleVisibilityChange);
  await requestInitialCamera();
  await resumeBroadcast({ silentMissing: true });
});
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  stopTimers();
  publisher?.close();
  stopMedia();
});
</script>

<template>
  <div class="fixed inset-0 z-[90] bg-charcoal/90 p-0 lg:overflow-y-auto lg:p-5" :class="isLive ? 'overflow-hidden' : 'overflow-y-auto'" role="dialog" aria-modal="true" aria-label="Estudio de directo">
    <section class="mx-auto max-w-[1180px] border-charcoal bg-porcelain sm:min-h-0 sm:border-2 sm:shadow-[10px_10px_0_#e3b4b9]" :class="isLive ? 'h-[100dvh] overflow-hidden lg:h-auto lg:overflow-visible' : 'min-h-full'">
      <header class="items-center justify-between border-b-2 border-charcoal px-3 py-2.5 sm:px-7 sm:py-4" :class="isLive ? 'hidden lg:flex' : 'flex'">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Tu cocina, ahora</p>
          <h2 class="font-display text-2xl font-bold sm:text-4xl">{{ reconnecting ? "Reconectando…" : (isLive ? "Estás en directo." : "Prepará el directo.") }}</h2>
        </div>
        <button type="button" class="focus-ring grid size-10 place-items-center border-2 border-charcoal hover:bg-blush sm:size-12" :aria-label="isLive ? 'Pausar y cerrar estudio' : 'Cerrar estudio'" @click="closeStudio"><PhX :size="24" /></button>
      </header>

      <div class="min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]" :class="isLive ? 'flex h-[100dvh] flex-col overflow-hidden lg:h-auto lg:overflow-visible' : 'grid'">
        <div class="relative min-w-0 shrink-0 border-charcoal lg:block lg:h-auto lg:flex-none lg:border-r-2" :class="isLive ? (mobilePanel === 'camera' ? 'h-full flex-1' : 'hidden') : ''">
          <div class="relative overflow-hidden bg-charcoal" :class="isLive ? [mobilePanel === 'camera' ? 'h-full max-h-none' : 'h-[22dvh] max-h-[22dvh]', 'lg:h-auto lg:max-h-[72vh] lg:aspect-video'] : 'aspect-[9/16] max-h-[62vh] sm:aspect-video'">
            <video ref="preview" autoplay muted playsinline class="h-full w-full object-cover" :class="facing === 'user' && 'scale-x-[-1]'" />
            <div v-if="requestingCamera" class="absolute inset-0 grid place-items-center bg-charcoal text-center text-porcelain"><div><PhCamera :size="52" class="mx-auto" /><p class="mt-3 font-semibold">Esperando permiso para la cámara…</p></div></div>
            <div v-if="isLive" class="absolute left-4 top-4 flex items-center gap-2 bg-blush px-3 py-2 text-sm font-bold text-charcoal"><span class="size-2 rounded-full bg-charcoal" /> EN DIRECTO</div>
            <div v-if="isLive && !reconnecting" class="absolute right-3 top-3 z-10 flex gap-2 lg:hidden">
              <button type="button" class="focus-ring bg-porcelain/95 px-3 py-2 text-xs font-bold text-charcoal shadow-lg" @click="mobilePanel = 'chat'">Ampliar chat</button>
              <button type="button" class="focus-ring grid size-9 place-items-center bg-porcelain/95 text-charcoal shadow-lg" aria-label="Pausar y cerrar estudio" @click="closeStudio"><PhX :size="19" /></button>
            </div>
            <div v-if="reconnecting" class="absolute inset-0 grid place-items-center bg-charcoal/80 px-6 text-center text-porcelain"><div><PhArrowsClockwise :size="46" class="mx-auto" /><p class="mt-3 font-display text-2xl font-bold">Recuperando la señal…</p><button type="button" class="focus-ring mt-4 bg-blush px-4 py-3 font-bold text-charcoal" :disabled="connecting" @click="resumeBroadcast()">Reanudar ahora</button></div></div>
            <div v-if="cameraPaused" class="absolute inset-0 grid place-items-center bg-charcoal text-porcelain"><div class="text-center"><PhVideoCameraSlash :size="58" class="mx-auto" /><p class="mt-3 font-semibold">Cámara pausada</p></div></div>
          </div>

          <div class="grid grid-cols-4 border-t-2 border-charcoal" :class="isLive && mobilePanel === 'camera' ? 'absolute inset-x-0 bottom-0 z-10 bg-porcelain/95 backdrop-blur-sm lg:static lg:bg-transparent' : ''">
            <button type="button" class="live-control focus-ring" :class="muted && 'bg-blush'" :disabled="!hasAudio" @click="toggleMute"><PhMicrophoneSlash v-if="muted" :size="23" /><PhMicrophone v-else :size="23" /><span>{{ hasAudio ? (muted ? "Activar" : "Silenciar") : "Sin audio" }}</span></button>
            <button type="button" class="live-control focus-ring" :class="cameraPaused && 'bg-blush'" @click="toggleCamera"><PhVideoCameraSlash v-if="cameraPaused" :size="23" /><PhVideoCamera v-else :size="23" /><span>Cámara</span></button>
            <button type="button" class="live-control focus-ring" :disabled="switchingCamera || requestingCamera || !hasMedia" @click="switchCamera"><PhArrowsClockwise :size="23" /><span>{{ switchingCamera ? "Cambiando…" : "Cambiar" }}</span></button>
            <button type="button" class="live-control focus-ring" :class="torchOn && 'bg-olive'" :disabled="!torchAvailable" @click="toggleTorch"><PhFlashlight :size="23" /><span>Flash</span></button>
          </div>
        </div>

        <aside class="min-w-0 p-3 sm:p-4 lg:p-7" :class="isLive ? (mobilePanel === 'camera' ? 'hidden lg:block lg:overflow-visible' : 'flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:block lg:h-auto lg:overflow-visible') : ''">
          <template v-if="!isLive">
            <label class="field-label">Título del directo<input ref="titleInput" v-model="title" maxlength="80" class="field-input" placeholder="Ej: Ñoquis en familia" /></label>
            <label class="field-label mt-5">Descripción<textarea v-model="description" maxlength="280" rows="5" class="field-input resize-none" placeholder="Contá qué vas a cocinar, para quién o qué pueden preguntarte." /></label>
            <p class="mt-3 text-sm leading-relaxed text-charcoal/60">La cámara y el micrófono solo se activan después de tu permiso. El flash aparece únicamente si la cámara lo admite.</p>
            <button v-if="!hasMedia && !requestingCamera" type="button" class="focus-ring mt-5 w-full border-2 border-charcoal bg-cream px-5 py-4 font-bold" @click="requestInitialCamera">Pedir permiso otra vez</button>
            <p class="mt-5 text-sm font-semibold" :class="canStart ? 'text-olive-dark' : 'text-charcoal/60'">{{ startHint }}</p>
            <button type="button" class="focus-ring mt-3 inline-flex min-h-14 w-full items-center justify-between bg-blush px-5 font-bold disabled:opacity-45" :disabled="connecting || requestingCamera" @click="startLive"><span>{{ connecting ? "Conectando…" : "Empezar directo" }}</span><PhVideoCamera :size="24" weight="fill" /></button>
          </template>

          <template v-else>
            <div class="flex min-w-0 items-center justify-between gap-3">
              <h3 class="min-w-0 truncate font-display text-xl font-bold sm:text-2xl lg:text-3xl">{{ live.title }}</h3>
              <div class="flex shrink-0 items-center gap-2 lg:hidden">
                <button type="button" class="focus-ring inline-flex min-h-9 items-center gap-1.5 bg-blush px-3 text-xs font-bold" @click="mobilePanel = 'camera'"><PhCamera :size="17" /> Ampliar cámara</button>
                <button type="button" class="focus-ring grid size-9 place-items-center border-2 border-charcoal" aria-label="Pausar y cerrar estudio" @click="closeStudio"><PhX :size="18" /></button>
              </div>
            </div>
            <p v-if="live.description" class="mt-2 hidden line-clamp-2 break-words text-sm leading-relaxed text-charcoal/65 lg:block">{{ live.description }}</p>
            <div class="mt-2 grid grid-cols-3 border-2 border-charcoal bg-cream text-center lg:mt-5">
              <div class="flex items-center justify-center gap-1.5 py-1.5 lg:block lg:py-3"><PhEye :size="18" class="lg:mx-auto" /><strong class="lg:block">{{ live.viewerCount }}</strong></div>
              <div class="flex items-center justify-center gap-1.5 border-x-2 border-charcoal py-1.5 lg:block lg:py-3"><PhHeart :size="18" class="lg:mx-auto" /><strong class="lg:block">{{ live.likeCount }}</strong></div>
              <div class="flex items-center justify-center gap-1.5 py-1.5 lg:block lg:py-3"><PhChatCircleDots :size="18" class="lg:mx-auto" /><strong class="lg:block">{{ comments.length }}</strong></div>
            </div>
            <div ref="chatScroll" class="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain border-y-2 border-charcoal/15 py-2 pr-1 lg:mt-5 lg:max-h-56 lg:flex-none lg:py-4" aria-live="polite" @scroll.passive="updateChatPosition">
              <p v-if="!comments.length" class="text-sm text-charcoal/50">Los comentarios van a aparecer acá.</p>
              <div v-for="comment in comments" :key="comment.id" class="border-b border-charcoal/12 pb-3 text-sm">
                <div class="flex min-w-0 items-start gap-2"><div class="min-w-0 flex-1"><strong>@{{ comment.author.handle }}</strong><span v-if="comment.author.isModerator" class="ml-1 bg-olive px-1.5 py-0.5 text-[10px] font-bold">MOD</span><img v-if="liveStickerFromBody(comment.body)" :src="liveStickerFromBody(comment.body).src" :alt="liveStickerFromBody(comment.body).label" class="mt-1 h-24 w-24 object-contain" width="96" height="96" /><span v-else class="break-words [overflow-wrap:anywhere]"> {{ comment.body }}</span></div>
                  <div v-if="comment.author.id !== live.author.id" class="flex shrink-0 gap-1">
                    <button type="button" class="focus-ring p-1 hover:bg-blush" title="Borrar mensaje" @click="deleteChatComment(comment)"><PhTrash :size="17" /></button>
                    <button type="button" class="focus-ring p-1 hover:bg-olive" :title="comment.author.isModerator ? 'Quitar moderador' : 'Dar moderador'" @click="toggleModerator(comment)"><PhShieldCheck :size="17" :weight="comment.author.isModerator ? 'fill' : 'regular'" /></button>
                    <button type="button" class="focus-ring p-1 hover:bg-blush" :title="comment.author.isBanned ? 'Desbloquear del chat' : 'Bloquear del chat'" @click="toggleBan(comment)"><PhUserMinus :size="17" /></button>
                  </div>
                </div>
              </div>
            </div>
            <button v-if="hasNewComments" type="button" class="focus-ring mt-2 w-full bg-olive px-3 py-2 text-sm font-bold" @click="scrollToLatest(true)">Ver comentarios nuevos ↓</button>
            <form class="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 lg:mt-4" @submit.prevent="addComment"><LiveStickerPicker @select="sendSticker" /><input v-model="commentBody" maxlength="180" class="min-w-0 border-2 border-charcoal bg-cream px-3" placeholder="Responder en vivo" /><button class="bg-charcoal px-3 py-3 font-bold text-porcelain sm:px-4">Enviar</button></form>
            <details v-if="moderation.moderators.length || moderation.bannedUsers.length" class="mt-2 max-h-28 overflow-y-auto border-2 border-charcoal/20 bg-cream px-4 py-2 lg:mt-5 lg:max-h-none lg:overflow-visible lg:py-3">
              <summary class="cursor-pointer font-bold">Administrar chat</summary>
              <div v-if="moderation.moderators.length" class="mt-4"><p class="text-xs font-bold uppercase tracking-[0.13em] text-olive-dark">Moderadores</p><div v-for="user in moderation.moderators" :key="user.id" class="mt-2 flex items-center justify-between gap-3 text-sm"><span class="truncate">@{{ user.handle }}</span><button type="button" class="font-bold underline" @click="toggleModeratorUser(user)">Quitar</button></div></div>
              <div v-if="moderation.bannedUsers.length" class="mt-4"><p class="text-xs font-bold uppercase tracking-[0.13em] text-olive-dark">Bloqueados del chat</p><div v-for="user in moderation.bannedUsers" :key="user.id" class="mt-2 flex items-center justify-between gap-3 text-sm"><span class="truncate">@{{ user.handle }}</span><button type="button" class="font-bold underline" @click="unbanUser(user)">Desbloquear</button></div></div>
            </details>
            <button type="button" class="focus-ring mt-2 inline-flex min-h-10 w-full items-center justify-between bg-charcoal px-4 text-sm font-bold text-porcelain lg:mt-6 lg:min-h-14 lg:px-5 lg:text-base" :disabled="connecting" @click="endLive"><span>Terminar directo</span><PhStop :size="21" weight="fill" /></button>
          </template>

          <p v-if="errorMessage" class="mt-5 border-l-4 border-blush bg-cream px-4 py-3 text-sm font-semibold" role="alert">{{ errorMessage }}</p>
        </aside>
      </div>
    </section>
  </div>
</template>
