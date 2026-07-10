<script setup>
import { ref } from "vue";
import { PhCheckCircle, PhPlant } from "@phosphor-icons/vue";
import bakingPrep from "../assets/images/baking-prep-signup.webp";

const email = ref("");
const submitted = ref(false);

const submit = () => {
  submitted.value = true;
};
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

      <div v-if="submitted" class="mx-auto mt-8 flex max-w-[560px] items-center justify-center gap-3 bg-porcelain px-6 py-5 text-left text-charcoal" role="status">
        <PhCheckCircle :size="30" weight="fill" class="shrink-0 text-olive" aria-hidden="true" />
        <p><strong>¡Listo!</strong> Te avisaremos a {{ email }} cuando abramos las puertas.</p>
      </div>

      <form v-else class="mx-auto mt-8 flex max-w-[640px] flex-col gap-3 sm:flex-row" @submit.prevent="submit">
        <label for="email" class="sr-only">Tu correo electrónico</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="Tu correo electrónico"
          class="focus-ring min-h-14 flex-1 border-2 border-transparent bg-porcelain px-5 text-base text-charcoal placeholder:text-charcoal/50 focus:border-charcoal focus:outline-none"
        />
        <button type="submit" class="focus-ring min-h-14 bg-charcoal px-8 text-base font-semibold text-porcelain transition hover:bg-olive hover:text-charcoal">
          Crear mi cuenta
        </button>
      </form>

      <p v-if="!submitted" class="mx-auto mt-3 max-w-[520px] text-sm text-charcoal/70">
        Sin spam. Solo te avisamos cuando abramos las puertas.
      </p>

      <p class="mt-5 text-base text-charcoal">
        ¿Ya tenés cuenta?
        <a href="mailto:hola@recetitas.app?subject=Quiero ingresar" class="font-semibold underline decoration-2 underline-offset-4 hover:text-porcelain">Ingresá</a>
      </p>
    </div>
  </section>
</template>
