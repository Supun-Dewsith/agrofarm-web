import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  KeyRound,
  X,
} from "lucide-react";

import { fetchWithAuth } from "../utils/auth";

/* =========================================================
   TYPES
========================================================= */

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: number | null;
  read: boolean;
  createdAt: string;
}

/* =========================================================
   TIME FORMATTER
========================================================= */

function relativeTime(value: string) {
  const createdTime = new Date(value).getTime();

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - createdTime) / 1000
    )
  );

  if (seconds < 60) {
    return "Just now";
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hr ago`;
  }

  return new Date(value).toLocaleDateString();
}

/* =========================================================
   COMPONENT
========================================================= */

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const containerRef =
    useRef<HTMLDivElement>(null);

  /* =========================================================
     LOAD UNREAD COUNT
  ========================================================= */

  const loadUnreadCount = async () => {
    try {
      const response = await fetchWithAuth(
        "/api/v1/notifications/unread-count"
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        count: number;
      };

      setUnreadCount(
        Number(data.count) || 0
      );
    } catch {
      // Do not interrupt the whole layout if polling fails.
    }
  };

  /* =========================================================
     LOAD NOTIFICATIONS
  ========================================================= */

  const loadNotifications = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchWithAuth(
        "/api/v1/notifications?limit=30"
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load notifications"
        );
      }

      const data =
        (await response.json()) as NotificationItem[];

      setNotifications(
        Array.isArray(data) ? data : []
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     POLLING
  ========================================================= */

  useEffect(() => {
    void loadUnreadCount();

    const timer = window.setInterval(
      () => {
        void loadUnreadCount();
      },
      30000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* =========================================================
     CLOSE WHEN CLICKING OUTSIDE
  ========================================================= */

  useEffect(() => {
    const closeDropdown = (
      event: MouseEvent
    ) => {
      const clickedNode =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(
          clickedNode
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      closeDropdown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeDropdown
      );
    };
  }, []);

  /* =========================================================
     TOGGLE DROPDOWN
  ========================================================= */

  const toggleNotifications = () => {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (nextOpen) {
      void loadNotifications();
    }
  };

  /* =========================================================
     MARK ONE AS READ
  ========================================================= */

  const markAsRead = async (
    notification: NotificationItem
  ) => {
    if (notification.read) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/v1/notifications/${notification.id}/read`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update notification"
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1)
      );
    } catch {
      setError(
        "Could not mark notification as read"
      );
    }
  };

  /* =========================================================
     MARK ALL AS READ
  ========================================================= */

  const markAllAsRead = async () => {
    try {
      const response = await fetchWithAuth(
        "/api/v1/notifications/read-all",
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update notifications"
        );
      }

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch {
      setError(
        "Could not mark all notifications as read"
      );
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* NOTIFICATION BELL */}

      <button
        type="button"
        onClick={toggleNotifications}
        aria-label="Notifications"
        title="Notifications"
        className={`
          relative grid h-10 w-10
          place-items-center rounded-xl
          border transition
          ${
            open
              ? `
                border-emerald-300
                bg-emerald-50
                text-emerald-800
              `
              : `
                border-slate-200
                bg-white
                text-slate-600
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-emerald-800
              `
          }
        `}
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span
            className="
              absolute -right-1.5 -top-1.5
              min-w-5 rounded-full
              border-2 border-white
              bg-red-600 px-1
              text-center text-[10px]
              font-bold leading-4 text-white
            "
          >
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION DROPDOWN */}

      {open && (
        <div
          className="
            absolute right-0 top-12 z-50
            w-[min(390px,calc(100vw-2rem))]
            overflow-hidden rounded-2xl
            border border-slate-200
            bg-white shadow-2xl
          "
        >
          {/* HEADER */}

          <div
            className="
              flex items-center justify-between
              border-b border-slate-100
              px-4 py-3.5
            "
          >
            <div>
              <h3
                className="
                  font-bold text-slate-900
                "
              >
                Notifications
              </h3>

              <p
                className="
                  mt-0.5 text-xs
                  text-slate-500
                "
              >
                {unreadCount} unread{" "}
                notification
                {unreadCount === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div
              className="
                flex items-center gap-1
              "
            >
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    void markAllAsRead()
                  }
                  title="Mark all as read"
                  className="
                    rounded-lg p-2
                    text-emerald-700
                    transition
                    hover:bg-emerald-50
                  "
                >
                  <CheckCheck
                    className="h-4 w-4"
                  />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                title="Close"
                className="
                  rounded-lg p-2
                  text-slate-500
                  transition
                  hover:bg-slate-100
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              className="
                border-b border-red-100
                bg-red-50 px-4 py-2.5
                text-xs font-medium
                text-red-700
              "
            >
              {error}
            </div>
          )}

          {/* NOTIFICATION LIST */}

          <div
            className="
              max-h-[420px]
              overflow-y-auto
            "
          >
            {loading &&
            notifications.length === 0 ? (
              <div
                className="
                  p-8 text-center
                  text-sm text-slate-500
                "
              >
                Loading notifications...
              </div>
            ) : notifications.length ===
              0 ? (
              <div
                className="
                  px-6 py-10 text-center
                "
              >
                <div
                  className="
                    mx-auto grid h-14 w-14
                    place-items-center
                    rounded-2xl
                    bg-slate-100
                    text-slate-400
                  "
                >
                  <Bell
                    className="h-7 w-7"
                  />
                </div>

                <p
                  className="
                    mt-3 font-semibold
                    text-slate-700
                  "
                >
                  No notifications yet
                </p>

                <p
                  className="
                    mt-1 text-xs
                    leading-5 text-slate-500
                  "
                >
                  Attendance and task
                  updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => {
                  const isAttendance =
                    notification.type.startsWith(
                      "ATTENDANCE"
                    );

                  const isPasswordReset =
                    notification.type === "PASSWORD_RESET" ||
                    notification.referenceType === "USER_RESET";

                  const NotificationIcon =
                    isPasswordReset
                      ? KeyRound
                      : isAttendance
                      ? Clock3
                      : ClipboardCheck;

                  return (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() =>
                        void markAsRead(
                          notification
                        )
                      }
                      className={`
                        flex w-full gap-3
                        border-b
                        border-slate-100
                        px-4 py-3.5
                        text-left transition
                        hover:bg-slate-50
                        ${
                          notification.read
                            ? "bg-white"
                            : "bg-emerald-50/60"
                        }
                      `}
                    >
                      <span
                        className={`
                          mt-0.5 grid h-9 w-9
                          shrink-0 place-items-center
                          rounded-xl
                          ${
                            isPasswordReset
                              ? `
                                bg-rose-50
                                text-rose-700
                              `
                              : isAttendance
                              ? `
                                bg-blue-50
                                text-blue-700
                              `
                              : `
                                bg-amber-50
                                text-amber-700
                              `
                          }
                        `}
                      >
                        <NotificationIcon
                          className="h-4 w-4"
                        />
                      </span>

                      <span
                        className="
                          min-w-0 flex-1
                        "
                      >
                        <span
                          className="
                            flex items-start
                            justify-between gap-2
                          "
                        >
                          <span
                            className="
                              text-sm font-bold
                              text-slate-800
                            "
                          >
                            {
                              notification.title
                            }
                          </span>

                          {!notification.read && (
                            <span
                              className="
                                mt-1.5 h-2 w-2
                                shrink-0 rounded-full
                                bg-emerald-600
                              "
                            />
                          )}
                        </span>

                        <span
                          className="
                            mt-0.5 block
                            text-xs leading-5
                            text-slate-600
                          "
                        >
                          {
                            notification.message
                          }
                        </span>

                        <span
                          className="
                            mt-1 block text-[11px]
                            font-medium
                            text-slate-400
                          "
                        >
                          {relativeTime(
                            notification.createdAt
                          )}
                        </span>
                      </span>
                    </button>
                  );
                }
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}