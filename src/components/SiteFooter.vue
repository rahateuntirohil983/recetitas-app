<script setup>
import { PhArrowUpRight } from "@phosphor-icons/vue";
import BrandMark from "./BrandMark.vue";

defineEmits(["navigate"]);
</script>

<template>
  <footer class="bg-black px-6 py-8 text-porcelain sm:px-10 lg:px-20">
    <div class="mx-auto grid max-w-[1180px] gap-10 md:grid-cols-[1fr_1.4fr_1fr] md:items-end">
      <BrandMark compact :show-name="false" />

      <nav aria-label="Navegación del pie" class="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:max-w-[460px]">
        <button type="button" class="footer-link text-left" @click="$emit('navigate', 'como-funciona')">Explorar recetas</button>
        <a class="footer-link" href="mailto:hola@recetitas.app?subject=Quiero saber más sobre la comunidad">Comunidad</a>
        <button type="button" class="footer-link text-left" @click="$emit('navigate', 'sumate')">Mis guardadas</button>
        <a class="footer-link" href="mailto:hola@recetitas.app?subject=Quiénes somos">Quiénes somos</a>
        <button type="button" class="footer-link text-left" @click="$emit('navigate', 'sumate')">Compartir receta</button>
        <a class="footer-link inline-flex items-center gap-1" href="mailto:hola@recetitas.app">Contacto <PhArrowUpRight :size="14" aria-hidden="true" /></a>
      </nav>

      <p class="font-display text-2xl leading-tight text-blush md:text-right">
        Hecho con amor<br />para cocineros reales.
      </p>
    </div>
  </footer>
</template>
