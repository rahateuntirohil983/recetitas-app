<script setup>
import { reactive, ref, watch } from "vue";
import { PhArrowRight, PhX } from "@phosphor-icons/vue";
import heroImage from "../assets/pumpkin-gnocchi-hero.webp";

const props = defineProps({
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
});

const emit = defineEmits(["close", "submit"]);
const mode = ref("login");
const login = reactive({ identifier: "", password: "" });
const registration = reactive({ displayName: "", handle: "", email: "", password: "" });

watch(() => props.open, (open) => {
  if (!open) return;
  mode.value = new URLSearchParams(window.location.search).get("login") === "register" ? "register" : "login";
});

const submit = () => {
  emit("submit", {
    mode: mode.value,
    payload: mode.value === "register" ? { ...registration } : { ...login },
  });
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-charcoal/75 p-4 backdrop-blur-sm" @click.self="$emit('close')" @keydown.esc="$emit('close')">
      <section class="login-sheet relative grid w-full max-w-[920px] overflow-hidden bg-porcelain shadow-2xl md:grid-cols-[0.88fr_1.12fr]" aria-modal="true" role="dialog" aria-labelledby="login-title">
        <button type="button" class="focus-ring absolute right-4 top-4 z-10 grid size-11 place-items-center bg-charcoal text-porcelain" aria-label="Cerrar" @click="$emit('close')">
          <PhX :size="22" aria-hidden="true" />
        </button>

        <figure class="relative hidden min-h-[630px] bg-blush md:block">
          <img :src="heroImage" alt="Ñoquis de calabaza con salvia" class="h-full w-full object-cover" />
          <figcaption class="absolute bottom-7 left-7 right-7 bg-porcelain px-6 py-5 font-display text-3xl font-bold leading-tight text-charcoal">
            Una mesa llena de recetas reales.
          </figcaption>
        </figure>

        <div class="flex min-h-[610px] flex-col justify-center px-7 py-16 sm:px-12">
          <p class="text-sm font-bold uppercase tracking-[0.16em] text-olive-dark">Tu lugar en la mesa</p>
          <h2 id="login-title" class="mt-3 font-display text-[clamp(2.7rem,6vw,4.4rem)] font-bold leading-[0.95] tracking-[-0.055em] text-charcoal">
            {{ mode === "login" ? "Volvé a tu recetario." : "Empezá tu recetario." }}
          </h2>

          <div class="mt-7 grid grid-cols-2 border-2 border-charcoal p-1">
            <button type="button" class="min-h-11 px-3 font-semibold" :class="mode === 'login' ? 'bg-charcoal text-porcelain' : 'text-charcoal'" @click="mode = 'login'">Entrar</button>
            <button type="button" class="min-h-11 px-3 font-semibold" :class="mode === 'register' ? 'bg-blush text-charcoal' : 'text-charcoal'" @click="mode = 'register'">Crear cuenta</button>
          </div>

          <form class="mt-6 grid gap-4" @submit.prevent="submit">
            <template v-if="mode === 'register'">
              <label class="grid gap-1.5 text-sm font-semibold">
                Tu nombre
                <input v-model="registration.displayName" required minlength="2" maxlength="60" autocomplete="name" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="Martina Ríos" />
              </label>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-1.5 text-sm font-semibold">
                  Usuario
                  <input v-model="registration.handle" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" autocomplete="username" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="marti_cocina" />
                </label>
                <label class="grid gap-1.5 text-sm font-semibold">
                  Correo
                  <input v-model="registration.email" required type="email" maxlength="254" autocomplete="email" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="vos@ejemplo.com" />
                </label>
              </div>
              <label class="grid gap-1.5 text-sm font-semibold">
                Contraseña
                <input v-model="registration.password" required type="password" minlength="10" maxlength="128" autocomplete="new-password" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="10 caracteres, una letra y un número" />
              </label>
            </template>

            <template v-else>
              <label class="grid gap-1.5 text-sm font-semibold">
                Usuario o correo
                <input v-model="login.identifier" required maxlength="254" autocomplete="username" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="marti_cocina" />
              </label>
              <label class="grid gap-1.5 text-sm font-semibold">
                Contraseña
                <input v-model="login.password" required type="password" maxlength="128" autocomplete="current-password" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="Tu contraseña" />
              </label>
            </template>

            <p v-if="errorMessage" class="border-l-4 border-blush bg-cream px-4 py-3 text-sm font-medium" role="alert">{{ errorMessage }}</p>

            <button type="submit" class="focus-ring mt-1 inline-flex min-h-14 items-center justify-between bg-charcoal px-6 font-semibold text-porcelain hover:bg-olive hover:text-charcoal disabled:cursor-wait disabled:opacity-65" :disabled="busy">
              {{ busy ? "Preparando tu mesa…" : mode === "login" ? "Entrar a mi cuenta" : "Crear mi cuenta" }}
              <PhArrowRight :size="22" weight="bold" aria-hidden="true" />
            </button>
          </form>

          <p class="mt-4 text-sm leading-relaxed text-charcoal/55">Usamos una sesión segura para que tu recetario siga siendo tuyo.</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
