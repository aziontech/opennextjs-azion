/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import { describe, expect, it } from "vitest";

import {
  vercelOgFallbackFontRule,
  vercelOgImportRule,
  vercelOgSatoriYogaRule,
  vercelOgYogaSecondRule,
} from "./vercel-og.js";

describe("vercelOgImportRule", () => {
  it("should rewrite a node import to an edge import", () => {
    const code = `e.exports=import("next/dist/compiled/@vercel/og/index.node.js")`;
    expect(patchCode(code, vercelOgImportRule)).toMatchInlineSnapshot(
      `"e.exports=import("next/dist/compiled/@vercel/og/index.edge.js")"`
    );
  });
});

describe("vercelOgFallbackFontRule", () => {
  it("should replace a fetch call for a font with an import", () => {
    const code = `var fallbackFont = fetch(new URL("./noto-sans-v27-latin-regular.ttf", import.meta.url)).then((res) => res.arrayBuffer());`;
    expect(patchCode(code, vercelOgFallbackFontRule)).toMatchInlineSnapshot(`
      "async function getFallbackFont() {
        // .bin is used so that a loader does not need to be configured for .ttf files
        const font = (await import("./noto-sans-v27-latin-regular.ttf.bin")).default;
        // The Azion bundler externalizes .bin files as \`file://\` URLs
        return typeof font === "string" && font.startsWith("file://") ? (await fetch(font)).arrayBuffer() : font;
      }

      var fallbackFont = getFallbackFont();"
    `);
  });
});

describe("vercelOgYogaSecondRule", () => {
  it.each([
    `var initializedYoga = initYoga(yoga_wasm).then((yoga2) => Ll(yoga2));`,
    `var initializedYoga = initYoga(yoga_wasm).then((yoga2) => Wl(yoga2));`,
  ])("should load the yoga wasm before initializing yoga: %s", (code) => {
    expect(patchCode(code, vercelOgYogaSecondRule)).toMatch(
      /^const yoga_wasm_bytes = await loadWasm\(yoga_wasm\);\nconst initializedYoga = initYoga\(yoga_wasm_bytes\)\.then\(\(yoga2\) => (Ll|Wl)\(yoga2\)\);$/
    );
  });
});

describe("vercelOgSatoriYogaRule", () => {
  it("should load the yoga wasm before initializing satori", () => {
    const code = `var initializeSatori = Wc(yoga_wasm);`;
    expect(patchCode(code, vercelOgSatoriYogaRule)).toMatchInlineSnapshot(`
      "const yoga_wasm_bytes = await loadWasm(yoga_wasm);
      var initializeSatori = Wc(yoga_wasm_bytes);"
    `);
  });
});
