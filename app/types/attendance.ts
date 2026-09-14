export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "ON_LEAVE";

export interface AttendanceResponse {
  id: number | null;
  userId: number;
  userName: string;
  role: string;
  farmId: number | null;
  farmName: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAccuracyMeters: number | null;
}

export interface AttendanceDashboardResponse {
  totalWorkers: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  recentAttendances: AttendanceResponse[];
}

export interface AttendanceFarm {
  id: number;
  farmName: string;
  farmAddress: string;
  boundary: string | null;
}

export interface AttendanceWorker {
  id: number;
  userName: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  farmId: number;
  farmName: string;
}

export interface QrGenerateResponse {
  token: string;
  farmId: number;
  farmName: string;
  manualCode: string;
  rotatingCode: string;
  rotationSeconds: number;
  rotatingCodeSecondsRemaining: number;
  rotatingCodeExpiresAt: string;
  createdAt: string;
  expiresAt: string;
  createdById: number;
  createdByName: string;
  createdByRole: string;
}

export interface QrLiveCodeResponse {
  rotatingCode: string;
  rotationSeconds: number;
  secondsRemaining: number;
  generatedAt: string;
  rotatingCodeExpiresAt: string;
  sessionExpiresAt: string;
}

export type AttendanceDeviceType = "MOBILE" | "DESKTOP";

export interface QrAttendanceRequest {
  qrToken: string;
  deviceType: AttendanceDeviceType;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  location?: string | null;
}

export interface AttendanceCodeRequest {
  sessionCode: string;
  rotatingCode: string;
  deviceType: AttendanceDeviceType;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  location?: string | null;
}

export interface QrAttendanceResponse {
  success: boolean;
  message: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
}

export interface AttendanceReportSummary {
  userId: number;
  userName: string;
  farmId: number;
  farmName: string;
  scheduledDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  workedHours: number;
}

