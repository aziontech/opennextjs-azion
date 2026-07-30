import pluginJs from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist", "**/test-snapshots", "**/test-fixtures"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: "open-next",
    plugins: {
      unicorn: eslintPluginUnicorn,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "unicorn/prefer-node-protocol": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
];
