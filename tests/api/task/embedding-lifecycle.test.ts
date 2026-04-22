import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateAndStoreEmbedding = vi.hoisted(() => vi.fn());

vi.mock("../../../apps/api/src/embeddings/upsert-task-embedding", () => ({
  generateAndStoreEmbedding: mockGenerateAndStoreEmbedding,
}));

const mockPublishEvent = vi.hoisted(() => vi.fn());

vi.mock("../../../apps/api/src/events", () => ({
  publishEvent: mockPublishEvent,
}));

const mockDbQuery = vi.hoisted(() => ({
  taskTable: { findFirst: vi.fn() },
  projectTable: { findFirst: vi.fn() },
  columnTable: { findFirst: vi.fn() },
}));

const mockInsert = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());

vi.mock("../../../apps/api/src/database", () => ({
  default: {
    query: mockDbQuery,
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}));

vi.mock("../../../apps/api/src/database/schema", () => ({
  taskTable: { id: "id_col" },
  columnTable: { teamId: "team_id_col", slug: "slug_col" },
  projectTable: { id: "project_id_col" },
  userTable: { id: "user_id_col", name: "name_col" },
}));

vi.mock("../../../apps/api/src/task/validate-task-fields", () => ({
  assertValidTaskStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../apps/api/src/task/controllers/get-next-task-number", () => ({
  default: vi.fn().mockResolvedValue(0),
}));

import createTask from "../../../apps/api/src/task/controllers/create-task";
import updateTask from "../../../apps/api/src/task/controllers/update-task";
import updateTaskDescription from "../../../apps/api/src/task/controllers/update-task-description";
import updateTaskTitle from "../../../apps/api/src/task/controllers/update-task-title";

const FAKE_PROJECT = { id: "proj-1", teamId: "team-1" };
const FAKE_TASK = {
  id: "task-1",
  teamId: "team-1",
  projectId: "proj-1",
  title: "Original title",
  description: "Original description",
  status: "to-do",
  priority: "no-priority",
  position: 1,
  userId: null,
  columnId: null,
  startDate: null,
  dueDate: null,
  number: 1,
  roadmapGroup: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("embedding lifecycle", () => {
  beforeEach(() => {
    mockGenerateAndStoreEmbedding.mockResolvedValue(undefined);
    mockPublishEvent.mockResolvedValue(undefined);

    mockDbQuery.projectTable.findFirst.mockResolvedValue(FAKE_PROJECT);
    mockDbQuery.taskTable.findFirst.mockResolvedValue(FAKE_TASK);
    mockDbQuery.columnTable.findFirst.mockResolvedValue(null);

    const returning = vi.fn().mockResolvedValue([FAKE_TASK]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockUpdate.mockReturnValue({ set });

    const insertReturning = vi.fn().mockResolvedValue([FAKE_TASK]);
    const values = vi.fn().mockReturnValue({ returning: insertReturning });
    mockInsert.mockReturnValue({ values });

    const from = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    mockSelect.mockReturnValue({ from });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fires embedding after task creation", async () => {
    await createTask({
      projectId: "proj-1",
      title: "Fix login bug",
      status: "to-do",
      description: "Users cannot log in",
    });

    expect(mockGenerateAndStoreEmbedding).toHaveBeenCalledWith(
      FAKE_TASK.id,
      FAKE_TASK.title,
      FAKE_TASK.description,
    );
  });

  it("fires embedding when title changes in updateTask", async () => {
    await updateTask(
      "task-1",
      "New title",
      "to-do",
      undefined,
      undefined,
      "proj-1",
      "Original description",
      "no-priority",
      1,
    );

    expect(mockGenerateAndStoreEmbedding).toHaveBeenCalled();
  });

  it("fires embedding when description changes in updateTask", async () => {
    await updateTask(
      "task-1",
      "Original title",
      "to-do",
      undefined,
      undefined,
      "proj-1",
      "New description",
      "no-priority",
      1,
    );

    expect(mockGenerateAndStoreEmbedding).toHaveBeenCalled();
  });

  it("skips embedding when only status changes in updateTask", async () => {
    await updateTask(
      "task-1",
      "Original title",
      "in-progress",
      undefined,
      undefined,
      "proj-1",
      "Original description",
      "no-priority",
      1,
    );

    expect(mockGenerateAndStoreEmbedding).not.toHaveBeenCalled();
  });

  it("fires embedding via updateTaskTitle", async () => {
    await updateTaskTitle({ id: "task-1", title: "New title" });

    expect(mockGenerateAndStoreEmbedding).toHaveBeenCalledWith(
      FAKE_TASK.id,
      FAKE_TASK.title,
      FAKE_TASK.description,
    );
  });

  it("fires embedding via updateTaskDescription", async () => {
    await updateTaskDescription({
      id: "task-1",
      description: "New description",
    });

    expect(mockGenerateAndStoreEmbedding).toHaveBeenCalledWith(
      FAKE_TASK.id,
      FAKE_TASK.title,
      FAKE_TASK.description,
    );
  });

  it("does not throw when embedding fails", async () => {
    mockGenerateAndStoreEmbedding.mockRejectedValueOnce(
      new Error("OpenAI down"),
    );

    await expect(
      createTask({
        projectId: "proj-1",
        title: "Fix login bug",
        status: "to-do",
      }),
    ).resolves.toBeDefined();
  });
});
