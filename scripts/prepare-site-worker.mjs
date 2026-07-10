import { mkdir, cp, copyFile } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/client", { recursive: true });
await copyFile("dist/index.html", "dist/client/index.html");
await cp("dist/assets", "dist/client/assets", { recursive: true });
await copyFile("worker/index.js", "dist/server/index.js");
