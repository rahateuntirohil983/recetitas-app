<script setup>
import { reactive, ref } from "vue";
import { PhArrowRight, PhX } from "@phosphor-icons/vue";

defineProps({ open: { type: Boolean, default: false }, busy: { type: Boolean, default: false } });
const emit = defineEmits(["close", "submit"]);

const error = ref("");
const form = reactive({
  title: "",
  summary: "",
  cookMinutes: 35,
  servings: 4,
  imageKey: "pumpkin",
  ingredients: "",
  steps: "",
});

const submit = () => {
  const ingredients = form.ingredients.split("\n").map((value) => value.trim()).filter(Boolean);
  const steps = form.steps.split("\n").map((value) => value.trim()).filter(Boolean);
  if (form.title.trim().length < 3 || form.summary.trim().length < 10 || !ingredients.length || !steps.length) {
    error.value = "Completá el título, la historia, los ingredientes y los pasos.";
    return;
  }
  error.value = "";
  emit("submit", { ...form, title: form.title.trim(), summary: form.summary.trim(), ingredients, steps });
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

        <form class="mt-8 grid gap-5" @submit.prevent="submit">
          <label class="field-label">
            Nombre de la receta
            <input v-model="form.title" class="field-input" maxlength="90" required placeholder="Tarta de tomates asados" />
          </label>
          <label class="field-label">
            La historia corta
            <textarea v-model="form.summary" class="field-input min-h-24 resize-y" maxlength="280" required placeholder="Qué la hace especial, cuándo la cocinás…" />
          </label>
          <div class="grid gap-5 sm:grid-cols-3">
            <label class="field-label">Minutos<input v-model.number="form.cookMinutes" type="number" min="1" max="1440" class="field-input" /></label>
            <label class="field-label">Porciones<input v-model.number="form.servings" type="number" min="1" max="24" class="field-input" /></label>
            <label class="field-label">Imagen
              <select v-model="form.imageKey" class="field-input">
                <option value="pumpkin">Plato terminado</option>
                <option value="gnocchi">Manos a la masa</option>
                <option value="baking">Mesa de preparación</option>
              </select>
            </label>
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="field-label">Ingredientes, uno por línea<textarea v-model="form.ingredients" class="field-input min-h-40 resize-y" required placeholder="4 tomates\n2 dientes de ajo\nAceite de oliva" /></label>
            <label class="field-label">Pasos, uno por línea<textarea v-model="form.steps" class="field-input min-h-40 resize-y" required placeholder="Asá los tomates.\nPrepará la masa.\nHorneá hasta dorar." /></label>
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
