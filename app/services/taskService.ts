import type {
  AttendanceDashboardResponse,
  AttendanceResponse,
} from "../types/attendance";

const API_BASE_URL = "http://localhost:8080/api/v1";

const getToken = (): string | null => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken")
  );
};

const getHeaders = (): HeadersInit => {
  const token = getToken();

  return {
    Accept: "*/*",
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

// ========================================
// GET ATTENDANCE DASHBOARD
// GET /api/v1/attendance/dashboard
// ========================================

export const getAttendanceDashboard =
  async (): Promise<AttendanceDashboardResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/attendance/dashboard`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Dashboard request failed: ${response.status}`
      );
    }

    return response.json();
  };

// ========================================
// GET ATTENDANCE BY DATE
// GET /api/v1/attendance
// ========================================

export const getAttendanceByDate = async (
  date: string
): Promise<AttendanceResponse[]> => {
  const response = await fetch(
    `${API_BASE_URL}/attendance?date=${encodeURIComponent(date)}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Attendance request failed: ${response.status}`
    );
  }

  return response.json();
};