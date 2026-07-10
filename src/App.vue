<script setup>
import HeroSection from "./components/HeroSection.vue";
import ManifestSection from "./components/ManifestSection.vue";
import JoinSection from "./components/JoinSection.vue";
import SiteFooter from "./components/SiteFooter.vue";

const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};
</script>

<template>
  <main class="overflow-hidden bg-porcelain text-ink">
    <HeroSection
      @explore="scrollTo('como-funciona')"
      @share="scrollTo('sumate')"
    />
    <ManifestSection />
    <JoinSection />
    <SiteFooter @navigate="scrollTo" />
  </main>
</template>
