import { fetchWithAuth } from "../utils/auth";

export interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  activeCropsCount: number;
  healthyCropsCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  totalAttendanceCount: number;
  diseaseAlertsCount: number;
  financialTrend: Array<{
    month: string;
    Revenue: number;
    Expense: number;
  }>;
  cropStatusDistribution: Array<{
    stage: string;
    count: number;
  }>;
  taskPriorityDistribution: Array<{
    priority: string;
    count: number;
  }>;
}

export interface FinancialTransaction {
  id: number;
  farmId: number;
  farmName: string;
  cropId?: number;
  cropName?: string;
  recordType: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  transactionDate: string;
  description: string;
  recordedByName?: string;
}

export interface CropReportItem {
  cropId: number;
  cropName: string;
  variety: string;
  farmId: number;
  farmName: string;
  fieldId: number;
  fieldName: string;
  growthStage: string;
  progress: number;
  status: string;
  plantDate?: string;
  harvestDate?: string;
}

export interface AttendanceReportItem {
  id: number;
  userId: number;
  userName: string;
  farmId: number;
  farmName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked: number;
  status: string;
  location?: string;
  verified: boolean;
}

export interface TaskReportItem {
  id: number;
  title: string;
  description?: string;
  farmId?: number;
  farmName?: string;
  fieldId?: number;
  fieldName?: string;
  assigneeId?: number;
  assigneeName?: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
}

export interface DiseaseReportItem {
  id: number;
  userId: number;
  userName?: string;
  plantName: string;
  diseaseName: string;
  isHealthy: boolean;
  confidence: number;
  treatment?: string;
  detectedAt: string;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      q.set(k, String(v));
    }
  });
  const res = q.toString();
  return res ? `?${res}` : "";
}

export async function fetchReportSummary(params: { farmId?: number; from?: string; to?: string }): Promise<ReportSummary> {
  const query = buildQuery(params);
  const res = await fetchWithAuth(`/api/reports/summary${query}`);
  if (!res.ok) throw new Error(`Failed to fetch report summary: ${res.status}`);
  return res.json();
}

export async function fetchFinancialReport(params: { farmId?: number; from?: string; to?: string }): Promise<FinancialTransaction[]> {
  const query = buildQuery(params);
  const res = await fetchWithAuth(`/api/reports/financial${query}`);
  if (!res.ok) throw new Error(`Failed to fetch financial report: ${res.status}`);
  return res.json();
}

export async function fetchCropReport(params: { farmId?: number }): Promise<CropReportItem[]> {
  const query = buildQuery(params);
  const res = await fetchWithAuth(`/api/reports/crops${query}`);
  if (!res.ok) throw new Error(`Failed to fetch crop report: ${res.status}`);
  return res.json();
}

export async function fetchAttendanceReport(params: { farmId?: number; from?: string; to?: string }): Promise<AttendanceReportItem[]> {
  const query = buildQuery(params);
  const res = await fetchWithAuth(`/api/reports/attendance${query}`);
  if (!res.ok) throw new Error(`Failed to fetch attendance report: ${res.status}`);
  return res.json();
}

export async function fetchTaskReport(params: { farmId?: number; from?: string; to?: string }): Promise<TaskReportItem[]> {
  const query = buildQuery(params);
  const res = await fetchWithAuth(`/api/reports/tasks${query}`);
  if (!res.ok) throw new Error(`Failed to fetch task report: ${res.status}`);
  return res.json();
}

export async function fetchDiseaseReport(limit = 50): Promise<DiseaseReportItem[]> {
  const res = await fetchWithAuth(`/api/reports/disease?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch disease report: ${res.status}`);
  return res.json();
}

export interface CreateFinancialTransactionPayload {
  farmId: number;
  cropId?: number;
  recordType: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  transactionDate: string;
  description?: string;
}

export async function createFinancialTransaction(
  payload: CreateFinancialTransactionPayload
): Promise<FinancialTransaction> {
  const res = await fetchWithAuth("/api/reports/financial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Failed to create financial transaction: ${res.status}`);
  }
  return res.json();
}

/**
 * Universal CSV Export with UTF-8 BOM for proper Excel compatibility.
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sanitize = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const text = String(val).replace(/"/g, '""');
    return `"${text}"`;
  };

  const csvRows = [
    headers.map(sanitize).join(","),
    ...rows.map((row) => row.map(sanitize).join(",")),
  ];

  const csvString = csvRows.join("\r\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute("download", `${filename}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
