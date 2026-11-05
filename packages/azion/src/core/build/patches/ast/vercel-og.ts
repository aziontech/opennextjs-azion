/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { applyRule, SgNode } from "@opennextjs/aws/build/patch/astCodePatcher.js";

export const vercelOgImportRule = `
rule:
  pattern: $NODE
  kind: string
  regex: "next/dist/compiled/@vercel/og/index\\\\.node\\\\.js"
inside:
  kind: arguments
  inside:
    kind: call_expression
    stopBy: end
    has:
      field: function
      regex: "import"

fix: |-
  "next/dist/compiled/@vercel/og/index.edge.js"
`;

/**
 * Patches Node.js imports for the library to be Edge imports.
 *
 * @param root Root node.
 * @returns Results of applying the rule.
 */
export function patchVercelOgImport(root: SgNode) {
  return applyRule(vercelOgImportRule, root);
}

export const vercelOgFallbackFontRule = `
rule:
  kind: variable_declaration
  all:
    - has:
        kind: variable_declarator
        has:
          kind: identifier
          regex: ^fallbackFont$
    - has:
        kind: call_expression
        pattern: fetch(new URL("$PATH", $$$REST))
        stopBy: end

fix: |-
  async function getFallbackFont() {
    // .bin is used so that a loader does not need to be configured for .ttf files
    const font = (await import("$PATH.bin")).default;
    // The Azion bundler externalizes .bin files as \`file://\` URLs
    return typeof font === "string" && font.startsWith("file://") ? (await fetch(font)).arrayBuffer() : font;
  }

  var fallbackFont = getFallbackFont();
`;

/**
 * Patches the default font fetching to use a .bin import.
 *
 * @param root Root node.
 * @returns Results of applying the rule.
 */
export function patchVercelOgFallbackFont(root: SgNode) {
  return applyRule(vercelOgFallbackFontRule, root);
}

export const vercelOgYogaRule = `
rule:
  pattern: var initializedResvg = initWasm(resvg_wasm);

fix: |-
  async function loadWasm(mod) {
    if (typeof mod === "string" && mod.startsWith("file://")) {
      const res = await fetch(mod); 
      return await res.arrayBuffer(); 
    }
    if (mod instanceof Response) {
      return await mod.arrayBuffer();
    }
    return mod; 
  }
  const resvg_wasm_bytes = await loadWasm(resvg_wasm);
  const initializedResvg = initWasm(resvg_wasm_bytes);
`;

export const vercelOgYogaSecondRule = `
rule:
  pattern: var initializedYoga = initYoga(yoga_wasm).then($CALLBACK);

fix: |-
  const yoga_wasm_bytes = await loadWasm(yoga_wasm);
  const initializedYoga = initYoga(yoga_wasm_bytes).then($CALLBACK);
`;

// Next 16.2+ initializes Yoga through satori
export const vercelOgSatoriYogaRule = `
rule:
  pattern: var initializeSatori = $INIT(yoga_wasm);

fix: |-
  const yoga_wasm_bytes = await loadWasm(yoga_wasm);
  var initializeSatori = $INIT(yoga_wasm_bytes);
`;

export function patchVercelOgYoga(root: SgNode): ReturnType<typeof applyRule> {
  const firstResult = applyRule(vercelOgYogaRule, root);
  const secondResult = applyRule(vercelOgYogaSecondRule, root);
  const thirdResult = applyRule(vercelOgSatoriYogaRule, root);
  return {
    edits: [...firstResult.edits, ...secondResult.edits, ...thirdResult.edits],
    matches: [...firstResult.matches, ...secondResult.matches, ...thirdResult.matches],
  };
}
