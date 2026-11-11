/**
 * Makes `performance.timeOrigin + performance.now()` an epoch time.
 *
 * The Azion runtime only implements a subset of `performance`: `timeOrigin` is `0` and `now()` is not an
 * epoch time. Next.js computes "now" as `performance.timeOrigin + performance.now()` to decide whether an ISR
 * page is stale, so with the runtime values pages were never considered stale and were never revalidated
 * (the response kept `x-nextjs-cache: HIT` while OpenNext, which uses `Date.now()`, already reported it as stale).
 *
 * Note: this is not specific to Next.js. It can move to the unenv preset (`@aziontech/unenv-preset`).
 */

// Anything within this drift is treated as an epoch time already
const MAX_DRIFT_MS = 60_000;

type PerformanceLike = { now: () => number; timeOrigin?: number };

/**
 * Overrides `performance.timeOrigin` so it follows `Date.now()` when the runtime value is not an epoch time.
 *
 * @returns `true` when `timeOrigin` was overridden.
 */
export function alignPerformanceTimeOrigin(
  perf: PerformanceLike | null | undefined = globalThis.performance
): boolean {
  if (!perf || typeof perf.now !== "function") {
    return false;
  }

  const drift = Date.now() - ((perf.timeOrigin || 0) + perf.now());
  // Also covers NaN
  if (Math.abs(drift) < MAX_DRIFT_MS) {
    return false;
  }

  try {
    Object.defineProperty(perf, "timeOrigin", {
      get: () => Date.now() - perf.now(),
      configurable: true,
    });
    return true;
  } catch {
    // Keep the runtime value when `timeOrigin` can not be overridden
    return false;
  }
}
