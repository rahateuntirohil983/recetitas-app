<script setup>
import { reactive, ref, watch } from "vue";
import { PhArrowRight, PhX } from "@phosphor-icons/vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  profile: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
});
const emit = defineEmits(["close", "submit"]);
const form = reactive({ displayName: "", handle: "", bio: "" });
const localError = ref("");

watch(() => [props.open, props.profile], ([open, profile]) => {
  if (!open || !profile) return;
  Object.assign(form, { displayName: profile.displayName || "", handle: profile.handle || "", bio: profile.bio || "" });
  localError.value = "";
}, { immediate: true });

const submit = () => {
  const handle = form.handle.trim().toLowerCase().replace(/^@/, "");
  if (form.displayName.trim().length < 2 || !/^[a-z0-9_]{3,24}$/.test(handle)) {
    localError.value = "Revisá tu nombre y usuario. El usuario admite letras, números y guiones bajos.";
    return;
  }
  emit("submit", { displayName: form.displayName.trim(), handle, bio: form.bio.trim() });
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[60] grid place-items-center bg-charcoal/80 p-4 backdrop-blur-sm" @click.self="$emit('close')">
      <section class="relative w-full max-w-[620px] bg-porcelain px-6 py-10 shadow-2xl sm:px-10" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <button type="button" class="focus-ring absolute right-4 top-4 grid size-11 place-items-center border-2 border-charcoal" aria-label="Cerrar" @click="$emit('close')"><PhX :size="22" /></button>
        <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Tu recetario</p>
        <h2 id="edit-profile-title" class="mt-2 pr-12 font-display text-5xl font-bold leading-none tracking-[-0.05em]">Editar perfil.</h2>
        <form class="mt-7 grid gap-5" novalidate @submit.prevent="submit">
          <label class="field-label">Nombre<input v-model="form.displayName" class="field-input" maxlength="60" autocomplete="name" /></label>
          <label class="field-label">Usuario<input v-model="form.handle" class="field-input" maxlength="24" autocomplete="username" /></label>
          <label class="field-label">Tu historia<textarea v-model="form.bio" class="field-input min-h-28 resize-y" maxlength="180" placeholder="Qué cocinás, de dónde vienen tus recetas…" /></label>
          <p v-if="localError || errorMessage" class="bg-blush px-4 py-3 text-sm font-semibold" role="alert">{{ localError || errorMessage }}</p>
          <button type="submit" class="focus-ring inline-flex min-h-14 items-center justify-between bg-charcoal px-6 font-semibold text-porcelain hover:bg-olive hover:text-charcoal" :disabled="busy">{{ busy ? "Guardando…" : "Guardar cambios" }}<PhArrowRight :size="21" /></button>
        </form>
      </section>
    </div>
  </Teleport>
</template>
