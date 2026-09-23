import * as T from "three";
import { ball, box, cylinder, joint, mesh, tube } from "./geometry";

export const stations = {
  center: [0, 1.25],
  desk: [-0.35, -1.2],
  workshop: [2.65, -0.75],
  reading: [-2.65, -0.35],
  tea: [-3, 1.7],
  bed: [1.65, 1.65],
} as const;
// Furniture footprints expanded by Luca's body radius. Paths run through the clear center aisle.
export const obstacles = [
  [-1.96, -3, 1.46, -1.34], // desk + 0.35 m clearance
  [1.72, -2.83, 4.28, -1.27], // workbench
  [-3.74, -2.45, -1.96, -0.85], // reading chair
  [-4.75, -2.6, -3.25, -1.4], // bookcase
  [-4.7, 0.12, -3.3, 2.38], // tea table
  [1.84, -0.34, 4.32, 2.44], // rotated bed
] as const;

function table(
  parent: T.Object3D,
  p: number[],
  width: number,
  depth: number,
  color = "#b58153",
) {
  const g = joint(parent, "", p);
  box(g, color, [0, 1, 0], [width, 0.15, depth]);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      box(
        g,
        "#755440",
        [x * (width / 2 - 0.12), 0.47, z * (depth / 2 - 0.12)],
        [0.11, 0.95, 0.11],
      );
  return g;
}
function book(parent: T.Object3D, p: number[], color: string, h = 0.36) {
  box(parent, color, p, [0.13, h, 0.25], 0.01);
  box(
    parent,
    "#e9dcc2",
    [p[0]!, p[1]! + h * 0.17, p[2]! + 0.129],
    [0.085, 0.02, 0.007],
    0.003,
  );
}
function plant(parent: T.Object3D, p: number[], size = 1) {
  const g = joint(parent, "", p);
  g.scale.setScalar(size);
  cylinder(g, "#bb7e5e", [0, 0.16, 0], 0.21, 0.32, 0.26);
  cylinder(g, "#624f3c", [0, 0.32, 0], 0.22, 0.015);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      x = Math.cos(a) * 0.22,
      z = Math.sin(a) * 0.22;
    tube(
      g,
      "#738151",
      [
        [0, 0.3, 0],
        [x * 0.5, 0.6, z * 0.5],
        [x, 0.7 + i * 0.025, z],
      ],
      0.017,
    );
    const leaf = ball(
      g,
      i % 2 ? "#91a16a" : "#687f52",
      [x, 0.7 + i * 0.025, z],
      [0.12, 0.22, 0.07],
    );
    leaf.rotation.z = -x * 2;
  }
}
function mug(parent: T.Object3D, p: number[]) {
  const g = joint(parent, "", p);
  cylinder(g, "#f3dfba", [0, 0.12, 0], 0.105, 0.22);
  cylinder(g, "#6c4933", [0, 0.235, 0], 0.087, 0.008);
  mesh(g, new T.TorusGeometry(0.072, 0.025, 8, 16), "#f3dfba", [0.13, 0.13, 0]);
  return g;
}
export function createRoom(scene: T.Scene) {
  const world = joint(scene, "Cave", [0, -0.11, 0]);
  const base = cylinder(world, "#867c5f", [0, -0.27, 0], 5.1, 0.55);
  base.scale.z = 0.79;
  const grass = cylinder(world, "#8d9e70", [0, 0.01, 0], 5.15, 0.12);
  grass.scale.z = 0.79;
  const foundation = cylinder(world, "#78593e", [0, 0.1, 0], 4.65, 0.2);
  foundation.scale.z = 0.79;
  for (let i = -13; i <= 13; i++) {
    const z = i * 0.255,
      width = 2 * Math.sqrt(Math.max(0, 4.56 ** 2 - (z / 0.79) ** 2));
    box(
      world,
      ["#c69e70", "#cba77b", "#d4b287", "#c8a376"][(i + 16) % 4]!,
      [0, 0.22, z],
      [width, 0.065, 0.244],
      0.012,
    );
    for (let x = -3; x < 4; x += 2)
      if (Math.abs(x) < width / 2 - 0.1)
        box(
          world,
          "#a98259",
          [x + (i % 2) * 0.5, 0.255, z],
          [0.012, 0.004, 0.22],
          0.001,
        );
  }
  // Curved rock silhouette and smooth cutaway interior.
  const wall = new T.Shape();
  wall.moveTo(-4.5, 0.2);
  wall.lineTo(-4.5, 1.6);
  wall.bezierCurveTo(-4.5, 3.5, -2.5, 4.15, 0, 4.05);
  wall.bezierCurveTo(2.8, 4.15, 4.5, 3.4, 4.5, 1.6);
  wall.lineTo(4.5, 0.2);
  wall.closePath();
  mesh(
    world,
    new T.ExtrudeGeometry(wall, {
      depth: 0.28,
      bevelEnabled: true,
      bevelSize: 0.18,
      bevelThickness: 0.08,
      bevelSegments: 3,
      steps: 1,
    }),
    "#b4a187",
    [0, 0, -3.2],
  );
  const inner = mesh(
    world,
    new T.ShapeGeometry(wall),
    "#e0cfaa",
    [0, 0, -2.76],
  );
  inner.scale.set(0.965, 0.945, 1);
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      ball(
        world,
        i % 2 ? "#b3a188" : "#a4967d",
        [side * (4.25 + i * 0.045), 0.62 + (3 - i) * 0.19, -2.35 + i * 0.85],
        [0.42, 0.75 + (3 - i) * 0.14, 0.62],
      );
    }
  // Round window with wooden crossbar and painted blue sky.
  const window = joint(world, "Window", [-2.75, 2.55, -2.65]);
  mesh(
    window,
    new T.CylinderGeometry(0.63, 0.63, 0.045, 48),
    "#819e9d",
    [0, 0, 0],
  ).rotation.x = Math.PI / 2;
  mesh(
    window,
    new T.TorusGeometry(0.64, 0.075, 12, 48),
    "#946b49",
    [0, 0, 0.055],
  );
  box(window, "#a27b56", [0, 0, 0.085], [0.065, 1.2, 0.065]);
  box(window, "#a27b56", [0, 0, 0.09], [1.2, 0.065, 0.065]);
  ball(window, "#e2dfb6", [0.27, 0.29, 0.029], [0.105, 0.105, 0.01]);
  // Back desk and computer.
  const desk = table(world, [-0.25, 0.25, -2.17], 2.65, 0.86);
  box(desk, "#4d6664", [0, 1.47, -0.16], [0.86, 0.57, 0.085]);
  const screen = box(
    desk,
    "#bfd7bd",
    [0, 1.47, -0.11],
    [0.75, 0.45, 0.014],
    0.025,
  );
  screen.material = new T.MeshStandardMaterial({
    color: "#bfd7bd",
    emissive: "#86bdb0",
    emissiveIntensity: 0.25,
    roughness: 0.6,
  });
  box(desk, "#4d6664", [0, 1.14, -0.15], [0.07, 0.19, 0.08]);
  box(desk, "#657b71", [0, 1.09, 0.04], [0.72, 0.04, 0.24], 0.02);
  for (let i = 0; i < 4; i++)
    box(
      desk,
      "#5b8b7e",
      [-0.13, 1.59 - i * 0.085, -0.093],
      [0.39 - (i % 2) * 0.12, 0.015, 0.004],
      0.002,
    );
  book(desk, [0.91, 1.27, -0.12], "#b97756");
  book(desk, [1.07, 1.31, -0.12], "#7d9271", 0.44);
  mug(desk, [-0.8, 1.09, 0.15]);
  cylinder(desk, "#8e7150", [-0.95, 1.17, -0.22], 0.16, 0.12);
  tube(
    desk,
    "#7b6851",
    [
      [-0.95, 1.2, -0.22],
      [-0.95, 1.86, -0.22],
      [-0.73, 1.94, -0.15],
    ],
    0.025,
  );
  mesh(
    desk,
    new T.ConeGeometry(0.22, 0.21, 24, 1, true),
    "#d4b269",
    [-0.73, 1.87, -0.15],
  );
  const lamp = new T.PointLight("#ffe0a0", 4, 4);
  lamp.position.set(-1, 2.15, -2.2);
  world.add(lamp);
  // Reading chair with quilted seat and low bookcase.
  const chair = joint(world, "ReadingChair", [-2.85, 0.25, -1.65]);
  box(chair, "#8f6849", [0, 0.36, 0], [0.95, 0.32, 0.88]);
  box(chair, "#9ba480", [0, 0.56, 0.08], [0.79, 0.19, 0.72], 0.09);
  box(chair, "#a8af89", [0, 1.02, -0.32], [0.86, 0.83, 0.2], 0.09);
  for (const side of [-1, 1])
    box(chair, "#a8af89", [side * 0.45, 0.75, 0], [0.18, 0.33, 0.89], 0.07);
  box(
    chair,
    "#e5c49a",
    [0.1, 1.02, -0.17],
    [0.42, 0.36, 0.13],
    0.09,
  ).rotation.z = -0.14;
  const shelf = joint(world, "Bookcase", [-4, 0.25, -2]);
  for (const x of [-0.36, 0.36])
    box(shelf, "#9b7250", [x, 0.85, 0], [0.09, 1.7, 0.48]);
  for (let i = 0; i < 4; i++) {
    box(shelf, "#9b7250", [0, 0.16 + i * 0.48, 0], [0.8, 0.07, 0.48]);
    for (let j = 0; j < 4; j++)
      book(
        shelf,
        [-0.25 + j * 0.155, 0.37 + i * 0.48, 0],
        ["#698b86", "#be805c", "#d1b276", "#8c9071"][j]!,
        0.3 + (j % 2) * 0.08,
      );
  }
  // Workbench, pegboard, brass machine and drawers.
  const bench = table(world, [3, 0.25, -2.05], 1.85, 0.85, "#a47b51");
  box(world, "#b28e64", [3, 2.2, -2.66], [1.8, 1, 0.1]);
  for (let x = 0; x < 7; x++)
    for (let y = 0; y < 3; y++)
      ball(
        world,
        "#8c6f4d",
        [2.28 + x * 0.24, 1.86 + y * 0.28, -2.6],
        [0.018, 0.018, 0.01],
      );
  for (let i = 0; i < 3; i++) {
    box(
      world,
      "#7e6650",
      [2.42 + i * 0.46, 2.25, -2.54],
      [0.05, 0.35, 0.07],
      0.02,
    );
    box(
      world,
      i % 2 ? "#bcc0a9" : "#b8ad91",
      [2.42 + i * 0.46, 2.43, -2.54],
      [0.21, 0.085, 0.1],
      0.03,
    );
  }
  box(bench, "#6e8e83", [0.37, 1.36, -0.05], [0.7, 0.52, 0.48]);
  const dial = cylinder(bench, "#e9d9ae", [0.38, 1.43, 0.208], 0.135, 0.02);
  dial.rotation.x = Math.PI / 2;
  box(
    bench,
    "#6d654d",
    [0.38, 1.45, 0.225],
    [0.014, 0.12, 0.014],
    0.001,
  ).rotation.z = -0.6;
  const indicator = ball(
    bench,
    "#d5b167",
    [0.59, 1.25, 0.212],
    [0.035, 0.035, 0.02],
  );
  box(bench, "#ead6ad", [-0.48, 1.1, 0.1], [0.51, 0.025, 0.42], 0.01);
  box(bench, "#b98859", [-0.03, 0.55, 0], [1.5, 0.68, 0.6]);
  for (let i = 0; i < 2; i++) {
    box(bench, "#c99969", [-0.03, 0.37 + i * 0.31, 0.32], [1.4, 0.26, 0.06]);
    ball(bench, "#766149", [-0.03, 0.37 + i * 0.31, 0.37], [0.05, 0.03, 0.027]);
  }
  // Bed tucked into the right-hand alcove, above the workshop area in the scene.
  const bed = joint(world, "Bed", [3.08, 0.25, 1.05]);
  bed.rotation.y = -0.12;
  box(bed, "#8e684d", [0, 0.27, 0], [1.48, 0.43, 1.75]);
  box(bed, "#e8d3ab", [0, 0.54, 0], [1.38, 0.23, 1.65], 0.13);
  box(bed, "#8ea4a0", [0, 0.69, 0.27], [1.4, 0.15, 1.1], 0.09);
  for (let i = -2; i <= 2; i++)
    box(bed, "#b3c3b6", [i * 0.25, 0.772, 0.3], [0.023, 0.008, 0.96], 0.003);
  box(bed, "#f2e4c6", [0, 0.73, -0.57], [0.95, 0.18, 0.37], 0.085);
  box(bed, "#9d7753", [0, 0.75, -0.91], [1.55, 1.13, 0.14]);
  // Tea corner and everyday details.
  const tea = table(world, [-4, 0.25, 1.25], 0.7, 1.55);
  cylinder(tea, "#718f88", [0, 1.29, -0.25], 0.23, 0.38, 0.19);
  ball(tea, "#718f88", [0, 1.48, -0.25], [0.2, 0.075, 0.2]);
  tube(
    tea,
    "#718f88",
    [
      [0.12, 1.27, -0.25],
      [0.34, 1.3, -0.25],
      [0.39, 1.43, -0.25],
    ],
    0.05,
  );
  mesh(
    tea,
    new T.TorusGeometry(0.19, 0.035, 8, 20),
    "#6b6351",
    [0, 1.55, -0.25],
  );
  mug(tea, [0.03, 1.09, 0.38]);
  plant(world, [4, 0.3, 2.4], 0.85);
  plant(world, [-3.6, 0.3, 2.7], 0.65);
  const rug = cylinder(world, "#ba805c", [0, 0.274, 0.65], 1.67, 0.022, 1.67);
  rug.scale.z = 0.73;
  for (const r of [1.4, 1.49, 1.56]) {
    const ring = mesh(
      world,
      new T.TorusGeometry(r, 0.018, 6, 64),
      "#e8c495",
      [0, 0.293, 0.65],
    );
    ring.rotation.x = Math.PI / 2;
    ring.scale.y = 0.73;
  }
  // Small hanging picture, bunting and mushrooms on the exposed earth.
  box(world, "#936e4c", [1.16, 2.75, -2.63], [0.65, 0.79, 0.09]);
  box(world, "#ece0bb", [1.16, 2.75, -2.57], [0.52, 0.65, 0.018]);
  ball(world, "#bca16b", [1.16, 2.77, -2.553], [0.13, 0.16, 0.009]);
  tube(
    world,
    "#887c5b",
    [
      [-1.6, 3.48, -2.6],
      [0, 3.21, -2.55],
      [2.4, 3.4, -2.6],
    ],
    0.013,
  );
  for (let i = 0; i < 9; i++)
    ball(
      world,
      "#f7d88d",
      [-1.55 + i * 0.49, 3.21 + 0.035 * Math.abs(i - 4), -2.54],
      [0.048, 0.062, 0.04],
    );
  for (const [x, z] of [
    [-4.65, 1],
    [-3.55, 2.9],
    [3.8, 2.85],
    [4.65, -0.8],
  ]) {
    for (let i = 0; i < 3; i++) {
      cylinder(world, "#e0ceaa", [x! + i * 0.12, 0.3, z!], 0.035, 0.25);
      ball(
        world,
        i % 2 ? "#b98865" : "#c39a70",
        [x! + i * 0.12, 0.45, z!],
        [0.12, 0.07, 0.12],
      );
    }
  }
  return { world, screen, indicator, lamp };
}
