import { BaseOverride, LazyLoadedOverride, OpenNextConfig } from "@opennextjs/aws/types/open-next";
import type { IncrementalCache, Queue, TagCache } from "@opennextjs/aws/types/overrides";

export type Override<T extends BaseOverride> = "dummy" | T | LazyLoadedOverride<T>;

/**
 * Azion specific overrides.
 *
 * See the [Caching documentation](https://opennext.js.org/azion/caching))
 */
export type AzionOverrides = {
  /**
   * Sets the incremental cache implementation.
   */
  incrementalCache?: Override<IncrementalCache>;

  /**
   * Sets the tag cache implementation.
   */
  tagCache?: Override<TagCache>;

  /**
   * Sets the revalidation queue implementation
   */
  queue?: "direct" | Override<Queue>;
};

/**
 * Defines the OpenNext configuration that targets the Azion adapter
 *
 * @param config options that enabled you to configure the application's behavior
 * @returns the OpenNext configuration object
 */
export function defineAzionConfig(config: AzionOverrides = {}): OpenNextConfig {
  const { incrementalCache, tagCache, queue } = config;

  return {
    default: {
      override: {
        wrapper: "cloudflare-node", // TODO: add support for Azion
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue),
      },
    },
    // node:crypto is used to compute cache keys
    edgeExternals: ["node:crypto"],
  };
}

function resolveIncrementalCache(value: AzionOverrides["incrementalCache"] = "dummy") {
  if (typeof value === "string") {
    return value;
  }

  return typeof value === "function" ? value : () => value;
}

function resolveTagCache(value: AzionOverrides["tagCache"] = "dummy") {
  if (typeof value === "string") {
    return value;
  }

  return typeof value === "function" ? value : () => value;
}

function resolveQueue(value: AzionOverrides["queue"] = "dummy") {
  if (typeof value === "string") {
    return value;
  }

  return typeof value === "function" ? value : () => value;
}
