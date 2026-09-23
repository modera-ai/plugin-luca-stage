import { describe, expect, it } from "vitest";
import { activate } from "../src/index";

describe("Luca cave plugin", () => {
  it("registers a permission-free conversation stage", async () => {
    const contribution = await activate({} as never);
    const stage = contribution?.ui?.find(item => item.slot === "conversation.stage");
    expect(stage?.slot).toBe("conversation.stage");
    expect(stage?.stage?.title).toBe("Luca's home");
    expect(stage?.frontend).toBe("cave");
    expect(stage?.requiredPermissions).toEqual([]);
  });
});
