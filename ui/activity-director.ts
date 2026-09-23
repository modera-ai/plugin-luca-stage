import type { Activity } from "./behavior";

/** Keep one readable gesture, then go to the latest state. Never replay a stale queue. */
export function shouldSwitchActivity(
  current: Activity,
  next: Activity,
  age: number,
  reduced: boolean,
): boolean {
  if (current === next) return false;
  return (
    reduced ||
    current === "idle" ||
    ["waiting", "failed", "cancelled", "completed", "idle"].includes(next) ||
    age >= 0.65
  );
}
