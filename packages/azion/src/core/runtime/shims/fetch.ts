/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
export default fetch;
export const Headers: typeof globalThis.Headers = globalThis.Headers;
export const Request: typeof globalThis.Request = globalThis.Request;
export const Response: typeof globalThis.Response = globalThis.Response;
