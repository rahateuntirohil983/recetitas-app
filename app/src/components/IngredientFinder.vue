<script setup>
import { ref } from "vue";
import { PhArrowRight, PhBasket, PhMagnifyingGlass, PhX } from "@phosphor-icons/vue";
import { api } from "../lib/api.js";

const props = defineProps({ language: { type: String, default: "" } });
const emit = defineEmits(["open"]);
const query = ref("");
const loading = ref(false);
const error = ref("");
const result = ref(null);

const examples = ["Tengo huevo, harina y leche", "Tomate, arroz y queso", "Papa, cebolla y ajo"];
const search = async () => {
  if (!query.value.trim()) return;
  loading.value = true;
  error.value = "";
  try {
    result.value = await api.recipesByIngredients(query.value.trim(), props.language);
  } catch (failure) {
    error.value = failure.message;
  } finally {
    loading.value = false;
  }
};
const clear = () => { query.value = ""; result.value = null; error.value = ""; };
</script>

<template>
  <section class="border-2 border-charcoal bg-cream p-5 shadow-[7px_7px_0_#999e76] sm:p-7">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
      <div><p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">Cociná con lo que hay</p><h2 class="mt-1 font-display text-4xl font-bold tracking-[-0.05em]">¿Qué tenés en casa?</h2><p class="mt-2 max-w-[620px] text-sm leading-relaxed text-charcoal/65">Escribilo como te salga. Buscamos recetas reales que aprovechen esos ingredientes.</p></div>
      <PhBasket :size="66" weight="thin" class="hidden justify-self-end text-blush lg:block" />
    </div>
    <form class="relative mt-5 flex flex-col gap-2 sm:flex-row" @submit.prevent="search">
      <label class="relative flex-1"><span class="sr-only">Ingredientes disponibles</span><PhMagnifyingGlass :size="21" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/45" /><input v-model="query" class="min-h-14 w-full border-2 border-charcoal bg-porcelain pl-12 pr-11 outline-none focus:bg-white" placeholder="Tengo huevo, harina y leche" /><button v-if="query" type="button" class="focus-ring absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center" aria-label="Limpiar" @click="clear"><PhX :size="18" /></button></label>
      <button type="submit" class="focus-ring min-h-14 bg-charcoal px-6 font-bold text-porcelain hover:bg-olive hover:text-charcoal" :disabled="loading || !query.trim()">{{ loading ? 'Buscando…' : 'Buscar opciones' }}</button>
    </form>
    <div class="mt-3 flex flex-wrap gap-2"><button v-for="example in examples" :key="example" type="button" class="focus-ring border border-charcoal/25 bg-porcelain px-3 py-2 text-xs font-semibold hover:bg-blush" @click="query = example; search()">{{ example.replace(/^Tengo\s+/i, '') }}</button></div>
    <p v-if="error" class="mt-4 bg-blush px-4 py-3 text-sm font-semibold" role="alert">{{ error }}</p>

    <div v-if="result" class="mt-7 border-t-2 border-charcoal pt-6">
      <p class="text-sm font-semibold text-charcoal/65">Encontramos {{ result.items.length }} {{ result.items.length === 1 ? 'opción' : 'opciones' }} con <strong>{{ result.pantry.join(', ') }}</strong>.</p>
      <div v-if="result.items.length" class="mt-4 grid gap-3 md:grid-cols-2">
        <button v-for="match in result.items" :key="match.recipe.id" type="button" class="focus-ring grid min-w-0 grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 border-2 border-charcoal bg-porcelain p-3 text-left hover:bg-olive" @click="$emit('open', match.recipe)">
          <img v-if="match.recipe.imageUrl" :src="match.recipe.imageUrl" :alt="match.recipe.title" class="size-[76px] object-cover" loading="lazy" /><span v-else class="grid size-[76px] place-items-center bg-olive/45"><PhBasket :size="30" /></span>
          <span class="min-w-0"><strong class="block break-words leading-tight">{{ match.recipe.title }}</strong><span class="mt-1 block text-xs text-charcoal/60">Coinciden {{ match.matchedPantry.length }} · faltan {{ match.missingIngredients.length }}</span><span v-if="match.missingIngredients.length" class="mt-1 line-clamp-1 block text-xs text-charcoal/45">{{ match.missingIngredients.slice(0, 3).join(', ') }}</span><span v-else class="mt-1 block text-xs font-bold text-olive-dark">Tenés todo lo necesario</span></span>
          <PhArrowRight :size="20" />
        </button>
      </div>
      <p v-else class="mt-4 border-2 border-charcoal/20 bg-porcelain p-5 text-center font-semibold">Todavía no hay recetas que coincidan. Probá con menos ingredientes.</p>
    </div>
  </section>
</template>
