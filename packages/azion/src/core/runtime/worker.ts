/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */

//@ts-expect-error: Will be resolved by wrangler build
import { runWithAzionRequestContext } from "./azion/init.js";

// This is a workaround for the Azion Storage API
const bucketName = (globalThis as any).AZION_BUCKET_NAME ?? "";
const InstanceStorage = new (globalThis as any).Azion.Storage(bucketName);

export default {
  // TODO: change to event to request when available on Azion Bundler
  async fetch(event: any, env: AzionEnv, ctx: ExecutionContext) {
    // TODO: load the env and ctx from the global scope
    // remove this when bindings are available
    ctx = {
      waitUntil: event.waitUntil.bind(event),
      passThroughOnException: event.passThroughOnException,
      request: event.request,
      props: {},
    };
    env = {
      ...env,
      // bind the env to the worker
      AZION: {
        BUCKET_NAME: (globalThis as any).AZION_BUCKET_NAME ?? "",
        BUCKET_PREFIX: (globalThis as any).AZION_BUCKET_PREFIX ?? "",
        CACHE_API_STORAGE_NAME: (globalThis as any).AZION_CACHE_API_STORAGE_NAME ?? "nextjs_cache",
        Storage: InstanceStorage,
      },
      ASSETS: {
        fetch: getStorageAsset,
      },
      WORKER_SELF_REFERENCE: {
        fetch: async (url: string, options: RequestInit) => {
          const request = new Request(url, options);
          ctx = {
            ...ctx,
            request,
          };
          return requestHandler(request, env, ctx);
        },
      },
    };
    return runWithAzionRequestContext(event.request, env, ctx, async () => {
      return requestHandler(event.request, env, ctx);
    });
  },
};

const requestHandler = async (request: Request, env: any, ctx: any) => {
  const url = new URL(request.url);
  // This is a workaround for rewrite next.config
  // Issue: https://github.com/opennextjs/opennextjs-aws/issues/848
  request.headers.set("x-original-url", url.pathname);
  // Serve images in development.
  // Note: "/data-cache/image/..." requests do not reach production workers.
  // TODO: make support for this
  if (url.pathname.startsWith("/data-cache/image/")) {
    const m = url.pathname.match(/\/data-cache\/image\/.+?\/(?<url>.+)$/);
    if (m === null) {
      return new Response("Not Found!", { status: 404 });
    }
    const imageUrl = m.groups!.url!;
    return imageUrl.match(/^https?:\/\//) ? fetch(imageUrl) : env.ASSETS?.fetch(new URL(`/${imageUrl}`, url));
  }

  // Fallback for the Next default image loader.
  if (url.pathname === "/_next/image") {
    const imageUrl = url.searchParams.get("url") ?? "";
    return imageUrl.startsWith("/") ? env.ASSETS?.fetch(new URL(imageUrl, request.url)) : fetch(imageUrl);
  }

  // static assets
  if (url.pathname.startsWith("/_next/")) {
    return env.ASSETS?.fetch(request);
  }
  const assetRegex = /\.(css|js|ttf|woff|woff2|pdf|svg|jpg|jpeg|gif|bmp|png|ico|mp4|json|xml)$/;
  if (url.pathname.match(assetRegex)) {
    if (url.pathname.includes("com.chrome.devtools.json")) {
      return new Response("ok", { status: 200 });
    }
    return env.ASSETS?.fetch(request);
  }
  // @ts-expect-error: resolved by wrangler build
  const { handler } = await import("./server-functions/default/handler.mjs");

  return handler(request, env, {
    waitUntil: ctx.waitUntil.bind(ctx),
  });
};

const getStorageAsset = async (request: Request) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url).pathname);
    const assetUrl = new URL(requestPath === "/" ? "index.html" : requestPath, "file://");
    return fetch(assetUrl);
  } catch (e) {
    return new Response((e as Error).message || (e as Error).toString(), { status: 404 });
  }
};
