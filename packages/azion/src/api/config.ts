/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */

import {
  BaseOverride,
  LazyLoadedOverride,
  OpenNextConfig,
  type RoutePreloadingBehavior,
} from "@opennextjs/aws/types/open-next.js";
import type { IncrementalCache, Queue, TagCache, Wrapper } from "@opennextjs/aws/types/overrides.js";

import AzionWrapperEdge from "../core/overrides/wrapper/azion-wrapper-edge.js";

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

  /**
   * Sets the wrapper implementation.
   */
  wrapper?: Override<Wrapper>;

  /**
   * Route preloading behavior.
   * Using a value other than "none" can result in higher CPU usage on cold starts.
   * @default "none"
   */
  routePreloadingBehavior?: RoutePreloadingBehavior;
};

/**
 * Defines the OpenNext configuration that targets the Azion adapter
 *
 * @param config options that enabled you to configure the application's behavior
 * @returns the OpenNext configuration object
 */
export function defineAzionConfig(config: AzionOverrides = {}): OpenNextConfig {
  const { incrementalCache, tagCache, queue, wrapper, routePreloadingBehavior } = config;

  return {
    default: {
      override: {
        wrapper: resolveWrapper(wrapper),
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue),
      },
      routePreloadingBehavior,
    },
    // node:crypto is used to compute cache keys and node:stream is used to wrapper
    edgeExternals: ["node:crypto", "node:stream"],
    middleware: {
      external: true,
      override: {
        // TODO: in the future move to the open-next aws package
        wrapper: () => AzionWrapperEdge as Wrapper,
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue),
      },
    },
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

function resolveWrapper(value: AzionOverrides["wrapper"] = "dummy") {
  if (typeof value === "string") {
    return value;
  }

  return typeof value === "function" ? value : () => value;
}
