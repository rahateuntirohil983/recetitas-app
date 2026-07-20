<script setup>
import { onMounted, ref } from "vue";
import { PhCheck, PhFolder, PhPlus, PhX } from "@phosphor-icons/vue";
import { api } from "../lib/api.js";

const props = defineProps({ recipe: { type: Object, required: true } });
const emit = defineEmits(["close", "login", "notify"]);
const collections = ref([]);
const loading = ref(true);
const title = ref("");
const creating = ref(false);
const error = ref("");

const load = async () => {
  loading.value = true;
  try { collections.value = (await api.myCollections(props.recipe.id)).collections; }
  catch (failure) { if (failure.status === 401) emit("login"); else error.value = failure.message; }
  finally { loading.value = false; }
};
const toggle = async (collection) => {
  try {
    const response = await api.toggleCollectionRecipe(collection.id, props.recipe.id);
    collection.containsRecipe = response.active;
    collection.itemCount = Math.max(0, collection.itemCount + (response.active ? 1 : -1));
    emit("notify", response.active ? `Guardada en ${collection.title}.` : `Quitada de ${collection.title}.`);
  } catch (failure) { error.value = failure.message; }
};
const create = async () => {
  if (title.value.trim().length < 2) return;
  creating.value = true;
  try {
    const response = await api.createCollection({ title: title.value.trim(), description: "" });
    collections.value = [{ ...response.collection, containsRecipe: false }, ...collections.value];
    title.value = "";
  } catch (failure) { error.value = failure.message; }
  finally { creating.value = false; }
};
onMounted(load);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[88] grid place-items-end bg-charcoal/65 sm:place-items-center" @click.self="$emit('close')">
      <section class="w-full max-w-[560px] border-2 border-charcoal bg-porcelain p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <header class="flex items-start justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Tu recetario</p><h2 id="folder-title" class="mt-1 font-display text-4xl font-bold tracking-[-0.05em]">Guardar en carpeta.</h2></div><button type="button" class="focus-ring grid size-11 shrink-0 place-items-center border-2 border-charcoal" aria-label="Cerrar" @click="$emit('close')"><PhX :size="21" /></button></header>
        <p class="mt-3 line-clamp-2 text-sm text-charcoal/60">{{ recipe.title }}</p>
        <div v-if="loading" class="py-10 text-center font-semibold">Abriendo tus carpetas…</div>
        <div v-else class="mt-6 max-h-[42vh] space-y-2 overflow-y-auto">
          <button v-for="collection in collections" :key="collection.id" type="button" class="focus-ring flex min-h-14 w-full items-center gap-3 border-2 border-charcoal px-4 text-left" :class="collection.containsRecipe ? 'bg-olive' : 'bg-cream'" @click="toggle(collection)"><PhFolder :size="23" :weight="collection.containsRecipe ? 'fill' : 'regular'" /><span class="min-w-0 flex-1"><strong class="block truncate">{{ collection.title }}</strong><span class="text-xs text-charcoal/55">{{ collection.itemCount }} recetas</span></span><PhCheck v-if="collection.containsRecipe" :size="20" weight="bold" /></button>
          <p v-if="!collections.length" class="py-6 text-center text-charcoal/55">Creá tu primera carpeta para organizar recetas.</p>
        </div>
        <form class="mt-5 flex gap-2 border-t-2 border-charcoal pt-5" @submit.prevent="create"><label class="flex-1"><span class="sr-only">Nombre de la carpeta</span><input v-model="title" maxlength="60" class="field-input" placeholder="Ej.: Para el domingo" /></label><button type="submit" class="focus-ring grid min-w-14 place-items-center bg-charcoal text-porcelain" :disabled="creating || title.trim().length < 2" aria-label="Crear carpeta"><PhPlus :size="22" weight="bold" /></button></form>
        <p v-if="error" class="mt-3 bg-blush px-4 py-3 text-sm font-semibold" role="alert">{{ error }}</p>
      </section>
    </div>
  </Teleport>
</template>
