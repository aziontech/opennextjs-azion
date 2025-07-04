import logger from "@opennextjs/aws/logger.js";
import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

/**
 * Ensures open next is configured for azion.
 *
 * @param config OpenNext configuration.
 */
export function ensureAzionConfig(config: OpenNextConfig) {
  const requirements = {
    // TODO: in the future move to the open-next aws package
    dftUseAzionWrapper: typeof config.default?.override?.wrapper === "function",
    dftUseEdgeConverter: config.default?.override?.converter === "edge",
    dftUseFetchProxy: config.default?.override?.proxyExternalRequest === "fetch",
    dftMaybeUseCache:
      config.default?.override?.incrementalCache === "dummy" ||
      typeof config.default?.override?.incrementalCache === "function",
    dftMaybeUseTagCache:
      config.default?.override?.tagCache === "dummy" ||
      typeof config.default?.override?.incrementalCache === "function",
    dftMaybeUseQueue:
      config.default?.override?.queue === "dummy" ||
      config.default?.override?.queue === "direct" ||
      typeof config.default?.override?.queue === "function",
    mwIsMiddlewareIntegrated: config.middleware === undefined,
    hasCryptoExternal: config.edgeExternals?.includes("node:crypto"),
  };

  if (config.default?.override?.queue === "direct") {
    logger.warn("The direct mode queue is not recommended for use in production.");
  }

  if (Object.values(requirements).some((satisfied) => !satisfied)) {
    throw new Error(
      "The `open-next.config.ts` should have a default export like this:\n\n" +
        `{
          default: {
            override: {
              wrapper: "function",
              converter: "edge",
              proxyExternalRequest: "fetch",
              incrementalCache: "dummy" | function,
              tagCache: "dummy",
              queue: "dummy" | "direct" | function,
            },
          },
          edgeExternals: ["node:crypto"],
        }\n\n`.replace(/^ {8}/gm, "")
    );
  }
}
