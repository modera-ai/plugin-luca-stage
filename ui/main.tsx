import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type {
  ConversationStageState,
  PluginFrontendApi,
} from "@modera/plugin-sdk";
import asset from "./assets/luca.json";
import { createRoom, obstacles, stations } from "./room";
import { activityFor, route, type Activity, type Point } from "./behavior";
import { box, joint, cylinder, mesh } from "./geometry";
import { mountInterface } from "./presentation";
import { shouldSwitchActivity } from "./activity-director";

const $ = (id: string) => document.getElementById(id)!;
const api = (window as unknown as { moderaPlugin?: PluginFrontendApi })
  .moderaPlugin;
let zh = true,
  state: ConversationStageState = {
    phase: "idle",
    runId: null,
    tools: [],
    theme: "light",
  };
let desired: Activity = "idle",
  activity: Activity = "idle",
  activityAt = 0;
let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  low = false,
  disposed = false,
  visible = true;
let renderer: T.WebGLRenderer | undefined,
  controls: OrbitControls | undefined,
  frame = 0;
const scene = new T.Scene();
const camera = new T.OrthographicCamera(-6.5, 6.5, 5, -5, 0.1, 100);
const labels: Record<Activity, [string, string, string]> = {
  idle: [
    "卢卡正在享受小屋时光",
    "Luca is enjoying a quiet moment",
    "我在这里，慢慢来。",
  ],
  thinking: ["正在认真思考", "Thinking things through", "嗯…让我想一想。"],
  search: ["正在电脑上查找资料", "Looking things up", "去找些可靠的线索。"],
  read: ["正在阅读资料", "Reading the details", "这一页，要仔细看看。"],
  edit: ["正在整理和制作文件", "Working on your files", "一点一点做好它。"],
  terminal: [
    "正在运行命令或测试",
    "Running commands or tests",
    "看看它运行得怎么样。",
  ],
  tool: ["正在使用工具", "Working with a tool", "工具准备好了。"],
  responding: ["正在组织回答", "Preparing a response", "把想法好好整理给你。"],
  waiting: ["正在等你确认或继续", "Waiting for you", "准备好后，叫我就好。"],
  completed: ["这次工作完成了", "All done", "做好啦！"],
  cancelled: [
    "已停止，休息一下",
    "Stopped. Taking a break",
    "好，我们先停在这里。",
  ],
  failed: [
    "遇到问题，需要看一下",
    "Something needs attention",
    "出了点问题，一起看看吧。",
  ],
};
function paint() {
  const [cn, en, bubble] = labels[desired];
  $("status").textContent = zh ? cn : en;
  $("bubble").textContent = zh ? bubble : en;
  $("detail").textContent = state.tools.length
    ? `${state.tools[0]!.title}${state.tools.length > 1 ? ` · +${state.tools.length - 1}` : ""}`
    : zh
      ? "让工作有一点生活的温度"
      : "A little warmth in your working day";
  $("mode").textContent = zh
    ? state.phase === "idle"
      ? "生活中"
      : state.phase === "waiting"
        ? "等你回来"
        : "陪你工作"
    : state.phase === "idle"
      ? "AT HOME"
      : "BY YOUR SIDE";
  $("title").textContent = zh ? "卢卡的小屋" : "Luca’s home";
  $("subtitle").textContent = zh
    ? "山丘里的小小工作日"
    : "A LITTLE DAY IN THE HILLS";
  $("reset").textContent = zh ? "复位视角" : "Reset view";
  $("motion").textContent = zh ? "减少动画" : "Less motion";
  $("quality").textContent = zh ? "省电画质" : "Eco quality";
  $("hint").textContent = zh
    ? "拖动看看小屋 · 滚轮缩放"
    : "Drag to look around · Scroll to zoom";
  $("motion").setAttribute("aria-pressed", String(reduced));
  $("quality").setAttribute("aria-pressed", String(low));
  document.documentElement.classList.toggle("dark", state.theme === "dark");
}
function apply(next: ConversationStageState, locale = "zh-CN") {
  state = next;
  zh = locale.startsWith("zh");
  const nextActivity = activityFor(next);
  if (nextActivity !== desired) {
    desired = nextActivity;
  }
  paint();
}
let refreshing = false,
  dirty = false;
async function refresh() {
  if (!api) return;
  if (refreshing) {
    dirty = true;
    return;
  }
  refreshing = true;
  try {
    const snapshot = await api.snapshot();
    if (!disposed) {
      visible = snapshot.visible !== false;
      apply(snapshot.stage ?? state, snapshot.locale);
    }
  } catch (error) {
    if (!disposed) $("detail").textContent = String(error);
  } finally {
    refreshing = false;
    if (dirty && !disposed) {
      dirty = false;
      void refresh();
    }
  }
}
const off = api?.onChanged(() => void refresh());
void refresh();
mountInterface((presentation) => {
  visible = presentation.visible;
  $("scene").dataset.visible = String(visible);
  apply(presentation.state, presentation.locale);
});

function fail(error: unknown) {
  $("error").hidden = false;
  $("error-message").textContent =
    `${zh ? "3D 场景不可用，仍可在下方阅读对话，或切回标准对话。" : "The 3D scene is unavailable. Your conversation is still available below."} ${String(error)}`;
}
$("retry").onclick = () => location.reload();

async function start() {
  renderer = new T.WebGLRenderer({
    canvas: $("scene") as HTMLCanvasElement,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  const hemi = new T.HemisphereLight("#fff5dd", "#a3a98d", 2.6);
  scene.add(hemi);
  const sunlight = new T.DirectionalLight("#fff0d5", 3.2);
  sunlight.position.set(-3, 8, 6);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -7;
  sunlight.shadow.camera.right = 7;
  sunlight.shadow.camera.top = 7;
  sunlight.shadow.camera.bottom = -7;
  sunlight.shadow.normalBias = 0.035;
  sunlight.shadow.bias = -0.0002;
  scene.add(sunlight);
  const fill = new T.DirectionalLight("#c1d1cf", 1.1);
  fill.position.set(5, 4, -1);
  scene.add(fill);
  const room = createRoom(scene);
  const bytes = Uint8Array.from(atob(asset.glb), (c) => c.charCodeAt(0));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
  if (disposed) return;
  const luca = gltf.scene;
  luca.scale.setScalar(1);
  luca.position.set(0, 0.17, 1.25);
  scene.add(luca);
  luca.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const mixer = new T.AnimationMixer(luca);
  const actions = Object.fromEntries(
    gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
  );
  let previousAction: T.AnimationAction | undefined;
  function animate(name: string) {
    const action = actions[name];
    if (action === previousAction) return;
    previousAction?.fadeOut(0.25);
    action?.reset().fadeIn(0.25).play();
    previousAction = action;
  }
  const tail = luca.getObjectByName("Tail")!,
    head = luca.getObjectByName("Head")!;
  const eyes = [luca.getObjectByName("EyeL")!, luca.getObjectByName("EyeR")!];
  const ears = [luca.getObjectByName("EarL")!, luca.getObjectByName("EarR")!];
  const armR = luca.getObjectByName("ArmR")!;
  const modelRoot = luca.getObjectByName("Luca")!;
  const pose = new T.Vector3();
  const book = joint(luca, "HeldBook", [0, 0.85, 0.42]);
  box(book, "#8a9d85", [0, 0, 0], [0.48, 0.06, 0.32], 0.025);
  box(book, "#eaddbb", [0, 0.035, 0], [0.43, 0.015, 0.28], 0.007);
  book.rotation.x = 0.35;
  book.visible = false;
  const cup = joint(armR, "HeldCup", [0.04, -0.35, 0.1]);
  cup.visible = false;
  cylinder(cup, "#f0dfbd", [0, 0, 0], 0.09, 0.17);
  mesh(cup, new T.TorusGeometry(0.055, 0.018, 8, 16), "#f0dfbd", [0.1, 0, 0]);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minAzimuthAngle = -0.4;
  controls.maxAzimuthAngle = 0.55;
  controls.minPolarAngle = 0.72;
  controls.maxPolarAngle = 1.2;
  controls.minZoom = 0.8;
  controls.maxZoom = 1.7;
  function reset() {
    camera.position.set(7, 7.2, 12);
    camera.zoom = 1;
    controls!.target.set(0, 1.35, 0);
    camera.updateProjectionMatrix();
    controls!.update();
  }
  reset();
  function resize() {
    if (!renderer) return;
    const w = innerWidth,
      h = innerHeight,
      aspect = w / h;
    const vertical = Math.max(8.8, 12.8 / aspect);
    camera.left = (-vertical * aspect) / 2;
    camera.right = (vertical * aspect) / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(document.body);
  $("reset").onclick = reset;
  $("motion").onclick = () => {
    reduced = !reduced;
    paint();
  };
  $("quality").onclick = () => {
    low = !low;
    renderer!.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.5));
    renderer!.shadowMap.enabled = !low;
    resize();
    paint();
  };
  let path: Point[] = [],
    destination: Point = stations.center,
    facing = 0.2,
    previousTime = performance.now(),
    elapsed = 0,
    idleIndex = -1,
    renderedFrames = 0,
    celebrationAt = -1;
  let transfer:
    { point: Point; yaw: number; at: number; landed: boolean } | undefined;
  const landing = new T.Mesh(
    new T.RingGeometry(0.3, 0.36, 32),
    new T.MeshBasicMaterial({
      color: "#fff4cd",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  landing.rotation.x = -Math.PI / 2;
  scene.add(landing);
  function land(point: Point, yaw: number) {
    luca.position.set(point[0], 0.17, point[1]);
    luca.rotation.y = yaw;
    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.x = 0;
    facing = yaw;
  }
  function go(point: Point, yaw: number) {
    destination = point;
    facing = yaw;
    path = route([luca.position.x, luca.position.z], point, obstacles);
  }
  function begin(next: Activity) {
    landing.material.opacity = 0;
    activity = next;
    activityAt = elapsed;
    idleIndex = -1;
    celebrationAt = -1;
    const point =
      next === "search" || next === "responding"
        ? stations.desk
        : ["terminal", "edit", "tool"].includes(next)
          ? stations.workshop
          : next === "read"
            ? stations.reading
            : stations.center;
    const yaw =
      point === stations.desk || point === stations.workshop ? Math.PI : 0.2;
    if (next === "idle") {
      transfer = undefined;
      luca.scale.setScalar(1);
      go(point, yaw);
      return;
    }
    path = [];
    destination = point;
    if (
      reduced ||
      Math.hypot(luca.position.x - point[0], luca.position.z - point[1]) < 0.15
    ) {
      transfer = undefined;
      luca.scale.setScalar(1);
      land(point, yaw);
    } else transfer = { point, yaw, at: elapsed, landed: false };
  }
  function tick(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || !visible) {
      previousTime = now;
      return;
    }
    const dt = Math.min((now - previousTime) / 1000, 0.06);
    if (dt < (low || reduced ? 1 / 30 : 1 / 60) - 0.001) return;
    previousTime = now;
    elapsed += dt;
    if (shouldSwitchActivity(activity, desired, elapsed - activityAt, reduced))
      begin(desired);
    if (transfer) {
      const t = elapsed - transfer.at;
      if (!transfer.landed && (t >= 0.08 || reduced)) {
        land(transfer.point, transfer.yaw);
        transfer.landed = true;
        landing.position.set(transfer.point[0], 0.19, transfer.point[1]);
      }
      const arrival = Math.max(0, (t - 0.08) / 0.18);
      luca.scale.setScalar(
        reduced ? 1 : t < 0.08 ? 1 - t * 5 : 0.6 + Math.min(1, arrival) * 0.4,
      );
      landing.scale.setScalar(1 + arrival * 1.3);
      landing.material.opacity =
        reduced || !transfer.landed ? 0 : Math.max(0, 0.5 * (1 - arrival));
      if (t >= 0.26 || reduced) {
        transfer = undefined;
        luca.scale.setScalar(1);
        landing.material.opacity = 0;
      }
    }
    let effective = activity;
    if (activity === "completed" && !path.length && celebrationAt < 0)
      celebrationAt = elapsed;
    if (
      (activity === "completed" &&
        celebrationAt >= 0 &&
        elapsed - celebrationAt > 2.4) ||
      (activity === "cancelled" && elapsed - activityAt > 3.5)
    )
      effective = "idle";
    if (effective === "idle" && !reduced) {
      const index = Math.min(3, Math.floor((elapsed - activityAt) / 18));
      if (index !== idleIndex) {
        idleIndex = index;
        const p = [
          stations.center,
          stations.reading,
          stations.tea,
          stations.bed,
        ][index]!;
        go(p, index === 2 ? -Math.PI / 2 : index === 3 ? 0 : 0.2);
      }
    }
    const walking = path.length > 0;
    const seated =
      !walking &&
      !reduced &&
      (effective === "read" || (effective === "idle" && idleIndex === 1));
    const sleeping =
      !walking && !reduced && effective === "idle" && idleIndex === 3;
    if (seated)
      pose.set(-2.85 - luca.position.x, 0.26, -1.42 - luca.position.z);
    else if (sleeping)
      pose.set(3.08 - luca.position.x, 0.76, 1.87 - luca.position.z);
    else pose.set(0, 0, 0);
    pose.applyAxisAngle(new T.Vector3(0, 1, 0), -luca.rotation.y);
    modelRoot.position.lerp(pose, Math.min(1, dt * 4));
    modelRoot.rotation.x = T.MathUtils.damp(
      modelRoot.rotation.x,
      sleeping ? -Math.PI / 2 : 0,
      5,
      dt,
    );
    const gettingUp =
      walking &&
      (modelRoot.position.length() > 0.04 ||
        Math.abs(modelRoot.rotation.x) > 0.04);
    if (walking) {
      const [x, z] = path[0]!,
        dx = x - luca.position.x,
        dz = z - luca.position.z,
        distance = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz),
        turn = Math.atan2(
          Math.sin(yaw - luca.rotation.y),
          Math.cos(yaw - luca.rotation.y),
        );
      luca.rotation.y += turn * Math.min(1, dt * 7);
      const speed = reduced ? 1.6 : activity === "thinking" ? 0.65 : 1.25;
      const step = gettingUp
        ? 0
        : Math.min(
            distance,
            dt * speed * Math.max(0.1, 1 - Math.abs(turn) / Math.PI),
          );
      if (distance > 0.001) {
        luca.position.x += (dx / distance) * step;
        luca.position.z += (dz / distance) * step;
      }
      if (distance < 0.045) path.shift();
      animate(reduced || gettingUp ? "" : "Walk");
    } else {
      const turn = Math.atan2(
        Math.sin(facing - luca.rotation.y),
        Math.cos(facing - luca.rotation.y),
      );
      luca.rotation.y += turn * Math.min(1, dt * 4);
      const action =
        effective === "thinking"
          ? "Think"
          : effective === "completed"
            ? "Wave"
            : seated
              ? "SitRead"
              : ["search", "edit", "terminal", "tool", "responding"].includes(
                    effective,
                  )
                ? "Work"
                : "";
      animate(reduced ? "" : action);
    }
    mixer.update(dt);
    if (!reduced) {
      tail.rotation.z =
        Math.sin(elapsed * (effective === "completed" ? 8 : 2)) * 0.12;
      luca.position.y =
        0.17 +
        (walking
          ? Math.abs(Math.sin(elapsed * 8)) * 0.035
          : Math.sin(elapsed * 2) * 0.006);
      if (!previousAction)
        head.rotation.z =
          effective === "failed" ? -0.16 : Math.sin(elapsed * 0.7) * 0.035;
      const tea = !walking && effective === "idle" && idleIndex === 2;
      if (!previousAction)
        armR.rotation.x = tea ? -1.7 + Math.sin(elapsed) * 0.1 : 0;
      const blink = sleeping || elapsed % 4.6 < 0.14 ? 0.12 : 1;
      for (const eye of eyes) eye.scale.y = blink;
      ears.forEach((ear, i) => {
        ear.rotation.z =
          (i ? -0.22 : 0.22) +
          (effective === "failed"
            ? i
              ? -0.16
              : 0.16
            : Math.sin(elapsed * 0.8 + i) * 0.025);
      });
    }
    if (reduced) {
      for (const eye of eyes) eye.scale.y = 1;
      luca.position.y = 0.17;
    }
    cup.visible = !walking && effective === "idle" && idleIndex === 2;
    book.visible = seated;
    book.position.copy(modelRoot.position).add(new T.Vector3(0, 0.85, 0.42));
    (room.screen.material as T.MeshStandardMaterial).emissiveIntensity =
      effective === "search" && !reduced
        ? 0.28 + Math.sin(elapsed * 3) * 0.08
        : 0.1;
    (room.indicator.material as T.MeshStandardMaterial).color.set(
      effective === "terminal" ? "#92be88" : "#d5b167",
    );
    const dark = state.theme === "dark";
    hemi.intensity = dark ? 1.5 : 2.6;
    sunlight.intensity = dark ? 1.5 : 3.2;
    room.lamp.intensity = dark ? 7 : 4;
    controls!.update();
    const anchor = head
      .getWorldPosition(new T.Vector3())
      .add(new T.Vector3(0, 0.75, 0))
      .project(camera);
    $("bubble").style.left =
      `${Math.max(70, Math.min(innerWidth - 150, (anchor.x * 0.5 + 0.5) * innerWidth))}px`;
    $("bubble").style.top =
      `${Math.max(75, (-anchor.y * 0.5 + 0.5) * innerHeight - 6)}px`;
    $("bubble").style.opacity =
      walking || (effective === "idle" && elapsed % 18 > 6) ? "0" : "1";
    const canvas = renderer!.domElement;
    canvas.dataset.activity = activity;
    canvas.dataset.transfer = transfer ? "cut" : "settled";
    canvas.dataset.position = `${luca.position.x.toFixed(2)},${luca.position.z.toFixed(2)}`;
    canvas.dataset.moving = String(walking);
    canvas.dataset.pose = sleeping
      ? "sleeping"
      : seated
        ? "seated"
        : walking
          ? "walking"
          : cup.visible
            ? "tea"
            : "standing";
    canvas.dataset.frames = String(++renderedFrames);
    renderer!.render(scene, camera);
  }
  paint();
  frame = requestAnimationFrame(tick);
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    off?.();
    controls?.dispose();
    mixer.stopAllAction();
    mixer.uncacheRoot(luca);
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          materials.add(m);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    renderer?.dispose();
  };
  window.addEventListener("pagehide", cleanup, { once: true });
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    fail("WebGL context lost");
  });
  renderer.domElement.addEventListener("webglcontextrestored", () =>
    location.reload(),
  );
  await api?.ready();
}
void start().catch(fail);
