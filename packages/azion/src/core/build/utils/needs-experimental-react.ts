import { createRequire } from "node:module";
import path from "node:path";

import type { NextConfig } from "@opennextjs/aws/types/next-types.js";

// Not sure if this should be upstreamed to aws
// Adding more stuff there make typing incorrect actually, these properties are never undefined as long as it is the right version of next
// Ideally we'd have different `NextConfig` types for different versions of next
interface ExtendedNextConfig extends NextConfig {
  experimental: {
    ppr?: boolean;
    taint?: boolean;
    viewTransition?: boolean;
    serverActions?: boolean;
  };
}

/**
 * Whether the app uses the experimental React channel.
 *
 * The flags change between Next versions (i.e. Next 16.4 checks `blockingSSR`, `taint`, `transitionIndicator`
 * and `gestureTransition`), so the helper of the Next version used by the app is used when it can be loaded.
 *
 * @param nextConfig The Next config
 * @param appPath The path to the app, used to load the helper from the app's Next version
 */
export function needsExperimentalReact(nextConfig: ExtendedNextConfig, appPath?: string) {
  if (appPath) {
    try {
      const require = createRequire(path.join(appPath, "package.json"));
      const helper: {
        needsExperimentalReact: (config: NextConfig) => boolean;
      } = require("next/dist/lib/needs-experimental-react.js");
      return Boolean(helper.needsExperimentalReact(nextConfig));
    } catch {
      // The helper does not exist in older Next versions, use the copy below.
    }
  }

  // Copied from https://github.com/vercel/next.js/blob/4518bc91641a0fd938664b781e12ae7c145f3396/packages/next/src/lib/needs-experimental-react.ts#L3-L6
  const { ppr, taint, viewTransition } = nextConfig.experimental || {};
  return Boolean(ppr || taint || viewTransition);
}
