<script setup>
import { PhBell, PhCheck, PhX } from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";

defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  unreadCount: { type: Number, default: 0 },
});
defineEmits(["close", "read-all", "open-item"]);

const message = (item) => ({
  like: `indicó que le gusta “${item.recipeTitle}”.`,
  comment: `comentó en “${item.recipeTitle}”.`,
  follow: "empezó a seguirte.",
}[item.type] || "interactuó con tu cocina.");
const formatDate = (value) => new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[65] bg-charcoal/60 backdrop-blur-sm" @click.self="$emit('close')">
      <aside class="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-porcelain shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
        <header class="flex items-start justify-between gap-4 border-b-2 border-charcoal px-5 py-5 sm:px-7">
          <div><p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Tu actividad</p><h2 id="notifications-title" class="mt-1 font-display text-3xl font-bold">Notificaciones.</h2><p class="mt-1 text-sm text-charcoal/60">{{ unreadCount ? `${unreadCount} sin leer` : 'Estás al día' }}</p></div>
          <button type="button" class="focus-ring grid size-11 place-items-center border-2 border-charcoal hover:bg-blush" aria-label="Cerrar notificaciones" @click="$emit('close')"><PhX :size="21" /></button>
        </header>
        <div v-if="unreadCount" class="border-b border-charcoal/15 px-5 py-3 text-right sm:px-7"><button type="button" class="focus-ring inline-flex min-h-10 items-center gap-2 px-3 text-sm font-bold hover:bg-olive" @click="$emit('read-all')"><PhCheck :size="18" /> Marcar todas como leídas</button></div>
        <div class="flex-1 overflow-y-auto">
          <p v-if="loading" class="px-6 py-14 text-center font-display text-2xl text-charcoal/55">Revisando la mesa…</p>
          <template v-else>
            <button v-for="item in items" :key="item.id" type="button" class="focus-ring flex w-full gap-3 border-b border-charcoal/12 px-5 py-4 text-left transition hover:bg-cream sm:px-7" :class="!item.read && 'bg-blush/35'" @click="$emit('open-item', item)">
              <PigAvatar :index="item.actor.avatarIndex" :size="44" :label="`Avatar de ${item.actor.displayName}`" class="ring-2 ring-charcoal/10" />
              <span class="min-w-0 flex-1"><span class="block break-words text-sm leading-relaxed"><strong>{{ item.actor.displayName }}</strong> {{ message(item) }}</span><time class="mt-1 block text-xs font-semibold text-charcoal/45">{{ formatDate(item.createdAt) }}</time></span>
              <span v-if="!item.read" class="mt-2 size-2 shrink-0 rounded-full bg-olive-dark" aria-label="Sin leer" />
            </button>
          </template>
          <div v-if="!loading && !items.length" class="px-6 py-16 text-center"><PhBell :size="48" weight="thin" class="mx-auto text-charcoal/35" /><p class="mt-3 font-display text-2xl text-charcoal/55">Todavía no hay novedades.</p></div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
