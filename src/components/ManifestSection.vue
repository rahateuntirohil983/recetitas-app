<script setup>
import { PhArrowRight } from "@phosphor-icons/vue";

const steps = [
  {
    verb: "Encontrá.",
    color: "text-charcoal",
    description: "Inspirate con recetas de personas como vos.",
  },
  {
    verb: "Guardá.",
    color: "text-blush",
    description: "Tus favoritas, siempre a mano.",
  },
  {
    verb: "Compartí.",
    color: "text-olive",
    description: "Subí tus recetas y hacé parte a la comunidad.",
  },
];
</script>

<template>
  <section id="como-funciona" class="scroll-mt-0 bg-porcelain px-6 py-20 sm:px-10 md:py-24 lg:px-20 lg:py-28">
    <div class="mx-auto max-w-[1180px]">
      <h2 class="sr-only">Cómo funciona recetitas.app</h2>
      <ol class="space-y-9 md:space-y-7">
        <li v-for="step in steps" :key="step.verb" class="grid items-center gap-4 md:grid-cols-[1.25fr_90px_1fr] md:gap-7">
          <p :class="['font-display text-[clamp(3.25rem,7vw,6.7rem)] font-bold leading-none tracking-[-0.065em]', step.color]">
            {{ step.verb }}
          </p>
          <PhArrowRight :size="62" weight="regular" class="hidden text-charcoal md:block" aria-hidden="true" />
          <p class="max-w-[360px] text-lg leading-snug text-charcoal md:text-xl">
            {{ step.description }}
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>
