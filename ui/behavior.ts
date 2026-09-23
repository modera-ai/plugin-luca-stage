import type { ConversationStageState } from "@modera/plugin-sdk";

export type Activity =
  | "idle"
  | "thinking"
  | "search"
  | "read"
  | "edit"
  | "terminal"
  | "tool"
  | "responding"
  | "waiting"
  | "completed"
  | "cancelled"
  | "failed";
export function activityFor(state: ConversationStageState): Activity {
  if (state.phase !== "tools") return state.phase;
  const name = state.tools[0]?.name.toLowerCase() ?? "";
  if (/ask_user|question|approval|confirm/.test(name)) return "waiting";
  if (/search|web|browser|fetch/.test(name)) return "search";
  if (/terminal|shell|exec|command|test/.test(name)) return "terminal";
  if (/read|list|find|glob|inspect|memory/.test(name)) return "read";
  if (/write|edit|patch|create|delete|rename/.test(name)) return "edit";
  return "tool";
}

export type Point = readonly [number, number];
export type Obstacle = readonly [number, number, number, number];
export function clearSegment(
  a: Point,
  b: Point,
  obstacles: readonly Obstacle[],
) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.08));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n,
      z = a[1] + ((b[1] - a[1]) * i) / n;
    if (
      obstacles.some(
        ([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2,
      )
    )
      return false;
  }
  return true;
}
/** Visibility graph over expanded furniture corners; deterministic shortest collision-free route. */
export function route(
  from: Point,
  to: Point,
  obstacles: readonly Obstacle[],
): Point[] {
  const nodes: Point[] = [
    from,
    to,
    ...obstacles.flatMap(
      ([a, b, c, d]) =>
        [
          [a - 0.1, b - 0.1],
          [a - 0.1, d + 0.1],
          [c + 0.1, b - 0.1],
          [c + 0.1, d + 0.1],
        ] as Point[],
    ),
  ];
  const distances = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    visited = new Set<number>();
  distances[0] = 0;
  for (let count = 0; count < nodes.length; count++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (u < 0 || distances[i]! < distances[u]!)) u = i;
    if (u < 0 || !Number.isFinite(distances[u])) break;
    if (u === 1) {
      const path: Point[] = [];
      for (let n = 1; n !== 0; n = previous[n]!) path.unshift(nodes[n]!);
      return path;
    }
    visited.add(u);
    for (let v = 0; v < nodes.length; v++) {
      if (visited.has(v) || !clearSegment(nodes[u]!, nodes[v]!, obstacles))
        continue;
      const d =
        distances[u]! +
        Math.hypot(nodes[u]![0] - nodes[v]![0], nodes[u]![1] - nodes[v]![1]);
      if (d < distances[v]!) {
        distances[v] = d;
        previous[v] = u;
      }
    }
  }
  return []; // Never walk through furniture when no route exists.
}
