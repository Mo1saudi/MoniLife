import { describe, expect, it } from "vitest";

import { buildFrictionSteps, filterLifeTasks, getAdvisorResponse } from "../lib/omni-life-center-utils";

describe("Omni Life Center core interactions", () => {
  it("creates three actionable friction-breaker steps for a task", () => {
    const steps = buildFrictionSteps("task-7", true);

    expect(steps).toHaveLength(3);
    expect(steps.map((step) => step.id)).toEqual(["task-7-1", "task-7-2", "task-7-3"]);
    expect(steps.every((step) => step.done === false)).toBe(true);
  });

  it("filters tasks by their completion and energy state", () => {
    const tasks = [
      { id: "1", done: false, energy: "high" as const },
      { id: "2", done: false, energy: "low" as const },
      { id: "3", done: true, energy: "medium" as const },
    ];

    expect(filterLifeTasks(tasks, "pending").map((task) => task.id)).toEqual(["1", "2"]);
    expect(filterLifeTasks(tasks, "low").map((task) => task.id)).toEqual(["2"]);
    expect(filterLifeTasks(tasks, "done").map((task) => task.id)).toEqual(["3"]);
  });

  it("gives contextual hydration advice using the supplied local metric", () => {
    const response = getAdvisorResponse("أحتاج إلى تذكير ماء", true, 2100);

    expect(response).toContain("2100");
    expect(response).toContain("250");
  });
});
