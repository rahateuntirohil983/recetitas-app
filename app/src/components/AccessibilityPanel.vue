<script setup>
import { computed, reactive, watch } from "vue";
import { PhCheck, PhEye, PhTextAa, PhTranslate, PhX } from "@phosphor-icons/vue";

const props = defineProps({
  preferences: { type: Object, required: true },
});
const emit = defineEmits(["close", "update"]);
const form = reactive({ ...props.preferences });
const copies = {
  es: { eyebrow: "A tu manera", title: "Ajustes.", language: "Idioma de la aplicación", languageNote: "Las recetas mantienen el idioma en que fueron escritas.", text: "Tamaño del texto", normal: "Normal", large: "Grande", xlarge: "Muy grande", colors: "Colores y contraste", colorsNote: "Paletas pensadas para distinguir acciones sin depender solamente del rojo o el verde.", original: "Original", redGreen: "Rojo–verde", blueYellow: "Azul–amarillo", contrast: "Alto contraste", motion: "Reducir animaciones", motionNote: "Evita movimientos y transiciones innecesarias.", save: "Guardar ajustes", close: "Cerrar ajustes" },
  en: { eyebrow: "Your way", title: "Settings.", language: "App language", languageNote: "Recipes stay in the language chosen by their author.", text: "Text size", normal: "Normal", large: "Large", xlarge: "Very large", colors: "Color and contrast", colorsNote: "Palettes designed to distinguish actions without relying on red or green alone.", original: "Original", redGreen: "Red–green", blueYellow: "Blue–yellow", contrast: "High contrast", motion: "Reduce motion", motionNote: "Avoids unnecessary movement and transitions.", save: "Save settings", close: "Close settings" },
  pt: { eyebrow: "Do seu jeito", title: "Ajustes.", language: "Idioma do aplicativo", languageNote: "As receitas mantêm o idioma escolhido por quem publicou.", text: "Tamanho do texto", normal: "Normal", large: "Grande", xlarge: "Muito grande", colors: "Cores e contraste", colorsNote: "Paletas pensadas para distinguir ações sem depender apenas do vermelho ou verde.", original: "Original", redGreen: "Vermelho–verde", blueYellow: "Azul–amarelo", contrast: "Alto contraste", motion: "Reduzir animações", motionNote: "Evita movimentos e transições desnecessárias.", save: "Salvar ajustes", close: "Fechar ajustes" },
};
const copy = computed(() => copies[form.language] || copies.es);

watch(() => props.preferences, (value) => Object.assign(form, value), { deep: true });
const save = () => emit("update", { ...form });
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[90] bg-charcoal/70 backdrop-blur-sm" @click.self="$emit('close')">
      <aside class="absolute inset-y-0 right-0 w-full max-w-[560px] overflow-y-auto border-l-2 border-charcoal bg-porcelain px-5 py-6 shadow-2xl sm:px-8" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="flex items-start justify-between gap-4 border-b-2 border-charcoal pb-5">
          <div><p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">{{ copy.eyebrow }}</p><h2 id="settings-title" class="mt-1 font-display text-4xl font-bold tracking-[-0.05em]">{{ copy.title }}</h2></div>
          <button type="button" class="focus-ring grid size-11 place-items-center border-2 border-charcoal hover:bg-blush" :aria-label="copy.close" @click="$emit('close')"><PhX :size="22" /></button>
        </header>

        <section class="mt-7">
          <h3 class="flex items-center gap-2 font-display text-2xl font-bold"><PhTranslate :size="24" /> {{ copy.language }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-charcoal/60">{{ copy.languageNote }}</p>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <button v-for="option in [{ id: 'es', label: 'Español' }, { id: 'en', label: 'English' }, { id: 'pt', label: 'Português' }]" :key="option.id" type="button" class="focus-ring min-h-12 border-2 border-charcoal px-2 font-semibold" :class="form.language === option.id ? 'bg-olive' : 'bg-cream'" @click="form.language = option.id">{{ option.label }}</button>
          </div>
        </section>

        <section class="mt-8 border-t border-charcoal/15 pt-7">
          <h3 class="flex items-center gap-2 font-display text-2xl font-bold"><PhTextAa :size="24" /> {{ copy.text }}</h3>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <button v-for="option in [{ value: 100, label: copy.normal }, { value: 115, label: copy.large }, { value: 130, label: copy.xlarge }]" :key="option.value" type="button" class="focus-ring min-h-14 border-2 border-charcoal px-2 font-semibold" :class="form.textScale === option.value ? 'bg-blush' : 'bg-cream'" @click="form.textScale = option.value">{{ option.label }}</button>
          </div>
        </section>

        <section class="mt-8 border-t border-charcoal/15 pt-7">
          <h3 class="flex items-center gap-2 font-display text-2xl font-bold"><PhEye :size="24" /> {{ copy.colors }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-charcoal/60">{{ copy.colorsNote }}</p>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <button v-for="option in [{ id: 'default', label: copy.original, colors: ['#e3b4b9','#999e76'] }, { id: 'red-green', label: copy.redGreen, colors: ['#67a9cf','#f0ad4e'] }, { id: 'blue-yellow', label: copy.blueYellow, colors: ['#d96c75','#62b3a5'] }, { id: 'contrast', label: copy.contrast, colors: ['#ff8fb3','#ffee58'] }]" :key="option.id" type="button" class="focus-ring flex min-h-14 items-center gap-3 border-2 border-charcoal px-3 text-left font-semibold" :class="form.colorMode === option.id ? 'bg-charcoal text-porcelain' : 'bg-cream'" @click="form.colorMode = option.id"><span class="flex" aria-hidden="true"><span class="size-6" :style="{ background: option.colors[0] }" /><span class="size-6" :style="{ background: option.colors[1] }" /></span><span>{{ option.label }}</span><PhCheck v-if="form.colorMode === option.id" :size="18" class="ml-auto" weight="bold" /></button>
          </div>
        </section>

        <label class="mt-8 flex cursor-pointer items-center justify-between gap-5 border-2 border-charcoal bg-cream p-4">
          <span><strong class="block">{{ copy.motion }}</strong><span class="mt-1 block text-sm text-charcoal/60">{{ copy.motionNote }}</span></span>
          <input v-model="form.reduceMotion" type="checkbox" class="size-6 accent-[#242421]" />
        </label>

        <button type="button" class="focus-ring mt-8 min-h-14 w-full bg-charcoal px-6 font-bold text-porcelain hover:bg-olive hover:text-charcoal" @click="save">{{ copy.save }}</button>
      </aside>
    </div>
  </Teleport>
</template>
