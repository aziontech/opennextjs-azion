import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import type { ContentUpdater } from "@opennextjs/aws/plugins/content-updater.js";
import mockFs from "mock-fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { inlineLoadManifest } from "./load-manifest.js";

const buildOpts = {
  appBuildOutputPath: "app",
  monorepoRoot: "",
  outputDir: "app/.open-next",
} as BuildOptions;

const dotNextDir = "app/.open-next/server-functions/default/app/.next";

type Manifests = {
  loadManifest: (path: string) => unknown;
  evalManifest: (path: string) => unknown;
};

async function getPatchedManifests(): Promise<Manifests> {
  let callback: (args: { contents: string }) => Promise<string>;
  inlineLoadManifest(
    {
      updateContent: (_name: string, updaters: [{ callback: typeof callback }]) => {
        callback = updaters[0].callback;
      },
    } as unknown as ContentUpdater,
    buildOpts
  );

  const contents = await callback!({
    contents: `
      function loadManifest(path, shouldCache, cache, skipParse, handleMissing) {
        return JSON.parse(readFileSync(path, "utf8"));
      }
      function evalManifest(path, shouldCache, cache, handleMissing) {
        return runInNewContext(readFileSync(path, "utf8"));
      }`,
  });

  return new Function(`${contents}; return { loadManifest, evalManifest };`)();
}

describe("inlineLoadManifest", () => {
  let manifests: Manifests;

  beforeAll(async () => {
    mockFs({
      [`${dotNextDir}/build-manifest.json`]: JSON.stringify({ pages: {} }),
      // Next 16.2+
      [`${dotNextDir}/server/prefetch-hints.json`]: JSON.stringify({ "/": ["/about"] }),
      // Next 16.4+
      [`${dotNextDir}/server/preview-props.json`]: JSON.stringify({ previewModeId: "id" }),
    });
    manifests = await getPatchedManifests();
  });

  afterAll(() => mockFs.restore());

  test("inlines the build manifests", () => {
    expect(manifests.loadManifest("/var/task/.next/build-manifest.json")).toEqual({ pages: {} });
    expect(manifests.loadManifest("/var/task/.next/server/prefetch-hints.json")).toEqual({
      "/": ["/about"],
    });
    expect(manifests.loadManifest("/var/task/.next/server/preview-props.json")).toEqual({
      previewModeId: "id",
    });
  });

  test("throws for an unexpected manifest", () => {
    expect(() => manifests.loadManifest("/var/task/.next/unknown.json")).toThrow(
      "Unexpected loadManifest(/var/task/.next/unknown.json) call!"
    );
  });

  test("returns an empty RSC manifest for a missing client reference manifest", () => {
    expect(manifests.evalManifest("/var/task/.next/server/app/page_client-reference-manifest.js")).toEqual({
      __RSC_MANIFEST: {},
    });
  });

  test("throws for an unexpected eval manifest", () => {
    expect(() => manifests.evalManifest("/var/task/.next/server/unknown.js")).toThrow(
      "Unexpected evalManifest(/var/task/.next/server/unknown.js) call!"
    );
  });
});

describe("inlineLoadManifest without optional manifests", () => {
  let manifests: Manifests;

  beforeAll(async () => {
    mockFs({ [dotNextDir]: {} });
    manifests = await getPatchedManifests();
  });

  afterAll(() => mockFs.restore());

  test.each([
    "react-loadable-manifest.json",
    "server/subresource-integrity-manifest.json",
    "server/server-reference-manifest.json",
    "dynamic-css-manifest.json",
    "fallback-build-manifest.json",
    "server/prefetch-hints.json",
  ])("returns an empty object for %s", (manifest) => {
    expect(manifests.loadManifest(`/var/task/.next/${manifest}`)).toEqual({});
  });
});
