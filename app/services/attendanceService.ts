// app/services/attendanceService.ts

import type {
  AttendanceDashboardResponse,
  AttendanceRequest,
  AttendanceResponse,
  QrAttendanceRequest,
  QrAttendanceResponse,
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

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async <T>(
  response: Response
): Promise<T> => {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = await response.json();

      if (typeof data === "string") {
        message = data;
      } else if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      }
    } catch {
      // Ignore invalid/non-JSON error body
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

/**
 * GET /api/v1/attendance/dashboard
 */
export const getAttendanceDashboard = async (
  date?: string
): Promise<AttendanceDashboardResponse> => {
  const url = new URL(
    `${API_BASE_URL}/attendance/dashboard`
  );

  if (date) {
    url.searchParams.set("date", date);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<AttendanceDashboardResponse>(
    response
  );
};

/**
 * GET /api/v1/attendance?date=YYYY-MM-DD
 */
export const getAttendanceByDate = async (
  date: string
): Promise<AttendanceResponse[]> => {
  const url = new URL(
    `${API_BASE_URL}/attendance`
  );

  url.searchParams.set("date", date);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<AttendanceResponse[]>(
    response
  );
};

/**
 * POST /api/v1/attendance/check-in
 */
export const checkIn = async (
  request: AttendanceRequest
): Promise<AttendanceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/attendance/check-in`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(request),
    }
  );

  return handleResponse<AttendanceResponse>(response);
};

/**
 * PUT /api/v1/attendance/check-out/{userId}
 */
export const checkOut = async (
  userId: number
): Promise<AttendanceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/attendance/check-out/${userId}`,
    {
      method: "PUT",
      headers: getHeaders(),
    }
  );

  return handleResponse<AttendanceResponse>(response);
};

/**
 * POST /api/v1/attendance/qr-scan
 */
export const processQrAttendance = async (
  request: QrAttendanceRequest
): Promise<QrAttendanceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/attendance/qr-scan`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(request),
    }
  );

  return handleResponse<QrAttendanceResponse>(
    response
  );
};

/**
 * GET /api/v1/attendance/history/{userId}
 */
export const getAttendanceHistory = async (
  userId: number
): Promise<AttendanceResponse[]> => {
  const response = await fetch(
    `${API_BASE_URL}/attendance/history/${userId}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  return handleResponse<AttendanceResponse[]>(response);
};