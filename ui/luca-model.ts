import * as T from "three";
import { ball, box, joint, mesh, tube } from "./geometry";

/** Original articulated toy model. +Z is forward; feet are on Y=0. */
export function createLuca() {
  const root = new T.Group();
  root.name = "Luca";
  const fur = "#c99a69",
    cream = "#fff0d6",
    denim = "#5d8393",
    dark = "#352d29";
  const body = joint(root, "Body", [0, 0.72, 0]);
  ball(body, cream, [0, 0.08, 0], [0.34, 0.4, 0.26]);
  ball(body, denim, [0, -0.1, 0.01], [0.34, 0.29, 0.28]);
  box(body, denim, [0, 0.13, 0.258], [0.37, 0.33, 0.055], 0.04);
  box(body, "#7698a3", [0, 0.08, 0.294], [0.18, 0.12, 0.023], 0.015);
  for (const side of [-1, 1]) {
    box(
      body,
      denim,
      [side * 0.19, 0.27, 0.215],
      [0.065, 0.37, 0.065],
      0.023,
    ).rotation.z = side * 0.12;
    ball(body, "#ddb66f", [side * 0.155, 0.27, 0.3], [0.026, 0.026, 0.018]);
    const leg = joint(root, side < 0 ? "LegL" : "LegR", [
      side * 0.185,
      0.43,
      0,
    ]);
    ball(leg, denim, [0, -0.1, 0], [0.155, 0.23, 0.17]);
    ball(leg, fur, [0, -0.32, 0.06], [0.17, 0.115, 0.22]);
    const arm = joint(body, side < 0 ? "ArmL" : "ArmR", [side * 0.32, 0.22, 0]);
    ball(arm, cream, [side * 0.025, -0.075, 0], [0.135, 0.16, 0.14]);
    ball(arm, fur, [side * 0.04, -0.255, 0.02], [0.115, 0.19, 0.12]);
    ball(arm, cream, [side * 0.04, -0.36, 0.04], [0.12, 0.105, 0.12]);
  }
  const head = joint(body, "Head", [0, 0.63, 0.015]);
  ball(head, fur, [0, 0, 0], [0.52, 0.445, 0.405]);
  for (const side of [-1, 1]) {
    ball(head, fur, [side * 0.34, -0.14, 0.04], [0.245, 0.22, 0.28]);
    ball(head, cream, [side * 0.205, -0.19, 0.285], [0.275, 0.19, 0.14]);
    // Beveled, rounded triangular ears: compact silhouette, not realistic dog anatomy.
    const ear = joint(head, side < 0 ? "EarL" : "EarR", [
      side * 0.335,
      0.3,
      -0.035,
    ]);
    const triangle = new T.Shape();
    triangle.moveTo(-0.17, 0);
    triangle.quadraticCurveTo(-0.15, 0.16, -0.045, 0.36);
    triangle.quadraticCurveTo(0, 0.42, 0.045, 0.36);
    triangle.quadraticCurveTo(0.15, 0.16, 0.17, 0);
    triangle.closePath();
    mesh(
      ear,
      new T.ExtrudeGeometry(triangle, {
        depth: 0.09,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.045,
      }),
      fur,
      [0, 0, 0],
    );
    ball(ear, "#e4b797", [0, 0.145, 0.11], [0.09, 0.17, 0.028]);
    ear.rotation.z = -side * 0.22;
    const eye = joint(head, side < 0 ? "EyeL" : "EyeR", [
      side * 0.205,
      0.012,
      0.378,
    ]);
    ball(eye, dark, [0, 0, 0], [0.059, 0.075, 0.035]);
    ball(eye, "#fffaf0", [-0.014, 0.023, 0.032], [0.016, 0.021, 0.009]);
    ball(head, "#df9e85", [side * 0.35, -0.125, 0.34], [0.062, 0.028, 0.018]);
    const brow = ball(
      head,
      "#805c44",
      [side * 0.205, 0.145, 0.352],
      [0.067, 0.021, 0.02],
    );
    brow.rotation.z = -side * 0.12;
  }
  ball(head, cream, [0, -0.145, 0.399], [0.16, 0.115, 0.095]);
  ball(head, dark, [0, -0.105, 0.483], [0.068, 0.045, 0.036]);
  tube(
    head,
    "#674c3d",
    [
      [-0.095, -0.207, 0.456],
      [-0.05, -0.229, 0.473],
      [0, -0.21, 0.48],
      [0.05, -0.229, 0.473],
      [0.095, -0.207, 0.456],
    ],
    0.009,
  );
  for (let i = 0; i < 3; i++)
    ball(
      head,
      fur,
      [i * 0.08 - 0.08, 0.392 + (i === 1 ? 0.018 : 0), 0.02],
      [0.095, 0.09, 0.16],
    );
  const tail = joint(body, "Tail", [0, -0.08, -0.24]);
  // A voluminous curled tail made of overlapping tapered fur masses.
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(0, 0, 0),
    new T.Vector3(0.12, 0.03, -0.38),
    new T.Vector3(0.3, 0.34, -0.61),
    new T.Vector3(0.28, 0.63, -0.45),
    new T.Vector3(0.1, 0.57, -0.32),
  ]);
  for (let i = 0; i < 15; i++) {
    const p = curve.getPoint(i / 14),
      r = 0.12 + 0.085 * Math.sin((i / 14) * Math.PI);
    ball(tail, i > 10 ? cream : fur, p.toArray(), [r, r * 1.05, r]);
  }
  root.userData.author = "Modera · original Luca model";
  const track = (node: string, axis: string, values: number[], duration = 1) =>
    new T.QuaternionKeyframeTrack(
      `${node}.quaternion`,
      values.map((_, i) => (i * duration) / (values.length - 1)),
      values.flatMap((v) =>
        new T.Quaternion()
          .setFromEuler(
            new T.Euler(axis === "x" ? v : 0, 0, axis === "z" ? v : 0),
          )
          .toArray(),
      ),
    );
  const clips = [
    new T.AnimationClip("Walk", 1, [
      track("LegL", "x", [0, 0.5, 0, -0.5, 0]),
      track("LegR", "x", [0, -0.5, 0, 0.5, 0]),
      track("ArmL", "x", [0, -0.3, 0, 0.3, 0]),
      track("ArmR", "x", [0, 0.3, 0, -0.3, 0]),
    ]),
    new T.AnimationClip("Work", 1.2, [
      track("ArmL", "x", [-1.75, -1.9, -1.75], 1.2),
      track("ArmR", "x", [-1.9, -1.75, -1.9], 1.2),
      track("Head", "x", [0.13, 0.2, 0.13], 1.2),
    ]),
    new T.AnimationClip("Think", 3, [
      track("ArmR", "x", [-0.8, -1, -0.8], 3),
      track("Head", "z", [-0.09, 0.09, -0.09], 3),
    ]),
    new T.AnimationClip("Wave", 1.4, [
      track("ArmR", "z", [0.1, 0.9, 1.3, 0.9, 0.1], 1.4),
      track("Head", "x", [0, 0.12, 0], 1.4),
    ]),
    new T.AnimationClip("Read", 3, [
      track("ArmL", "x", [-0.85, -0.95, -0.85], 3),
      track("ArmR", "x", [-0.85, -0.8, -0.85], 3),
      track("Head", "x", [0.2, 0.3, 0.2], 3),
    ]),
    new T.AnimationClip("SitRead", 3, [
      track("LegL", "x", [-1.25, -1.25], 3),
      track("LegR", "x", [-1.25, -1.25], 3),
      track("ArmL", "x", [-1.05, -1.15, -1.05], 3),
      track("ArmR", "x", [-1.05, -1, -1.05], 3),
      track("Head", "x", [0.2, 0.3, 0.2], 3),
    ]),
  ];
  return { root, clips };
}
