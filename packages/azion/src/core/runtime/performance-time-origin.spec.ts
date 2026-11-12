import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { alignPerformanceTimeOrigin } from "./performance-time-origin.js";

describe("alignPerformanceTimeOrigin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T18:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("makes timeOrigin + now() follow Date.now() when the runtime value is not an epoch time", () => {
    // workerd style: `timeOrigin` is 0 and `now()` does not advance between requests
    const perf = { timeOrigin: 0, now: () => 1234 };

    expect(alignPerformanceTimeOrigin(perf)).toBe(true);
    expect(Math.abs(perf.timeOrigin + perf.now() - Date.now())).toBeLessThan(5);

    // An ISR page is stale after its revalidate time, whatever `now()` reports
    const lastModified = Date.now();
    vi.advanceTimersByTime(61_000);
    expect(perf.timeOrigin + perf.now() - lastModified).toBeGreaterThanOrEqual(61_000);
  });

  test("overrides a missing timeOrigin", () => {
    const perf: { timeOrigin?: number; now: () => number } = { now: () => 10 };

    expect(alignPerformanceTimeOrigin(perf)).toBe(true);
    expect(Math.abs((perf.timeOrigin ?? 0) + perf.now() - Date.now())).toBeLessThan(5);
  });

  test("does nothing when timeOrigin is already an epoch time", () => {
    const now = () => 500;
    const perf = { timeOrigin: Date.now() - 500, now };

    expect(alignPerformanceTimeOrigin(perf)).toBe(false);
    expect(Object.getOwnPropertyDescriptor(perf, "timeOrigin")?.value).toBe(perf.timeOrigin);
  });

  test("does nothing without a usable performance object", () => {
    expect(alignPerformanceTimeOrigin(null)).toBe(false);
    expect(alignPerformanceTimeOrigin({} as unknown as { now: () => number })).toBe(false);
  });

  test("keeps the runtime value when timeOrigin can not be overridden", () => {
    const perf = { now: () => 1 };
    Object.defineProperty(perf, "timeOrigin", { value: 0, configurable: false });

    expect(alignPerformanceTimeOrigin(perf)).toBe(false);
    expect(perf.timeOrigin).toBe(0);
  });
});
