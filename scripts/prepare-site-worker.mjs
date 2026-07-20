import { mkdir, cp, copyFile, rm } from "node:fs/promises";
import { build } from "vite";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/client", { recursive: true });
await copyFile("dist/index.html", "dist/client/index.html");
await cp("dist/assets", "dist/client/assets", { recursive: true });
await copyFile("dist/og.png", "dist/client/og.png");
await rm("dist/client/app", { recursive: true, force: true });
await cp("app/dist", "dist/client/app", { recursive: true });

await build({
  configFile: false,
  build: {
    ssr: "worker/index.js",
    outDir: "dist/server",
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        format: "es",
      },
    },
  },
});
