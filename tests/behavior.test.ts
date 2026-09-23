import { describe, expect, it } from "vitest";
import { activityFor, clearSegment, route } from "../ui/behavior";
import { stations, obstacles } from "../ui/room";
describe("Luca activities and furniture routes", () => {
  it("maps actual tool categories while preserving all terminal and waiting states", () => {
    const base = { runId: "r", tools: [], theme: "light" as const };
    for (const phase of [
      "waiting",
      "completed",
      "cancelled",
      "failed",
      "responding",
      "thinking",
      "idle",
    ] as const)
      expect(activityFor({ ...base, phase })).toBe(phase);
    for (const [name, expected] of [
      ["web_search", "search"],
      ["file_read", "read"],
      ["file_edit", "edit"],
      ["terminal_exec", "terminal"],
      ["custom_tool", "tool"],
      ["ask_user_question", "waiting"],
    ])
      expect(
        activityFor({
          ...base,
          phase: "tools",
          tools: [{ id: "t", name: name!, title: "" }],
        }),
      ).toBe(expected);
  });
  it("routes every station pair without crossing expanded furniture footprints", () => {
    for (const from of Object.values(stations))
      for (const to of Object.values(stations)) {
        const path = route(from, to, obstacles);
        expect(path.length, `${from} -> ${to}`).toBeGreaterThan(0);
        let previous: readonly [number, number] = from;
        for (const point of path) {
          expect(clearSegment(previous, point, obstacles)).toBe(true);
          previous = point;
        }
        expect(path.at(-1)).toEqual(to);
      }
  });
  it("refuses blocked targets instead of clipping through furniture", () => {
    expect(route([0, 0], [1, 1], [[0.5, 0.5, 1.5, 1.5]])).toEqual([]);
  });
});
