<script setup>
import { PhArrowRight, PhFolder, PhTrash, PhX } from "@phosphor-icons/vue";
defineProps({ collection: { type: Object, default: null }, recipes: { type: Array, default: () => [] }, loading: { type: Boolean, default: false }, canDelete: { type: Boolean, default: false } });
defineEmits(["close", "open", "delete"]);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[82] overflow-y-auto bg-charcoal/70 p-3 backdrop-blur-sm sm:p-6" @click.self="$emit('close')">
      <section class="mx-auto my-4 min-h-[70vh] w-full max-w-[900px] border-2 border-charcoal bg-porcelain shadow-[10px_10px_0_#242421]" role="dialog" aria-modal="true" aria-labelledby="collection-title">
        <header class="flex items-start justify-between gap-5 border-b-2 border-charcoal bg-olive px-5 py-6 sm:px-8"><div><p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]"><PhFolder :size="18" weight="fill" /> Carpeta pública</p><h2 id="collection-title" class="mt-1 break-words font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">{{ collection?.title || 'Abriendo…' }}</h2><p v-if="collection?.description" class="mt-2 max-w-[650px] break-words text-sm text-charcoal/65">{{ collection.description }}</p></div><button type="button" class="focus-ring grid size-11 shrink-0 place-items-center border-2 border-charcoal bg-porcelain" aria-label="Cerrar carpeta" @click="$emit('close')"><PhX :size="22" /></button></header>
        <div v-if="loading" class="px-6 py-20 text-center font-display text-2xl">Buscando recetas…</div>
        <div v-else class="p-5 sm:p-8">
          <div v-if="recipes.length" class="grid gap-4 sm:grid-cols-2"><button v-for="recipe in recipes" :key="recipe.id" type="button" class="focus-ring overflow-hidden border-2 border-charcoal bg-cream text-left hover:bg-blush" @click="$emit('open', recipe)"><img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.title" class="h-44 w-full object-cover" loading="lazy" /><div class="p-4"><p class="text-xs font-bold uppercase tracking-[0.13em] text-olive-dark">{{ recipe.cookMinutes }} min · @{{ recipe.author.handle }}</p><h3 class="mt-1 break-words font-display text-2xl font-bold leading-tight">{{ recipe.title }}</h3><span class="mt-3 inline-flex items-center gap-1 text-sm font-bold">Abrir <PhArrowRight :size="17" /></span></div></button></div>
          <p v-else class="py-16 text-center font-display text-3xl font-bold text-charcoal/55">Esta carpeta todavía está vacía.</p>
          <button v-if="canDelete" type="button" class="focus-ring mt-8 inline-flex min-h-12 items-center gap-2 border-2 border-charcoal px-5 font-bold hover:bg-blush" @click="$emit('delete', collection)"><PhTrash :size="20" /> Eliminar carpeta</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
