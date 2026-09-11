import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type TaskFilter =
  | "ALL"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED";

interface Task {
  id: number;
  title: string;
  description: string | null;
  farmName: string;
  fieldName: string | null;
  assigneeName: string;
  supervisorName: string | null;
  workerNames: string[];
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
}

interface TaskForm {
  title: string;
  description: string;
  farmName: string;
  fieldName: string;
  assigneeName: string;
  supervisorName: string;
  workerNames: string;
  dueDate: string;
  priority: TaskPriority;
}

/* =========================================================
   API
========================================================= */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const TASK_API = `${API_BASE_URL}/api/tasks`;

/* =========================================================
   AUTH
========================================================= */

function getAuthHeaders(): HeadersInit {
  const tokenData = localStorage.getItem("token_data");

  if (!tokenData) {
    return {
      "Content-Type": "application/json",
    };
  }

  try {
    const parsed = JSON.parse(tokenData);

    const token =
      parsed?.accessToken ||
      parsed?.access_token ||
      parsed?.token ||
      parsed?.jwt;

    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    }
  } catch {
    console.warn("Invalid token_data");
  }

  return {
    "Content-Type": "application/json",
  };
}

/* =========================================================
   HELPERS
========================================================= */

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  farmName: "",
  fieldName: "",
  assigneeName: "",
  supervisorName: "",
  workerNames: "",
  dueDate: "",
  priority: "MEDIUM",
};

function normalizeTasks(data: unknown): Task[] {
  if (Array.isArray(data)) {
    return data as Task[];
  }

  if (
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray((data as { content?: unknown }).content)
  ) {
    return (data as { content: Task[] }).content;
  }

  if (
    data &&
    typeof data === "object" &&
    "tasks" in data &&
    Array.isArray((data as { tasks?: unknown }).tasks)
  ) {
    return (data as { tasks: Task[] }).tasks;
  }

  return [];
}

function formatStatus(status: TaskStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function formatPriority(priority: TaskPriority): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatDate(date?: string | null): string {
  if (!date) {
    return "No due date";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toWorkerString(workerNames?: string[] | null): string {
  return Array.isArray(workerNames) ? workerNames.join(", ") : "";
}

function parseWorkerNames(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
}

function getTaskEmoji(task: Task): string {
  const value = `${task.title} ${task.description ?? ""}`.toLowerCase();

  if (
    value.includes("water") ||
    value.includes("irrigation")
  ) {
    return "💧";
  }

  if (
    value.includes("fertilizer") ||
    value.includes("fertilise") ||
    value.includes("plant")
  ) {
    return "🌱";
  }

  if (
    value.includes("harvest") ||
    value.includes("wheat") ||
    value.includes("crop")
  ) {
    return "🌾";
  }

  if (
    value.includes("spray") ||
    value.includes("pest") ||
    value.includes("disease")
  ) {
    return "🧪";
  }

  if (
    value.includes("check") ||
    value.includes("inspect") ||
    value.includes("monitor")
  ) {
    return "✅";
  }

  return "📋";
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function statusClasses(status: TaskStatus): string {
  switch (status) {
    case "PENDING":
      return "border-orange-300 bg-orange-50 text-orange-600";
    case "IN_PROGRESS":
      return "border-blue-300 bg-blue-50 text-blue-600";
    case "COMPLETED":
      return "border-emerald-300 bg-emerald-50 text-emerald-600";
    case "CANCELLED":
      return "border-slate-300 bg-slate-100 text-slate-500";
    default:
      return "border-slate-300 bg-white text-slate-600";
  }
}

function priorityClasses(priority: TaskPriority): string {
  switch (priority) {
    case "LOW":
      return "bg-emerald-500 text-white";
    case "MEDIUM":
      return "bg-orange-500 text-white";
    case "HIGH":
      return "bg-rose-500 text-white";
    case "URGENT":
      return "bg-red-600 text-white";
    default:
      return "bg-slate-500 text-white";
  }
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<TaskFilter>("ALL");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] =
    useState<number | null>(null);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [showTaskModal, setShowTaskModal] =
    useState(false);
  const [editingTaskId, setEditingTaskId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<TaskForm>(EMPTY_FORM);

  /* =======================================================
     LOAD TASKS
  ======================================================= */

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(TASK_API, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to load tasks (${response.status})`
        );
      }

      const data: unknown = await response.json();

      setTasks(normalizeTasks(data));
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  /* =======================================================
     COUNTS
  ======================================================= */

  const counts = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter(
        (task) => task.status === "PENDING"
      ).length,
      inProgress: tasks.filter(
        (task) => task.status === "IN_PROGRESS"
      ).length,
      completed: tasks.filter(
        (task) => task.status === "COMPLETED"
      ).length,
    }),
    [tasks]
  );

  /* =======================================================
     FILTERED TASKS
  ======================================================= */

  const filteredTasks = useMemo(() => {
    if (activeFilter === "ALL") {
      return tasks;
    }

    return tasks.filter(
      (task) => task.status === activeFilter
    );
  }, [tasks, activeFilter]);

  /* =======================================================
     OPEN CREATE
  ======================================================= */

  const openCreateTask = () => {
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
    setShowTaskModal(true);
  };

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const openEditTask = (task: Task) => {
    setEditingTaskId(task.id);

    setForm({
      title: task.title ?? "",
      description: task.description ?? "",
      farmName: task.farmName ?? "",
      fieldName: task.fieldName ?? "",
      assigneeName: task.assigneeName ?? "",
      supervisorName: task.supervisorName ?? "",
      workerNames: toWorkerString(task.workerNames),
      dueDate: task.dueDate ?? "",
      priority: task.priority ?? "MEDIUM",
    });

    setShowTaskModal(true);
  };

  /* =======================================================
     CREATE / UPDATE
  ======================================================= */

  const handleTaskSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    if (!form.farmName.trim()) {
      alert("Please enter the farm name.");
      return;
    }

    if (!form.assigneeName.trim()) {
      alert("Please enter the assignee name.");
      return;
    }

    if (!form.dueDate) {
      alert("Please select a due date.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      farmName: form.farmName.trim(),
      fieldName: form.fieldName.trim(),
      assigneeName: form.assigneeName.trim(),
      supervisorName: form.supervisorName.trim(),
      workerNames: parseWorkerNames(
        form.workerNames
      ),
      dueDate: form.dueDate,
      priority: form.priority,
    };

    const isCreating = editingTaskId === null;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        isCreating
          ? TASK_API
          : `${TASK_API}/${editingTaskId}`,
        {
          method: isCreating ? "POST" : "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to ${
              isCreating ? "create" : "update"
            } task`
        );
      }

      setShowTaskModal(false);
      setEditingTaskId(null);
      setForm(EMPTY_FORM);

      await loadTasks();

      alert(
        isCreating
          ? "Task created successfully."
          : "Task updated successfully."
      );
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to save task"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     STATUS UPDATE
  ======================================================= */

  const updateTaskStatus = async (
    task: Task,
    status: TaskStatus
  ) => {
    if (task.status === status) {
      return;
    }

    try {
      setChangingStatusId(task.id);
      setError("");

      const response = await fetch(
        `${TASK_API}/${task.id}/status?status=${encodeURIComponent(
          status
        )}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to update task status (${response.status})`
        );
      }

      await loadTasks();
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to update task status"
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDeleteTask = async (
    task: Task
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(task.id);
      setError("");

      const response = await fetch(
        `${TASK_API}/${task.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to delete task (${response.status})`
        );
      }

      await loadTasks();
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete task"
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-4 py-6 sm:px-6 lg:px-8">

      {/* HEADER */}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Task Management
          </h1>

          <p className="mt-1 text-sm font-medium text-emerald-700/80">
            Assign and track farm activities
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateTask}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-700/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <span className="text-lg leading-none">
            +
          </span>
          Create Task
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadTasks()}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* STATS */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TaskStatCard
          title="Total Tasks"
          value={counts.total}
          icon={
            <CheckCircleIcon className="h-5 w-5" />
          }
          iconClassName="bg-blue-50 text-blue-500 ring-blue-100"
          valueClassName="text-slate-800"
        />

        <TaskStatCard
          title="Pending"
          value={counts.pending}
          icon={
            <CircleIcon className="h-5 w-5" />
          }
          iconClassName="bg-orange-50 text-orange-500 ring-orange-100"
          valueClassName="text-orange-600"
        />

        <TaskStatCard
          title="In Progress"
          value={counts.inProgress}
          icon={
            <ClockIcon className="h-5 w-5" />
          }
          iconClassName="bg-blue-50 text-blue-500 ring-blue-100"
          valueClassName="text-blue-600"
        />

        <TaskStatCard
          title="Completed"
          value={counts.completed}
          icon={
            <CheckCircleIcon className="h-5 w-5" />
          }
          iconClassName="bg-emerald-50 text-emerald-500 ring-emerald-100"
          valueClassName="text-emerald-600"
        />
      </div>

      {/* TASK PANEL */}

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/60">
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-sm font-extrabold text-slate-700">
              All Tasks
            </h2>

            <button
              type="button"
              onClick={() => void loadTasks()}
              disabled={loading}
              className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* FILTERS */}

          <div className="mb-5 inline-flex max-w-full flex-wrap rounded-xl bg-emerald-50/80 p-1 ring-1 ring-emerald-100">
            <FilterButton
              active={activeFilter === "ALL"}
              onClick={() =>
                setActiveFilter("ALL")
              }
            >
              All Tasks
            </FilterButton>

            <FilterButton
              active={activeFilter === "PENDING"}
              onClick={() =>
                setActiveFilter("PENDING")
              }
            >
              Pending
            </FilterButton>

            <FilterButton
              active={
                activeFilter === "IN_PROGRESS"
              }
              onClick={() =>
                setActiveFilter("IN_PROGRESS")
              }
            >
              In Progress
            </FilterButton>

            <FilterButton
              active={
                activeFilter === "COMPLETED"
              }
              onClick={() =>
                setActiveFilter("COMPLETED")
              }
            >
              Completed
            </FilterButton>
          </div>

          {/* LIST */}

          {loading && tasks.length === 0 ? (
            <LoadingState text="Loading tasks..." />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              title={
                activeFilter === "ALL"
                  ? "No tasks found"
                  : `No ${formatStatus(
                      activeFilter
                    ).toLowerCase()} tasks found`
              }
              description={
                activeFilter === "ALL"
                  ? "Create your first farm task."
                  : "There are no tasks in this status."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={
                    changingStatusId === task.id ||
                    deletingId === task.id
                  }
                  onEdit={() =>
                    openEditTask(task)
                  }
                  onDelete={() =>
                    void handleDeleteTask(task)
                  }
                  onStatusChange={(status) =>
                    void updateTaskStatus(
                      task,
                      status
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CREATE / EDIT MODAL */}

      {showTaskModal && (
        <Modal
          title={
            editingTaskId === null
              ? "Create New Task"
              : "Edit Task"
          }
          onClose={() => {
            if (!saving) {
              setShowTaskModal(false);
            }
          }}
        >
          <form
            onSubmit={handleTaskSubmit}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Task Title *"
                placeholder="e.g. Irrigation System Check"
                value={form.title}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    title: value,
                  }))
                }
              />

              <Select
                label="Priority *"
                value={form.priority}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    priority:
                      value as TaskPriority,
                  }))
                }
              >
                <option value="LOW">
                  Low
                </option>
                <option value="MEDIUM">
                  Medium
                </option>
                <option value="HIGH">
                  High
                </option>
                <option value="URGENT">
                  Urgent
                </option>
              </Select>
            </div>

            <TextArea
              label="Description"
              placeholder="Describe what needs to be done..."
              value={form.description}
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  description: value,
                }))
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Farm Name *"
                placeholder="e.g. Green Valley Farm"
                value={form.farmName}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    farmName: value,
                  }))
                }
              />

              <Input
                label="Field Name"
                placeholder="e.g. Field A"
                value={form.fieldName}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    fieldName: value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Assignee Name *"
                placeholder="e.g. Kamal Perera"
                value={form.assigneeName}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    assigneeName: value,
                  }))
                }
              />

              <Input
                label="Supervisor Name"
                placeholder="e.g. Nimal Silva"
                value={form.supervisorName}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    supervisorName: value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Due Date *"
                placeholder=""
                type="date"
                value={form.dueDate}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    dueDate: value,
                  }))
                }
              />

              <Input
                label="Worker Names"
                placeholder="Sunil Silva, Amal Fernando, Kasun Perera"
                value={form.workerNames}
                onChange={(value) =>
                  setForm((previous) => ({
                    ...previous,
                    workerNames: value,
                  }))
                }
              />
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs leading-5 text-emerald-800">
              Worker names must be separated by commas.
              Example:{" "}
              <span className="font-bold">
                Sunil Silva, Amal Fernando
              </span>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setShowTaskModal(false)
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingTaskId === null
                  ? "Create Task"
                  : "Update Task"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   TASK CARD
========================================================= */

function TaskCard({
  task,
  busy,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (
    status: TaskStatus
  ) => void;
}) {
  const [showDetails, setShowDetails] =
    useState(false);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-950/5 sm:px-5">
      <div className="flex items-start gap-3">
        <label className="mt-0.5 flex shrink-0 items-center">
          <input
            type="checkbox"
            checked={
              task.status === "COMPLETED"
            }
            disabled={busy}
            onChange={(event) =>
              onStatusChange(
                event.target.checked
                  ? "COMPLETED"
                  : "PENDING"
              )
            }
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            title={
              task.status === "COMPLETED"
                ? "Mark as pending"
                : "Mark as completed"
            }
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-lg"
                  aria-hidden="true"
                >
                  {getTaskEmoji(task)}
                </span>

                <h3
                  className={`text-sm font-extrabold sm:text-[15px] ${
                    task.status === "COMPLETED"
                      ? "text-slate-500 line-through"
                      : "text-slate-800"
                  }`}
                >
                  {task.title}
                </h3>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold lowercase ${priorityClasses(
                    task.priority
                  )}`}
                >
                  {formatPriority(
                    task.priority
                  )}
                </span>
              </div>

              {task.description && (
                <p className="mt-2 text-xs leading-5 text-emerald-900/70 sm:text-sm">
                  {task.description}
                </p>
              )}
            </div>

            <span
              className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold lowercase ${statusClasses(
                task.status
              )}`}
            >
              {formatStatus(task.status)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-emerald-700" />

              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-800 px-1 text-[8px] font-extrabold text-white">
                {getInitials(
                  task.assigneeName
                )}
              </span>

              {task.assigneeName}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-emerald-700" />
              {formatDate(task.dueDate)}
            </span>

            {task.fieldName && (
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                {task.fieldName}
              </span>
            )}

            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {task.farmName}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <StatusActionButton
                active={
                  task.status === "PENDING"
                }
                disabled={busy}
                onClick={() =>
                  onStatusChange("PENDING")
                }
              >
                Pending
              </StatusActionButton>

              <StatusActionButton
                active={
                  task.status ===
                  "IN_PROGRESS"
                }
                disabled={busy}
                onClick={() =>
                  onStatusChange(
                    "IN_PROGRESS"
                  )
                }
              >
                In Progress
              </StatusActionButton>

              <StatusActionButton
                active={
                  task.status ===
                  "COMPLETED"
                }
                disabled={busy}
                onClick={() =>
                  onStatusChange("COMPLETED")
                }
              >
                Completed
              </StatusActionButton>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowDetails(
                    (previous) => !previous
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
              >
                {showDetails
                  ? "Hide Details"
                  : "Details"}
              </button>

              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Please wait..." : "Delete"}
              </button>
            </div>
          </div>

          {showDetails && (
            <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <TaskDetail
                label="Supervisor"
                value={
                  task.supervisorName ||
                  "Not assigned"
                }
              />

              <TaskDetail
                label="Workers"
                value={
                  task.workerNames?.length
                    ? task.workerNames.join(
                        ", "
                      )
                    : "No workers"
                }
              />

              <TaskDetail
                label="Created"
                value={
                  task.createdAt
                    ? new Date(
                        task.createdAt
                      ).toLocaleString()
                    : "Unknown"
                }
              />

              <TaskDetail
                label="Task ID"
                value={`#${task.id}`}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function TaskStatCard({
  title,
  value,
  icon,
  iconClassName,
  valueClassName,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconClassName: string;
  valueClassName: string;
}) {
  return (
    <div className="flex min-h-[112px] items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
      <div>
        <p className="text-[11px] font-medium text-emerald-900/70">
          {title}
        </p>

        <p
          className={`mt-2 text-2xl font-medium ${valueClassName}`}
        >
          {value}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${iconClassName}`}
      >
        {icon}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? "bg-white text-slate-800 shadow-sm"
          : "text-slate-600 hover:bg-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function StatusActionButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || active}
      className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
        active
          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
          : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function TaskDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
      />
    </div>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
      >
        {children}
      </select>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              {title}
            </h2>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Fill the task details below.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

      <p className="mt-4 text-sm font-bold text-slate-600">
        {text}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl ring-1 ring-emerald-100">
        📋
      </div>

      <h3 className="mt-4 text-sm font-extrabold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   INLINE ICONS
   No extra icon package is required.
========================================================= */

function CheckCircleIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.8 12.2 2 2 4.5-4.8"
      />
    </svg>
  );
}

function CircleIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function ClockIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l2.8 1.7"
      />
    </svg>
  );
}

function UserIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 18c.6-3 2.6-4.5 5.5-4.5s4.9 1.5 5.5 4.5"
      />
    </svg>
  );
}

function CalendarIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="5"
        y="6.5"
        width="14"
        height="12"
        rx="2"
      />
      <path
        strokeLinecap="round"
        d="M8 4.5v4M16 4.5v4M5 10h14"
      />
    </svg>
  );
}
