/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
/**
 * Replaces webpack `__require` with actual `require`
 */
export function patchRequire(code: string): string {
  return code.replace(/__require\d?\(/g, "require(").replace(/__require\d?\./g, "require.");
}
