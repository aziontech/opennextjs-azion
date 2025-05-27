/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */

declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
    props: Record<string, unknown>;
    request: Request;
  }

  interface AzionEnv {
    // Asset binding
    ASSETS?: {
      // get an asset from the Azion Storage
      fetch: (request: Request) => Promise<Response>;
    };

    // Environment to use when loading Next `.env` files
    // Default to "production"
    NEXTJS_ENV?: string;

    // Azion bindings
    AZION?: {
      BUCKET_NAME: string;
      BUCKET_PREFIX: string;
      CACHE_API_STORAGE_NAME: string;
      Storage: {
        get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
        put: (
          key: string,
          value: Uint8Array<ArrayBufferLike>,
          options: Record<string, unknown>
        ) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
    };

    // Worker self reference
    WORKER_SELF_REFERENCE: any;
  }
}

export type AzionContext<AzProperties extends Record<string, unknown> = any, Context = ExecutionContext> = {
  env: AzionEnv;
  ctx: Context;
  az: AzProperties | undefined;
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
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(options: { async: true }): Promise<AzionContext<AzProperties, Context>>;
export function getAzionContext<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(options?: { async: false }): AzionContext<AzProperties, Context>;
export function getAzionContext<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(
  options: GetAzionContextOptions = { async: false }
): AzionContext<AzProperties, Context> | Promise<AzionContext<AzProperties, Context>> {
  return options.async ? getAzionContextAsync() : getAzionContextSync();
}

function getAzionContextFromGlobalScope<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(): AzionContext<AzProperties, Context> | undefined {
  const global = globalThis as InternalGlobalThis<AzProperties, Context>;
  return global[azionContextSymbol];
}

function getAzionContextSync<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(): AzionContext<AzProperties, Context> {
  const azionContext = getAzionContextFromGlobalScope<AzProperties, Context>();

  if (azionContext) {
    return azionContext;
  }

  throw new Error(`\n\nERROR: \`getAzionContext\` has been called without having called`);
}

/**
 * Utility to get the current Azion context in async mode
 */
async function getAzionContextAsync<
  AzProperties extends Record<string, unknown> = any,
  Context = ExecutionContext,
>(): Promise<AzionContext<AzProperties, Context>> {
  const azionContext = getAzionContextFromGlobalScope<AzProperties, Context>();

  if (azionContext) {
    return azionContext;
  }

  throw new Error(
    `\n\nERROR: \`getAzionContext\` has been called in async mode but the context is not available.\n`
  );
}
