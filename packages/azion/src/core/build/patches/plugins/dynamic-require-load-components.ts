import { join, posix, relative, sep } from "node:path";

import { type BuildOptions, getPackagePath } from "@opennextjs/aws/build/helper.js";
import { patchCode, type RuleConfig } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";
import { glob } from "glob";

import { normalizePath } from "../../utils/normalize-path.js";

export function inlineDynamicRequireLoadComponents(updater: ContentUpdater, buildOpts: BuildOptions): Plugin {
  return updater.updateContent("inline-dynamic-manifest", [
    {
      versions: "<=14.0.0",
      filter: getCrossPlatformPathRegex(String.raw`/next/dist/server/load-components\.js$`, {
        escape: false,
      }),
      contentFilter: /async function loadClientReferenceManifest\(/,
      callback: async ({ contents }) => patchCode(contents, await getRule(buildOpts)),
    },
  ]);
}

async function getRule(buildOpts: BuildOptions) {
  const { outputDir } = buildOpts;

  const baseDir = join(outputDir, "server-functions/default", getPackagePath(buildOpts), ".next");
  const appDir = join(baseDir, "server/app");
  const manifests = await glob(join(baseDir, "**/*_client-reference-manifest.js"), {
    windowsPathsNoEscape: true,
  });
  const returnManifests = manifests
    .map((manifest) => {
      const endsWith = normalizePath(relative(baseDir, manifest));
      const key = normalizePath("/" + relative(appDir, manifest)).replace(
        "_client-reference-manifest.js",
        ""
      );
      return `
          if ($PATH.endsWith("${endsWith}")) {
            require(${JSON.stringify(manifest)});
            return {
              __RSC_MANIFEST: {
              "${key}": globalThis.__RSC_MANIFEST["${key}"],
              },
            };
          }
        `;
    })
    .join("\n");
  // this code is equivalent to version 14.x
  // we need to test in other versions
  const newFunctions = `
    function evalManifest($PATH, $$$ARGS) {
      $PATH = $PATH.replaceAll(${JSON.stringify(sep)}, ${JSON.stringify(posix.sep)});
      ${returnManifests}
      throw new Error(\`Unexpected evalManifest(\${$PATH}) call!\`);
    }
    async function evalManifestWithRetries(manifestPath, attempts = 3) {
      while (true) {
        try {
          return evalManifest(manifestPath);
        } catch (err) {
          attempts--;
          if (attempts <= 0) throw err;
          await (0, _wait.wait)(100);
        }
      }
    }
  `;

  return {
    rule: {
      pattern: `
  function loadClientReferenceManifest($PATH, $ENTRY_NAME) {
    $$$_
  }`,
    },
    fix: `
   ${newFunctions}
  async function loadClientReferenceManifest($PATH, $ENTRY_NAME) {
    try {
        const context = await evalManifestWithRetries($PATH);
        return context.__RSC_MANIFEST[$ENTRY_NAME];
      } catch (err) {
        return undefined;
      }
  }
  `,
  } satisfies RuleConfig;
}
