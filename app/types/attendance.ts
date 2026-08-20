// app/types/attendance.ts

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "ON_LEAVE";

export interface AttendanceResponse {
  id: number;
  userId: number;
  userName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  location: string | null;
}

export interface AttendanceDashboardResponse {
  totalWorkers: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  recentAttendances: AttendanceResponse[];
}

export interface AttendanceRequest {
  userId: number;
  userName?: string;
  location?: string;
  status?: AttendanceStatus;
}

export interface QrAttendanceRequest {
  qrToken: string;
  userId: number;
  location?: string;
}

export interface QrAttendanceResponse {
  success: boolean;
  message: string;
  checkInTime: string | null;
}