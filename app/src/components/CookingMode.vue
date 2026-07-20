<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { PhArrowLeft, PhArrowRight, PhCheck, PhPause, PhPlay, PhPlus, PhTimer, PhX } from "@phosphor-icons/vue";

const props = defineProps({ recipe: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const current = ref(0);
const completed = ref(new Set());
const initialSeconds = Math.max(60, Number(props.recipe.cookMinutes || 1) * 60);
const seconds = ref(initialSeconds);
const running = ref(false);
const targetEnd = ref(0);
const timerDone = ref(false);
let interval = 0;
let wakeLock = null;
const storageKey = `recetitas-cooking-${props.recipe.id}`;

const format = computed(() => `${String(Math.floor(seconds.value / 60)).padStart(2, "0")}:${String(seconds.value % 60).padStart(2, "0")}`);
const progress = computed(() => props.recipe.steps.length ? Math.round(completed.value.size / props.recipe.steps.length * 100) : 0);
const persist = () => localStorage.setItem(storageKey, JSON.stringify({ current: current.value, completed: [...completed.value], seconds: seconds.value, running: running.value, targetEnd: targetEnd.value }));
const syncTimer = () => {
  if (!running.value) return;
  seconds.value = Math.max(0, Math.ceil((targetEnd.value - Date.now()) / 1000));
  if (seconds.value === 0) {
    running.value = false;
    targetEnd.value = 0;
    timerDone.value = true;
    navigator.vibrate?.([180, 100, 180]);
  }
  persist();
};
const startPause = () => {
  if (running.value) {
    syncTimer();
    running.value = false;
    targetEnd.value = 0;
  } else {
    if (seconds.value <= 0) seconds.value = initialSeconds;
    timerDone.value = false;
    running.value = true;
    targetEnd.value = Date.now() + seconds.value * 1000;
  }
  persist();
};
const resetTimer = () => { running.value = false; targetEnd.value = 0; seconds.value = initialSeconds; timerDone.value = false; persist(); };
const addMinute = () => { seconds.value += 60; if (running.value) targetEnd.value += 60_000; persist(); };
const selectStep = (index) => { current.value = Math.max(0, Math.min(props.recipe.steps.length - 1, index)); persist(); };
const markAndNext = () => {
  const next = new Set(completed.value);
  next.has(current.value) ? next.delete(current.value) : next.add(current.value);
  completed.value = next;
  if (next.has(current.value) && current.value < props.recipe.steps.length - 1) current.value += 1;
  persist();
};
const close = () => { syncTimer(); emit("close"); };
const escape = (event) => { if (event.key === "Escape") close(); };

onMounted(async () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    current.value = Math.min(Number(stored.current || 0), Math.max(0, props.recipe.steps.length - 1));
    completed.value = new Set((stored.completed || []).filter((index) => index >= 0 && index < props.recipe.steps.length));
    seconds.value = Number(stored.seconds) >= 0 ? Number(stored.seconds) : initialSeconds;
    running.value = Boolean(stored.running && stored.targetEnd);
    targetEnd.value = Number(stored.targetEnd || 0);
    syncTimer();
  } catch { /* device-local progress is optional */ }
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", escape);
  interval = window.setInterval(syncTimer, 500);
  try { wakeLock = await navigator.wakeLock?.request("screen"); } catch { /* unsupported or denied */ }
});
onBeforeUnmount(() => { window.clearInterval(interval); document.removeEventListener("keydown", escape); document.body.style.overflow = ""; wakeLock?.release?.(); });
</script>

<template>
  <Teleport to="body">
    <section class="fixed inset-0 z-[95] overflow-y-auto bg-porcelain text-charcoal" role="dialog" aria-modal="true" aria-labelledby="cooking-title">
      <header class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-charcoal bg-charcoal px-4 py-3 text-porcelain sm:px-7">
        <div class="min-w-0"><p class="text-xs font-bold uppercase tracking-[0.15em] text-blush">Cocinando ahora</p><h1 id="cooking-title" class="truncate font-display text-2xl font-bold sm:text-3xl">{{ recipe.title }}</h1></div>
        <button type="button" class="focus-ring grid size-11 shrink-0 place-items-center border-2 border-porcelain/60" aria-label="Cerrar modo cocina" @click="close"><PhX :size="22" /></button>
      </header>

      <div class="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1320px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside class="hidden border-r-2 border-charcoal bg-cream p-6 lg:block">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">Tu avance · {{ progress }}%</p>
          <div class="mt-3 h-3 border-2 border-charcoal bg-porcelain"><div class="h-full bg-olive transition-all" :style="{ width: `${progress}%` }" /></div>
          <ol class="mt-6 grid gap-2">
            <li v-for="(step, index) in recipe.steps" :key="index"><button type="button" class="focus-ring flex w-full items-center gap-3 border-2 border-charcoal p-3 text-left" :class="index === current ? 'bg-blush' : completed.has(index) ? 'bg-olive/55' : 'bg-porcelain'" @click="selectStep(index)"><span class="grid size-8 shrink-0 place-items-center bg-charcoal font-display font-bold text-porcelain"><PhCheck v-if="completed.has(index)" :size="18" /><template v-else>{{ index + 1 }}</template></span><span class="line-clamp-2 text-sm" :class="completed.has(index) && 'line-through opacity-60'">{{ step }}</span></button></li>
          </ol>
        </aside>

        <main class="flex min-w-0 flex-col px-5 py-6 sm:px-10 sm:py-9">
          <section class="grid gap-3 border-2 border-charcoal bg-cream p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div><p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-olive-dark"><PhTimer :size="18" /> Temporizador</p><p class="mt-1 font-display text-[clamp(2.8rem,10vw,4.8rem)] font-bold tabular-nums leading-none" :class="timerDone && 'text-[#b33a4a]'">{{ format }}</p><p v-if="timerDone" class="mt-1 font-bold">¡Tiempo! Revisá la cocción.</p></div>
            <div class="grid grid-cols-3 gap-2"><button type="button" class="focus-ring grid min-h-12 place-items-center border-2 border-charcoal bg-porcelain px-3" :aria-label="running ? 'Pausar temporizador' : 'Iniciar temporizador'" @click="startPause"><PhPause v-if="running" :size="22" weight="fill" /><PhPlay v-else :size="22" weight="fill" /></button><button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-1 border-2 border-charcoal bg-porcelain px-3 font-bold" @click="addMinute"><PhPlus :size="18" />1 min</button><button type="button" class="focus-ring min-h-12 border-2 border-charcoal bg-porcelain px-3 text-sm font-bold" @click="resetTimer">Reiniciar</button></div>
          </section>

          <section class="flex flex-1 flex-col justify-center py-10 sm:py-14">
            <p class="text-sm font-bold uppercase tracking-[0.18em] text-olive-dark">Paso {{ current + 1 }} de {{ recipe.steps.length }}</p>
            <div class="mt-3 grid grid-cols-[3.2rem_minmax(0,1fr)] gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-7"><span class="grid size-13 place-items-center bg-charcoal font-display text-2xl font-bold text-porcelain sm:size-18 sm:text-4xl">{{ current + 1 }}</span><p class="min-w-0 break-words [overflow-wrap:anywhere] font-display text-[clamp(2rem,6vw,4rem)] font-bold leading-[1.12] tracking-[-0.035em]">{{ recipe.steps[current] }}</p></div>
            <button type="button" class="focus-ring mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 border-2 border-charcoal px-5 font-bold sm:w-auto sm:self-start" :class="completed.has(current) ? 'bg-olive' : 'bg-blush'" @click="markAndNext"><PhCheck :size="22" weight="bold" /> {{ completed.has(current) ? 'Marcar pendiente' : current === recipe.steps.length - 1 ? 'Marcar como listo' : 'Listo, siguiente paso' }}</button>
          </section>

          <footer class="grid grid-cols-2 gap-2 border-t-2 border-charcoal pt-5"><button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-porcelain font-bold" :disabled="current === 0" @click="selectStep(current - 1)"><PhArrowLeft :size="20" /> Anterior</button><button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-charcoal font-bold text-porcelain" :disabled="current === recipe.steps.length - 1" @click="selectStep(current + 1)">Siguiente <PhArrowRight :size="20" /></button></footer>
        </main>
      </div>
    </section>
  </Teleport>
</template>
