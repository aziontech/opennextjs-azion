//@ts-expect-error: Will be resolved by wrangler build
import { runWithAzionRequestContext } from "./azion/init.js";

// export { DOQueueHandler } from "./.build/durable-objects/queue.js";
// export { DOShardedTagCache } from "./.build/durable-objects/sharded-tag-cache.js";

export default {
  // TODO: create types for this
  // the bundler does not pass env and ctx to the worker
  async fetch(event: any, env: any, ctx: any) {
    ctx = {
      ...ctx,
      waitUntil: event.waitUntil.bind(event),
    };
    env = {
      ...env,
      ASSETS: {
        fetch: getStorageAsset,
      },
    };
    return runWithAzionRequestContext(event.request, env, ctx, async () => {
      const url = new URL(event.request.url);
      // TODO: This is a workaround for rewrite next.config
      // Issue: https://github.com/opennextjs/opennextjs-aws/issues/848
      event.request.headers.set("x-original-url", url.pathname);
      // Serve images in development.
      // Note: "/cdn-cgi/image/..." requests do not reach production workers.
      // TODO: check this
      if (url.pathname.startsWith("/cdn-cgi/image/")) {
        const m = url.pathname.match(/\/cdn-cgi\/image\/.+?\/(?<url>.+)$/);
        if (m === null) {
          return new Response("Not Found!", { status: 404 });
        }
        const imageUrl = m.groups!.url!;
        return imageUrl.match(/^https?:\/\//)
          ? fetch(imageUrl)
          : env.ASSETS?.fetch(new URL(`/${imageUrl}`, url));
      }

      // Fallback for the Next default image loader.
      if (url.pathname === "/_next/image") {
        const imageUrl = url.searchParams.get("url") ?? "";
        return imageUrl.startsWith("/")
          ? env.ASSETS?.fetch(new URL(imageUrl, event.request.url))
          : fetch(imageUrl);
      }

      // TODO: check this
      if (url.pathname.startsWith("/_next/")) {
        return env.ASSETS?.fetch(event.request);
      }
      const assetRegex = /\.(css|js|ttf|woff|woff2|pdf|svg|jpg|jpeg|gif|bmp|png|ico|mp4|json|xml)$/;
      if (url.pathname.match(assetRegex)) {
        return env.ASSETS?.fetch(event.request);
      }

      // @ts-expect-error: resolved by wrangler build
      const { handler } = await import("./server-functions/default/handler.mjs");

      return handler(event.request, env, {
        waitUntil: ctx.waitUntil.bind(ctx),
      });
    });
  },
};

const getStorageAsset = async (request: Request) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url).pathname); // Decodifica o caminho
    const assetUrl = new URL(requestPath === "/" ? "index.html" : requestPath, "file://");
    return fetch(assetUrl);
  } catch (e) {
    return new Response((e as Error).message || (e as Error).toString(), { status: 500 });
  }
};
