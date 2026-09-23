// Original vector artwork, rendered locally for the existing PNG manifest icon protocol.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 128, height: 128 }, deviceScaleFactor: 2 });
  const svg = await readFile(resolve("plugins/luca-stage/ui/assets/icon.svg"), "utf8");
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  const png = await page.screenshot({ omitBackground: true });
  await writeFile(resolve("plugins/luca-stage/ui/assets/icon.png"), png);
  const path = resolve("plugins/luca-stage/plugin.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  manifest.icon = `data:image/png;base64,${png.toString("base64")}`;
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
} finally { await browser.close(); }
