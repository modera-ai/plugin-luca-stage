import type { PluginModule } from "@modera/plugin-sdk";
import manifest from "../plugin.json";

export const activate: PluginModule["activate"] = async () => ({
  ui: [
    {
      id: "modera.luca-stage.panel",
      slot: "panel",
      stageId: "modera.luca-stage.conversation",
      launcher: {
        title: "Luca's home",
        description: "Keep Luca beside your work",
        icon: "box",
        image: manifest.icon,
        locales: {
          "zh-CN": { title: "卢卡的小屋", description: "让卢卡在侧栏陪你工作" },
        },
      },
      requiredPermissions: [],
      async render() {
        return { title: "Luca's home", children: [] };
      },
    },
    {
      id: "modera.luca-stage.conversation",
      slot: "conversation.stage",
      frontend: "cave",
      stage: {
        embedded: true,
        image: manifest.icon,
        composerLayout: { width: 640, compactBottom: 170 },
        composerTheme: {
          light: {
            surface: "#fff9e9ed",
            text: "#514b38",
            muted: "#847c61",
            border: "#b9b394",
            accent: "#82956a",
          },
          dark: {
            surface: "#303b32ed",
            text: "#eee5ce",
            muted: "#b8b69c",
            border: "#64725c",
            accent: "#a6b77f",
          },
        },
        title: "Luca's home",
        locales: { "zh-CN": { title: "卢卡的小屋" } },
      },
      requiredPermissions: [],
      async render(request) {
        return {
          title: request.locale.startsWith("zh") ? "卢卡的小屋" : "Luca's home",
          children: [],
        };
      },
    },
  ],
});
