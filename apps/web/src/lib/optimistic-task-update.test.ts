import { describe, expect, it } from "vitest";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { applyTaskPatch } from "./optimistic-task-update";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test task",
  number: 1,
  description: null,
  status: "todo",
  priority: "medium",
  startDate: null,
  dueDate: null,
  position: 0,
  createdAt: "2026-01-01T00:00:00Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
  projectId: "proj-1",
  milestoneId: null,
  ...overrides,
});

const makeProject = (
  overrides: Partial<ProjectWithTasks> = {},
): ProjectWithTasks =>
  ({
    id: "proj-1",
    name: "Test Project",
    columns: [
      {
        id: "col-1",
        name: "Todo",
        isFinal: false,
        tasks: [makeTask({ id: "task-1", status: "todo" })],
      },
      {
        id: "col-2",
        name: "Done",
        isFinal: true,
        tasks: [makeTask({ id: "task-2", status: "done" })],
      },
    ],
    plannedTasks: [makeTask({ id: "task-3", status: "planned" })],
    archivedTasks: [makeTask({ id: "task-4", status: "archived" })],
    ...overrides,
  }) as unknown as ProjectWithTasks;

describe("applyTaskPatch", () => {
  it("returns undefined when project is undefined", () => {
    expect(
      applyTaskPatch(undefined, "task-1", { status: "done" }),
    ).toBeUndefined();
  });

  it("patches a task inside a column", () => {
    const project = makeProject();
    const result = applyTaskPatch(project, "task-1", { status: "in-progress" });
    expect(result?.columns[0].tasks[0].status).toBe("in-progress");
  });

  it("does not mutate the original project", () => {
    const project = makeProject();
    applyTaskPatch(project, "task-1", { status: "in-progress" });
    expect(project.columns[0].tasks[0].status).toBe("todo");
  });

  it("patches a task in plannedTasks", () => {
    const project = makeProject();
    const result = applyTaskPatch(project, "task-3", { priority: "high" });
    expect(result?.plannedTasks[0].priority).toBe("high");
  });

  it("patches a task in archivedTasks", () => {
    const project = makeProject();
    const result = applyTaskPatch(project, "task-4", { status: "done" });
    expect(result?.archivedTasks[0].status).toBe("done");
  });

  it("leaves tasks with non-matching ids unchanged", () => {
    const project = makeProject();
    const result = applyTaskPatch(project, "task-1", { status: "in-progress" });
    expect(result?.columns[1].tasks[0].status).toBe("done");
    expect(result?.plannedTasks[0].status).toBe("planned");
  });

  it("applies a partial patch preserving other task fields", () => {
    const project = makeProject();
    const result = applyTaskPatch(project, "task-1", { status: "in-progress" });
    const patched = result?.columns[0].tasks[0];
    expect(patched?.title).toBe("Test task");
    expect(patched?.priority).toBe("medium");
  });

  it("returns the project unchanged when taskId is not found anywhere", () => {
    const project = makeProject();
    const result = applyTaskPatch(project, "nonexistent-id", {
      status: "done",
    });
    expect(result?.columns[0].tasks[0].status).toBe("todo");
    expect(result?.plannedTasks[0].status).toBe("planned");
  });
});
