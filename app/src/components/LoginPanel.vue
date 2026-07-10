<script setup>
import { PhArrowRight, PhX } from "@phosphor-icons/vue";
import heroImage from "../assets/pumpkin-gnocchi-hero.webp";

defineProps({
  open: { type: Boolean, default: false },
  demoMode: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});

defineEmits(["close", "demo-login"]);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-charcoal/75 p-4 backdrop-blur-sm" @click.self="$emit('close')">
      <section class="login-sheet relative grid w-full max-w-[880px] overflow-hidden bg-porcelain shadow-2xl md:grid-cols-[0.92fr_1.08fr]" aria-modal="true" role="dialog" aria-labelledby="login-title">
        <button type="button" class="focus-ring absolute right-4 top-4 z-10 grid size-11 place-items-center bg-charcoal text-porcelain" aria-label="Cerrar" @click="$emit('close')">
          <PhX :size="22" aria-hidden="true" />
        </button>

        <figure class="relative hidden min-h-[520px] bg-blush md:block">
          <img :src="heroImage" alt="Ñoquis de calabaza con salvia" class="h-full w-full object-cover" />
          <figcaption class="absolute bottom-7 left-7 right-7 bg-porcelain px-6 py-5 font-display text-3xl font-bold leading-tight text-charcoal">
            Una mesa llena de recetas reales.
          </figcaption>
        </figure>

        <div class="flex min-h-[500px] flex-col justify-center px-7 py-16 sm:px-12">
          <p class="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-olive-dark">Tu lugar en la mesa</p>
          <h2 id="login-title" class="font-display text-[clamp(2.8rem,7vw,4.8rem)] font-bold leading-[0.95] tracking-[-0.055em] text-charcoal">
            Entrá, guardá<br />y compartí.
          </h2>
          <p class="mt-6 max-w-[420px] text-lg leading-relaxed text-charcoal/75">
            Creá tu perfil, seguí cocineros y armá tu propio recetario sin perder ninguna receta.
          </p>

          <button v-if="demoMode" type="button" class="focus-ring mt-9 inline-flex min-h-14 items-center justify-between bg-olive px-6 font-semibold text-charcoal hover:bg-blush" :disabled="busy" @click="$emit('demo-login')">
            {{ busy ? "Preparando tu mesa…" : "Entrar como Marti" }}
            <PhArrowRight :size="22" aria-hidden="true" />
          </button>

          <a v-else href="/signin-with-chatgpt?return_to=/app/" class="focus-ring mt-9 inline-flex min-h-14 items-center justify-between bg-charcoal px-6 font-semibold text-porcelain hover:bg-olive hover:text-charcoal">
            Continuar con ChatGPT
            <PhArrowRight :size="22" aria-hidden="true" />
          </a>

          <p class="mt-4 text-sm leading-relaxed text-charcoal/55">
            Al continuar aceptás participar en esta primera versión de recetitas.app.
          </p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
