<script setup>
import { computed, onMounted, ref } from "vue";
import LandingAuthModal from "./LandingAuthModal.vue";
import { authMode, authOpen, closeAuth, openAuth } from "../lib/auth-ui.js";

const session = ref(null);

const displayName = computed(() => {
  const user = session.value?.user;
  return user?.displayName || user?.handle || "tu cocina";
});

const loadSession = async () => {
  try {
    const response = await fetch("/api/session", { credentials: "include" });
    session.value = response.ok ? await response.json() : { authenticated: false };
  } catch {
    session.value = { authenticated: false };
  }
};

const authenticated = (nextSession) => {
  session.value = nextSession;
  closeAuth();
};

const logout = async () => {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).catch(() => null);
  session.value = { authenticated: false };
};

onMounted(loadSession);
</script>

<template>
  <nav class="absolute right-4 top-5 z-50 flex min-h-11 items-center gap-2 sm:right-8 md:right-10 md:top-8 lg:right-16" aria-label="Cuenta">
    <template v-if="session?.authenticated">
      <span class="hidden max-w-40 truncate text-sm font-medium text-charcoal md:block">Hola, {{ displayName }}</span>
      <a href="/app/" class="focus-ring border-2 border-charcoal bg-porcelain px-4 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-charcoal hover:text-porcelain">Mi recetario</a>
      <button type="button" class="focus-ring hidden px-2 py-2.5 text-sm font-semibold text-charcoal underline decoration-blush decoration-2 underline-offset-4 sm:block" @click="logout">Salir</button>
    </template>

    <template v-else>
      <a href="/app/" class="focus-ring hidden px-2 py-2.5 text-sm font-semibold text-charcoal underline decoration-olive decoration-2 underline-offset-4 sm:block">Comunidad</a>
      <button type="button" class="focus-ring border-2 border-charcoal bg-porcelain px-5 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-charcoal hover:text-porcelain" @click="openAuth('login')">Entrar</button>
    </template>
  </nav>

  <LandingAuthModal :open="authOpen" :initial-mode="authMode" @close="closeAuth" @authenticated="authenticated" />
</template>
