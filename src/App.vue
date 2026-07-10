<script setup>
import HeroSection from "./components/HeroSection.vue";
import ManifestSection from "./components/ManifestSection.vue";
import JoinSection from "./components/JoinSection.vue";
import SiteFooter from "./components/SiteFooter.vue";

const openCommunity = (query = "") => {
  window.location.assign(`/app/${query}`);
};
</script>

<template>
  <main class="overflow-hidden bg-porcelain text-ink">
    <HeroSection
      @explore="openCommunity()"
      @share="openCommunity('?compose=1')"
    />
    <ManifestSection />
    <JoinSection />
    <SiteFooter />
  </main>
</template>
