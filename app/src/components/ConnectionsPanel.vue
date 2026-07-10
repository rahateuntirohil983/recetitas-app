<script setup>
import { PhX } from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";

defineProps({
  open: { type: Boolean, default: false },
  type: { type: String, default: "followers" },
  people: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});
defineEmits(["close", "profile"]);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[65] grid place-items-center bg-charcoal/80 p-4 backdrop-blur-sm" @click.self="$emit('close')">
      <section class="relative w-full max-w-[520px] bg-porcelain px-6 py-9 shadow-2xl sm:px-9" role="dialog" aria-modal="true" aria-labelledby="connections-title">
        <button type="button" class="focus-ring absolute right-4 top-4 grid size-11 place-items-center border-2 border-charcoal" aria-label="Cerrar" @click="$emit('close')"><PhX :size="22" /></button>
        <p class="text-xs font-bold uppercase tracking-[0.17em] text-olive-dark">La comunidad</p>
        <h2 id="connections-title" class="mt-2 pr-12 font-display text-4xl font-bold">{{ type === 'followers' ? 'Seguidores.' : 'Siguiendo.' }}</h2>
        <p v-if="loading" class="mt-7 bg-cream px-5 py-8 text-center">Buscando personas…</p>
        <p v-else-if="!people.length" class="mt-7 bg-cream px-5 py-8 text-center">Todavía no hay personas para mostrar.</p>
        <div v-else class="mt-7 grid max-h-[55vh] gap-2 overflow-y-auto">
          <button v-for="person in people" :key="person.id" type="button" class="focus-ring flex items-center gap-3 border border-charcoal/20 px-4 py-3 text-left hover:bg-blush" @click="$emit('profile', person.handle)">
            <PigAvatar :index="person.avatarIndex" :size="44" :label="`Avatar de ${person.displayName}`" class="ring-2 ring-charcoal/10" />
            <span class="min-w-0"><strong class="block truncate">{{ person.displayName }}</strong><span class="block truncate text-sm text-charcoal/55">@{{ person.handle }}</span></span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
