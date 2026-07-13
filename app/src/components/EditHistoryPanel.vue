<script setup>
import { PhClockCounterClockwise, PhX } from "@phosphor-icons/vue";

defineProps({
  open: { type: Boolean, default: false },
  recipe: { type: Object, default: null },
  edits: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});
defineEmits(["close"]);

const formatDate = (value) => new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[65] bg-charcoal/60 backdrop-blur-sm" @click.self="$emit('close')">
      <aside class="absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col bg-porcelain shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header class="flex items-start justify-between gap-4 border-b-2 border-charcoal px-5 py-5 sm:px-7">
          <div><p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Transparencia de la receta</p><h2 id="history-title" class="mt-1 font-display text-3xl font-bold">Historial de cambios.</h2><p class="mt-1 line-clamp-1 text-sm text-charcoal/60">{{ recipe?.title }}</p></div>
          <button type="button" class="focus-ring grid size-11 place-items-center border-2 border-charcoal hover:bg-blush" aria-label="Cerrar historial" @click="$emit('close')"><PhX :size="21" /></button>
        </header>
        <div class="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <p v-if="loading" class="py-12 text-center font-display text-2xl text-charcoal/55">Buscando los cambios…</p>
          <ol v-else class="grid gap-4">
            <li v-for="(edit, index) in edits" :key="edit.id" class="grid grid-cols-[2.5rem_1fr] gap-3">
              <span class="grid size-10 place-items-center bg-charcoal font-display font-bold text-porcelain">{{ edits.length - index }}</span>
              <div class="min-w-0 border-2 border-charcoal/15 bg-cream px-4 py-3"><p class="break-words leading-relaxed text-charcoal/78">{{ edit.note }}</p><time class="mt-2 block text-xs font-semibold text-charcoal/45">{{ formatDate(edit.createdAt) }}</time></div>
            </li>
          </ol>
          <div v-if="!loading && !edits.length" class="py-12 text-center"><PhClockCounterClockwise :size="44" weight="thin" class="mx-auto text-charcoal/35" /><p class="mt-3 font-display text-2xl text-charcoal/55">Todavía no hay cambios.</p></div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
