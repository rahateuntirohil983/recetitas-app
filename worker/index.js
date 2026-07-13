import { handleApiRequest } from "../api/src/handler.js";

const noCacheHtml = (response) => {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-cache, no-store, max-age=0, must-revalidate");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }

    const asset = await env.ASSETS.fetch(request);

    if (asset.status !== 404) {
      const isAssetPath = url.pathname.startsWith("/app/assets/") || url.pathname.startsWith("/assets/");
      if (isAssetPath && asset.headers.get("content-type")?.includes("text/html")) {
        return new Response("Asset not found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      }
      const isPigImage = /^\/app\/avatars\/pig-\d{2}\.webp$/.test(url.pathname)
        || /^\/app\/stickers\/pig-[a-z-]+\.webp$/.test(url.pathname);
      if (isPigImage) {
        const headers = new Headers(asset.headers);
        headers.set("content-type", "image/webp");
        headers.set("cache-control", "public, max-age=31536000, immutable");
        return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
      }
      if (asset.headers.get("content-type")?.includes("text/html")) return noCacheHtml(asset);
      return asset;
    }

    if (url.pathname.startsWith("/app/assets/") || url.pathname.startsWith("/assets/")) return asset;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return asset;
    }

    const fallbackPath = url.pathname === "/app" || url.pathname.startsWith("/app/")
      ? "/app/index.html"
      : "/index.html";

    const fallback = await env.ASSETS.fetch(new Request(new URL(fallbackPath, request.url), {
      method: request.method,
      headers: request.headers,
    }));
    return noCacheHtml(fallback);
  },
};

export default worker;
