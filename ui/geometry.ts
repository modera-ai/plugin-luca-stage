import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const materials = new Map<string, T.MeshStandardMaterial>();
const sphere = new T.SphereGeometry(1, 24, 16);
export function material(color: string, roughness = 0.82) {
  const key = color + roughness;
  let value = materials.get(key);
  if (!value) {
    value = new T.MeshStandardMaterial({ color, roughness });
    materials.set(key, value);
  }
  return value;
}
export function mesh(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  color: string,
  p: number[],
  s = [1, 1, 1],
) {
  const m = new T.Mesh(geometry, material(color));
  m.position.set(p[0]!, p[1]!, p[2]!);
  m.scale.set(s[0]!, s[1]!, s[2]!);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function ball(
  parent: T.Object3D,
  color: string,
  p: number[],
  s: number[],
) {
  return mesh(parent, sphere, color, p, s);
}
export function box(
  parent: T.Object3D,
  color: string,
  p: number[],
  s: number[],
  radius = 0.06,
) {
  return mesh(
    parent,
    new RoundedBoxGeometry(s[0]!, s[1]!, s[2]!, 3, radius),
    color,
    p,
  );
}
export function cylinder(
  parent: T.Object3D,
  color: string,
  p: number[],
  r: number,
  h: number,
  top = r,
) {
  return mesh(parent, new T.CylinderGeometry(top, r, h, 24), color, p);
}
export function joint(parent: T.Object3D, name: string, p: number[]) {
  const g = new T.Group();
  g.name = name;
  g.position.set(p[0]!, p[1]!, p[2]!);
  parent.add(g);
  return g;
}
export function tube(
  parent: T.Object3D,
  color: string,
  points: number[][],
  radius: number,
) {
  const curve = new T.CatmullRomCurve3(
    points.map((p) => new T.Vector3(p[0], p[1], p[2])),
  );
  return mesh(
    parent,
    new T.TubeGeometry(curve, 32, radius, 10, false),
    color,
    [0, 0, 0],
  );
}
