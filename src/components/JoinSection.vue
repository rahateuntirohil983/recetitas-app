<script setup>
import { PhArrowRight, PhPlant } from "@phosphor-icons/vue";
import bakingPrep from "../assets/images/baking-prep-signup.webp";
</script>

<template>
  <section id="sumate" class="join-section relative scroll-mt-0 overflow-hidden bg-blush px-6 pb-16 pt-24 sm:px-10 md:pb-12 md:pt-16 lg:px-20">
    <div class="absolute -bottom-20 -left-20 hidden h-[330px] w-[330px] rounded-full bg-olive md:flex md:items-center md:justify-center" aria-hidden="true">
      <PhPlant :size="190" weight="thin" class="-translate-y-8 translate-x-6 text-charcoal" />
    </div>

    <figure class="absolute -bottom-16 -right-24 hidden h-[310px] w-[390px] overflow-hidden rounded-[50%] md:block lg:-right-10">
        <img :src="bakingPrep" alt="Ingredientes preparados para cocinar" class="h-full w-full object-cover" loading="lazy" decoding="async" />
    </figure>

    <div class="relative z-10 mx-auto max-w-[760px] text-center">
      <h2 class="font-display text-[clamp(2.5rem,5vw,4.9rem)] font-bold leading-[1.02] tracking-[-0.055em] text-charcoal">
        Sumate a recetitas.app
      </h2>
      <p class="mx-auto mt-4 max-w-[600px] text-lg leading-relaxed text-charcoal md:text-xl">
        Creá tu cuenta gratis y empezá a descubrir, guardar y compartir recetas.
      </p>

      <div class="mx-auto mt-8 flex max-w-[640px] flex-col justify-center gap-3 sm:flex-row">
        <a
          href="/signin-with-chatgpt?return_to=/app/"
          class="focus-ring inline-flex min-h-14 items-center justify-center gap-3 bg-charcoal px-8 text-base font-semibold text-porcelain transition hover:bg-olive hover:text-charcoal"
        >
          Crear mi cuenta <PhArrowRight :size="19" weight="bold" aria-hidden="true" />
        </a>
        <a
          href="/app/"
          class="focus-ring inline-flex min-h-14 items-center justify-center border-2 border-charcoal px-8 text-base font-semibold text-charcoal transition hover:bg-porcelain"
        >
          Ver la comunidad
        </a>
      </div>

      <p class="mx-auto mt-3 max-w-[520px] text-sm text-charcoal/70">
        Gratis. Sin contraseñas nuevas: ingresás de forma segura con tu cuenta de ChatGPT.
      </p>

      <p class="mt-5 text-base text-charcoal">
        ¿Ya tenés cuenta?
        <a href="/signin-with-chatgpt?return_to=/app/" class="font-semibold underline decoration-2 underline-offset-4 hover:text-porcelain">Ingresá</a>
      </p>
    </div>
  </section>
</template>
