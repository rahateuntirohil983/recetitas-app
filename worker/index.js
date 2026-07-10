import { handleApiRequest } from "../api/src/handler.js";

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }

    const asset = await env.ASSETS.fetch(request);

    if (asset.status !== 404) {
      if (/^\/app\/avatars\/pig-\d{2}\.webp$/.test(url.pathname)) {
        const headers = new Headers(asset.headers);
        headers.set("content-type", "image/webp");
        headers.set("cache-control", "public, max-age=31536000, immutable");
        return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
      }
      return asset;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return asset;
    }

    const fallbackPath = url.pathname === "/app" || url.pathname.startsWith("/app/")
      ? "/app/index.html"
      : "/index.html";

    return env.ASSETS.fetch(new Request(new URL(fallbackPath, request.url), {
      method: request.method,
      headers: request.headers,
    }));
  },
};

export default worker;
