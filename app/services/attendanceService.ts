import { fetchWithAuth } from "../utils/auth";
import type {
  AttendanceCodeRequest,
  AttendanceDashboardResponse,
  AttendanceFarm,
  AttendanceReportSummary,
  AttendanceResponse,
  AttendanceWorker,
  QrAttendanceRequest,
  QrAttendanceResponse,
  QrGenerateResponse,
  QrLiveCodeResponse,
} from "../types/attendance";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    if (body && typeof body === "object") {
      const errorBody = body as { message?: string; error?: string };
      throw new Error(
        errorBody.message ||
          errorBody.error ||
          `Attendance request failed (${response.status})`
      );
    }

    if (typeof body === "string" && body.trim()) {
      throw new Error(body);
    }

    throw new Error(`Attendance request failed (${response.status})`);
  }

  return body as T;
}

function queryString(
  values: Record<string, string | number | undefined | null>
): string {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

type RawFarm = {
  id?: number | string;
  farmId?: number | string;
  farmName?: string;
  name?: string;
  farmAddress?: string;
  address?: string;
  boundary?: unknown;
  farmBoundary?: unknown;
};

const normalizeBoundary = (value: unknown): string | null => {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
};

const normalizeFarm = (raw: RawFarm): AttendanceFarm | null => {
  const idValue = raw.id ?? raw.farmId;
  const id = Number(idValue);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    farmName: String(raw.farmName ?? raw.name ?? `Farm ${id}`),
    farmAddress: String(raw.farmAddress ?? raw.address ?? ""),
    boundary: normalizeBoundary(raw.boundary ?? raw.farmBoundary),
  };
};

const normalizeFarmList = (value: unknown): AttendanceFarm[] => {
  const rawList = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? (((value as { data?: unknown; content?: unknown; farms?: unknown }).data ??
          (value as { content?: unknown }).content ??
          (value as { farms?: unknown }).farms) as unknown)
      : [];

  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((item) => normalizeFarm((item ?? {}) as RawFarm))
    .filter((farm): farm is AttendanceFarm => farm !== null);
};

/**
 * Loads the farms available to Attendance.
 *
 * Primary source: /api/v1/attendance/farms
 * Fallback source: /api/v1/farms
 *
 * The fallback is important while an older attendance backend still returns
 * only id/name/address. The normal farms endpoint already contains the saved
 * map boundary, so we merge it by farm id instead of showing "boundary missing".
 */
export async function getAttendanceFarms(): Promise<AttendanceFarm[]> {
  const attendanceResponse = await fetchWithAuth("/api/v1/attendance/farms");
  const attendanceRaw = await readJson<unknown>(attendanceResponse);
  const attendanceFarms = normalizeFarmList(attendanceRaw);

  const needsBoundaryFallback = attendanceFarms.some(
    (farm) => !farm.boundary || !farm.boundary.trim()
  );

  if (!needsBoundaryFallback) {
    return attendanceFarms;
  }

  try {
    const farmsResponse = await fetchWithAuth("/api/v1/farms");
    const farmsRaw = await readJson<unknown>(farmsResponse);
    const fullFarms = normalizeFarmList(farmsRaw);

    if (!fullFarms.length) {
      return attendanceFarms;
    }

    const fullById = new Map(fullFarms.map((farm) => [farm.id, farm]));

    return attendanceFarms.map((farm) => {
      const fullFarm = fullById.get(farm.id);
      if (!fullFarm) return farm;

      return {
        ...farm,
        farmName: farm.farmName || fullFarm.farmName,
        farmAddress: farm.farmAddress || fullFarm.farmAddress,
        boundary: farm.boundary || fullFarm.boundary,
      };
    });
  } catch (error) {
    console.warn(
      "Attendance farm boundary fallback could not load /api/v1/farms:",
      error
    );
    return attendanceFarms;
  }
}

export async function getAttendanceWorkers(
  farmId?: number,
  search = ""
): Promise<AttendanceWorker[]> {
  const query = queryString({ farmId, search });
  return readJson<AttendanceWorker[]>(
    await fetchWithAuth(`/api/v1/attendance/workers?${query}`)
  );
}

export async function getAttendanceByDate(
  date: string,
  farmId?: number,
  search = ""
): Promise<AttendanceResponse[]> {
  const query = queryString({ date, farmId, search });
  return readJson<AttendanceResponse[]>(
    await fetchWithAuth(`/api/v1/attendance?${query}`)
  );
}

export async function getAttendanceDashboard(
  date: string,
  farmId?: number
): Promise<AttendanceDashboardResponse> {
  const query = queryString({ date, farmId });
  return readJson<AttendanceDashboardResponse>(
    await fetchWithAuth(`/api/v1/attendance/dashboard?${query}`)
  );
}

export async function generateAttendanceQr(
  farmId: number
): Promise<QrGenerateResponse> {
  return readJson<QrGenerateResponse>(
    await fetchWithAuth(
      `/api/v1/attendance/qr/generate?farmId=${encodeURIComponent(String(farmId))}`,
      { method: "POST" }
    )
  );
}

export async function getAttendanceQrLiveCode(
  token: string
): Promise<QrLiveCodeResponse> {
  return readJson<QrLiveCodeResponse>(
    await fetchWithAuth(
      `/api/v1/attendance/qr/live-code?token=${encodeURIComponent(token)}`
    )
  );
}

export async function processQrAttendance(
  request: QrAttendanceRequest
): Promise<QrAttendanceResponse> {
  return readJson<QrAttendanceResponse>(
    await fetchWithAuth("/api/v1/attendance/qr-scan", {
      method: "POST",
      body: JSON.stringify(request),
    })
  );
}

export async function processCodeAttendance(
  request: AttendanceCodeRequest
): Promise<QrAttendanceResponse> {
  return readJson<QrAttendanceResponse>(
    await fetchWithAuth("/api/v1/attendance/code-check", {
      method: "POST",
      body: JSON.stringify(request),
    })
  );
}

export async function getAttendanceReport(
  from: string,
  to: string,
  farmId?: number,
  userId?: number,
  search = ""
): Promise<AttendanceResponse[]> {
  const query = queryString({ from, to, farmId, userId, search });
  return readJson<AttendanceResponse[]>(
    await fetchWithAuth(`/api/v1/attendance/report?${query}`)
  );
}

export async function getAttendanceReportSummary(
  from: string,
  to: string,
  farmId?: number,
  userId?: number,
  search = ""
): Promise<AttendanceReportSummary[]> {
  const query = queryString({ from, to, farmId, userId, search });
  return readJson<AttendanceReportSummary[]>(
    await fetchWithAuth(`/api/v1/attendance/report/summary?${query}`)
  );
}


