import { describe, it, expect } from "vitest";
import { focusStats, recordFocus } from "@/server/services/focus";
import { setupOrg } from "./helpers";

describe("resumo do foco", () => {
  it("soma minutos, conta focos completos e ignora sessões curtas", async () => {
    const { admin } = await setupOrg();
    const now = new Date();
    await recordFocus(admin, { taskId: null, startedAt: now.getTime() - 3600_000, seconds: 1500, plannedMinutes: 25, completed: true, tiny: false });
    await recordFocus(admin, { taskId: null, startedAt: now.getTime() - 1800_000, seconds: 600, plannedMinutes: 25, completed: false, tiny: false });
    await recordFocus(admin, { taskId: null, startedAt: now.getTime() - 900_000, seconds: 20, plannedMinutes: 25, completed: false, tiny: false });
    const s = await focusStats(admin, now);
    expect(s.today).toEqual({ min: 35, n: 1 });
    expect(s.month.rate).toBe(50);
    expect(s.total).toBe(2);
  });
});
