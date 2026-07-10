import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/app/",
  plugins: [vue(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 4174,
  },
  build: {
    outDir: "dist",
  },
});
