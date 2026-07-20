<script setup>
import { computed } from "vue";
import { PhChartBar, PhCheck } from "@phosphor-icons/vue";
const props = defineProps({ poll: { type: Object, required: true }, busy: { type: Boolean, default: false } });
defineEmits(["vote"]);
const hasVoted = computed(() => props.poll.options.some((option) => option.voted));
const percent = (votes) => props.poll.totalVotes ? Math.round(votes / props.poll.totalVotes * 100) : 0;
</script>

<template>
  <section class="mt-8 border-2 border-charcoal bg-cream p-5 sm:p-7">
    <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-olive-dark"><PhChartBar :size="19" /> Encuesta de la receta</p>
    <h2 class="mt-2 break-words font-display text-3xl font-bold tracking-[-0.04em]">{{ poll.question }}</h2>
    <div class="mt-5 grid gap-3">
      <button v-for="option in poll.options" :key="option.id" type="button" class="focus-ring relative min-h-14 overflow-hidden border-2 border-charcoal bg-porcelain px-4 text-left font-semibold" :disabled="busy" :aria-pressed="option.voted" @click="$emit('vote', option.id)">
        <span v-if="hasVoted" class="absolute inset-y-0 left-0 bg-olive/45 transition-all" :style="{ width: `${percent(option.voteCount)}%` }" aria-hidden="true" />
        <span class="relative flex items-center justify-between gap-3"><span class="inline-flex items-center gap-2"><PhCheck v-if="option.voted" :size="19" weight="bold" />{{ option.label }}</span><span v-if="hasVoted" class="shrink-0 text-sm">{{ percent(option.voteCount) }}%</span></span>
      </button>
    </div>
    <p class="mt-4 text-sm text-charcoal/55">{{ poll.totalVotes }} {{ poll.totalVotes === 1 ? 'voto' : 'votos' }} · podés cambiar tu respuesta</p>
  </section>
</template>
