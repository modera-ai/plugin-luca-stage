// Reproducible original GLB asset; no downloaded or copyrighted game models.
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "../../artifacts/luca-cave/model-generator.mjs");
await mkdir(dirname(out), { recursive: true });
await build({
  entryPoints: [resolve(root, "ui/luca-model.ts")],
  outfile: out,
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["three", "three/*"],
});
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const { createLuca } = await import(
  new URL(`file:///${out.replaceAll("\\", "/")}`)
);
const { root: model, clips } = createLuca();
const data = await new GLTFExporter().parseAsync(model, {
  binary: true,
  animations: clips,
});
await mkdir(resolve(root, "ui/assets"), { recursive: true });
await writeFile(resolve(root, "ui/assets/luca.glb"), Buffer.from(data));
// The isolated frontend parses its bundled bytes without adding network privileges.
await writeFile(
  resolve(root, "ui/assets/luca.json"),
  JSON.stringify({ glb: Buffer.from(data).toString("base64") }),
);
console.log(`Luca: ${data.byteLength} bytes, ${clips.length} animation clips`);
