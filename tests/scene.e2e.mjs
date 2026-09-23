// Standalone WebGL acceptance with synthetic stage snapshots (no model calls).
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const root = resolve("plugins/luca-stage/dist/ui");
const evidence = resolve("artifacts/luca-cave", `scene-${Date.now()}`);
await mkdir(evidence, { recursive: true });
const server = createServer(async (req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const path = resolve(
      root,
      "." + (req.url === "/" ? "/index.html" : req.url),
    );
    if (!path.startsWith(root)) throw new Error("Invalid path");
    res.setHeader(
      "Content-Type",
      { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[
        extname(path)
      ] ?? "application/octet-stream",
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [],
  results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1180, height: 760 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.addInitScript(() => {
    let listener;
    window.testState = {
      phase: "idle",
      runId: null,
      tools: [],
      theme: "light",
    };
    window.moderaPlugin = {
      snapshot: async () => ({
        locale: "zh-CN",
        stage: window.testState,
        view: { title: "Luca", children: [] },
      }),
      onChanged: (fn) => {
        listener = fn;
        return () => {};
      },
      ready: async () => {
        window.sceneReady = true;
      },
    };
    window.setStage = (state) => {
      window.testState = state;
      listener?.();
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.sceneReady, { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(evidence, "01-home.png") });
  assert.equal(await page.locator("#error").isVisible(), false);
  for (const [phase, tool, label] of [
    ["thinking", "", "思考"],
    ["tools", "web_search", "查找"],
    ["tools", "file_read", "阅读"],
    ["tools", "file_edit", "制作"],
    ["tools", "terminal_exec", "命令"],
    ["responding", "", "回答"],
    ["waiting", "", "确认"],
    ["failed", "", "问题"],
    ["cancelled", "", "停止"],
    ["completed", "", "完成"],
  ]) {
    await page.evaluate(
      ({ phase, tool }) =>
        window.setStage({
          phase,
          runId: "synthetic-run",
          tools: tool ? [{ id: "t", name: tool, title: tool }] : [],
          theme: "light",
        }),
      { phase, tool },
    );
    await page.waitForFunction(
      (label) => document.getElementById("status").textContent.includes(label),
      label,
    );
    const activity =
      phase === "tools"
        ? {
            web_search: "search",
            file_read: "read",
            file_edit: "edit",
            terminal_exec: "terminal",
          }[tool]
        : phase;
    await page.waitForFunction(
      (activity) => {
        const data = document.getElementById("scene").dataset;
        return data.activity === activity && data.moving === "false";
      },
      activity,
      { timeout: 30000 },
    );
    await page.waitForTimeout(1600);
    await page.screenshot({
      path: resolve(
        evidence,
        `${results.length + 2}-${phase}-${tool || "none"}.png`,
      ),
    });
    results.push({
      phase,
      tool,
      status: await page.locator("#status").textContent(),
    });
  }
  await page.evaluate(() =>
    window.setStage({ phase: "idle", runId: null, tools: [], theme: "light" }),
  );
  for (const pose of ["seated", "tea", "sleeping"]) {
    await page.waitForFunction(
      (pose) => document.getElementById("scene").dataset.pose === pose,
      pose,
      { timeout: 90000 },
    );
    await page.waitForTimeout(1600);
    await page.screenshot({ path: resolve(evidence, `idle-${pose}.png`) });
    results.push({ idlePose: pose });
  }
  await page.evaluate(() =>
    window.setStage({
      phase: "thinking",
      runId: "wake-up",
      tools: [],
      theme: "light",
    }),
  );
  await page.waitForFunction(() => {
    const d = document.getElementById("scene").dataset;
    return d.activity === "thinking" && d.pose !== "sleeping";
  });
  await page.getByRole("button", { name: "减少动画" }).click();
  assert.equal(
    await page.locator("#motion").getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "省电画质" }).click();
  await page.evaluate(() =>
    window.setStage({ phase: "idle", runId: null, tools: [], theme: "dark" }),
  );
  await page.setViewportSize({ width: 560, height: 500 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(evidence, "12-compact-dark.png") });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.evaluate(() =>
    document
      .getElementById("scene")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext(),
  );
  await page.waitForFunction(() => !document.getElementById("error").hidden);
  await page.getByRole("button", { name: "重新加载" }).click();
  await page.waitForFunction(() => window.sceneReady);
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(evidence, "report.json"),
    JSON.stringify(
      {
        synthetic: true,
        commit,
        results,
        errors,
        reload: "passed",
        compact: "passed",
      },
      null,
      2,
    ),
  );
  console.log(evidence);
} catch (error) {
  await writeFile(
    resolve(evidence, "failure.json"),
    JSON.stringify({ commit, error: String(error), errors, results }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
  server.close();
}
