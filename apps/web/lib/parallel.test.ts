import { describe, expect, it } from "vitest";
import { runInParallel } from "./parallel";

describe("runInParallel", () => {
  it("processes several items concurrently without exceeding the limit", async () => {
    let active = 0;
    let peak = 0;
    const completed: number[] = [];

    await runInParallel([1, 2, 3, 4, 5], 3, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      completed.push(item);
      active -= 1;
    });

    expect(peak).toBe(3);
    expect([...completed].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not start more work after processing is stopped", async () => {
    let keepGoing = true;
    const started: number[] = [];

    await runInParallel([1, 2, 3, 4], 2, async (item) => {
      started.push(item);
      keepGoing = false;
    }, () => keepGoing);

    expect(started).toEqual([1]);
  });
});
