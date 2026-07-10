<script setup>
import { reactive, ref, watch } from "vue";
import { PhArrowRight, PhX } from "@phosphor-icons/vue";
import authFood from "../assets/images/pumpkin-gnocchi-hero.webp";

const props = defineProps({
  open: { type: Boolean, default: false },
  initialMode: { type: String, default: "login" },
});

const emit = defineEmits(["close", "authenticated"]);
const mode = ref("login");
const busy = ref(false);
const errorMessage = ref("");
const login = reactive({ identifier: "", password: "" });
const registration = reactive({ displayName: "", handle: "", email: "", password: "" });

watch(
  () => [props.open, props.initialMode],
  ([open, initialMode]) => {
    if (!open) return;
    mode.value = initialMode === "register" ? "register" : "login";
    errorMessage.value = "";
  },
  { immediate: true },
);

const selectMode = (nextMode) => {
  mode.value = nextMode;
  errorMessage.value = "";
};

const submit = async () => {
  busy.value = true;
  errorMessage.value = "";
  const path = mode.value === "register" ? "/api/auth/register" : "/api/auth/login";
  const payload = mode.value === "register" ? registration : login;

  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || "No pudimos abrir tu cuenta.");
    emit("authenticated", data);
  } catch (failure) {
    errorMessage.value = failure.message;
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-charcoal/80 p-4 backdrop-blur-sm"
      @click.self="$emit('close')"
      @keydown.esc="$emit('close')"
    >
      <section class="relative grid w-full max-w-[940px] overflow-hidden bg-porcelain shadow-2xl md:grid-cols-[0.86fr_1.14fr]" role="dialog" aria-modal="true" aria-labelledby="landing-auth-title">
        <button type="button" class="focus-ring absolute right-4 top-4 z-10 grid size-11 place-items-center bg-charcoal text-porcelain" aria-label="Cerrar" @click="$emit('close')">
          <PhX :size="22" aria-hidden="true" />
        </button>

        <figure class="relative hidden min-h-[620px] bg-olive md:block">
          <img :src="authFood" alt="Ñoquis caseros servidos" class="h-full w-full object-cover" />
          <figcaption class="absolute bottom-7 left-7 right-7 bg-porcelain px-6 py-5 font-display text-3xl font-bold leading-tight text-charcoal">
            Recetas reales.<br />Personas reales.
          </figcaption>
        </figure>

        <div class="flex min-h-[590px] flex-col justify-center px-7 py-16 sm:px-12">
          <p class="text-sm font-bold uppercase tracking-[0.16em] text-olive-dark">Tu lugar en la mesa</p>
          <h2 id="landing-auth-title" class="mt-3 font-display text-[clamp(2.7rem,6vw,4.4rem)] font-bold leading-[0.96] tracking-[-0.055em] text-charcoal">
            {{ mode === "login" ? "Volvé a tu recetario." : "Creá tu recetario." }}
          </h2>

          <div class="mt-7 grid grid-cols-2 border-2 border-charcoal p-1" role="tablist" aria-label="Acceso">
            <button type="button" class="min-h-11 px-3 font-semibold" :class="mode === 'login' ? 'bg-charcoal text-porcelain' : 'text-charcoal'" @click="selectMode('login')">Entrar</button>
            <button type="button" class="min-h-11 px-3 font-semibold" :class="mode === 'register' ? 'bg-blush text-charcoal' : 'text-charcoal'" @click="selectMode('register')">Crear cuenta</button>
          </div>

          <form class="mt-6 grid gap-4" @submit.prevent="submit">
            <template v-if="mode === 'register'">
              <label class="grid gap-1.5 text-sm font-semibold text-charcoal">
                Tu nombre
                <input v-model="registration.displayName" required minlength="2" maxlength="60" autocomplete="name" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="Martina Ríos" />
              </label>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-1.5 text-sm font-semibold text-charcoal">
                  Usuario
                  <input v-model="registration.handle" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" autocomplete="username" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="marti_cocina" />
                </label>
                <label class="grid gap-1.5 text-sm font-semibold text-charcoal">
                  Correo
                  <input v-model="registration.email" required type="email" maxlength="254" autocomplete="email" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="vos@ejemplo.com" />
                </label>
              </div>
            </template>

            <label v-else class="grid gap-1.5 text-sm font-semibold text-charcoal">
              Usuario o correo
              <input v-model="login.identifier" required maxlength="254" autocomplete="username" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="marti_cocina" />
            </label>

            <label v-if="mode === 'register'" class="grid gap-1.5 text-sm font-semibold text-charcoal">
              Contraseña
              <input v-model="registration.password" required type="password" minlength="10" maxlength="128" autocomplete="new-password" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="10 caracteres, una letra y un número" />
            </label>
            <label v-else class="grid gap-1.5 text-sm font-semibold text-charcoal">
              Contraseña
              <input v-model="login.password" required type="password" maxlength="128" autocomplete="current-password" class="focus-ring min-h-12 border-2 border-charcoal bg-cream px-4 font-normal outline-none focus:bg-porcelain" placeholder="Tu contraseña" />
            </label>

            <p v-if="errorMessage" class="border-l-4 border-blush bg-cream px-4 py-3 text-sm font-medium text-charcoal" role="alert">{{ errorMessage }}</p>

            <button type="submit" class="focus-ring mt-1 inline-flex min-h-14 items-center justify-between bg-charcoal px-6 font-semibold text-porcelain transition hover:bg-olive hover:text-charcoal disabled:cursor-wait disabled:opacity-65" :disabled="busy">
              {{ busy ? "Preparando tu mesa…" : mode === "login" ? "Entrar a mi cuenta" : "Crear mi cuenta" }}
              <PhArrowRight :size="21" weight="bold" aria-hidden="true" />
            </button>
          </form>

          <p class="mt-4 text-sm leading-relaxed text-charcoal/55">Tu contraseña nunca se guarda en texto plano y la sesión queda protegida en este dispositivo.</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>
