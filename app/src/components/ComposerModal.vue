<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { PhArrowRight, PhImageSquare, PhTrash, PhUploadSimple, PhX } from "@phosphor-icons/vue";

defineProps({ open: { type: Boolean, default: false }, busy: { type: Boolean, default: false } });
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

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
});

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
  emit("submit", { ...form, title: form.title.trim(), summary: form.summary.trim(), ingredients, steps, imageFile: imageFile.value });
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
            Foto de la receta <span class="font-normal text-charcoal/55">Opcional · JPG, PNG o WebP · máximo 8 MB</span>
            <div v-if="imagePreview" class="relative overflow-hidden border-2 border-charcoal bg-cream">
              <img :src="imagePreview" alt="Vista previa de la receta" class="aspect-[16/9] w-full object-cover" />
              <button type="button" class="focus-ring absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 bg-charcoal px-4 text-sm font-semibold text-porcelain" @click="clearImage"><PhTrash :size="18" /> Quitar</button>
            </div>
            <label v-else class="focus-ring flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-charcoal bg-cream px-5 py-7 text-center transition hover:bg-blush">
              <PhImageSquare :size="38" weight="thin" aria-hidden="true" />
              <span class="font-semibold">Subí una foto de tu plato</span>
              <span class="inline-flex items-center gap-2 text-sm font-medium text-charcoal/60"><PhUploadSimple :size="17" /> Elegir imagen</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="chooseImage" />
            </label>
            <span v-if="imageError" class="field-error">{{ imageError }}</span>
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
