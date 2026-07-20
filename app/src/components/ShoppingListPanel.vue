<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { PhCheck, PhCopy, PhShareNetwork, PhShoppingCart, PhX } from "@phosphor-icons/vue";

const props = defineProps({ recipe: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const checked = ref(new Set());
const copied = ref(false);
const storageKey = computed(() => `recetitas-shopping-${props.recipe.id}`);
const remaining = computed(() => props.recipe.ingredients.length - checked.value.size);

const load = () => {
  try { checked.value = new Set(JSON.parse(localStorage.getItem(storageKey.value) || "[]")); }
  catch { checked.value = new Set(); }
};
const persist = () => localStorage.setItem(storageKey.value, JSON.stringify([...checked.value]));
const toggle = (index) => {
  const next = new Set(checked.value);
  next.has(index) ? next.delete(index) : next.add(index);
  checked.value = next;
  persist();
};
const listText = () => `${props.recipe.title}\n\n${props.recipe.ingredients.map((item) => `• ${item}`).join("\n")}`;
const copy = async () => {
  await navigator.clipboard.writeText(listText());
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 1800);
};
const share = async () => navigator.share ? navigator.share({ title: `Lista · ${props.recipe.title}`, text: listText() }) : copy();
const escape = (event) => { if (event.key === "Escape") emit("close"); };
watch(() => props.recipe.id, load, { immediate: true });
onMounted(() => { document.addEventListener("keydown", escape); document.body.style.overflow = "hidden"; });
onBeforeUnmount(() => { document.removeEventListener("keydown", escape); document.body.style.overflow = ""; });
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[85] bg-charcoal/70 backdrop-blur-sm" @click.self="$emit('close')">
      <aside class="absolute inset-y-0 right-0 flex w-full max-w-[590px] flex-col border-l-2 border-charcoal bg-porcelain shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="shopping-title">
        <header class="flex items-start justify-between gap-4 border-b-2 border-charcoal bg-olive px-5 py-6 sm:px-8">
          <div><p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]"><PhShoppingCart :size="18" weight="fill" /> Lista automática</p><h2 id="shopping-title" class="mt-1 font-display text-4xl font-bold leading-none tracking-[-0.05em]">Compras.</h2><p class="mt-2 max-w-[420px] break-words text-sm font-semibold text-charcoal/65">Todo para preparar {{ recipe.title }}.</p></div>
          <button type="button" class="focus-ring grid size-11 shrink-0 place-items-center border-2 border-charcoal bg-porcelain" aria-label="Cerrar lista" @click="$emit('close')"><PhX :size="22" /></button>
        </header>
        <div class="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div class="mb-5 flex items-center justify-between gap-3"><p class="font-semibold">{{ remaining }} por comprar</p><button v-if="checked.size" type="button" class="text-sm font-semibold underline" @click="checked = new Set(); persist()">Desmarcar todo</button></div>
          <ul class="grid min-w-0 gap-3 overflow-hidden">
            <li v-for="(ingredient, index) in recipe.ingredients" :key="`${index}-${ingredient}`" class="min-w-0 max-w-full">
              <label class="focus-within:ring-4 focus-within:ring-blush flex min-h-14 w-full min-w-0 max-w-full cursor-pointer items-center gap-4 overflow-hidden border-2 border-charcoal px-4 py-3 transition" :class="checked.has(index) ? 'bg-cream text-charcoal/45 line-through' : 'bg-porcelain hover:bg-blush'">
                <input type="checkbox" class="sr-only" :checked="checked.has(index)" @change="toggle(index)" /><span class="grid size-7 shrink-0 place-items-center border-2 border-charcoal" :class="checked.has(index) && 'bg-charcoal text-porcelain'"><PhCheck v-if="checked.has(index)" :size="18" weight="bold" /></span><span class="block min-w-0 flex-1 whitespace-normal break-all leading-relaxed [overflow-wrap:anywhere] [word-break:break-word]">{{ ingredient }}</span>
              </label>
            </li>
          </ul>
        </div>
        <footer class="grid grid-cols-2 gap-2 border-t-2 border-charcoal bg-cream p-4 sm:p-5"><button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border-2 border-charcoal bg-porcelain font-bold" @click="copy"><PhCopy :size="20" /> {{ copied ? 'Copiada' : 'Copiar' }}</button><button type="button" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-charcoal font-bold text-porcelain" @click="share"><PhShareNetwork :size="20" /> Compartir</button></footer>
      </aside>
    </div>
  </Teleport>
</template>
