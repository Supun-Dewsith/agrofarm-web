import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardList,
  Clock3,
  Leaf,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sprout,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  fetchWithAuth,
  getAuthData,
} from "../utils/auth";

/* =========================================================
   TYPES
========================================================= */

type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type TaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

type TaskFilter = "ALL" | TaskStatus;

type SortOrder =
  | "NEWEST"
  | "DUE_DATE"
  | "PRIORITY";

interface Task {
  id: number;
  title: string;
  description: string | null;

  farmId: number;
  farmName: string;

  fieldId: number | null;
  fieldName: string | null;

  supervisorId: number | null;
  supervisorName: string | null;

  workerIds: number[];
  workerNames: string[];

  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

interface SelectOption {
  id: number;
  name: string;
}

interface TaskOptions {
  farms: SelectOption[];
  fields: SelectOption[];
  supervisors: SelectOption[];
  workers: SelectOption[];
}

interface TaskForm {
  title: string;
  description: string;

  farmId: string;
  fieldId: string;
  supervisorId: string;

  workerIds: number[];

  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

interface ModalProps {
  titleId: string;
  children: ReactNode;
  onCancel: () => void;
  compact?: boolean;
}

/* =========================================================
   CONSTANTS
========================================================= */

const STATUSES: TaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITIES: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const FILTERS: TaskFilter[] = [
  "ALL",
  ...STATUSES,
];

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

const EMPTY_OPTIONS: TaskOptions = {
  farms: [],
  fields: [],
  supervisors: [],
  workers: [],
};

const SUMMARY_CARDS = [
  {
    key: "ALL",
    title: "Total Tasks",
    Icon: ClipboardList,
    color: "blue",
  },
  {
    key: "PENDING",
    title: "Pending",
    Icon: Circle,
    color: "orange",
  },
  {
    key: "IN_PROGRESS",
    title: "In Progress",
    Icon: Clock3,
    color: "blue",
  },
  {
    key: "COMPLETED",
    title: "Completed",
    Icon: CheckCircle2,
    color: "green",
  },
] as const;

/* =========================================================
   HELPERS
========================================================= */

function createEmptyForm(): TaskForm {
  return {
    title: "",
    description: "",
    farmId: "",
    fieldId: "",
    supervisorId: "",
    workerIds: [],
    priority: "MEDIUM",
    status: "PENDING",
    dueDate: "",
  };
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function getLocalDate(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value || "No date";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getError(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

function formSnapshot(form: TaskForm): string {
  return JSON.stringify({
    ...form,
    workerIds: [...form.workerIds].sort((a, b) => a - b),
  });
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isOption(value: unknown): value is SelectOption {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    Number.isFinite(value.id) &&
    typeof value.name === "string"
  );
}

function isTaskOptions(
  value: unknown
): value is TaskOptions {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "farms",
    "fields",
    "supervisors",
    "workers",
  ].every((key) => {
    const items = value[key];

    return (
      Array.isArray(items) &&
      items.every(isOption)
    );
  });
}

function normalizeTask(value: unknown): Task {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.title !== "string" ||
    typeof value.farmId !== "number" ||
    typeof value.farmName !== "string" ||
    typeof value.dueDate !== "string" ||
    !STATUSES.includes(value.status as TaskStatus) ||
    !PRIORITIES.includes(value.priority as TaskPriority)
  ) {
    throw new Error(
      "Unexpected task response. Check that the matching Task backend update is installed."
    );
  }

  return {
    id: value.id,
    title: value.title,

    description:
      typeof value.description === "string"
        ? value.description
        : null,

    farmId: value.farmId,
    farmName: value.farmName,

    fieldId:
      typeof value.fieldId === "number"
        ? value.fieldId
        : null,

    fieldName:
      typeof value.fieldName === "string"
        ? value.fieldName
        : null,

    supervisorId:
      typeof value.supervisorId === "number"
        ? value.supervisorId
        : null,

    supervisorName:
      typeof value.supervisorName === "string"
        ? value.supervisorName
        : null,

    workerIds: Array.isArray(value.workerIds)
      ? value.workerIds.filter(
          (id): id is number =>
            typeof id === "number"
        )
      : [],

    workerNames: Array.isArray(value.workerNames)
      ? value.workerNames.filter(
          (name): name is string =>
            typeof name === "string"
        )
      : [],

    priority: value.priority as TaskPriority,
    status: value.status as TaskStatus,
    dueDate: value.dueDate,
  };
}

/* =========================================================
   API
========================================================= */

async function taskApi<T>(
  path = "",
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(
    `/api/tasks${path}`,
    options
  );

  if (!response.ok) {
    const body: unknown = await response
      .json()
      .catch(() => null);

    let message = "";

    if (isRecord(body)) {
      for (const key of [
        "detail",
        "message",
        "reason",
      ]) {
        const value = body[key];

        if (typeof value === "string" && value) {
          message = value;
          break;
        }
      }
    }

    if (!message) {
      message =
        response.status === 403
          ? "You do not have permission for this task or farm."
          : response.status === 401
            ? "Your session has expired. Please sign in again."
            : `Request failed (${response.status}). Please try again.`;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* =========================================================
   MODAL SCROLL LOCK
========================================================= */

let modalLockCount = 0;
let originalBodyOverflow = "";

function lockBodyScroll(): () => void {
  if (modalLockCount === 0) {
    originalBodyOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
  }

  modalLockCount += 1;

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;

    modalLockCount = Math.max(
      0,
      modalLockCount - 1
    );

    if (modalLockCount === 0) {
      document.body.style.overflow =
        originalBodyOverflow;
    }
  };
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  titleId,
  children,
  onCancel,
  compact = false,
}: ModalProps) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const unlockScroll = lockBodyScroll();

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      dialog?.close();
      unlockScroll();

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`tm-modal ${
        compact ? "tm-modal-compact" : ""
      }`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      {children}
    </dialog>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Tasks() {
  const [role, setRole] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [filter, setFilter] =
    useState<TaskFilter>("ALL");

  const [search, setSearch] = useState("");
  const [farmFilter, setFarmFilter] = useState("");

  const [sortOrder, setSortOrder] =
    useState<SortOrder>("NEWEST");

  const [expandedTaskId, setExpandedTaskId] =
    useState<number | null>(null);

  const [busyTaskId, setBusyTaskId] =
    useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [editingTaskId, setEditingTaskId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<TaskForm>(createEmptyForm);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [options, setOptions] =
    useState<TaskOptions>(EMPTY_OPTIONS);

  const [optionsLoading, setOptionsLoading] =
    useState(false);

  const [optionsError, setOptionsError] =
    useState("");

  const [optionsRetry, setOptionsRetry] =
    useState(0);

  const [workerSearch, setWorkerSearch] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<Task | null>(null);

  const [deleteError, setDeleteError] =
    useState("");

  const [showDiscard, setShowDiscard] =
    useState(false);

  const initialFormSnapshot = useRef("");
  const mounted = useRef(false);
  const loadSequence = useRef(0);

  const mutationPending = useRef(false);
  const savePending = useRef(false);

  const canManage =
    role === "ADMIN" || role === "SUPERVISOR";

  const today = getLocalDate();

  /* =======================================================
     LOAD TASKS
  ======================================================= */

  const loadTasks = useCallback(async () => {
    const requestNumber =
      ++loadSequence.current;

    setLoading(true);
    setError("");

    try {
      const data = await taskApi<unknown>();

      if (!Array.isArray(data)) {
        throw new Error(
          "Unexpected task response. Check the Task backend update."
        );
      }

      const normalized =
        data.map(normalizeTask);

      if (
        mounted.current &&
        requestNumber === loadSequence.current
      ) {
        setTasks(normalized);
      }
    } catch (err) {
      if (
        mounted.current &&
        requestNumber === loadSequence.current
      ) {
        setError(
          getError(err, "Unable to load tasks.")
        );
      }
    } finally {
      if (
        mounted.current &&
        requestNumber === loadSequence.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    try {
      const auth = getAuthData();

      setRole(
        (auth?.role || "").toUpperCase()
      );

      void loadTasks();
    } catch {
      setError(
        "Your session is invalid. Please sign in again."
      );

      setLoading(false);
    }

    return () => {
      mounted.current = false;
      loadSequence.current += 1;
    };
  }, [loadTasks]);

  /* =======================================================
     LOAD FORM OPTIONS
  ======================================================= */

  useEffect(() => {
    if (!showForm || !canManage) {
      return;
    }

    let active = true;

    setOptionsLoading(true);
    setOptionsError("");

    setOptions((previous) => ({
      ...previous,
      fields: [],
      supervisors: [],
      workers: [],
    }));

    const query = form.farmId
      ? `?farmId=${encodeURIComponent(form.farmId)}`
      : "";

    taskApi<unknown>(`/options${query}`)
      .then((data) => {
        if (!isTaskOptions(data)) {
          throw new Error(
            "Unexpected selection response. Check the Task backend update."
          );
        }

        if (active) {
          setOptions(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setOptionsError(
            getError(
              err,
              "Unable to load farm selections."
            )
          );
        }
      })
      .finally(() => {
        if (active) {
          setOptionsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    showForm,
    canManage,
    form.farmId,
    optionsRetry,
  ]);

  /* =======================================================
     COUNTS AND FILTERS
  ======================================================= */

  const counts = useMemo(
    () => ({
      ALL: tasks.length,

      PENDING: tasks.filter(
        (task) => task.status === "PENDING"
      ).length,

      IN_PROGRESS: tasks.filter(
        (task) =>
          task.status === "IN_PROGRESS"
      ).length,

      COMPLETED: tasks.filter(
        (task) =>
          task.status === "COMPLETED"
      ).length,

      CANCELLED: tasks.filter(
        (task) =>
          task.status === "CANCELLED"
      ).length,
    }),
    [tasks]
  );

  const filterFarms = useMemo(() => {
    const farms = new Map<number, string>();

    tasks.forEach((task) => {
      farms.set(task.farmId, task.farmName);
    });

    return Array.from(farms.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query =
      search.toLowerCase().trim();

    const result = tasks.filter((task) => {
      const matchesStatus =
        filter === "ALL" ||
        task.status === filter;

      const matchesFarm =
        !farmFilter ||
        task.farmId === Number(farmFilter);

      const searchableText = [
        task.title,
        task.description || "",
        task.farmName,
        task.fieldName || "",
        task.supervisorName || "",
        ...task.workerNames,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesFarm &&
        searchableText.includes(query)
      );
    });

    return result.sort((a, b) => {
      if (sortOrder === "DUE_DATE") {
        return (
          a.dueDate.localeCompare(b.dueDate) ||
          b.id - a.id
        );
      }

      if (sortOrder === "PRIORITY") {
        return (
          PRIORITY_ORDER[b.priority] -
            PRIORITY_ORDER[a.priority] ||
          a.dueDate.localeCompare(b.dueDate)
        );
      }

      return b.id - a.id;
    });
  }, [
    tasks,
    filter,
    farmFilter,
    search,
    sortOrder,
  ]);

  const filteredWorkers = useMemo(() => {
    const query =
      workerSearch.toLowerCase().trim();

    return options.workers.filter((worker) =>
      worker.name.toLowerCase().includes(query)
    );
  }, [options.workers, workerSearch]);

  const selectedWorkers = useMemo(
    () =>
      form.workerIds.map((id) => ({
        id,
        name:
          options.workers.find(
            (worker) => worker.id === id
          )?.name || `Farmer #${id}`,
      })),
    [form.workerIds, options.workers]
  );

  const hasUnavailableWorkers =
    !optionsLoading &&
    !optionsError &&
    form.workerIds.some(
      (id) =>
        !options.workers.some(
          (worker) => worker.id === id
        )
    );

  const hasFilters =
    filter !== "ALL" ||
    search.trim() !== "" ||
    farmFilter !== "";

  const formIsDirty =
    showForm &&
    formSnapshot(form) !==
      initialFormSnapshot.current;

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  function updateForm<K extends keyof TaskForm>(
    key: K,
    value: TaskForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFormError("");
  }

  function openTaskForm(task?: Task) {
    if (
      !canManage ||
      loading ||
      mutationPending.current
    ) {
      return;
    }

    const nextForm: TaskForm = task
      ? {
          title: task.title,
          description:
            task.description || "",

          farmId: String(task.farmId),

          fieldId:
            task.fieldId !== null
              ? String(task.fieldId)
              : "",

          supervisorId:
            task.supervisorId !== null
              ? String(task.supervisorId)
              : "",

          workerIds: [...task.workerIds],

          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
        }
      : createEmptyForm();

    initialFormSnapshot.current =
      formSnapshot(nextForm);

    setEditingTaskId(task?.id ?? null);

    setForm(nextForm);
    setFormError("");

    setOptions(EMPTY_OPTIONS);
    setOptionsError("");
    setOptionsLoading(true);

    setWorkerSearch("");
    setShowDiscard(false);
    setShowForm(true);
  }

  function closeTaskForm() {
    if (savePending.current) {
      return;
    }

    if (formIsDirty) {
      setShowDiscard(true);
      return;
    }

    setShowForm(false);
  }

  function discardChanges() {
    setShowDiscard(false);
    setShowForm(false);
  }

  function changeFarm(farmId: string) {
    setOptionsLoading(true);
    setOptionsError("");
    setWorkerSearch("");
    setFormError("");

    setForm((previous) => ({
      ...previous,
      farmId,
      fieldId: "",
      supervisorId: "",
      workerIds: [],
    }));
  }

  function toggleWorker(
    workerId: number,
    checked: boolean
  ) {
    setForm((previous) => ({
      ...previous,

      workerIds: checked
        ? Array.from(
            new Set([
              ...previous.workerIds,
              workerId,
            ])
          )
        : previous.workerIds.filter(
            (id) => id !== workerId
          ),
    }));

    setFormError("");
  }

  function selectAllShownWorkers() {
    setForm((previous) => ({
      ...previous,

      workerIds: Array.from(
        new Set([
          ...previous.workerIds,
          ...filteredWorkers.map(
            (worker) => worker.id
          ),
        ])
      ),
    }));

    setFormError("");
  }

  function resetFilters() {
    setFilter("ALL");
    setSearch("");
    setFarmFilter("");
    setSortOrder("NEWEST");
  }

  function isOverdue(task: Task): boolean {
    return (
      task.dueDate < today &&
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED"
    );
  }

  function isDueToday(task: Task): boolean {
    return (
      task.dueDate === today &&
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED"
    );
  }

  /* =======================================================
     CREATE / UPDATE
  ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      savePending.current ||
      !canManage ||
      optionsLoading ||
      optionsError
    ) {
      return;
    }

    setFormError("");

    if (!form.title.trim()) {
      setFormError("Enter a task title.");
      return;
    }

    if (!form.farmId) {
      setFormError("Select a farm.");
      return;
    }

    if (!form.supervisorId) {
      setFormError("Select a supervisor.");
      return;
    }

    if (form.workerIds.length === 0) {
      setFormError(
        "Select at least one farmer."
      );
      return;
    }

    if (!form.dueDate) {
      setFormError("Select a due date.");
      return;
    }

    const validFarm = options.farms.some(
      (item) =>
        item.id === Number(form.farmId)
    );

    const validSupervisor =
      options.supervisors.some(
        (item) =>
          item.id === Number(form.supervisorId)
      );

    const validField =
      !form.fieldId ||
      options.fields.some(
        (item) =>
          item.id === Number(form.fieldId)
      );

    const validWorkers =
      form.workerIds.every((workerId) =>
        options.workers.some(
          (worker) => worker.id === workerId
        )
      );

    if (
      !validFarm ||
      !validSupervisor ||
      !validField ||
      !validWorkers
    ) {
      setFormError(
        "Some selections are no longer available. Check the farm, field and assigned team."
      );
      return;
    }

    savePending.current = true;
    setSaving(true);

    try {
      const data = await taskApi<unknown>(
        editingTaskId === null
          ? ""
          : `/${editingTaskId}`,
        {
          method:
            editingTaskId === null
              ? "POST"
              : "PUT",

          body: JSON.stringify({
            title: form.title.trim(),
            description:
              form.description.trim(),

            farmId: Number(form.farmId),

            fieldId: form.fieldId
              ? Number(form.fieldId)
              : null,

            supervisorId: Number(
              form.supervisorId
            ),

            workerIds: form.workerIds,
            priority: form.priority,
            status: form.status,
            dueDate: form.dueDate,
          }),
        }
      );

      const savedTask = normalizeTask(data);

      setTasks((previous) =>
        editingTaskId === null
          ? [savedTask, ...previous]
          : previous.map((task) =>
              task.id === savedTask.id
                ? savedTask
                : task
            )
      );

      resetFilters();
      setExpandedTaskId(savedTask.id);

      setNotice(
        editingTaskId === null
          ? "Task created and assigned successfully."
          : "Task changes saved successfully."
      );

      setShowForm(false);
    } catch (err) {
      setFormError(
        getError(err, "Unable to save task.")
      );
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  }

  /* =======================================================
     STATUS UPDATE — PUT
  ======================================================= */

  async function changeTaskStatus(
    task: Task,
    nextStatus: TaskStatus
  ) {
    if (
      !canManage ||
      loading ||
      mutationPending.current ||
      task.status === nextStatus
    ) {
      return;
    }

    mutationPending.current = true;

    setBusyTaskId(task.id);
    setError("");

    try {
      const data = await taskApi<unknown>(
        `/${task.id}/status?status=${encodeURIComponent(
          nextStatus
        )}`,
        {
          method: "PUT",
        }
      );

      const updatedTask =
        normalizeTask(data);

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? updatedTask
            : item
        )
      );

      setNotice(
        `“${task.title}” marked ${formatLabel(
          nextStatus
        ).toLowerCase()}.`
      );
    } catch (err) {
      setError(
        getError(
          err,
          "Unable to update task status."
        )
      );
    } finally {
      mutationPending.current = false;
      setBusyTaskId(null);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function confirmDelete() {
    if (
      !deleteTarget ||
      !canManage ||
      mutationPending.current
    ) {
      return;
    }

    const task = deleteTarget;

    mutationPending.current = true;
    setBusyTaskId(task.id);
    setDeleteError("");

    try {
      await taskApi<void>(`/${task.id}`, {
        method: "DELETE",
      });

      setTasks((previous) =>
        previous.filter(
          (item) => item.id !== task.id
        )
      );

      if (expandedTaskId === task.id) {
        setExpandedTaskId(null);
      }

      setDeleteTarget(null);
      setNotice("Task deleted successfully.");
    } catch (err) {
      setDeleteError(
        getError(err, "Unable to delete task.")
      );
    } finally {
      mutationPending.current = false;
      setBusyTaskId(null);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="tm-page">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="tm-header">
        <div className="tm-heading">
          <span className="tm-logo">
            <Leaf size={27} />
          </span>

          <div>
            <h1>Task Management</h1>

            <p>
              {role === "FARMER"
                ? "Your assigned tasks, all in one place"
                : "Plan, assign and track farm activities"}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            className="tm-primary"
            disabled={
              loading || busyTaskId !== null
            }
            onClick={() => openTaskForm()}
          >
            <Plus size={18} />
            Create Task
          </button>
        )}
      </header>

      {/* MESSAGES */}

      {error && (
        <div className="tm-alert" role="alert">
          <span>{error}</span>

          <button
            type="button"
            disabled={
              loading || busyTaskId !== null
            }
            onClick={() => void loadTasks()}
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="tm-notice" role="status">
          <CheckCircle2 size={19} />

          <span>{notice}</span>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <section
        className="tm-stats"
        aria-label="Task summary"
      >
        {SUMMARY_CARDS.map(
          ({ key, title, Icon, color }) => (
            <button
              type="button"
              key={key}
              className={`tm-stat ${color}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              <span className="tm-stat-copy">
                <span>{title}</span>

                <strong>
                  {loading && tasks.length === 0
                    ? "—"
                    : counts[key]}
                </strong>
              </span>

              <span className="tm-stat-icon">
                <Icon size={23} />
              </span>
            </button>
          )
        )}
      </section>

      {/* TASK PANEL */}

      <section
        className="tm-panel"
        aria-busy={loading}
      >
        <div className="tm-toolbar">
          <div>
            <h2>
              {role === "FARMER"
                ? "My Tasks"
                : "All Tasks"}
            </h2>

            <p>
              {role === "SUPERVISOR"
                ? "Tasks across your assigned farms"
                : role === "FARMER"
                  ? "Your supervisor reviews and updates progress"
                  : "Keep every farm activity on track"}
            </p>
          </div>

          <div className="tm-tools">
            <label className="tm-search">
              <Search size={18} />

              <input
                aria-label="Search tasks"
                placeholder="Search tasks, farms or people..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>

            <button
              type="button"
              className="tm-icon"
              aria-label="Refresh tasks"
              disabled={
                loading || busyTaskId !== null
              }
              onClick={() => void loadTasks()}
            >
              <RefreshCw
                size={18}
                className={
                  loading ? "tm-spin" : ""
                }
              />
            </button>
          </div>
        </div>

        {/* FILTERS */}

        <div className="tm-filter-row">
          <div
            className="tm-tabs"
            aria-label="Filter by task status"
          >
            {FILTERS.map((status) => (
              <button
                type="button"
                key={status}
                aria-pressed={filter === status}
                className={
                  filter === status
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(status)
                }
              >
                {status === "ALL"
                  ? "All Tasks"
                  : formatLabel(status)}

                <span>{counts[status]}</span>
              </button>
            ))}
          </div>

          <div className="tm-filter-selects">
            <select
              aria-label="Filter by farm"
              value={farmFilter}
              onChange={(event) =>
                setFarmFilter(
                  event.target.value
                )
              }
            >
              <option value="">All farms</option>

              {filterFarms.map((farm) => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort tasks"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target.value as SortOrder
                )
              }
            >
              <option value="NEWEST">
                Newest first
              </option>

              <option value="DUE_DATE">
                Due date
              </option>

              <option value="PRIORITY">
                Highest priority
              </option>
            </select>
          </div>
        </div>

        {/* TASK LIST */}

        <div className="tm-list">
          {loading && tasks.length === 0 ? (
            <div className="tm-empty">
              <RefreshCw
                size={32}
                className="tm-spin"
              />

              <h3>Loading tasks...</h3>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="tm-empty">
              <ClipboardList size={40} />

              <h3>
                {error
                  ? "Tasks could not be loaded"
                  : hasFilters
                    ? "No matching tasks"
                    : "No tasks yet"}
              </h3>

              <p>
                {error
                  ? "Use Retry to load your tasks."
                  : hasFilters
                    ? "Try another search, farm or status."
                    : canManage
                      ? "Use Create Task to assign your first activity."
                      : "Your assigned tasks will appear here."}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  className="tm-secondary"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const expanded =
                expandedTaskId === task.id;

              const taskBusy =
                busyTaskId === task.id;

              return (
                <article
                  key={task.id}
                  className={`tm-task ${
                    expanded
                      ? "tm-task-expanded"
                      : ""
                  }`}
                >
                  <div className="tm-task-top">
                    <div className="tm-task-main">
                      <span
                        className={`tm-task-symbol ${
                          task.status === "COMPLETED"
                            ? "done"
                            : ""
                        }`}
                      >
                        {task.status ===
                        "COMPLETED" ? (
                          <CheckCircle2 size={22} />
                        ) : (
                          <Sprout size={22} />
                        )}
                      </span>

                      <div className="tm-task-content">
                        <div className="tm-task-title">
                          <h3>
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={`task-details-${task.id}`}
                              onClick={() =>
                                setExpandedTaskId(
                                  expanded
                                    ? null
                                    : task.id
                                )
                              }
                            >
                              {task.title}
                            </button>
                          </h3>

                          <span
                            className={`tm-priority ${task.priority.toLowerCase()}`}
                          >
                            {formatLabel(
                              task.priority
                            )}
                          </span>
                        </div>

                        {!expanded &&
                          task.description && (
                            <p className="tm-description tm-truncate">
                              {task.description}
                            </p>
                          )}

                        <div className="tm-meta">
                          <span>
                            <Leaf size={15} />
                            {task.farmName}
                          </span>

                          {task.fieldName && (
                            <span className="tm-field">
                              {task.fieldName}
                            </span>
                          )}

                          <span>
                            <CalendarDays
                              size={15}
                            />

                            {formatDate(
                              task.dueDate
                            )}
                          </span>

                          {isOverdue(task) && (
                            <span className="tm-overdue">
                              Overdue
                            </span>
                          )}

                          {isDueToday(task) && (
                            <span className="tm-due-today">
                              Due today
                            </span>
                          )}
                        </div>

                        <div className="tm-team">
                          <Users size={16} />

                          {task.workerNames
                            .slice(0, 3)
                            .map((name, index) => (
                              <span
                                className="tm-person"
                                key={`${task.id}-${index}`}
                              >
                                <span className="tm-avatar">
                                  {getInitials(name)}
                                </span>

                                {name}
                              </span>
                            ))}

                          {task.workerNames.length >
                            3 && (
                            <button
                              type="button"
                              className="tm-more-workers"
                              aria-label="View all assigned farmers"
                              onClick={() =>
                                setExpandedTaskId(
                                  task.id
                                )
                              }
                            >
                              +
                              {task.workerNames
                                .length - 3}{" "}
                              more
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="tm-task-actions">
                      <span
                        className={`tm-status ${task.status.toLowerCase()}`}
                      >
                        {formatLabel(task.status)}
                      </span>

                      {canManage && (
                        <div className="tm-row-actions">
                          <select
                            aria-label={`Status for ${task.title}`}
                            value={task.status}
                            disabled={
                              loading ||
                              busyTaskId !== null
                            }
                            onChange={(event) =>
                              void changeTaskStatus(
                                task,
                                event.target
                                  .value as TaskStatus
                              )
                            }
                          >
                            {STATUSES.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {formatLabel(
                                    status
                                  )}
                                </option>
                              )
                            )}
                          </select>

                          <button
                            type="button"
                            className="tm-icon"
                            aria-label={`Edit ${task.title}`}
                            disabled={
                              loading ||
                              busyTaskId !== null
                            }
                            onClick={() =>
                              openTaskForm(task)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="tm-icon tm-delete"
                            aria-label={`Delete ${task.title}`}
                            disabled={
                              loading ||
                              busyTaskId !== null
                            }
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget(task);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}

                      {taskBusy && (
                        <span
                          className="tm-saving"
                          role="status"
                        >
                          <RefreshCw
                            size={14}
                            className="tm-spin"
                          />
                          Updating...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED DETAILS */}

                  <div
                    id={`task-details-${task.id}`}
                    hidden={!expanded}
                    className="tm-details"
                  >
                    <div className="tm-detail-grid">
                      <div>
                        <span className="tm-detail-label">
                          DESCRIPTION
                        </span>

                        <p className="tm-full-description">
                          {task.description ||
                            "No description has been added."}
                        </p>
                      </div>

                      <div>
                        <span className="tm-detail-label">
                          SUPERVISING OFFICER
                        </span>

                        <p className="tm-supervisor">
                          <ShieldCheck size={18} />

                          {task.supervisorName ||
                            "No supervisor assigned"}
                        </p>

                        <span className="tm-detail-label">
                          WORK AREA
                        </span>

                        <p>
                          {task.fieldName ||
                            "Entire farm"}
                        </p>
                      </div>
                    </div>

                    <div className="tm-detail-team">
                      <span className="tm-detail-label">
                        ASSIGNED FARMERS ·{" "}
                        {task.workerNames.length}
                      </span>

                      <div className="tm-team">
                        {task.workerNames.map(
                          (name, index) => (
                            <span
                              className="tm-person"
                              key={`detail-${task.id}-${index}`}
                            >
                              <span className="tm-avatar">
                                {getInitials(name)}
                              </span>

                              {name}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tm-expand-button"
                    aria-expanded={expanded}
                    aria-controls={`task-details-${task.id}`}
                    onClick={() =>
                      setExpandedTaskId(
                        expanded ? null : task.id
                      )
                    }
                  >
                    {expanded
                      ? "Hide details"
                      : "View details"}

                    {expanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </article>
              );
            })
          )}
        </div>

        <footer className="tm-panel-footer">
          <span>
            Showing {filteredTasks.length} of{" "}
            {tasks.length} tasks
          </span>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          )}
        </footer>
      </section>

      {/* CREATE / EDIT MODAL */}

      {showForm && (
        <Modal
          titleId="task-form-title"
          onCancel={closeTaskForm}
        >
          <form
            className="tm-form"
            onSubmit={handleSubmit}
          >
            <header className="tm-modal-header">
              <div>
                <span className="tm-eyebrow">
                  FARM ACTIVITIES
                </span>

                <h2 id="task-form-title">
                  {editingTaskId === null
                    ? "Create Task"
                    : "Edit Task"}
                </h2>

                <p>
                  Choose the location, assign your
                  team and set the schedule.
                </p>
              </div>

              <button
                type="button"
                className="tm-icon"
                aria-label="Close task form"
                disabled={saving}
                onClick={closeTaskForm}
              >
                <X size={21} />
              </button>
            </header>

            <div className="tm-form-body">
              {formError && (
                <div
                  className="tm-alert"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              {optionsError && (
                <div
                  className="tm-alert"
                  role="alert"
                >
                  <span>{optionsError}</span>

                  <button
                    type="button"
                    disabled={optionsLoading}
                    onClick={() =>
                      setOptionsRetry(
                        (previous) => previous + 1
                      )
                    }
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* DETAILS */}

              <fieldset disabled={saving}>
                <legend className="tm-section-title">
                  <span>01</span>
                  Task details
                </legend>

                <label className="tm-input-label">
                  Task title <b>*</b>

                  <input
                    autoFocus
                    required
                    maxLength={255}
                    placeholder="e.g. Inspect the irrigation system"
                    value={form.title}
                    onChange={(event) =>
                      updateForm(
                        "title",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="tm-input-label">
                  Description

                  <textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Explain the work, equipment needed and what the supervisor should check..."
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value
                      )
                    }
                  />

                  <small className="tm-character-count">
                    {form.description.length}/1000
                    characters
                  </small>
                </label>
              </fieldset>

              {/* LOCATION AND TEAM */}

              <fieldset disabled={saving}>
                <legend className="tm-section-title">
                  <span>02</span>
                  Location & team
                </legend>

                <div className="tm-grid">
                  <label className="tm-input-label">
                    Farm <b>*</b>

                    <select
                      required
                      value={form.farmId}
                      disabled={optionsLoading}
                      onChange={(event) =>
                        changeFarm(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select a farm
                      </option>

                      {options.farms.map((farm) => (
                        <option
                          key={farm.id}
                          value={farm.id}
                        >
                          {farm.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="tm-input-label">
                    Field <small>Optional</small>

                    <select
                      value={form.fieldId}
                      disabled={
                        !form.farmId ||
                        optionsLoading ||
                        !!optionsError
                      }
                      onChange={(event) =>
                        updateForm(
                          "fieldId",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Entire farm / no specific field
                      </option>

                      {options.fields.map(
                        (field) => (
                          <option
                            key={field.id}
                            value={field.id}
                          >
                            {field.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <p className="tm-help">
                  Changing the farm clears the selected
                  field, supervisor and farmers.
                </p>

                <label className="tm-input-label">
                  Supervising officer <b>*</b>

                  <select
                    required
                    value={form.supervisorId}
                    disabled={
                      !form.farmId ||
                      optionsLoading ||
                      !!optionsError
                    }
                    onChange={(event) =>
                      updateForm(
                        "supervisorId",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select a supervisor
                    </option>

                    {options.supervisors.map(
                      (supervisor) => (
                        <option
                          key={supervisor.id}
                          value={supervisor.id}
                        >
                          {supervisor.name}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {form.farmId &&
                  !optionsLoading &&
                  !optionsError &&
                  options.supervisors.length ===
                    0 && (
                    <p className="tm-hint">
                      No active supervisor is assigned
                      to this farm. Update farm
                      assignments in User Management
                      first.
                    </p>
                  )}

                {/* FARMER MULTI-SELECTION */}

                <div className="tm-worker-heading">
                  <span>
                    Assign farmers <b>*</b>
                  </span>

                  <span aria-live="polite">
                    {form.workerIds.length} selected
                  </span>
                </div>

                <div className="tm-selection-actions">
                  <button
                    type="button"
                    disabled={
                      optionsLoading ||
                      !!optionsError ||
                      filteredWorkers.length === 0
                    }
                    onClick={selectAllShownWorkers}
                  >
                    Select all shown
                  </button>

                  <button
                    type="button"
                    disabled={
                      form.workerIds.length === 0
                    }
                    onClick={() =>
                      updateForm("workerIds", [])
                    }
                  >
                    Clear selection
                  </button>
                </div>

                {selectedWorkers.length > 0 && (
                  <div
                    className="tm-selected-chips"
                    aria-label="Selected farmers"
                  >
                    {selectedWorkers.map((worker) => (
                      <button
                        type="button"
                        key={worker.id}
                        aria-label={`Remove ${worker.name}`}
                        onClick={() =>
                          toggleWorker(
                            worker.id,
                            false
                          )
                        }
                      >
                        {worker.name}
                        <X size={14} />
                      </button>
                    ))}
                  </div>
                )}

                <div className="tm-worker-box">
                  <label className="tm-search">
                    <Search size={17} />

                    <input
                      aria-label="Search farmers"
                      placeholder="Search farmers..."
                      value={workerSearch}
                      disabled={
                        !form.farmId ||
                        optionsLoading ||
                        !!optionsError
                      }
                      onChange={(event) =>
                        setWorkerSearch(
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <div className="tm-worker-list">
                    {optionsLoading ? (
                      <p className="tm-worker-empty">
                        Loading farm and team
                        selections...
                      </p>
                    ) : optionsError ? (
                      <p className="tm-worker-empty">
                        Use Retry above to load your team.
                      </p>
                    ) : !form.farmId ? (
                      <p className="tm-worker-empty">
                        Select a farm to see its farmers.
                      </p>
                    ) : filteredWorkers.length === 0 ? (
                      <p className="tm-worker-empty">
                        {workerSearch
                          ? "No farmers match your search."
                          : "No active farmers are assigned to this farm."}
                      </p>
                    ) : (
                      filteredWorkers.map((worker) => {
                        const selected =
                          form.workerIds.includes(
                            worker.id
                          );

                        return (
                          <label
                            key={worker.id}
                            className={`tm-worker ${
                              selected
                                ? "selected"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) =>
                                toggleWorker(
                                  worker.id,
                                  event.target.checked
                                )
                              }
                            />

                            <span className="tm-avatar">
                              {getInitials(
                                worker.name
                              )}
                            </span>

                            <span>
                              {worker.name}
                              <small>Farmer</small>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {hasUnavailableWorkers && (
                  <p className="tm-hint">
                    Some previously selected farmers
                    are no longer available.{" "}

                    <button
                      type="button"
                      onClick={() =>
                        updateForm(
                          "workerIds",
                          form.workerIds.filter(
                            (id) =>
                              options.workers.some(
                                (worker) =>
                                  worker.id === id
                              )
                          )
                        )
                      }
                    >
                      Remove unavailable selections
                    </button>
                  </p>
                )}
              </fieldset>

              {/* SCHEDULE */}

              <fieldset disabled={saving}>
                <legend className="tm-section-title">
                  <span>03</span>
                  Schedule & progress
                </legend>

                <div className="tm-grid tm-three">
                  <label className="tm-input-label">
                    Priority <b>*</b>

                    <select
                      value={form.priority}
                      onChange={(event) =>
                        updateForm(
                          "priority",
                          event.target
                            .value as TaskPriority
                        )
                      }
                    >
                      {PRIORITIES.map(
                        (priority) => (
                          <option
                            key={priority}
                            value={priority}
                          >
                            {formatLabel(priority)}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="tm-input-label">
                    Status <b>*</b>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target
                            .value as TaskStatus
                        )
                      }
                    >
                      {STATUSES.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {formatLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="tm-input-label">
                    Due date <b>*</b>

                    <input
                      type="date"
                      required
                      value={form.dueDate}
                      onChange={(event) =>
                        updateForm(
                          "dueDate",
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>

                {form.dueDate &&
                  form.dueDate < today &&
                  form.status !== "COMPLETED" &&
                  form.status !== "CANCELLED" && (
                    <p className="tm-hint">
                      This date is in the past.
                      The task will appear as overdue.
                    </p>
                  )}
              </fieldset>
            </div>

            {/* FOOTER */}

            <footer className="tm-modal-footer">
              <span>
                <b>*</b> Required fields
              </span>

              <div>
                <button
                  type="button"
                  className="tm-secondary"
                  disabled={saving}
                  onClick={closeTaskForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tm-primary"
                  disabled={
                    saving ||
                    optionsLoading ||
                    !!optionsError
                  }
                >
                  {saving && (
                    <RefreshCw
                      size={16}
                      className="tm-spin"
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : editingTaskId === null
                      ? "Create Task"
                      : "Save Changes"}
                </button>
              </div>
            </footer>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION */}

      {deleteTarget && (
        <Modal
          compact
          titleId="task-delete-title"
          onCancel={() => {
            if (!mutationPending.current) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="tm-confirm-content">
            <span className="tm-confirm-icon">
              <Trash2 size={25} />
            </span>

            <h2 id="task-delete-title">
              Delete this task?
            </h2>

            <p>
              “{deleteTarget.title}” and its farmer
              assignments will be removed.
              This cannot be undone.
            </p>

            {deleteError && (
              <div
                className="tm-alert"
                role="alert"
              >
                {deleteError}
              </div>
            )}

            <div className="tm-confirm-actions">
              <button
                autoFocus
                type="button"
                className="tm-secondary"
                disabled={busyTaskId !== null}
                onClick={() =>
                  setDeleteTarget(null)
                }
              >
                Keep task
              </button>

              <button
                type="button"
                className="tm-primary tm-danger"
                disabled={busyTaskId !== null}
                onClick={() =>
                  void confirmDelete()
                }
              >
                {busyTaskId !== null
                  ? "Deleting..."
                  : "Delete task"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* UNSAVED CHANGES CONFIRMATION */}

      {showDiscard && (
        <Modal
          compact
          titleId="task-discard-title"
          onCancel={() =>
            setShowDiscard(false)
          }
        >
          <div className="tm-confirm-content">
            <h2 id="task-discard-title">
              Discard unsaved changes?
            </h2>

            <p>
              Your changes have not been saved.
              Continue editing to keep working,
              or discard them to close the form.
            </p>

            <div className="tm-confirm-actions">
              <button
                autoFocus
                type="button"
                className="tm-secondary"
                onClick={() =>
                  setShowDiscard(false)
                }
              >
                Keep editing
              </button>

              <button
                type="button"
                className="tm-primary tm-danger"
                onClick={discardChanges}
              >
                Discard changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* =========================================================
   COMPLETE DESIGN
   Strong readable text and normal solid colours.
========================================================= */

const styles = `
/* BASE */

.tm-page {
  --tm-ink: #172d22;
  --tm-green: #166534;
  --tm-border: #c9d4cb;
  --tm-muted: #46574b;

  min-height: 100%;
  padding: 28px;
  background: #f3f5f3;
  color: var(--tm-ink);

  font-family: inherit;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

.tm-page *,
.tm-page *::before,
.tm-page *::after {
  box-sizing: border-box;
}

.tm-page h1,
.tm-page h2,
.tm-page h3,
.tm-page p {
  margin: 0;
}

.tm-page button,
.tm-page input,
.tm-page select,
.tm-page textarea {
  font: inherit;
}

.tm-page button {
  cursor: pointer;
  transition:
    background-color .16s ease,
    border-color .16s ease,
    color .16s ease,
    box-shadow .16s ease;
}

.tm-page button:disabled {
  cursor: not-allowed;
  opacity: .65;
}

.tm-page input:disabled,
.tm-page select:disabled,
.tm-page textarea:disabled {
  color: #59645c;
  background: #e9eeea;
  cursor: not-allowed;
}

.tm-page button:focus-visible,
.tm-page input:focus-visible,
.tm-page select:focus-visible,
.tm-page textarea:focus-visible {
  outline: 3px solid #337b46;
  outline-offset: 3px;
}

.tm-page input::placeholder,
.tm-page textarea::placeholder {
  color: #657168;
  opacity: 1;
}

.tm-page [hidden] {
  display: none !important;
}

.tm-page svg {
  flex-shrink: 0;
}

/* HEADER */

.tm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  padding: 28px 30px;
  margin-bottom: 24px;

  border: 1px solid #16432b;
  border-radius: 16px;

  color: #ffffff;
  background: #16432b;

  box-shadow: 0 6px 18px rgba(22, 67, 43, .1);
}

.tm-heading {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.tm-logo {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 55px;
  height: 55px;

  border: 1px solid #638771;
  border-radius: 14px;

  color: #ffffff;
  background: #285b3d;
}

.tm-header h1 {
  color: #ffffff;
  font-size: 29px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -.7px;
}

.tm-header p {
  margin-top: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 450;
  line-height: 1.65;
}

/* BUTTONS */

.tm-primary,
.tm-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  min-height: 43px;
  padding: 11px 17px;

  border: 1px solid transparent;
  border-radius: 9px;

  font-size: 13px !important;
  font-weight: 700 !important;
  line-height: 1.4;
  white-space: nowrap;
}

.tm-primary {
  color: #ffffff;
  background: #166534;
  border-color: #166534;
}

.tm-primary:hover:not(:disabled) {
  background: #104e28;
  border-color: #104e28;
}

.tm-header > .tm-primary {
  color: #16432b;
  background: #ffffff;
  border-color: #ffffff;
}

.tm-header > .tm-primary:hover:not(:disabled) {
  color: #10371f;
  background: #e7efe9;
  border-color: #e7efe9;
}

.tm-header button:focus-visible,
.tm-modal-header button:focus-visible {
  outline-color: #ffffff;
}

.tm-secondary {
  color: #294c35;
  background: #ffffff;
  border-color: #9eb3a4;
}

.tm-secondary:hover:not(:disabled) {
  background: #e7efe8;
  border-color: #6a8c73;
}

.tm-danger {
  color: #ffffff;
  background: #b42318;
  border-color: #b42318;
}

.tm-danger:hover:not(:disabled) {
  background: #921d14;
  border-color: #921d14;
}

.tm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  width: 39px;
  height: 39px;
  padding: 0;

  border: 1px solid #b7c8bc;
  border-radius: 9px;

  color: #345c40;
  background: #ffffff;
}

.tm-icon:hover:not(:disabled) {
  color: #16432b;
  background: #e4eee6;
  border-color: #6e9378;
}

.tm-delete {
  color: #b42318;
}

.tm-delete:hover:not(:disabled) {
  color: #921d14;
  background: #fbe9e6;
  border-color: #cf8d84;
}

/* ALERTS */

.tm-alert,
.tm-notice {
  display: flex;
  align-items: center;
  gap: 11px;

  padding: 13px 16px;
  margin-bottom: 18px;

  border: 1px solid;
  border-radius: 10px;

  font-size: 13px;
  font-weight: 500;
  line-height: 1.7;
}

.tm-alert {
  color: #8f281c;
  background: #fff4f1;
  border-color: #d6a296;
}

.tm-notice {
  color: #20572f;
  background: #edf6ec;
  border-color: #9fbea3;
}

.tm-alert > span,
.tm-notice > span {
  flex: 1;
}

.tm-alert button,
.tm-notice button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 5px;
  border: 0;
  border-radius: 5px;

  color: inherit;
  background: transparent;
}

.tm-alert button {
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* SUMMARY CARDS */

.tm-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 24px;
}

.tm-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  padding: 22px;

  text-align: left;
  color: #183524;
  background: #ffffff;

  border: 1px solid #c9d4cb;
  border-radius: 13px;

  box-shadow: 0 3px 10px rgba(30, 52, 35, .035);
}

.tm-stat:hover {
  border-color: #759a7e;
  box-shadow: 0 5px 16px rgba(30, 52, 35, .07);
}

.tm-stat[aria-pressed="true"] {
  border-color: #296b3f;
  box-shadow: 0 0 0 1px #296b3f;
}

.tm-stat-copy > span {
  display: block;
  color: #3a5041;
  font-size: 13px;
  font-weight: 650;
}

.tm-stat-copy strong {
  display: block;
  margin-top: 10px;

  color: #163d26;
  font-size: 33px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.8px;
  font-variant-numeric: tabular-nums;
}

.tm-stat-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 46px;
  height: 46px;
  border-radius: 12px;
}

.tm-stat.blue .tm-stat-icon {
  color: #ffffff;
  background: #2457b8;
}

.tm-stat.orange .tm-stat-icon {
  color: #ffffff;
  background: #a54b08;
}

.tm-stat.orange strong {
  color: #914000;
}

.tm-stat.green .tm-stat-icon {
  color: #ffffff;
  background: #166534;
}

.tm-stat.green strong {
  color: #166534;
}

/* PANEL */

.tm-panel {
  overflow: hidden;

  border: 1px solid #c9d4cb;
  border-radius: 15px;

  background: #ffffff;
  box-shadow: 0 4px 16px rgba(32, 54, 36, .035);
}

.tm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  padding: 24px 24px 19px;
}

.tm-toolbar h2 {
  color: #1d3926;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -.3px;
}

.tm-toolbar p {
  margin-top: 6px;
  color: #4c5d50;
  font-size: 13px;
  line-height: 1.6;
}

.tm-tools {
  display: flex;
  align-items: center;
  gap: 9px;
}

.tm-search {
  display: flex;
  align-items: center;
  gap: 9px;

  min-height: 42px;
  padding: 10px 12px;

  border: 1px solid #b7c8bc;
  border-radius: 9px;

  color: #496050;
  background: #ffffff;
}

.tm-search:focus-within {
  border-color: #337b46;
  box-shadow: 0 0 0 3px rgba(51, 123, 70, .1);
}

.tm-search input {
  width: 235px;
  min-width: 0;
  padding: 0;

  border: 0;
  outline: 0;

  color: #213a28;
  background: transparent;

  font-size: 13px;
  font-weight: 500;
}

.tm-search input:focus-visible {
  outline: 0;
}

.tm-search button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 2px;
  border: 0;

  color: #3f5846;
  background: transparent;
}

/* FILTERS */

.tm-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 13px;

  padding: 0 24px 21px;
}

.tm-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  padding: 5px;
  border: 1px solid #c7d4c8;
  border-radius: 10px;

  background: #e9eeea;
}

.tm-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 7px;

  min-height: 35px;
  padding: 7px 10px;

  border: 0;
  border-radius: 7px;

  color: #354d3c;
  background: transparent;

  font-size: 12px;
  font-weight: 650;
}

.tm-tabs button:hover {
  color: #173e25;
  background: #d9e5da;
}

.tm-tabs button.active {
  color: #ffffff;
  background: #166534;
}

.tm-tabs button > span {
  min-width: 20px;
  padding: 2px 5px;

  border-radius: 4px;

  color: #2c4632;
  background: #d3dfd4;

  text-align: center;
  font-size: 10px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.tm-tabs button.active > span {
  color: #ffffff;
  background: #104b27;
}

.tm-filter-selects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tm-filter-selects select,
.tm-row-actions select {
  max-width: 175px;
  min-height: 37px;
  padding: 8px 10px;

  border: 1px solid #b3c4b7;
  border-radius: 8px;

  color: #304b36;
  background: #ffffff;

  font-size: 12px;
  font-weight: 600;
}

/* TASK LIST */

.tm-list {
  display: flex;
  flex-direction: column;
  gap: 13px;

  padding: 0 24px 22px;
}

.tm-task {
  overflow: hidden;

  border: 1px solid #c3d0c5;
  border-radius: 12px;

  background: #ffffff;

  transition:
    border-color .16s ease,
    box-shadow .16s ease;
}

.tm-task:hover {
  border-color: #709777;
  box-shadow: 0 4px 14px rgba(39, 72, 44, .055);
}

.tm-task-expanded {
  border-color: #55865f;
}

.tm-task-top {
  display: flex;
  justify-content: space-between;
  gap: 20px;

  padding: 21px;
}

.tm-task-main {
  display: flex;
  flex: 1;
  gap: 14px;
  min-width: 0;
}

.tm-task-symbol {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 39px;
  height: 39px;

  border: 1px solid #356d41;
  border-radius: 10px;

  color: #ffffff;
  background: #356d41;
}

.tm-task-symbol.done {
  color: #ffffff;
  background: #166534;
  border-color: #166534;
}

.tm-task-content {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}

.tm-task-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.tm-task-title h3 {
  min-width: 0;

  font-size: 16px;
  font-weight: 750;
  line-height: 1.5;
}

.tm-task-title h3 button {
  padding: 0;
  border: 0;

  color: #1c3c25;
  background: transparent;

  text-align: left;
  font-weight: inherit;
  overflow-wrap: anywhere;
}

.tm-task-title h3 button:hover {
  color: #166534;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.tm-description {
  margin-top: 8px !important;

  color: #435446;
  font-size: 13px;
  font-weight: 450;
  line-height: 1.8;

  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.tm-truncate {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* PRIORITY */

.tm-priority {
  display: inline-flex;
  align-items: center;

  padding: 5px 8px;
  border-radius: 5px;

  font-size: 10px;
  font-weight: 750;
  line-height: 1.3;
}

.tm-priority.low {
  color: #ffffff;
  background: #3f6212;
}

.tm-priority.medium {
  color: #ffffff;
  background: #854d0e;
}

.tm-priority.high {
  color: #ffffff;
  background: #b42318;
}

.tm-priority.urgent {
  color: #ffffff;
  background: #881337;
}

/* METADATA */

.tm-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px 15px;

  margin-top: 12px;

  color: #3f5745;
  font-size: 12px;
  font-weight: 550;
  line-height: 1.5;
}

.tm-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.tm-field {
  padding: 4px 7px;
  border-radius: 5px;
  color: #ffffff;
  background: #44662d;
  font-size: 11px;
  font-weight: 650;
}

.tm-overdue {
  padding: 4px 7px;
  border-radius: 5px;
  color: #ffffff;
  background: #b42318;
  font-size: 11px;
  font-weight: 700;
}

.tm-due-today {
  padding: 4px 7px;
  border-radius: 5px;
  color: #ffffff;
  background: #854d0e;
  font-size: 11px;
  font-weight: 700;
}

/* TEAM */

.tm-team {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  margin-top: 12px;
  color: #3f5d45;
}

.tm-person {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  color: #34513b;
  font-size: 12px;
  font-weight: 550;
  line-height: 1.5;
}

.tm-avatar {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;

  width: 28px;
  height: 28px;

  border: 2px solid #ffffff;
  border-radius: 50%;

  color: #ffffff;
  background: #376f45;

  font-size: 9px;
  font-weight: 750;
}

.tm-team .tm-person:nth-of-type(3n + 2) .tm-avatar {
  background: #285a83;
}

.tm-team .tm-person:nth-of-type(3n + 3) .tm-avatar {
  background: #76551b;
}

.tm-more-workers {
  padding: 5px 8px;

  border: 1px solid #315d3b;
  border-radius: 6px;

  color: #ffffff;
  background: #315d3b;

  font-size: 11px !important;
  font-weight: 650;
}

.tm-more-workers:hover {
  background: #21442b;
}

/* STATUS AND ACTIONS */

.tm-task-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 17px;
}

.tm-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 6px 10px;
  border: 1px solid;
  border-radius: 18px;

  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
  white-space: nowrap;
}

.tm-status::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.tm-status.pending {
  color: #ffffff;
  background: #96500b;
  border-color: #96500b;
}

.tm-status.in_progress {
  color: #ffffff;
  background: #2457b8;
  border-color: #2457b8;
}

.tm-status.completed {
  color: #ffffff;
  background: #166534;
  border-color: #166534;
}

.tm-status.cancelled {
  color: #ffffff;
  background: #475569;
  border-color: #475569;
}

.tm-row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tm-row-actions select {
  max-width: 127px;
  min-height: 34px;
  padding: 6px 8px;
  font-size: 11px;
}

.tm-row-actions .tm-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

.tm-saving {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  color: #375c40;
  font-size: 11px;
  font-weight: 600;
}

/* EXPANDED DETAILS */

.tm-details {
  margin: 0 21px 15px 74px;
  padding: 19px;

  border: 1px solid #c5d4c4;
  border-radius: 10px;

  background: #f4f7f2;
}

.tm-detail-grid {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 24px;
}

.tm-detail-label {
  display: block;
  margin-bottom: 8px;

  color: #3d5938;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .7px;
}

.tm-details p {
  color: #354b31;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.85;
}

.tm-full-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.tm-supervisor {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 17px !important;
}

.tm-detail-team {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid #cfdbca;
}

.tm-expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  width: 100%;
  min-height: 37px;
  padding: 8px;

  border: 0;
  border-top: 1px solid #d7e1d3;

  color: #335a2b;
  background: #f0f5ed;

  font-size: 12px !important;
  font-weight: 650;
}

.tm-expand-button:hover {
  color: #1b3f16;
  background: #e2ecd9;
}

/* PANEL FOOTER */

.tm-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  padding: 15px 24px;
  border-top: 1px solid #d5dfd1;

  color: #485d40;
  background: #f8faf6;

  font-size: 12px;
  font-weight: 500;
}

.tm-panel-footer button {
  padding: 3px;
  border: 0;

  color: #31551f;
  background: transparent;

  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* EMPTY STATE */

.tm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;

  padding: 60px 20px;
  color: #466b36;
  text-align: center;
}

.tm-empty > svg {
  box-sizing: content-box;
  padding: 18px;

  border: 1px solid #becfb3;
  border-radius: 18px;

  background: #eef4e8;
}

.tm-empty h3 {
  margin-top: 4px;
  color: #2d4824;
  font-size: 19px;
  font-weight: 750;
}

.tm-empty p {
  max-width: 390px;
  color: #516345;
  font-size: 13px;
  line-height: 1.85;
}

/* MODAL */

.tm-modal {
  width: min(730px, calc(100vw - 28px));
  max-height: calc(100dvh - 36px);

  margin: auto;
  padding: 0;

  border: 1px solid #bdcebd;
  border-radius: 16px;

  color: #223c22;
  background: #ffffff;

  box-shadow: 0 25px 90px rgba(18, 42, 24, .25);
  animation: tm-modal-enter .16s ease-out;
}

.tm-modal::backdrop {
  background: rgba(17, 35, 21, .52);
  backdrop-filter: blur(4px);
}

.tm-modal-compact {
  width: min(455px, calc(100vw - 28px));
}

.tm-form {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 38px);
}

.tm-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;

  padding: 25px 27px;
  border-bottom: 1px solid #16432b;

  color: #ffffff;
  background: #16432b;
}

.tm-eyebrow {
  display: inline-block;
  padding: 5px 8px;

  border: 1px solid #6a8d6e;
  border-radius: 5px;

  color: #ffffff;
  background: #2b5737;

  font-size: 9px;
  font-weight: 750;
  letter-spacing: 1.2px;
}

.tm-modal-header h2 {
  margin-top: 10px;

  color: #ffffff;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -.5px;
}

.tm-modal-header p {
  margin-top: 8px;

  color: #ffffff;
  font-size: 13px;
  line-height: 1.7;
}

.tm-modal-header .tm-icon {
  color: #ffffff;
  background: #2a583a;
  border-color: #6a8d72;
}

.tm-modal-header .tm-icon:hover:not(:disabled) {
  color: #ffffff;
  background: #386949;
  border-color: #9cbda3;
}

/* FORM */

.tm-form-body {
  overflow-y: auto;
  padding: 25px 27px;

  scrollbar-width: thin;
  scrollbar-color: #829a78 transparent;
}

.tm-form-body fieldset {
  min-width: 0;
  margin: 0 0 23px;
  padding: 0 0 22px;

  border: 0;
  border-bottom: 1px solid #dce4d6;
}

.tm-form-body fieldset:last-child {
  margin: 0;
  padding-bottom: 0;
  border-bottom: 0;
}

.tm-section-title {
  display: flex;
  align-items: center;
  gap: 10px;

  margin-bottom: 18px;

  color: #2f4c25;
  font-size: 14px;
  font-weight: 750;
}

.tm-section-title > span {
  display: inline-grid;
  place-items: center;

  width: 28px;
  height: 28px;

  border: 1px solid #416425;
  border-radius: 8px;

  color: #ffffff;
  background: #416425;

  font-size: 10px;
  font-weight: 750;
}

.tm-input-label {
  display: block;
  margin-bottom: 15px;

  color: #354c2b;
  font-size: 13px;
  font-weight: 700;
}

.tm-input-label b,
.tm-worker-heading b,
.tm-modal-footer b {
  color: #a72e22;
}

.tm-input-label > small {
  margin-left: 5px;
  color: #5a684d;
  font-size: 11px;
  font-weight: 500;
}

.tm-input-label > input,
.tm-input-label > select,
.tm-input-label > textarea {
  display: block;
  width: 100%;
  min-width: 0;

  margin-top: 8px;
  padding: 11px 12px;

  border: 1px solid #b5c5a9;
  border-radius: 9px;

  color: #253c1e;
  background: #ffffff;

  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;

  transition:
    border-color .15s ease,
    box-shadow .15s ease;
}

.tm-input-label > input:hover:not(:disabled),
.tm-input-label > select:hover:not(:disabled),
.tm-input-label > textarea:hover:not(:disabled) {
  border-color: #7d9a69;
}

.tm-input-label > input:focus,
.tm-input-label > select:focus,
.tm-input-label > textarea:focus {
  border-color: #477633;
  box-shadow: 0 0 0 3px rgba(71, 118, 51, .1);
}

.tm-input-label textarea {
  resize: vertical;
  min-height: 110px;
}

.tm-character-count {
  display: block;
  margin-top: 6px;
  text-align: right;
}

.tm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.tm-three {
  grid-template-columns: 1fr 1fr 1.2fr;
}

.tm-help {
  margin: -3px 0 17px !important;

  color: #57684a;
  font-size: 12px;
  font-weight: 450;
  line-height: 1.75;
}

/* FARMER SELECTION */

.tm-worker-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  margin-top: 18px;

  color: #344e25;
  font-size: 13px;
  font-weight: 750;
}

.tm-worker-heading > span:last-child {
  padding: 5px 8px;

  border: 1px solid #416425;
  border-radius: 6px;

  color: #ffffff;
  background: #416425;

  font-size: 11px;
  font-weight: 700;
}

.tm-selection-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  margin: 9px 0;
}

.tm-selection-actions button {
  padding: 5px 0;
  border: 0;

  color: #3b6223;
  background: transparent;

  font-size: 12px;
  font-weight: 700;
}

.tm-selection-actions button:hover:not(:disabled) {
  color: #244813;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tm-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
}

.tm-selected-chips button {
  display: inline-flex;
  align-items: center;
  gap: 7px;

  padding: 6px 10px;
  border: 1px solid #416425;
  border-radius: 18px;

  color: #ffffff;
  background: #416425;

  font-size: 12px;
  font-weight: 600;
}

.tm-selected-chips button:hover:not(:disabled) {
  background: #2d4b18;
  border-color: #2d4b18;
}

.tm-worker-box {
  overflow: hidden;
  border: 1px solid #b0c29f;
  border-radius: 10px;
  background: #ffffff;
}

.tm-worker-box .tm-search {
  padding: 12px;

  border: 0;
  border-bottom: 1px solid #c7d5b9;
  border-radius: 0;

  color: #486532;
  background: #f5f8f0;
}

.tm-worker-box .tm-search input {
  width: 100%;
}

.tm-worker-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;

  max-height: 210px;
  overflow-y: auto;
  padding: 9px;

  scrollbar-width: thin;
  scrollbar-color: #8caa72 transparent;
}

.tm-worker {
  display: flex;
  align-items: center;
  gap: 9px;

  padding: 11px 10px;

  border: 1px solid transparent;
  border-radius: 8px;

  color: #354f24;
  background: #ffffff;

  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  transition:
    background-color .15s ease,
    border-color .15s ease;
}

.tm-worker:hover {
  background: #eef4e6;
}

.tm-worker.selected {
  color: #274117;
  background: #e7f0db;
  border-color: #8eaa73;
}

.tm-worker input {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  accent-color: #416425;
  cursor: pointer;
}

.tm-worker .tm-avatar {
  width: 33px;
  height: 33px;
  color: #ffffff;
  background: #416425;
  font-size: 10px;
}

.tm-worker small {
  display: block;
  margin-top: 3px;
  color: #576b44;
  font-size: 11px;
  font-weight: 450;
}

.tm-worker-empty {
  grid-column: 1 / -1;
  padding: 25px 12px;

  color: #52683d;
  font-size: 13px;
  line-height: 1.8;
  text-align: center;
}

.tm-hint {
  margin-top: 11px !important;
  margin-bottom: 11px !important;
  padding: 11px 12px;

  border: 1px solid #d5bd83;
  border-radius: 8px;

  color: #715016;
  background: #fff8e7;

  font-size: 12px;
  font-weight: 450;
  line-height: 1.8;
}

.tm-hint button {
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* MODAL FOOTER */

.tm-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  padding: 18px 27px;

  border-top: 1px solid #d2dfc6;
  background: #f8faf4;
}

.tm-modal-footer > span {
  color: #52673c;
  font-size: 12px;
  font-weight: 500;
}

.tm-modal-footer > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

/* CONFIRMATION MODALS */

.tm-confirm-content {
  padding: 29px;
}

.tm-confirm-content h2 {
  color: #2b451c;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.4;
  letter-spacing: -.4px;
}

.tm-confirm-content > p {
  margin-top: 13px;
  margin-bottom: 24px;

  color: #4e613d;
  font-size: 14px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.tm-confirm-icon {
  display: inline-grid;
  place-items: center;

  width: 51px;
  height: 51px;
  margin-bottom: 18px;

  border: 1px solid #b42318;
  border-radius: 13px;

  color: #ffffff;
  background: #b42318;
}

.tm-confirm-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

/* ANIMATIONS */

.tm-spin {
  animation: tm-spin 1s linear infinite;
}

@keyframes tm-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes tm-modal-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* TABLET */

@media (max-width: 1100px) {
  .tm-page {
    padding: 22px 18px;
  }

  .tm-header {
    padding: 25px;
  }

  .tm-stats {
    gap: 12px;
  }

  .tm-stat {
    padding: 19px;
  }

  .tm-tools .tm-search input {
    width: 190px;
  }
}

/* MOBILE */

@media (max-width: 760px) {
  .tm-page {
    padding: 17px 13px;
  }

  .tm-header {
    gap: 15px;
    padding: 23px 20px;
    border-radius: 13px;
  }

  .tm-logo {
    display: none;
  }

  .tm-header h1 {
    font-size: 24px;
  }

  .tm-header p {
    max-width: 245px;
    font-size: 13px;
  }

  .tm-header > .tm-primary {
    padding: 10px 13px;
  }

  .tm-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 11px;
    margin-bottom: 20px;
  }

  .tm-stat {
    padding: 18px;
  }

  .tm-stat-copy > span {
    font-size: 12px;
  }

  .tm-stat-copy strong {
    font-size: 30px;
  }

  .tm-stat-icon {
    width: 41px;
    height: 41px;
    border-radius: 10px;
  }

  .tm-toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 21px 17px 17px;
  }

  .tm-tools .tm-search {
    flex: 1;
  }

  .tm-tools .tm-search input {
    width: 100%;
  }

  .tm-filter-row {
    padding: 0 17px 18px;
  }

  .tm-tabs {
    width: 100%;
  }

  .tm-tabs button {
    padding: 7px 8px;
    font-size: 12px;
  }

  .tm-filter-selects {
    width: 100%;
  }

  .tm-filter-selects select {
    flex: 1;
    min-width: 0;
    max-width: none;
  }

  .tm-list {
    padding: 0 17px 19px;
  }

  .tm-task-top {
    flex-direction: column;
    gap: 16px;
    padding: 17px;
  }

  .tm-task-main {
    gap: 11px;
  }

  .tm-task-title h3 {
    font-size: 15px;
  }

  .tm-task-symbol {
    width: 35px;
    height: 35px;
    border-radius: 9px;
  }

  .tm-task-actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-left: 46px;
  }

  .tm-details {
    margin: 0 17px 13px;
    padding: 16px;
  }

  .tm-detail-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .tm-modal {
    border-radius: 14px;
  }

  .tm-modal-header {
    padding: 23px 20px;
  }

  .tm-modal-header h2 {
    font-size: 24px;
  }

  .tm-form-body {
    padding: 22px 20px;
  }

  .tm-three {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .tm-worker-list {
    grid-template-columns: 1fr;
  }

  .tm-modal-footer {
    padding: 17px 20px;
  }

  .tm-confirm-content {
    padding: 25px;
  }

  .tm-input-label > input,
  .tm-input-label > select,
  .tm-input-label > textarea,
  .tm-search input {
    font-size: 16px;
  }
}

/* SMALL MOBILE */

@media (max-width: 440px) {
  .tm-page {
    padding: 13px 10px;
  }

  .tm-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 17px;
    padding: 22px;
  }

  .tm-header h1 {
    font-size: 25px;
  }

  .tm-header p {
    max-width: none;
  }

  .tm-header > .tm-primary {
    align-self: flex-end;
  }

  .tm-primary,
  .tm-secondary {
    padding: 10px 12px;
    font-size: 13px !important;
  }

  .tm-stat {
    padding: 15px;
  }

  .tm-stat-copy > span {
    font-size: 12px;
  }

  .tm-stat-copy strong {
    font-size: 28px;
  }

  .tm-stat-icon {
    width: 35px;
    height: 35px;
    border-radius: 9px;
  }

  .tm-stat-icon svg {
    width: 20px;
    height: 20px;
  }

  .tm-task-actions {
    margin-left: 0;
  }

  .tm-row-actions {
    flex-wrap: wrap;
  }

  .tm-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .tm-modal-footer > span {
    display: none;
  }

  .tm-modal-footer {
    justify-content: flex-end;
  }

  .tm-confirm-actions {
    flex-direction: column-reverse;
  }

  .tm-confirm-actions button {
    width: 100%;
  }

  .tm-empty {
    padding: 45px 15px;
  }
}

/* REDUCED MOTION */

@media (prefers-reduced-motion: reduce) {
  .tm-page button,
  .tm-task,
  .tm-input-label > input,
  .tm-input-label > select,
  .tm-input-label > textarea,
  .tm-worker {
    transition: none;
  }

  .tm-spin,
  .tm-modal {
    animation: none;
  }
}
`;