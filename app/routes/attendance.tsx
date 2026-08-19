import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Download,
  QrCode,
  RefreshCw,
  UserCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";

import {
  getAttendanceByDate,
  getAttendanceDashboard,
} from "../services/attendanceService";

import type {
  AttendanceDashboardResponse,
  AttendanceResponse,
  AttendanceStatus,
} from "../types/attendance";

const API_BASE_URL = "http://localhost:8080/api/v1";

const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateString: string): string => {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatTime = (dateTime: string | null): string => {
  if (!dateTime) {
    return "-";
  }

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* FIXED: no status.toLowerCase() */
const statusLabel = (status: AttendanceStatus): string => {
  switch (status) {
    case "PRESENT":
      return "present";

    case "ABSENT":
      return "absent";

    case "LATE":
      return "late";

    case "HALF_DAY":
      return "half day";

    case "ON_LEAVE":
      return "on leave";

    default:
      return "unknown";
  }
};

const getStatusClass = (status: AttendanceStatus): string => {
  switch (status) {
    case "PRESENT":
      return "present";

    case "LATE":
      return "late";

    case "ABSENT":
      return "absent";

    case "HALF_DAY":
      return "half-day";

    case "ON_LEAVE":
      return "on-leave";

    default:
      return "";
  }
};

const createQrToken = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}`;
};

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateForApi(new Date())
  );

  const [dashboard, setDashboard] =
    useState<AttendanceDashboardResponse | null>(null);

  const [attendanceList, setAttendanceList] =
    useState<AttendanceResponse[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [error, setError] = useState<string>("");

  const [qrToken, setQrToken] = useState<string>("");

  const [showQr, setShowQr] = useState<boolean>(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState<AttendanceResponse | null>(null);

  const [actionLoading, setActionLoading] =
    useState<boolean>(false);

  const loadAttendance = useCallback(
    async (date: string, refresh = false) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [dashboardData, listData] = await Promise.all([
          getAttendanceDashboard(date),
          getAttendanceByDate(date),
        ]);

        setDashboard(dashboardData);
        setAttendanceList(listData);
      } catch (err) {
        console.error("Attendance loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load attendance data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAttendance(selectedDate);
  }, [selectedDate, loadAttendance]);

  const stats = useMemo(() => {
    return {
      total:
        dashboard?.totalWorkers ??
        attendanceList.length,

      present:
        dashboard?.presentToday ??
        attendanceList.filter(
          (item) => item.status === "PRESENT"
        ).length,

      late:
        dashboard?.lateToday ??
        attendanceList.filter(
          (item) => item.status === "LATE"
        ).length,

      absent:
        dashboard?.absentToday ??
        attendanceList.filter(
          (item) => item.status === "ABSENT"
        ).length,
    };
  }, [dashboard, attendanceList]);

  const generateQr = () => {
    const token = createQrToken();

    setQrToken(token);
    setShowQr(true);
  };

  const handleRefresh = () => {
    loadAttendance(selectedDate, true);
  };

  const handleCheckOut = async (userId: number) => {
    try {
      setActionLoading(true);

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const response = await fetch(
        `${API_BASE_URL}/attendance/check-out/${userId}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      if (!response.ok) {
        let message = "Unable to check out employee.";

        try {
          const data = await response.json();

          message =
            data?.message ||
            data?.error ||
            message;
        } catch {
          // Ignore invalid response
        }

        throw new Error(message);
      }

      await loadAttendance(selectedDate, true);

      setSelectedEmployee(null);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to check out employee."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const exportReport = () => {
    if (attendanceList.length === 0) {
      alert("There is no attendance data to export.");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee",
      "Date",
      "Check In",
      "Check Out",
      "Status",
      "Location",
    ];

    const rows = attendanceList.map((attendance) => [
      attendance.userId,
      attendance.userName,
      attendance.date,
      formatTime(attendance.checkInTime),
      formatTime(attendance.checkOutTime),
      statusLabel(attendance.status),
      attendance.location ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(value ?? "");

            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-report-${selectedDate}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="attendance-page">
      <style>{`
        .attendance-page {
          min-height: calc(100vh - 64px);
          background: #f5f8f7;
          padding: 24px 22px 40px;
          color: #16372e;
          box-sizing: border-box;
        }

        .attendance-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 18px;
        }

        .attendance-title {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          font-weight: 700;
          color: #14382f;
        }

        .attendance-subtitle {
          margin: 5px 0 0;
          color: #668078;
          font-size: 13px;
        }

        .attendance-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .attendance-btn {
          height: 38px;
          border-radius: 7px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .attendance-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .attendance-btn-outline {
          background: #ffffff;
          border: 1px solid #28745b;
          color: #21694f;
        }

        .attendance-btn-outline:hover {
          background: #edf7f2;
        }

        .attendance-btn-primary {
          background: #286d54;
          color: white;
          border: 1px solid #286d54;
        }

        .attendance-btn-primary:hover {
          background: #215d48;
        }

        .attendance-btn-small {
          height: 32px;
          padding: 0 10px;
          font-size: 11px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .stat-card {
          min-height: 98px;
          background: white;
          border: 1px solid #e4ece8;
          border-radius: 12px;
          padding: 17px 16px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 2px rgba(24, 65, 51, 0.03);
        }

        .stat-label {
          font-size: 11px;
          color: #547268;
          margin-bottom: 8px;
        }

        .stat-number {
          font-size: 21px;
          line-height: 1;
          font-weight: 500;
          color: #0f3d31;
        }

        .stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-total {
          color: #2475e8;
          background: #eff5ff;
        }

        .stat-present {
          color: #00a84f;
          background: #effcf4;
        }

        .stat-late {
          color: #ff7600;
          background: #fff6ed;
        }

        .stat-absent {
          color: #ff3038;
          background: #fff1f2;
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(290px, 1fr);
          gap: 18px;
          align-items: stretch;
        }

        .attendance-card,
        .qr-card {
          background: white;
          border: 1px solid #e4ece8;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(24, 65, 51, 0.03);
        }

        .attendance-card {
          overflow: hidden;
        }

        .table-card-header {
          height: 72px;
          padding: 0 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
        }

        .section-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #12382e;
        }

        .date-picker {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 31px;
          padding: 0 9px;
          border: 1px solid #d9e5e0;
          border-radius: 6px;
          color: #294e43;
          background: #fff;
          font-size: 11px;
        }

        .date-picker input {
          border: 0;
          outline: 0;
          color: #294e43;
          font-size: 11px;
          background: transparent;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 650px;
        }

        .attendance-table th {
          height: 39px;
          text-align: left;
          padding: 0 16px;
          border-bottom: 1px solid #dfe9e5;
          color: #173d32;
          font-size: 10px;
          font-weight: 600;
        }

        .attendance-table td {
          height: 48px;
          padding: 0 16px;
          border-bottom: 1px solid #e3ebe8;
          font-size: 10px;
          color: #27483e;
          white-space: nowrap;
        }

        .attendance-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .attendance-table tbody tr:hover {
          background: #fafdfc;
        }

        .employee-cell {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .employee-avatar {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2c7159;
          color: white;
          font-size: 8px;
          font-weight: 700;
        }

        .employee-name {
          color: #1d4438;
          font-weight: 500;
        }

        .employee-role {
          color: #527268;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 39px;
          height: 18px;
          padding: 0 7px;
          border-radius: 999px;
          color: white;
          font-size: 8px;
          font-weight: 700;
          text-transform: lowercase;
        }

        .status-badge.present {
          background: #00bf57;
        }

        .status-badge.late {
          background: #ff7200;
        }

        .status-badge.absent {
          background: #ff3038;
        }

        .status-badge.half-day {
          background: #f1a400;
        }

        .status-badge.on-leave {
          background: #8b67d9;
        }

        .empty-state {
          padding: 45px 20px;
          text-align: center;
          color: #789088;
          font-size: 12px;
        }

        .loading-state {
          padding: 45px 20px;
          text-align: center;
          color: #4e7165;
          font-size: 12px;
        }

        .error-box {
          margin: 12px 16px;
          padding: 11px 13px;
          border-radius: 7px;
          background: #fff1f1;
          border: 1px solid #ffd1d1;
          color: #b52525;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .qr-card {
          min-height: 310px;
          padding: 16px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .qr-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #12382e;
        }

        .qr-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .qr-placeholder {
          width: 128px;
          height: 128px;
          border-radius: 8px;
          background: #d9f3df;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2a7359;
          margin: 12px 0;
        }

        .qr-text {
          max-width: 220px;
          text-align: center;
          color: #667e76;
          font-size: 11px;
          line-height: 1.5;
          margin: 0 0 12px;
        }

        .qr-generate-btn {
          width: 200px;
          max-width: 100%;
          height: 34px;
        }

        .qr-token {
          max-width: 230px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
          color: #638078;
          margin-bottom: 8px;
        }

        .refresh-button {
          border: 0;
          background: transparent;
          cursor: pointer;
          color: #39715f;
          padding: 5px;
        }

        .refresh-button:hover {
          color: #1e5844;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 39, 31, 0.42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal {
          width: 390px;
          max-width: 100%;
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .modal-title {
          margin: 0;
          font-size: 16px;
          color: #14382f;
        }

        .close-button {
          border: 0;
          background: transparent;
          cursor: pointer;
          color: #6a8179;
        }

        .employee-detail {
          background: #f6faf8;
          border: 1px solid #e2ece8;
          border-radius: 9px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 6px 0;
          font-size: 11px;
        }

        .detail-label {
          color: #698079;
        }

        .detail-value {
          color: #21483b;
          font-weight: 600;
          text-align: right;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .attendance-page {
            padding: 16px 12px 30px;
          }

          .attendance-header {
            flex-direction: column;
          }

          .attendance-actions {
            width: 100%;
          }

          .attendance-actions .attendance-btn {
            flex: 1;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .stat-card {
            min-height: 88px;
            padding: 13px;
          }

          .table-card-header {
            height: auto;
            padding: 14px;
            gap: 10px;
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="attendance-container">

        {/* HEADER */}
        <div className="attendance-header">
          <div>
            <h1 className="attendance-title">
              Attendance Management
            </h1>

            <p className="attendance-subtitle">
              Track and manage daily attendance
            </p>
          </div>

          <div className="attendance-actions">
            <button
              type="button"
              className="attendance-btn attendance-btn-outline"
              onClick={generateQr}
            >
              <QrCode size={14} />
              Generate QR
            </button>

            <button
              type="button"
              className="attendance-btn attendance-btn-primary"
              onClick={exportReport}
              disabled={attendanceList.length === 0}
            >
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">

          <div className="stat-card">
            <div>
              <div className="stat-label">
                Total
              </div>

              <div className="stat-number">
                {loading ? "..." : stats.total}
              </div>
            </div>

            <div className="stat-icon stat-total">
              <UserRound size={18} />
            </div>
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">
                Present
              </div>

              <div
                className="stat-number"
                style={{ color: "#00a84f" }}
              >
                {loading ? "..." : stats.present}
              </div>
            </div>

            <div className="stat-icon stat-present">
              <UserCheck size={18} />
            </div>
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">
                Late
              </div>

              <div
                className="stat-number"
                style={{ color: "#ff7600" }}
              >
                {loading ? "..." : stats.late}
              </div>
            </div>

            <div className="stat-icon stat-late">
              <Clock3 size={18} />
            </div>
          </div>

          <div className="stat-card">
            <div>
              <div className="stat-label">
                Absent
              </div>

              <div
                className="stat-number"
                style={{ color: "#ff3038" }}
              >
                {loading ? "..." : stats.absent}
              </div>
            </div>

            <div className="stat-icon stat-absent">
              <UserX size={18} />
            </div>
          </div>

        </div>

        {/* MAIN CONTENT */}
        <div className="main-grid">

          {/* TABLE */}
          <div className="attendance-card">

            <div className="table-card-header">

              <h2 className="section-title">
                Today's Attendance
              </h2>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <button
                  type="button"
                  className="refresh-button"
                  title="Refresh"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw
                    size={14}
                    className={
                      refreshing ? "spin" : ""
                    }
                  />
                </button>

                <label className="date-picker">
                  <CalendarDays size={13} />

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

            </div>

            {error && (
              <div className="error-box">
                <span>{error}</span>

                <button
                  type="button"
                  className="attendance-btn attendance-btn-outline attendance-btn-small"
                  onClick={() =>
                    loadAttendance(selectedDate)
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {loading ? (
              <div className="loading-state">
                Loading attendance...
              </div>
            ) : attendanceList.length === 0 ? (
              <div className="empty-state">
                No attendance records found for{" "}
                {formatDisplayDate(selectedDate)}.
              </div>
            ) : (
              <div className="table-wrapper">

                <table className="attendance-table">

                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendanceList.map(
                      (attendance) => {

                        const initials =
                          attendance.userName
                            .split(" ")
                            .map(
                              (part) =>
                                part.charAt(0)
                            )
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                        return (
                          <tr
                            key={attendance.id}
                            onClick={() =>
                              setSelectedEmployee(
                                attendance
                              )
                            }
                            style={{
                              cursor: "pointer",
                            }}
                          >

                            <td>
                              <div className="employee-cell">

                                <div className="employee-avatar">
                                  {initials}
                                </div>

                                <span className="employee-name">
                                  {attendance.userName}
                                </span>

                              </div>
                            </td>

                            <td>
                              <span className="employee-role">
                                Employee
                              </span>
                            </td>

                            <td>
                              {formatTime(
                                attendance.checkInTime
                              )}
                            </td>

                            <td>
                              {formatTime(
                                attendance.checkOutTime
                              )}
                            </td>

                            <td>
                              <span
                                className={`status-badge ${getStatusClass(
                                  attendance.status
                                )}`}
                              >
                                {statusLabel(
                                  attendance.status
                                )}
                              </span>
                            </td>

                          </tr>
                        );
                      }
                    )}
                  </tbody>

                </table>

              </div>
            )}

          </div>

          {/* QR */}
          <div className="qr-card">

            <h2 className="qr-title">
              QR Attendance
            </h2>

            <div className="qr-content">

              {!showQr ? (
                <>
                  <div className="qr-placeholder">
                    <QrCode
                      size={62}
                      strokeWidth={2.2}
                    />
                  </div>

                  <p className="qr-text">
                    Scan this QR code to mark your
                    attendance
                  </p>

                  <button
                    type="button"
                    className="attendance-btn attendance-btn-primary qr-generate-btn"
                    onClick={generateQr}
                  >
                    Generate New QR
                  </button>
                </>
              ) : (
                <>
                  <div className="qr-placeholder">
                    <QrCode
                      size={68}
                      strokeWidth={2.1}
                    />
                  </div>

                  <div className="qr-token">
                    Token: {qrToken}
                  </div>

                  <p className="qr-text">
                    QR token generated successfully.
                    Connect this token to your QR
                    scanner.
                  </p>

                  <button
                    type="button"
                    className="attendance-btn attendance-btn-primary qr-generate-btn"
                    onClick={generateQr}
                  >
                    Generate New QR
                  </button>
                </>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* DETAILS MODAL */}
      {selectedEmployee && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedEmployee(null)
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <h3 className="modal-title">
                Attendance Details
              </h3>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setSelectedEmployee(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="employee-detail">

              <div className="detail-row">
                <span className="detail-label">
                  Employee
                </span>

                <span className="detail-value">
                  {selectedEmployee.userName}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  Employee ID
                </span>

                <span className="detail-value">
                  {selectedEmployee.userId}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  Date
                </span>

                <span className="detail-value">
                  {formatDisplayDate(
                    selectedEmployee.date
                  )}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  Check In
                </span>

                <span className="detail-value">
                  {formatTime(
                    selectedEmployee.checkInTime
                  )}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  Check Out
                </span>

                <span className="detail-value">
                  {formatTime(
                    selectedEmployee.checkOutTime
                  )}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  Status
                </span>

                <span
                  className={`status-badge ${getStatusClass(
                    selectedEmployee.status
                  )}`}
                >
                  {statusLabel(
                    selectedEmployee.status
                  )}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">
                  Location
                </span>

                <span className="detail-value">
                  {selectedEmployee.location || "-"}
                </span>
              </div>

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="attendance-btn attendance-btn-outline"
                onClick={() =>
                  setSelectedEmployee(null)
                }
              >
                Close
              </button>

              {selectedEmployee.checkInTime &&
                !selectedEmployee.checkOutTime &&
                selectedEmployee.status !== "ABSENT" && (
                  <button
                    type="button"
                    className="attendance-btn attendance-btn-primary"
                    disabled={actionLoading}
                    onClick={() =>
                      handleCheckOut(
                        selectedEmployee.userId
                      )
                    }
                  >
                    {actionLoading
                      ? "Processing..."
                      : "Check Out"}
                  </button>
                )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
}