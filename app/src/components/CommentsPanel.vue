<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { PhArrowUp, PhImageSquare, PhTrash, PhX } from "@phosphor-icons/vue";
import PigAvatar from "./PigAvatar.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  recipe: { type: Object, default: null },
  comments: { type: Array, default: () => [] },
  authenticated: { type: Boolean, default: false },
  viewerId: { type: String, default: "" },
  busy: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit", "login", "delete"]);
const body = ref("");
const imageFile = ref(null);
const imagePreview = ref("");
const imageError = ref("");

const clearImage = () => { if (imagePreview.value) URL.revokeObjectURL(imagePreview.value); imageFile.value = null; imagePreview.value = ""; imageError.value = ""; };
watch(() => props.recipe?.id, () => { body.value = ""; clearImage(); });
onBeforeUnmount(clearImage);

const chooseImage = (event) => {
  const file = event.target.files?.[0];
  imageError.value = "";
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
    imageError.value = "Elegí una foto JPG, PNG o WebP de hasta 8 MB.";
    event.target.value = "";
    return;
  }
  clearImage();
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
};

const submit = () => {
  const value = body.value.trim();
  if (!value && !imageFile.value) return;
  emit("submit", { body: value, imageFile: imageFile.value, previewUrl: imagePreview.value });
  body.value = "";
  imageFile.value = null;
  imagePreview.value = "";
};

</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm" @click.self="$emit('close')">
      <aside class="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-porcelain shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="comments-title">
        <header class="flex items-start justify-between gap-4 border-b-2 border-charcoal px-5 py-5 sm:px-7">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-olive-dark">La sobremesa</p>
            <h2 id="comments-title" class="mt-1 font-display text-3xl font-bold leading-tight text-charcoal">Comentarios</h2>
            <p class="mt-1 line-clamp-1 text-sm text-charcoal/60">{{ recipe?.title }}</p>
          </div>
          <button type="button" class="focus-ring grid size-11 place-items-center border-2 border-charcoal text-charcoal hover:bg-blush" aria-label="Cerrar comentarios" @click="$emit('close')">
            <PhX :size="21" aria-hidden="true" />
          </button>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
          <article v-for="comment in comments" :key="comment.id" class="flex gap-3">
            <PigAvatar :index="comment.author.avatarIndex" :size="40" :label="`Avatar de ${comment.author.displayName}`" class="ring-2 ring-charcoal/10" />
            <div class="min-w-0 flex-1 bg-cream px-4 py-3">
              <div class="flex items-start justify-between gap-3">
                <p class="min-w-0 text-sm font-semibold text-charcoal">{{ comment.author.displayName }} <span class="font-normal text-charcoal/50">@{{ comment.author.handle }}</span></p>
                <button v-if="viewerId && comment.author.id === viewerId" type="button" class="focus-ring grid size-8 shrink-0 place-items-center text-charcoal/45 transition hover:bg-blush hover:text-charcoal" :disabled="busy" aria-label="Eliminar mi comentario" @click="$emit('delete', comment)">
                  <PhTrash :size="17" aria-hidden="true" />
                </button>
              </div>
              <p class="mt-1 min-w-0 break-words [overflow-wrap:anywhere] leading-relaxed text-charcoal/75">{{ comment.body }}</p>
              <img v-if="comment.imageUrl" :src="comment.imageUrl" :alt="comment.body ? `Foto del comentario de ${comment.author.displayName}` : `Foto compartida por ${comment.author.displayName}`" class="mt-3 max-h-[420px] w-full border-2 border-charcoal object-cover" loading="lazy" decoding="async" />
            </div>
          </article>
          <p v-if="!comments.length" class="py-12 text-center font-display text-2xl text-charcoal/55">Sé la primera persona en comentar.</p>
        </div>

        <footer class="border-t-2 border-charcoal bg-blush px-5 py-5 sm:px-7">
          <button v-if="!authenticated" type="button" class="focus-ring min-h-12 w-full bg-charcoal px-5 font-semibold text-porcelain" @click="$emit('login')">Entrá para comentar</button>
          <form v-else class="grid gap-3" @submit.prevent="submit">
            <div v-if="imagePreview" class="relative w-fit"><img :src="imagePreview" alt="Foto elegida para el comentario" class="h-24 w-32 border-2 border-charcoal object-cover" /><button type="button" class="focus-ring absolute -right-2 -top-2 grid size-8 place-items-center bg-charcoal text-porcelain" aria-label="Quitar foto" @click="clearImage"><PhX :size="16" /></button></div>
            <span v-if="imageError" class="field-error">{{ imageError }}</span>
            <div class="flex items-end gap-2"><label class="sr-only" for="comment-body">Tu comentario</label><textarea id="comment-body" v-model="body" maxlength="500" class="min-h-12 flex-1 resize-none border-2 border-charcoal bg-porcelain px-4 py-3 text-charcoal outline-none focus:border-olive-dark" placeholder="¿Cómo te salió?" /><label class="focus-ring grid size-12 shrink-0 cursor-pointer place-items-center border-2 border-charcoal bg-porcelain hover:bg-olive" aria-label="Agregar una foto"><PhImageSquare :size="23" /><input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="chooseImage" /></label><button type="submit" class="focus-ring grid size-12 shrink-0 place-items-center bg-charcoal text-porcelain hover:bg-olive hover:text-charcoal" :disabled="busy || (!body.trim() && !imageFile)" aria-label="Publicar comentario"><PhArrowUp :size="22" aria-hidden="true" /></button></div>
          </form>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
