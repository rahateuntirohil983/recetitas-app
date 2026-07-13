export const liveStickers = [
  { id: "hello", label: "Saludar", src: "/app/stickers/pig-hello.webp" },
  { id: "heart", label: "Mandar amor", src: "/app/stickers/pig-heart.webp" },
  { id: "delicious", label: "Qué rico", src: "/app/stickers/pig-delicious.webp" },
  { id: "laugh", label: "Reír", src: "/app/stickers/pig-laugh.webp" },
  { id: "applause", label: "Aplaudir", src: "/app/stickers/pig-applause.webp" },
  { id: "surprised", label: "Sorprenderse", src: "/app/stickers/pig-surprised.webp" },
].map((sticker) => ({ ...sticker, marker: `[[sticker:${sticker.id}]]` }));

const stickerByMarker = new Map(liveStickers.map((sticker) => [sticker.marker, sticker]));

export const liveStickerFromBody = (body) => stickerByMarker.get(String(body || "")) || null;
