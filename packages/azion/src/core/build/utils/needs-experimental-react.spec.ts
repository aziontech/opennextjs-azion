import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { needsExperimentalReact } from "./needs-experimental-react.js";

describe("needsExperimentalReact", () => {
  let appPath: string;

  beforeAll(() => {
    appPath = mkdtempSync(path.join(tmpdir(), "needs-experimental-react-"));
    writeFileSync(path.join(appPath, "package.json"), "{}");
    const libDir = path.join(appPath, "node_modules/next/dist/lib");
    mkdirSync(libDir, { recursive: true });
    writeFileSync(path.join(appPath, "node_modules/next/package.json"), JSON.stringify({ name: "next" }));
    // Next 16.4 helper
    writeFileSync(
      path.join(libDir, "needs-experimental-react.js"),
      `exports.needsExperimentalReact = (config) => {
        const { blockingSSR, taint, transitionIndicator, gestureTransition } = config.experimental || {};
        return Boolean(blockingSSR || taint || transitionIndicator || gestureTransition);
      };`
    );
  });

  afterAll(() => rmSync(appPath, { recursive: true, force: true }));

  test("uses the helper of the app's Next version", () => {
    expect(needsExperimentalReact({ experimental: { viewTransition: true } }, appPath)).toBe(false);
    expect(needsExperimentalReact({ experimental: { transitionIndicator: true } } as never, appPath)).toBe(
      true
    );
  });

  test("falls back to the copy when the helper can not be loaded", () => {
    const appWithoutNext = mkdtempSync(path.join(tmpdir(), "needs-experimental-react-"));

    try {
      expect(needsExperimentalReact({ experimental: { viewTransition: true } }, appWithoutNext)).toBe(true);
      expect(needsExperimentalReact({ experimental: {} })).toBe(false);
    } finally {
      rmSync(appWithoutNext, { recursive: true, force: true });
    }
  });
});
