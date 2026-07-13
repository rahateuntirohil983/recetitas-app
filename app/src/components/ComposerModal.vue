<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { PhArrowRight, PhImageSquare, PhRecord, PhStopCircle, PhTrash, PhUploadSimple, PhVideoCamera, PhX } from "@phosphor-icons/vue";

const props = defineProps({ open: { type: Boolean, default: false }, busy: { type: Boolean, default: false } });
const emit = defineEmits(["close", "submit"]);

const error = ref("");
const titleInput = ref(null);
const summaryInput = ref(null);
const ingredientsInput = ref(null);
const stepsInput = ref(null);
const fieldErrors = reactive({ title: "", summary: "", cookMinutes: "", servings: "", ingredients: "", steps: "" });
const imageFile = ref(null);
const imagePreview = ref("");
const imageError = ref("");
const mediaMode = ref("image");
const videoFile = ref(null);
const videoPreview = ref("");
const videoError = ref("");
const cameraPreview = ref(null);
const recording = ref(false);
const recordingSeconds = ref(0);
let cameraStream = null;
let mediaRecorder = null;
let recordingChunks = [];
let recordingInterval = 0;
let recordingTimeout = 0;
let discardRecording = false;
const form = reactive({
  title: "",
  summary: "",
  cookMinutes: 35,
  servings: 4,
  imageKey: "pumpkin",
  ingredients: "",
  steps: "",
});

const chooseImage = (event) => {
  const file = event.target.files?.[0] || null;
  imageError.value = "";
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    imageError.value = "Elegí una imagen JPG, PNG o WebP.";
    event.target.value = "";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    imageError.value = "La imagen puede pesar hasta 8 MB.";
    event.target.value = "";
    return;
  }
  clearVideo();
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
};

const clearImage = () => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = null;
  imagePreview.value = "";
  imageError.value = "";
};

const clearRecordingTimers = () => {
  window.clearInterval(recordingInterval);
  window.clearTimeout(recordingTimeout);
  recordingInterval = 0;
  recordingTimeout = 0;
};

const stopCamera = () => {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  if (cameraPreview.value) cameraPreview.value.srcObject = null;
};

const clearVideo = () => {
  if (videoPreview.value) URL.revokeObjectURL(videoPreview.value);
  videoFile.value = null;
  videoPreview.value = "";
  videoError.value = "";
};

const readVideoDuration = (file) => new Promise((resolve, reject) => {
  const preview = document.createElement("video");
  const url = URL.createObjectURL(file);
  preview.preload = "metadata";
  preview.onloadedmetadata = () => {
    const value = preview.duration;
    URL.revokeObjectURL(url);
    Number.isFinite(value) ? resolve(value) : reject(new Error("INVALID_DURATION"));
  };
  preview.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("INVALID_VIDEO"));
  };
  preview.src = url;
});

const setVideoFile = async (file) => {
  videoError.value = "";
  if (!file) return false;
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
    videoError.value = "Elegí un video MP4, WebM o MOV.";
    return false;
  }
  if (file.size > 50 * 1024 * 1024) {
    videoError.value = "El video puede pesar hasta 50 MB.";
    return false;
  }
  try {
    const duration = await readVideoDuration(file);
    if (duration > 35.25) {
      videoError.value = "El video puede durar hasta 35 segundos.";
      return false;
    }
  } catch {
    videoError.value = "No pudimos leer ese video.";
    return false;
  }
  clearImage();
  clearVideo();
  videoFile.value = file;
  videoPreview.value = URL.createObjectURL(file);
  return true;
};

const chooseVideo = async (event) => {
  const file = event.target.files?.[0] || null;
  if (!await setVideoFile(file)) event.target.value = "";
};

const stopRecording = () => {
  clearRecordingTimers();
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
};

const cancelRecording = () => {
  discardRecording = true;
  stopRecording();
  stopCamera();
  recording.value = false;
  recordingSeconds.value = 0;
};

const startRecording = async () => {
  videoError.value = "";
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    videoError.value = "Este navegador no permite grabar acá. Podés usar Elegir video.";
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 720 }, height: { ideal: 1280 } },
      audio: true,
    });
    const candidates = ["video/mp4;codecs=h264,aac", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
    mediaRecorder = new MediaRecorder(cameraStream, mimeType ? { mimeType } : undefined);
    recordingChunks = [];
    discardRecording = false;
    mediaRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.push(event.data); };
    mediaRecorder.onerror = () => { videoError.value = "La grabación se interrumpió. Probá otra vez."; cancelRecording(); };
    mediaRecorder.onstop = async () => {
      clearRecordingTimers();
      stopCamera();
      recording.value = false;
      recordingSeconds.value = 0;
      if (discardRecording || !recordingChunks.length) return;
      const type = String(mediaRecorder.mimeType || recordingChunks[0]?.type || "video/webm").split(";")[0];
      const extension = type === "video/mp4" ? "mp4" : "webm";
      const blob = new Blob(recordingChunks, { type });
      await setVideoFile(new File([blob], `recetita-${Date.now()}.${extension}`, { type }));
    };
    recording.value = true;
    recordingSeconds.value = 0;
    await nextTick();
    if (cameraPreview.value) cameraPreview.value.srcObject = cameraStream;
    mediaRecorder.start(250);
    const startedAt = Date.now();
    recordingInterval = window.setInterval(() => { recordingSeconds.value = Math.min(35, Math.floor((Date.now() - startedAt) / 1000)); }, 250);
    recordingTimeout = window.setTimeout(stopRecording, 35_000);
  } catch {
    stopCamera();
    recording.value = false;
    videoError.value = "No pudimos acceder a la cámara y al micrófono.";
  }
};

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  if (videoPreview.value) URL.revokeObjectURL(videoPreview.value);
  cancelRecording();
});

watch(() => props.open, (open) => { if (!open && recording.value) cancelRecording(); });

[
  ["title", () => form.title],
  ["summary", () => form.summary],
  ["cookMinutes", () => form.cookMinutes],
  ["servings", () => form.servings],
  ["ingredients", () => form.ingredients],
  ["steps", () => form.steps],
].forEach(([field, source]) => {
  watch(source, () => {
    fieldErrors[field] = "";
    error.value = "";
  });
});

const submit = async () => {
  const ingredients = form.ingredients.split("\n").map((value) => value.trim()).filter(Boolean);
  const steps = form.steps.split("\n").map((value) => value.trim()).filter(Boolean);
  const titleLength = form.title.trim().length;
  const summaryLength = form.summary.trim().length;

  Object.assign(fieldErrors, {
    title: titleLength < 3 ? `Faltan ${3 - titleLength} caracteres.` : "",
    summary: summaryLength < 10 ? `Faltan ${10 - summaryLength} caracteres para contar la historia.` : "",
    cookMinutes: !Number.isInteger(form.cookMinutes) || form.cookMinutes < 1 || form.cookMinutes > 1440 ? "Ingresá entre 1 y 1440 minutos." : "",
    servings: !Number.isInteger(form.servings) || form.servings < 1 || form.servings > 24 ? "Ingresá entre 1 y 24 porciones." : "",
    ingredients: !ingredients.length ? "Agregá al menos un ingrediente." : "",
    steps: !steps.length ? "Agregá al menos un paso." : "",
  });

  const firstInvalid = [
    ["title", titleInput],
    ["summary", summaryInput],
    ["ingredients", ingredientsInput],
    ["steps", stepsInput],
  ].find(([field]) => fieldErrors[field]);

  if (Object.values(fieldErrors).some(Boolean)) {
    error.value = "Revisá los campos marcados antes de publicar.";
    await nextTick();
    firstInvalid?.[1]?.value?.focus();
    return;
  }
  error.value = "";
  emit("submit", { ...form, title: form.title.trim(), summary: form.summary.trim(), ingredients, steps, imageFile: imageFile.value, videoFile: videoFile.value });
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto bg-charcoal/78 p-3 backdrop-blur-sm sm:p-6" @click.self="$emit('close')">
      <section class="recipe-composer relative mx-auto my-4 w-full max-w-[760px] bg-porcelain px-5 py-8 shadow-2xl sm:px-10 sm:py-10" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <button type="button" class="focus-ring absolute right-4 top-4 grid size-11 place-items-center border-2 border-charcoal text-charcoal hover:bg-blush" aria-label="Cerrar" @click="$emit('close')">
          <PhX :size="22" aria-hidden="true" />
        </button>
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-olive-dark">Compartí la tuya</p>
        <h2 id="composer-title" class="mt-2 pr-14 font-display text-[clamp(2.7rem,7vw,4.8rem)] font-bold leading-none tracking-[-0.055em] text-charcoal">
          Nueva receta.
        </h2>

        <form class="mt-8 grid gap-5" novalidate @submit.prevent="submit">
          <label class="field-label">
            Nombre de la receta
            <input ref="titleInput" v-model="form.title" class="field-input" :class="fieldErrors.title && 'field-input--error'" :aria-invalid="Boolean(fieldErrors.title)" maxlength="90" required placeholder="Tarta de tomates asados" />
            <span v-if="fieldErrors.title" class="field-error">{{ fieldErrors.title }}</span>
          </label>
          <label class="field-label">
            <span class="flex items-center justify-between gap-3"><span>La historia corta</span><small class="font-medium" :class="form.summary.trim().length < 10 ? 'text-charcoal/55' : 'text-olive-dark'">{{ form.summary.trim().length }}/10 mínimo</small></span>
            <textarea ref="summaryInput" v-model="form.summary" class="field-input min-h-24 resize-y" :class="fieldErrors.summary && 'field-input--error'" :aria-invalid="Boolean(fieldErrors.summary)" maxlength="280" required placeholder="Qué la hace especial, cuándo la cocinás…" />
            <span v-if="fieldErrors.summary" class="field-error">{{ fieldErrors.summary }}</span>
          </label>
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="field-label">Minutos<input v-model.number="form.cookMinutes" type="number" min="1" max="1440" class="field-input" :class="fieldErrors.cookMinutes && 'field-input--error'" /><span v-if="fieldErrors.cookMinutes" class="field-error">{{ fieldErrors.cookMinutes }}</span></label>
            <label class="field-label">Porciones<input v-model.number="form.servings" type="number" min="1" max="24" class="field-input" :class="fieldErrors.servings && 'field-input--error'" /><span v-if="fieldErrors.servings" class="field-error">{{ fieldErrors.servings }}</span></label>
          </div>

          <div class="field-label">
            Foto o video <span class="font-normal text-charcoal/55">Opcional · un video puede durar hasta 35 segundos</span>
            <div class="grid grid-cols-2 border-2 border-charcoal bg-cream p-1">
              <button type="button" class="focus-ring inline-flex min-h-11 items-center justify-center gap-2 font-semibold" :class="mediaMode === 'image' ? 'bg-charcoal text-porcelain' : 'text-charcoal'" @click="mediaMode = 'image'; clearVideo(); cancelRecording()"><PhImageSquare :size="20" /> Foto</button>
              <button type="button" class="focus-ring inline-flex min-h-11 items-center justify-center gap-2 font-semibold" :class="mediaMode === 'video' ? 'bg-charcoal text-porcelain' : 'text-charcoal'" @click="mediaMode = 'video'; clearImage()"><PhVideoCamera :size="20" /> Video</button>
            </div>

            <template v-if="mediaMode === 'image'">
              <div v-if="imagePreview" class="relative overflow-hidden border-2 border-charcoal bg-cream">
                <img :src="imagePreview" alt="Vista previa de la receta" class="aspect-[16/9] w-full object-cover" />
                <button type="button" class="focus-ring absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 bg-charcoal px-4 text-sm font-semibold text-porcelain" @click="clearImage"><PhTrash :size="18" /> Quitar</button>
              </div>
              <label v-else class="focus-ring flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-charcoal bg-cream px-5 py-7 text-center transition hover:bg-blush">
                <PhImageSquare :size="38" weight="thin" aria-hidden="true" />
                <span class="font-semibold">Subí una foto de tu plato</span>
                <span class="inline-flex items-center gap-2 text-sm font-medium text-charcoal/60"><PhUploadSimple :size="17" /> JPG, PNG o WebP · 8 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="chooseImage" />
              </label>
              <span v-if="imageError" class="field-error">{{ imageError }}</span>
            </template>

            <template v-else>
              <div v-if="recording" class="overflow-hidden border-2 border-charcoal bg-charcoal text-porcelain">
                <video ref="cameraPreview" autoplay muted playsinline class="aspect-[9/16] max-h-[520px] w-full object-cover" />
                <div class="flex items-center justify-between gap-3 bg-charcoal px-4 py-3">
                  <span class="inline-flex items-center gap-2 font-semibold"><span class="size-3 animate-pulse rounded-full bg-blush" /> Grabando {{ recordingSeconds }} / 35 s</span>
                  <button type="button" class="focus-ring inline-flex min-h-11 items-center gap-2 bg-porcelain px-4 font-semibold text-charcoal" @click="stopRecording"><PhStopCircle :size="20" weight="fill" /> Detener</button>
                </div>
              </div>
              <div v-else-if="videoPreview" class="relative overflow-hidden border-2 border-charcoal bg-charcoal">
                <video :src="videoPreview" controls playsinline class="aspect-[9/16] max-h-[520px] w-full object-contain" />
                <button type="button" class="focus-ring absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 bg-porcelain px-4 text-sm font-semibold text-charcoal" @click="clearVideo"><PhTrash :size="18" /> Quitar</button>
              </div>
              <div v-else class="grid gap-3 sm:grid-cols-2">
                <button type="button" class="focus-ring flex min-h-36 flex-col items-center justify-center gap-3 border-2 border-charcoal bg-blush px-5 py-6 text-center hover:bg-olive" @click="startRecording">
                  <PhRecord :size="38" weight="fill" aria-hidden="true" />
                  <span class="font-semibold">Grabar ahora</span>
                  <span class="text-sm font-medium text-charcoal/65">Se detiene a los 35 segundos</span>
                </button>
                <label class="focus-ring flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-charcoal bg-cream px-5 py-6 text-center hover:bg-blush">
                  <PhUploadSimple :size="38" weight="thin" aria-hidden="true" />
                  <span class="font-semibold">Elegir un video</span>
                  <span class="text-sm font-medium text-charcoal/60">MP4, WebM o MOV · 50 MB</span>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" class="sr-only" @change="chooseVideo" />
                </label>
              </div>
              <span v-if="videoError" class="field-error">{{ videoError }}</span>
            </template>
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="field-label">Ingredientes, uno por línea<textarea ref="ingredientsInput" v-model="form.ingredients" class="field-input min-h-40 resize-y" :class="fieldErrors.ingredients && 'field-input--error'" required placeholder="4 tomates\n2 dientes de ajo\nAceite de oliva" /><span v-if="fieldErrors.ingredients" class="field-error">{{ fieldErrors.ingredients }}</span></label>
            <label class="field-label">Pasos, uno por línea<textarea ref="stepsInput" v-model="form.steps" class="field-input min-h-40 resize-y" :class="fieldErrors.steps && 'field-input--error'" required placeholder="Asá los tomates.\nPrepará la masa.\nHorneá hasta dorar." /><span v-if="fieldErrors.steps" class="field-error">{{ fieldErrors.steps }}</span></label>
          </div>

          <p v-if="error" class="bg-blush px-4 py-3 text-sm font-semibold text-charcoal" role="alert">{{ error }}</p>
          <button type="submit" class="focus-ring mt-2 inline-flex min-h-14 items-center justify-between bg-charcoal px-6 font-semibold text-porcelain hover:bg-olive hover:text-charcoal" :disabled="busy">
            {{ busy ? "Publicando…" : "Publicar receta" }}
            <PhArrowRight :size="22" aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  </Teleport>
</template>
