<script setup>
import { PhAsteriskSimple } from "@phosphor-icons/vue";
import BrandMark from "./BrandMark.vue";
import heroFood from "../assets/images/pumpkin-gnocchi-hero.png";
import makingGnocchi from "../assets/images/making-gnocchi-hands.png";

defineEmits(["explore", "share"]);
</script>

<template>
  <section id="top" class="relative isolate min-h-[910px] bg-black text-porcelain lg:min-h-[900px]">
    <div class="absolute inset-y-0 right-0 hidden w-[42%] bg-blush md:block" aria-hidden="true" />
    <div class="hero-green-plane absolute bottom-0 right-0 hidden h-[54%] w-[38%] bg-olive md:block" aria-hidden="true" />

    <div class="relative mx-auto grid min-h-[910px] max-w-[1440px] grid-cols-1 md:grid-cols-[50%_50%] lg:min-h-[900px]">
      <div class="relative z-20 flex flex-col px-6 pb-16 pt-9 sm:px-10 md:px-12 md:pb-14 md:pt-12 lg:px-20 lg:pt-14">
        <BrandMark />

        <div class="mt-11 max-w-[620px] md:mt-14 lg:mt-16">
          <h1 class="hero-title font-display font-bold leading-[0.92] tracking-[-0.065em]">
            <span class="block text-porcelain">Tu</span>
            <span class="block text-blush">próxima</span>
            <span class="block text-porcelain">receta</span>
            <span class="block text-olive">favorita</span>
            <span class="block text-porcelain">vive acá.</span>
          </h1>
          <p class="mt-7 max-w-[430px] text-[1.05rem] leading-relaxed text-porcelain/88 sm:text-xl">
            Ideas de gente real para cocinar, guardar y volver a hacer.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              class="focus-ring min-h-14 bg-olive px-8 text-base font-semibold text-charcoal transition hover:bg-porcelain"
              @click="$emit('explore')"
            >
              Explorar recetas
            </button>
            <button
              type="button"
              class="focus-ring min-h-14 border-2 border-porcelain px-8 text-base font-semibold text-porcelain transition hover:border-blush hover:bg-blush hover:text-charcoal"
              @click="$emit('share')"
            >
              Compartir la mía
            </button>
          </div>
        </div>
      </div>

      <div class="relative min-h-[720px] overflow-hidden md:min-h-0">
        <div class="absolute inset-0 bg-blush md:hidden" aria-hidden="true" />
        <div class="hero-mobile-green absolute inset-x-0 bottom-0 h-[47%] bg-olive md:hidden" aria-hidden="true" />

        <figure class="hero-food-mask absolute right-[3%] top-[7%] z-10 h-[46%] w-[77%] overflow-hidden bg-cream md:right-[4%] md:top-[5%] md:h-[44%] md:w-[82%] lg:right-[7%] lg:w-[78%]">
          <img :src="heroFood" alt="Ñoquis de calabaza con salvia y parmesano" class="h-full w-full object-cover" />
        </figure>

        <article class="recipe-note absolute right-[14%] top-[42%] z-30 w-[68%] bg-porcelain px-6 py-7 text-charcoal shadow-[0_16px_40px_rgba(0,0,0,0.12)] md:right-[14%] md:top-[39%] md:w-[70%] lg:w-[62%] lg:px-8 lg:py-8">
          <h2 class="font-display text-[clamp(2rem,4.1vw,3.6rem)] font-bold leading-[0.98] tracking-[-0.045em]">
            Ñoquis de<br />calabaza,<br />sin vueltas
          </h2>
          <p class="mt-3 text-sm sm:text-base">por <strong class="font-medium text-blush">Cami</strong> · receta de familia</p>
        </article>

        <figure class="hands-mask absolute bottom-[7%] left-[5%] z-20 h-[29%] w-[70%] overflow-hidden bg-cream md:bottom-[7%] md:left-[3%] md:w-[68%] lg:left-[8%] lg:w-[62%]">
          <img :src="makingGnocchi" alt="Manos preparando ñoquis caseros" class="h-full w-full object-cover" />
        </figure>

        <PhAsteriskSimple
          :size="104"
          weight="regular"
          class="absolute bottom-[4%] right-[1%] z-30 text-olive-dark md:bottom-[5%] lg:right-[5%]"
          aria-hidden="true"
        />
      </div>
    </div>
  </section>
</template>
