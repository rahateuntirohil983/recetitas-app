const worker = {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);

    if (asset.status !== 404 || request.method === "HEAD") {
      return asset;
    }

    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};

export default worker;
