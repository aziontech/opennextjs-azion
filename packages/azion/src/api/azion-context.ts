declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
    props: any;
    request: Request;
  }

  interface AzionEnv {
    // Asset binding
    ASSETS?: any;

    // Environment to use when loading Next `.env` files
    // Default to "production"
    NEXTJS_ENV?: string;

    // Storage binding for the incremental cache
    AZION?: any;

    WORKER_SELF_REFERENCE: any;

    // KV used for the incremental cache
    // NEXT_INC_CACHE_KV?: KVNamespace;

    // R2 bucket used for the incremental cache
    // NEXT_INC_CACHE_R2_BUCKET?: R2Bucket;
    // Prefix used for the R2 incremental cache bucket
    // NEXT_INC_CACHE_R2_PREFIX?: string;

    // D1 db used for the tag cache
    // NEXT_TAG_CACHE_D1?: D1Database;

    // Durables object namespace to use for the sharded tag cache
    // NEXT_TAG_CACHE_DO_SHARDED?: DurableObjectNamespace<DOShardedTagCache>;
    // Queue of failed tag write
    // Optional, could be used to monitor or reprocess failed writes
    // NEXT_TAG_CACHE_DO_SHARDED_DLQ?: Queue;

    // Durable Object namespace to use for the durable object queue
    // NEXT_CACHE_DO_QUEUE?: DurableObjectNamespace<DOQueueHandler>;

    // Below are the optional environment variables to configure the durable object queue
    // The max number of revalidations that can be processed by the durable worker at the same time
    NEXT_CACHE_DO_QUEUE_MAX_REVALIDATION?: string;
    // The max time in milliseconds that a revalidation can take before being considered as failed
    NEXT_CACHE_DO_QUEUE_REVALIDATION_TIMEOUT_MS?: string;
    // The amount of time after which a revalidation will be attempted again if it failed
    // If it fails again it will exponentially back off until it reaches the max retry interval
    NEXT_CACHE_DO_QUEUE_RETRY_INTERVAL_MS?: string;
    // The maximum number of attempts that can be made to revalidate a path
    NEXT_CACHE_DO_QUEUE_MAX_RETRIES?: string;
    // Disable SQLite for the durable object queue handler
    // This can be safely used if you don't use an eventually consistent incremental cache (i.e. R2 without the regional cache for example)
    NEXT_CACHE_DO_QUEUE_DISABLE_SQLITE?: string;
  }
}

export type AzionContext<AzProperties extends Record<string, unknown> = any, Context = ExecutionContext> = {
  env: AzionEnv;
  cf: AzProperties | undefined;
  ctx: Context;
};

const azionContextSymbol = Symbol.for("__azion-context__");

/**
 * `globalThis` override for internal usage
 */
type InternalGlobalThis<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
> = typeof globalThis & {
  [azionContextSymbol]: AzionContext<AzProperties, Context> | undefined;
  __NEXT_DATA__: Record<string, unknown>;
};

type GetAzionContextOptions = {
  async: boolean;
};

export function getAzionContext<
  CfProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(options: { async: true }): Promise<AzionContext<CfProperties, Context>>;
export function getAzionContext<
  CfProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(options?: { async: false }): AzionContext<CfProperties, Context>;
export function getAzionContext<
  CfProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(
  options: GetAzionContextOptions = { async: false }
): AzionContext<CfProperties, Context> | Promise<AzionContext<CfProperties, Context>> {
  return options.async ? getAzionContextAsync() : getAzionContextSync();
}

function getAzionContextFromGlobalScope<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(): AzionContext<AzProperties, Context> | undefined {
  const global = globalThis as InternalGlobalThis<AzProperties, Context>;
  return global[azionContextSymbol];
}

/**
 * Detects whether the current code is being evaluated in a statically generated route
 */
// function inSSG<
//   CfProperties extends Record<string, unknown> = IncomingRequestCfProperties,
//   Context = ExecutionContext,
// >(): boolean {
//   const global = globalThis as InternalGlobalThis<CfProperties, Context>;
//   // Note: Next.js sets globalThis.__NEXT_DATA__.nextExport to true for SSG routes
//   // source: https://github.com/vercel/next.js/blob/4e394608423/packages/next/src/export/worker.ts#L55-L57)
//   return global.__NEXT_DATA__?.nextExport === true;
// }

function getAzionContextSync<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(): AzionContext<AzProperties, Context> {
  const azionContext = getAzionContextFromGlobalScope<AzProperties, Context>();

  if (azionContext) {
    return azionContext;
  }

  throw new Error(`\n\nERROR: \`getAzionContext\` has been called without having called`);
  //   throw new Error(initOpenNextCloudflareForDevErrorMsg);
}

/**
 * Utility to get the current Cloudflare context in async mode
 */
async function getAzionContextAsync<
  CfProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(): Promise<AzionContext<CfProperties, Context>> {
  const azionContext = getAzionContextFromGlobalScope<CfProperties, Context>();

  if (azionContext) {
    return azionContext;
  }

  // Note: Next.js sets process.env.NEXT_RUNTIME to 'nodejs' when the runtime in use is the node.js one
  // We want to detect when the runtime is the node.js one so that during development (`next dev`) we know wether
  // we are or not in a node.js process and that access to wrangler's node.js apis
  // const inNodejsRuntime = process.env.NEXT_RUNTIME === "nodejs";

  throw new Error(
    `\n\nERROR: \`getAzionContext\` has been called in async mode but the context is not available.\n`
  );
}
