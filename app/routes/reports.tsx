import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download, RefreshCw, Filter, Calendar, Search,
  TrendingUp, TrendingDown, DollarSign, Sprout,
  Users, ClipboardList, ShieldAlert, CheckCircle2,
  FileSpreadsheet, ArrowRight, Plus, X, Sparkles
} from 'lucide-react';
import { ReportAiDrawer } from '~/components/ReportAiDrawer';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '~/utils/preferences';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  Tooltip, BarChart, Bar, Legend, CartesianGrid
} from 'recharts';
import { fetchWithAuth } from '~/utils/auth';
import {
  fetchReportSummary,
  fetchFinancialReport,
  fetchCropReport,
  fetchAttendanceReport,
  fetchTaskReport,
  fetchDiseaseReport,
  createFinancialTransaction,
  exportToCSV,
  type ReportSummary,
  type FinancialTransaction,
  type CropReportItem,
  type AttendanceReportItem,
  type TaskReportItem,
  type DiseaseReportItem,
} from '~/services/reportService';

type ReportTab = 'financial' | 'crops' | 'attendance' | 'tasks' | 'disease';

interface FarmOption {
  farmIDs: number;
  farmNames: string;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { currency, formatMoney } = usePreferences();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');

  // Farm Selection
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('ALL');

  // Date Range
  const [datePreset, setDatePreset] = useState<'7d' | '30d' | '90d' | 'year' | 'custom'>('30d');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Search & Loading
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data States
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [financialData, setFinancialData] = useState<FinancialTransaction[]>([]);
  const [cropData, setCropData] = useState<CropReportItem[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceReportItem[]>([]);
  const [taskData, setTaskData] = useState<TaskReportItem[]>([]);
  const [diseaseData, setDiseaseData] = useState<DiseaseReportItem[]>([]);

  // Modal & Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [recordType, setRecordType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [formFarmId, setFormFarmId] = useState<number | ''>('');
  const [formCropId, setFormCropId] = useState<number | ''>('');
  const [formCategory, setFormCategory] = useState<string>('FERTILIZER');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formDescription, setFormDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load farms on mount
  useEffect(() => {
    async function loadFarms() {
      try {
        const res = await fetchWithAuth('/api/crops/farms');
        if (res.ok) {
          const list: FarmOption[] = await res.json();
          setFarms(list || []);
          if (list && list.length > 0) {
            setFormFarmId(list[0].farmIDs);
          }
        }
      } catch (err) {
        console.warn('Could not load farms:', err);
      }
    }
    loadFarms();
  }, []);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFarmId) {
      setModalError(t("Please select a farm."));
      return;
    }
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setModalError(t("Please enter a valid amount greater than 0."));
      return;
    }

    try {
      setIsSaving(true);
      setModalError(null);
      await createFinancialTransaction({
        farmId: Number(formFarmId),
        cropId: formCropId ? Number(formCropId) : undefined,
        recordType,
        category: formCategory,
        amount: numAmount,
        transactionDate: formDate,
        description: formDescription.trim() || undefined,
      });

      setIsModalOpen(false);
      setFormAmount('');
      setFormDescription('');
      setSuccessToast(t("Financial transaction recorded successfully!"));
      setTimeout(() => setSuccessToast(null), 4000);
      loadReportData(true);
    } catch (err: any) {
      setModalError(err?.message || t("Failed to save transaction."));
    } finally {
      setIsSaving(false);
    }
  };

  // Preset Handler
  const handlePresetChange = (preset: '7d' | '30d' | '90d' | 'year' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    setToDate(toStr);

    if (preset === '7d') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setFromDate(past.toISOString().slice(0, 10));
    } else if (preset === '30d') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setFromDate(past.toISOString().slice(0, 10));
    } else if (preset === '90d') {
      const past = new Date();
      past.setDate(past.getDate() - 90);
      setFromDate(past.toISOString().slice(0, 10));
    } else if (preset === 'year') {
      const past = new Date();
      past.setDate(past.getDate() - 365);
      setFromDate(past.toISOString().slice(0, 10));
    }
  };

  // Data Fetching
  const loadReportData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const farmId = selectedFarmId !== 'ALL' ? Number(selectedFarmId) : undefined;
    const filter = { farmId, from: fromDate, to: toDate };

    try {
      const sumPromise = fetchReportSummary(filter);

      if (activeTab === 'financial') {
        const [sum, fin] = await Promise.all([sumPromise, fetchFinancialReport(filter)]);
        setSummary(sum);
        setFinancialData(fin || []);
      } else if (activeTab === 'crops') {
        const [sum, crp] = await Promise.all([sumPromise, fetchCropReport({ farmId })]);
        setSummary(sum);
        setCropData(crp || []);
      } else if (activeTab === 'attendance') {
        const [sum, att] = await Promise.all([sumPromise, fetchAttendanceReport(filter)]);
        setSummary(sum);
        setAttendanceData(att || []);
      } else if (activeTab === 'tasks') {
        const [sum, tsk] = await Promise.all([sumPromise, fetchTaskReport(filter)]);
        setSummary(sum);
        setTaskData(tsk || []);
      } else if (activeTab === 'disease') {
        const [sum, dis] = await Promise.all([sumPromise, fetchDiseaseReport(50)]);
        setSummary(sum);
        setDiseaseData(dis || []);
      }
    } catch (err: any) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedFarmId, fromDate, toDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Search Filters
  const filteredFinancial = useMemo(() => {
    if (!searchQuery.trim()) return financialData;
    const q = searchQuery.toLowerCase();
    return financialData.filter(
      (item) =>
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.farmName?.toLowerCase().includes(q) ||
        item.cropName?.toLowerCase().includes(q)
    );
  }, [financialData, searchQuery]);

  const filteredCrops = useMemo(() => {
    if (!searchQuery.trim()) return cropData;
    const q = searchQuery.toLowerCase();
    return cropData.filter(
      (c) =>
        c.cropName?.toLowerCase().includes(q) ||
        c.variety?.toLowerCase().includes(q) ||
        c.growthStage?.toLowerCase().includes(q) ||
        c.farmName?.toLowerCase().includes(q) ||
        c.fieldName?.toLowerCase().includes(q)
    );
  }, [cropData, searchQuery]);

  const filteredAttendance = useMemo(() => {
    if (!searchQuery.trim()) return attendanceData;
    const q = searchQuery.toLowerCase();
    return attendanceData.filter(
      (a) =>
        a.userName?.toLowerCase().includes(q) ||
        a.farmName?.toLowerCase().includes(q) ||
        a.status?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
    );
  }, [attendanceData, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return taskData;
    const q = searchQuery.toLowerCase();
    return taskData.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.assigneeName?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q) ||
        t.priority?.toLowerCase().includes(q) ||
        t.fieldName?.toLowerCase().includes(q)
    );
  }, [taskData, searchQuery]);

  const filteredDisease = useMemo(() => {
    if (!searchQuery.trim()) return diseaseData;
    const q = searchQuery.toLowerCase();
    return diseaseData.filter(
      (d) =>
        d.plantName?.toLowerCase().includes(q) ||
        d.diseaseName?.toLowerCase().includes(q) ||
        d.treatment?.toLowerCase().includes(q) ||
        d.userName?.toLowerCase().includes(q)
    );
  }, [diseaseData, searchQuery]);

  // CSV Export Trigger
  const handleExportCSV = () => {
    if (activeTab === 'financial') {
      const headers = ['ID', 'Date', 'Farm', 'Crop', 'Type', 'Category', `Amount (${currency.code})`, 'Description', 'Recorded By'];
      const rows = filteredFinancial.map((f) => [
        f.id,
        f.transactionDate,
        f.farmName,
        f.cropName || '-',
        f.recordType,
        f.category,
        f.amount,
        f.description || '',
        f.recordedByName || '',
      ]);
      exportToCSV('agrofarm_financial_report', headers, rows);
    } else if (activeTab === 'crops') {
      const headers = ['Crop ID', 'Crop Name', 'Variety', 'Farm', 'Field', 'Stage', 'Progress (%)', 'Status', 'Plant Date', 'Harvest Date'];
      const rows = filteredCrops.map((c) => [
        c.cropId,
        c.cropName,
        c.variety || '-',
        c.farmName || '-',
        c.fieldName || '-',
        c.growthStage,
        `${c.progress}%`,
        c.status,
        c.plantDate ? c.plantDate.slice(0, 10) : '-',
        c.harvestDate ? c.harvestDate.slice(0, 10) : '-',
      ]);
      exportToCSV('agrofarm_crop_cultivation_report', headers, rows);
    } else if (activeTab === 'attendance') {
      const headers = ['ID', 'Date', 'Worker Name', 'Farm', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Location'];
      const rows = filteredAttendance.map((a) => [
        a.id,
        a.date,
        a.userName,
        a.farmName,
        a.checkInTime ? a.checkInTime.slice(11, 16) : '-',
        a.checkOutTime ? a.checkOutTime.slice(11, 16) : '-',
        a.hoursWorked,
        a.status,
        a.location || '',
      ]);
      exportToCSV('agrofarm_attendance_report', headers, rows);
    } else if (activeTab === 'tasks') {
      const headers = ['Task ID', 'Title', 'Farm', 'Field', 'Assigned Worker', 'Priority', 'Status', 'Due Date'];
      const rows = filteredTasks.map((t) => [
        t.id,
        t.title,
        t.farmName || '-',
        t.fieldName || '-',
        t.assigneeName || '-',
        t.priority,
        t.status,
        t.dueDate || '-',
      ]);
      exportToCSV('agrofarm_task_operations_report', headers, rows);
    } else if (activeTab === 'disease') {
      const headers = ['Scan ID', 'Date', 'Plant Name', 'Detected Disease', 'Health State', 'Confidence (%)', 'Treatment Guide', 'Scanned By'];
      const rows = filteredDisease.map((d) => [
        d.id,
        d.detectedAt ? d.detectedAt.slice(0, 10) : '-',
        d.plantName,
        d.diseaseName,
        d.isHealthy ? 'HEALTHY' : 'INFECTED',
        formatConfidence(d.confidence),
        d.treatment || '',
        d.userName || '',
      ]);
      exportToCSV('agrofarm_disease_diagnostics_report', headers, rows);
    }
  };

  const formatConfidence = (val?: number | null) => {
    if (val == null || isNaN(val)) return '0.0%';
    const num = val <= 1.0 && val > 0 ? val * 100 : val;
    return `${num.toFixed(1)}%`;
  };

  const formatLKR = (val: number | undefined | null) => {
    return formatMoney(val ?? 0);
  };

  const TableSkeletonRows = ({ columns, rows = 5 }: { columns: number; rows?: number }) => {
    const widths = ['w-24', 'w-32', 'w-16', 'w-28', 'w-36', 'w-20', 'w-28', 'w-24'];
    return (
      <>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <tr key={rIdx} className="animate-pulse border-b border-slate-100">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <td key={cIdx} className="p-3">
                <div
                  className={`h-4 bg-slate-200/80 rounded ${
                    widths[(rIdx + cIdx) % widths.length]
                  }`}
                />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  };

  const tabsConfig = [
    { id: 'financial' as ReportTab, label: t('Financial Ledger'), icon: DollarSign },
    { id: 'crops' as ReportTab, label: t('Crop Cultivation'), icon: Sprout },
    { id: 'attendance' as ReportTab, label: t('Labor & Attendance'), icon: Users },
    { id: 'tasks' as ReportTab, label: t('Field Tasks'), icon: ClipboardList },
    { id: 'disease' as ReportTab, label: t('AI Disease History'), icon: ShieldAlert },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6 mx-auto font-sans text-slate-800">

      {/* Sleek Top Controls Bar (Matching Settings Page Element Vibe & Thin Borders) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Farm & Date Presets */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Farm Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-700">
            <Filter size={14} className="text-slate-400" />
            <span className="font-semibold text-slate-500">{t("Farm")}:</span>
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">{t("All Farms")}</option>
              {farms.map((f) => (
                <option key={f.farmIDs} value={f.farmIDs}>
                  {f.farmNames}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600">
            {(['7d', '30d', '90d', 'year'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${datePreset === preset
                    ? 'bg-white text-emerald-800 font-semibold shadow-xs border border-slate-200/80'
                    : 'hover:text-slate-900'
                  }`}
              >
                {preset === '7d' ? t('7D') : preset === '30d' ? t('30D') : preset === '90d' ? t('90D') : t('1 Year')}
              </button>
            ))}
          </div>

          {/* Date Picker Inputs */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-700">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent text-slate-800 focus:outline-none text-xs"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent text-slate-800 focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Live Search & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("Filter table rows...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => loadReportData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
            {t("Refresh")}
          </button>

          {activeTab === 'financial' && (
            <button
              type="button"
              onClick={() => {
                setFormAmount('');
                setFormDescription('');
                setModalError(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={13} />
              {t("Record Entry")}
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={13} className="text-[#059669]" />
            {t("Download CSV")}
          </button>

          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles size={13} className="text-emerald-600" />
            {t("Ask AI")}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#059669]" />
            <span>{successToast}</span>
          </div>
          <button type="button" onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Category Tabs (Settings-Style Thin Border & Emerald Glow Elements) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${isActive
                  ? 'border-[#a7f3d0] bg-[#f0fdf4] text-[#065f46] shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
            >
              <div
                className={`p-2 rounded-md flex items-center justify-center shrink-0 ${isActive ? 'bg-[#dcfce7] text-[#059669]' : 'bg-slate-100 text-slate-500'
                  }`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs sm:text-sm font-semibold truncate ${isActive ? 'text-[#065f46]' : 'text-slate-800'}`}>
                  {tab.label}
                </div>
              </div>
              {isActive && <CheckCircle2 size={15} className="text-[#059669] shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Contextual Metric Cards (Clean Thin Borders & Subdued Modern Typography) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {activeTab === 'financial' && (
          <>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t("Total Revenue")}</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{formatLKR(summary?.totalIncome)}</h3>
                <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1 mt-0.5">
                  <TrendingUp size={12} /> {t("Sales Receipts")}
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-[#f0fdf4] text-[#059669] border border-[#a7f3d0]">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t("Total Expenses")}</p>
                <h3 className="text-xl font-bold text-rose-600 mt-1">{formatLKR(summary?.totalExpense)}</h3>
                <span className="text-[11px] text-rose-500 font-medium inline-flex items-center gap-1 mt-0.5">
                  <TrendingDown size={12} /> {t("Operations & Labor")}
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t("Net Profit")}</p>
                <h3 className="text-xl font-bold text-emerald-700 mt-1">{formatLKR(summary?.netProfit)}</h3>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{t("Revenue less expenses")}</span>
              </div>
              <div className="p-2.5 rounded-md bg-[#f0fdf4] text-[#059669] border border-[#a7f3d0]">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t("Profit Margin")}</p>
                <h3 className="text-xl font-bold text-blue-700 mt-1">
                  {summary?.profitMargin ? `${summary.profitMargin.toFixed(1)}%` : '0.0%'}
                </h3>
                <span className="text-[11px] text-slate-500 mt-0.5 block">{t("Net margin ratio")}</span>
              </div>
              <div className="p-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                <TrendingUp size={20} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'crops' && (
          <>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Planted Crops")}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{cropData.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Active batches registered")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Healthy Stand")}</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                {cropData.filter(c => c.status === 'Healthy').length}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{t("Optimal plant health")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("At Risk / Attention")}</p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">
                {cropData.filter(c => c.status !== 'Healthy').length}
              </h3>
              <p className="text-[11px] text-amber-600 mt-0.5">{t("Monitoring recommended")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Mean Cycle Progress")}</p>
              <h3 className="text-xl font-bold text-blue-700 mt-1">
                {cropData.length > 0 ? `${Math.round(cropData.reduce((acc, c) => acc + (c.progress || 0), 0) / cropData.length)}%` : '0%'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Maturation progress")}</p>
            </div>
          </>
        )}

        {activeTab === 'attendance' && (
          <>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Shifts Logged")}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{attendanceData.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("In selected filter date")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Present Check-ins")}</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                {attendanceData.filter(a => a.status === 'PRESENT').length}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{t("On-time attendance")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Late / Flags")}</p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">
                {attendanceData.filter(a => a.status === 'LATE').length}
              </h3>
              <p className="text-[11px] text-amber-600 mt-0.5">{t("Arrival deviations")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Total Labor Hours")}</p>
              <h3 className="text-xl font-bold text-blue-700 mt-1">
                {attendanceData.reduce((acc, a) => acc + (a.hoursWorked || 0), 0).toFixed(1)} hrs
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Logged field work")}</p>
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Total Tasks")}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{taskData.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Field duties scheduled")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Completed")}</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                {taskData.filter(t => t.status === 'COMPLETED').length}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{t("Successfully resolved")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("High / Urgent")}</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                {taskData.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length}
              </h3>
              <p className="text-[11px] text-rose-500 mt-0.5">{t("High attention tasks")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Completion Rate")}</p>
              <h3 className="text-xl font-bold text-blue-700 mt-1">
                {taskData.length > 0 ? `${Math.round((taskData.filter(t => t.status === 'COMPLETED').length / taskData.length) * 100)}%` : '0%'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Overall execution")}</p>
            </div>
          </>
        )}

        {activeTab === 'disease' && (
          <>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Total Scans")}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{diseaseData.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Foliage samples tested")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Pathogens Detected")}</p>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                {diseaseData.filter(d => !d.isHealthy).length}
              </h3>
              <p className="text-[11px] text-rose-500 mt-0.5">{t("Infected foliage flags")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Healthy Leaves")}</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                {diseaseData.filter(d => d.isHealthy).length}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{t("Clear inspection samples")}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase">{t("Mean Confidence")}</p>
              <h3 className="text-xl font-bold text-blue-700 mt-1">
                {diseaseData.length > 0
                  ? formatConfidence(
                      diseaseData.reduce((acc, d) => {
                        const val = d.confidence != null ? (d.confidence <= 1.0 && d.confidence > 0 ? d.confidence * 100 : d.confidence) : 0;
                        return acc + val;
                      }, 0) / diseaseData.length
                    )
                  : '0%'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t("Inference accuracy")}</p>
            </div>
          </>
        )}
      </div>

      {/* Visual Analytics Chart Card (Clean Thin Border) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'financial' && t("Revenue & Expense Analysis")}
              {activeTab === 'crops' && t("Crop Growth Progress Distribution")}
              {activeTab === 'attendance' && t("Attendance Status Breakdown")}
              {activeTab === 'tasks' && t("Task Execution States")}
              {activeTab === 'disease' && t("Plant Pathology Diagnostic Status")}
            </h3>
            <p className="text-xs text-slate-500">
              {t("Visual trends derived from active records")}
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'financial' ? (
              <AreaChart data={summary?.financialTrend || []} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [formatMoney(Number(value) || 0), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#059669" strokeWidth={2} fill="url(#colorRevenue)" name={t("Revenue")} />
                <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpense)" name={t("Expense")} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px' }} />
              </AreaChart>
            ) : activeTab === 'crops' ? (
              <BarChart data={cropData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="cropName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip formatter={(value: any) => [`${value}%`, t("Progress")]} contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="progress" name={t("Growth Progress (%)")} fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart
                data={
                  activeTab === 'attendance'
                    ? [
                      { name: t('Present'), count: attendanceData.filter(a => a.status === 'PRESENT').length, fill: '#059669' },
                      { name: t('Late'), count: attendanceData.filter(a => a.status === 'LATE').length, fill: '#d97706' },
                      { name: t('Absent'), count: attendanceData.filter(a => a.status === 'ABSENT').length, fill: '#dc2626' },
                    ]
                    : activeTab === 'tasks'
                      ? [
                        { name: t('Completed'), count: taskData.filter(t => t.status === 'COMPLETED').length, fill: '#059669' },
                        { name: t('In Progress'), count: taskData.filter(t => t.status === 'IN_PROGRESS').length, fill: '#2563eb' },
                        { name: t('Pending'), count: taskData.filter(t => t.status === 'PENDING').length, fill: '#64748b' },
                      ]
                      : [
                        { name: t('Healthy'), count: diseaseData.filter(d => d.isHealthy).length, fill: '#059669' },
                        { name: t('Infected'), count: diseaseData.filter(d => !d.isHealthy).length, fill: '#dc2626' },
                      ]
                }
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
                <Bar dataKey="count" name={t("Records")} radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Preview Table (Settings-Style Thin Border & Crisp Table Rows) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
              {activeTab === 'financial' && t("Financial Transaction Records")}
              {activeTab === 'crops' && t("Crop Registry & Growth Telemetry")}
              {activeTab === 'attendance' && t("Work Attendance Logs")}
              {activeTab === 'tasks' && t("Field Operational Task Logs")}
              {activeTab === 'disease' && t("AI Pathology Detection Records")}
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
              {activeTab === 'financial' && `${filteredFinancial.length}`}
              {activeTab === 'crops' && `${filteredCrops.length}`}
              {activeTab === 'attendance' && `${filteredAttendance.length}`}
              {activeTab === 'tasks' && `${filteredTasks.length}`}
              {activeTab === 'disease' && `${filteredDisease.length}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={13} className="text-[#059669]" />
            {t("Export CSV")}
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTab === 'financial' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-3">{t("Date")}</th>
                  <th className="p-3">{t("Farm")}</th>
                  <th className="p-3">{t("Type")}</th>
                  <th className="p-3">{t("Category")}</th>
                  <th className="p-3">{t("Description")}</th>
                  <th className="p-3 text-right">{t("Amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <TableSkeletonRows columns={6} />
                ) : filteredFinancial.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      {t("No financial records match the current filter")}
                    </td>
                  </tr>
                ) : (
                  filteredFinancial.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 whitespace-nowrap font-medium text-slate-900">{item.transactionDate}</td>
                      <td className="p-3 whitespace-nowrap">{item.farmName}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${item.recordType === 'INCOME'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          {t(item.recordType)}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-800">{t(item.category)}</td>
                      <td className="p-3 max-w-xs truncate text-slate-500">{item.description}</td>
                      <td
                        className={`p-3 whitespace-nowrap text-right font-bold ${item.recordType === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                      >
                        {item.recordType === 'INCOME' ? '+' : '-'} {formatLKR(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'crops' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-3">{t("Crop")}</th>
                  <th className="p-3">{t("Variety")}</th>
                  <th className="p-3">{t("Farm & Field")}</th>
                  <th className="p-3">{t("Stage")}</th>
                  <th className="p-3">{t("Progress")}</th>
                  <th className="p-3">{t("Status")}</th>
                  <th className="p-3">{t("Harvest Due")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <TableSkeletonRows columns={7} />
                ) : filteredCrops.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      {t("No crop records found")}
                    </td>
                  </tr>
                ) : (
                  filteredCrops.map((c) => (
                    <tr key={c.cropId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{c.cropName}</td>
                      <td className="p-3 text-slate-500">{c.variety || '-'}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{c.farmName}</div>
                        <div className="text-[11px] text-slate-400">{c.fieldName}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{t(c.growthStage)}</td>
                      <td className="p-3">
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#059669] h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, c.progress || 0))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">{c.progress}%</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${c.status === 'Healthy'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                          {t(c.status)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {c.harvestDate ? c.harvestDate.slice(0, 10) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'attendance' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-3">{t("Date")}</th>
                  <th className="p-3">{t("Worker Name")}</th>
                  <th className="p-3">{t("Farm")}</th>
                  <th className="p-3">{t("Check In")}</th>
                  <th className="p-3">{t("Check Out")}</th>
                  <th className="p-3">{t("Hours Worked")}</th>
                  <th className="p-3">{t("Status")}</th>
                  <th className="p-3">{t("Location")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <TableSkeletonRows columns={8} />
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      {t("No attendance records match the selected date or farm")}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 whitespace-nowrap font-medium text-slate-900">{a.date}</td>
                      <td className="p-3 font-semibold text-slate-800">{a.userName}</td>
                      <td className="p-3 text-slate-600">{a.farmName}</td>
                      <td className="p-3 text-slate-600">{a.checkInTime ? a.checkInTime.slice(11, 16) : '-'}</td>
                      <td className="p-3 text-slate-600">{a.checkOutTime ? a.checkOutTime.slice(11, 16) : '-'}</td>
                      <td className="p-3 font-semibold text-slate-900">{a.hoursWorked} {t("hrs")}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${a.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : a.status === 'LATE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          {t(a.status)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{a.location || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'tasks' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-3">{t("Task")}</th>
                  <th className="p-3">{t("Farm & Field")}</th>
                  <th className="p-3">{t("Assignee")}</th>
                  <th className="p-3">{t("Priority")}</th>
                  <th className="p-3">{t("Status")}</th>
                  <th className="p-3">{t("Due Date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <TableSkeletonRows columns={6} />
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      {t("No tasks found")}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((tItem) => (
                    <tr key={tItem.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{tItem.title}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{tItem.description}</div>
                      </td>
                      <td className="p-3">
                        <div>{tItem.farmName}</div>
                        <div className="text-[11px] text-slate-400">{tItem.fieldName}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{tItem.assigneeName || '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${tItem.priority === 'HIGH' || tItem.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : tItem.priority === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                          {t(tItem.priority)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${tItem.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tItem.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                          {t(tItem.status)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{tItem.dueDate || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'disease' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="p-3">{t("Date")}</th>
                  <th className="p-3">{t("Plant")}</th>
                  <th className="p-3">{t("Diagnosis")}</th>
                  <th className="p-3">{t("Condition")}</th>
                  <th className="p-3">{t("Confidence")}</th>
                  <th className="p-3">{t("Treatment")}</th>
                  <th className="p-3">{t("Inspector")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <TableSkeletonRows columns={7} />
                ) : filteredDisease.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      {t("No disease scans recorded")}
                    </td>
                  </tr>
                ) : (
                  filteredDisease.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                        {d.detectedAt ? d.detectedAt.slice(0, 10) : '-'}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{d.plantName}</td>
                      <td className="p-3 font-medium text-slate-800">{d.diseaseName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${d.isHealthy
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          {d.isHealthy ? t('HEALTHY') : t('INFECTED')}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-blue-700">{formatConfidence(d.confidence)}</td>
                      <td className="p-3 text-slate-500 max-w-sm truncate">{d.treatment || '-'}</td>
                      <td className="p-3 text-slate-600">{d.userName || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RECORD FINANCIAL TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t("Record Financial Transaction")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t("Add income or operational expense to farm ledger")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-3.5">
              {/* Record Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("Transaction Type")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordType('EXPENSE');
                      setFormCategory('FERTILIZER');
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                      recordType === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t("Expense (Outflow)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordType('INCOME');
                      setFormCategory('CROP_SALES');
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                      recordType === 'INCOME'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t("Income (Receipt)")}
                  </button>
                </div>
              </div>

              {/* Farm & Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Farm")}</label>
                  <select
                    value={formFarmId}
                    onChange={(e) => setFormFarmId(Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    {farms.map((f) => (
                      <option key={f.farmIDs} value={f.farmIDs}>{f.farmNames}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Date")}</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Category & Crop Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Category")}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    {recordType === 'EXPENSE' ? (
                      <>
                        <option value="FERTILIZER">{t("Fertilizer & Chemicals")}</option>
                        <option value="SEEDS">{t("Seeds & Seedlings")}</option>
                        <option value="LABOR_WAGES">{t("Labor & Field Wages")}</option>
                        <option value="EQUIPMENT">{t("Equipment & Machinery")}</option>
                        <option value="LOGISTICS">{t("Logistics & Transport")}</option>
                        <option value="MAINTENANCE">{t("Farm Maintenance")}</option>
                        <option value="OTHER">{t("Other Expense")}</option>
                      </>
                    ) : (
                      <>
                        <option value="CROP_SALES">{t("Crop Harvest Sales")}</option>
                        <option value="WHOLESALE">{t("Wholesale Distribution")}</option>
                        <option value="CONTRACT">{t("Contract Farming Revenue")}</option>
                        <option value="SUBSIDY">{t("Government Grant / Subsidy")}</option>
                        <option value="OTHER_INCOME">{t("Other Farm Income")}</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("Crop (Optional)")}</label>
                  <select
                    value={formCropId}
                    onChange={(e) => setFormCropId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">{t("None / General")}</option>
                    {cropData.map((c) => (
                      <option key={c.cropId} value={c.cropId}>{c.cropName} ({c.variety || c.growthStage})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">{t("Amount")} ({currency.code})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency.symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    className="w-full pl-12 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Description / Receipt Note */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">{t("Description / Receipt Note")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Bought 4 bags of urea, or market invoice #104")}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? <RefreshCw size={13} className="animate-spin" /> : null}
                  {isSaving ? t("Saving...") : t("Save Record")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI CHATBOT ASSISTANT DRAWER */}
      <ReportAiDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        activeTab={activeTab}
        activeTabLabel={tabsConfig.find((t) => t.id === activeTab)?.label || activeTab}
        farmId={selectedFarmId !== 'ALL' ? Number(selectedFarmId) : undefined}
        farmName={selectedFarmId !== 'ALL' ? farms.find((f) => String(f.farmIDs) === selectedFarmId)?.farmNames : undefined}
        fromDate={fromDate}
        toDate={toDate}
      />
    </div>
  );
}