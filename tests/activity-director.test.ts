import { expect, it } from "vitest";
import { shouldSwitchActivity } from "../ui/activity-director";
it("starts promptly, retains a readable gesture, then adopts the latest work instead of queuing stale steps", () => {
  expect(shouldSwitchActivity("idle", "search", 0, false)).toBe(true);
  for (const next of ["thinking", "edit", "tool"] as const)
    expect(shouldSwitchActivity("search", next, 0.1, false)).toBe(false);
  expect(shouldSwitchActivity("search", "terminal", 0.66, false)).toBe(true);
  expect(shouldSwitchActivity("search", "search", 10, false)).toBe(false);
});
it("cancellation, attention and reduced motion bypass the gesture hold", () => {
  for (const next of [
    "cancelled",
    "failed",
    "waiting",
    "completed",
    "idle",
  ] as const)
    expect(shouldSwitchActivity("search", next, 0, false)).toBe(true);
  expect(shouldSwitchActivity("search", "thinking", 0, true)).toBe(true);
});
