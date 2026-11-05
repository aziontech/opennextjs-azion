/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
/**
 * Initialization for the workerd runtime.
 *
 * The file must be imported at the top level the worker.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import process from "node:process";
import stream from "node:stream";

// @ts-expect-error: resolved by wrangler build
import * as nextEnvVars from "./next-env.mjs";

globalThis.AsyncLocalStorage = AsyncLocalStorage;
const azionContextALS = new AsyncLocalStorage();

// Note: this symbol needs to be kept in sync with `src/api/get-azion-context.ts`
Object.defineProperty(globalThis, Symbol.for("__azion-context__"), {
  get() {
    return azionContextALS.getStore();
  },
});

/**
 * Executes the handler with the Azion context.
 */
export async function runWithAzionRequestContext(
  request: Request,
  env: AzionEnv,
  ctx: ExecutionContext,
  handler: () => Promise<Response>
): Promise<Response> {
  init(request, env);

  return azionContextALS.run({ env, ctx, cf: request }, handler);
}

let initialized = false;

/**
 * Initializes the runtime on the first call,
 * no-op on subsequent invocations.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function init(_request: Request, _env: AzionEnv) {
  if (initialized) {
    return;
  }
  initialized = true;

  // const url = new URL(request.url);

  initRuntime();
  // TODO: CELLS not supported process set
  // populateProcessEnv(url, env);
}

function initRuntime() {
  // Some packages rely on `process.version` and `process.versions.node` (i.e. Jose@4)
  // TODO: Remove when https://github.com/unjs/unenv/pull/493 is merged
  // Object.assign(process, { version: process.version || "v22.14.0" });
  // Object.assign(process.versions, { node: "22.14.0", ...process.versions });

  globalThis.__dirname ??= "";
  globalThis.__filename ??= "";

  // Next 16.2+ calls `Buffer.prototype.indexOf` with a `Uint8Array` (`indexOfUint8Array`).
  // Node accepts it but the Buffer polyfill only accepts string, number or Buffer.
  const originalBufferIndexOf = Buffer.prototype.indexOf;
  Buffer.prototype.indexOf = function (
    this: Buffer,
    value: Parameters<Buffer["indexOf"]>[0],
    ...args: [byteOffset?: number, encoding?: BufferEncoding]
  ) {
    if (value instanceof Uint8Array && !Buffer.isBuffer(value)) {
      value = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
    return originalBufferIndexOf.call(this, value, ...args);
  };

  // Next 16.4+ calls `ref()`, `unref()` and `hasRef()` on the value returned by `setImmediate`.
  // The `setImmediate` polyfill returns a number.
  // Note: Next captures the global timers when the server is loaded, i.e. after this function runs.
  patchSetImmediate();

  // Next 16.4+ expects `process.nextTick` callbacks to run before the next task.
  // The global `process` polyfill schedules them with `setTimeout`.
  // Note: the global `process` is not the `node:process` module imported in this file.
  if (globalThis.process) {
    globalThis.process.nextTick = (callback: (...args: unknown[]) => void, ...args: unknown[]) =>
      queueMicrotask(() => callback(...args));
  }

  // Do not crash on cache not supported
  // https://github.com/azion/workerd/pull/2434
  // compatibility flag "cache_option_enabled" -> does not support "force-cache"
  const __original_fetch = globalThis.fetch;

  globalThis.fetch = (input, init) => {
    if (init) {
      delete (init as { cache: unknown }).cache;
    }
    return __original_fetch(input, init);
  };

  const CustomRequest = class extends globalThis.Request {
    constructor(input: Request | URL, init?: RequestInit) {
      if (init) {
        delete (init as { cache: unknown }).cache;
        Object.defineProperty(init, "body", {
          // @ts-ignore
          value: init.body instanceof stream.Readable ? ReadableStream.from(init.body) : init.body,
        });
      }
      super(input, init);
    }
  };

  Object.assign(globalThis, {
    Request: CustomRequest,
    __BUILD_TIMESTAMP_MS__,
    __NEXT_BASE_PATH__,
    // The external middleware will use the convertTo function of the `edge` converter
    // by default it will try to fetch the request, but since we are running everything in the same worker
    // we need to use the request as is.
    __dangerous_ON_edge_converter_returns_request: true,
  });
}

/**
 * Makes `setImmediate` return a Node-like `Immediate` when the polyfill returns a plain id.
 */
function patchSetImmediate() {
  const nativeSetImmediate = globalThis.setImmediate;
  const nativeClearImmediate = globalThis.clearImmediate;

  class Immediate {
    private hasRefValue = true;

    constructor(readonly id: unknown) {}

    ref() {
      this.hasRefValue = true;
      return this;
    }

    unref() {
      this.hasRefValue = false;
      return this;
    }

    hasRef() {
      return this.hasRefValue;
    }

    [Symbol.toPrimitive]() {
      return this.id;
    }
  }

  globalThis.setImmediate = Object.assign(function setImmediate(
    callback: (...args: unknown[]) => void,
    ...args: unknown[]
  ) {
    const immediate: unknown = nativeSetImmediate(callback, ...args);
    return typeof (immediate as Partial<Immediate> | undefined)?.ref === "function"
      ? immediate
      : new Immediate(immediate);
  }, nativeSetImmediate) as unknown as typeof globalThis.setImmediate;

  globalThis.clearImmediate = function clearImmediate(immediate: unknown) {
    return nativeClearImmediate(
      (immediate instanceof Immediate ? immediate.id : immediate) as NodeJS.Immediate
    );
  } as typeof globalThis.clearImmediate;
}

/**
 * Populate process.env with:
 * - the environment variables and secrets from the azion platform
 * - the variables from Next .env* files
 * - the origin resolver information
 */
export function populateProcessEnv(url: URL, env: AzionEnv) {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }

  const mode = env.NEXTJS_ENV ?? "production";
  if (nextEnvVars[mode]) {
    for (const key in nextEnvVars[mode]) {
      process.env[key] ??= nextEnvVars[mode][key];
    }
  }

  // Set the default Origin for the origin resolver.
  // This is only needed for an external middleware bundle
  process.env.OPEN_NEXT_ORIGIN = JSON.stringify({
    default: {
      host: url.hostname,
      protocol: url.protocol.slice(0, -1),
      port: url.port,
    },
  });
}

declare global {
  // Build timestamp
  var __BUILD_TIMESTAMP_MS__: number;
  // Next basePath
  var __NEXT_BASE_PATH__: string;
  // Deployment ID
  var __DEPLOYMENT_ID__: string;
}
