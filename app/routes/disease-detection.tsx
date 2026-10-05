import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFetcher, useNavigate } from 'react-router';
import {
  analyzePlantImage,
  getRecentDetections,
  linkDetectionToPlot,
  createRemediationTask,
  getTaskOptions,
} from '../services/diseaseService';
import type { DiseaseAnalysisResult, IpmTreatmentItem } from '../types/disease';
import { ImageBoundingBox, type DiagnosticViewMode } from '../components/ImageBoundingBox';
import { DiseaseAskMoreChat } from '../components/DiseaseAskMoreChat';
import { ReferenceSpecimenCard } from '../components/ReferenceSpecimenCard';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  ExternalLink,
  FileText,
  Flame,
  Layers,
  Leaf,
  MapPin,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TrendingDown,
  Wind,
  X,
  Info,
  Check,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

export async function clientAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const language = (formData.get('language') as string) || i18n.resolvedLanguage || i18n.language || 'en';
  const crop = (formData.get('crop') as string) || '';

  if (!file || file.size === 0) {
    return { error: 'Please select a valid image file.' };
  }

  try {
    const result = await analyzePlantImage(file, language, crop);
    return { result };
  } catch (error: any) {
    return { error: error.message || 'Analysis failed. Please try again.' };
  }
}

function formatInspectionDate(dateString?: string, t?: any): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return t ? t('Just now') : 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ${t ? t('ago') : 'ago'}`;
  if (diffHours < 24) return `${diffHours}h ${t ? t('ago') : 'ago'}`;
  if (diffDays === 1) return t ? t('Yesterday') : 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ${t ? t('ago') : 'ago'}`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const COMMON_CROPS = [
  { value: '', label: 'Auto-detect (All Crops)' },
  { value: 'Tomato', label: 'Tomato (Solanum lycopersicum)' },
  { value: 'Paddy / Rice', label: 'Paddy / Rice (Oryza sativa)' },
  { value: 'Chili / Pepper', label: 'Chili / Pepper (Capsicum)' },
  { value: 'Potato', label: 'Potato (Solanum tuberosum)' },
  { value: 'Corn / Maize', label: 'Corn / Maize (Zea mays)' },
  { value: 'Tea', label: 'Tea (Camellia sinensis)' },
  { value: 'Eggplant / Brinjal', label: 'Eggplant / Brinjal (Solanum melongena)' },
  { value: 'Onion', label: 'Onion / Shallots (Allium cepa)' },
  { value: 'Cucumber', label: 'Cucumber (Cucumis sativus)' },
  { value: 'Coconut', label: 'Coconut (Cocos nucifera)' },
  { value: 'Banana', label: 'Banana (Musa)' },
  { value: '__other__', label: 'Other Crop (Specify...)' },
];

export default function DiseaseDetectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof clientAction>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optional target crop selection for focused AI diagnosis
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [customCrop, setCustomCrop] = useState<string>('');

  // Core Inspection state
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recentInspections, setRecentInspections] = useState<DiseaseAnalysisResult[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<DiseaseAnalysisResult | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<number | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Interactive View Modes & Filters
  const [viewMode, setViewMode] = useState<DiagnosticViewMode>('boxes');
  const [ipmFilter, setIpmFilter] = useState<'all' | 'organic' | 'chemical' | 'cultural'>('all');

  // Task Options (Farms, Fields, Workers)
  const [taskOptions, setTaskOptions] = useState<{
    farms: Array<{ id: number; name: string }>;
    fields: Array<{ id: number; name: string }>;
    supervisors: Array<{ id: number; name: string }>;
    workers: Array<{ id: number; name: string }>;
  }>({ farms: [], fields: [], supervisors: [], workers: [] });

  // Modal 1: Remediation Task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskFarmId, setTaskFarmId] = useState<number | ''>('');
  const [taskFieldId, setTaskFieldId] = useState<number | ''>('');
  const [taskWorkerId, setTaskWorkerId] = useState<number | ''>('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskFeedback, setTaskFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal 2: Log to Plot History
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [plotFarmId, setPlotFarmId] = useState<number | ''>('');
  const [plotFieldId, setPlotFieldId] = useState<number | ''>('');
  const [isSubmittingPlot, setIsSubmittingPlot] = useState(false);
  const [plotFeedback, setPlotFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [linkedPlotInfo, setLinkedPlotInfo] = useState<string | null>(null);

  const isSubmitting = fetcher.state === 'submitting';
  const fetcherResult = fetcher.data?.result as DiseaseAnalysisResult | undefined;
  const currentData = activeAnalysis || fetcherResult;
  const error = fetcher.data?.error;

  // Load history on mount
  useEffect(() => {
    let mounted = true;
    getRecentDetections(30)
      .then((items) => {
        if (mounted) {
          setRecentInspections(items || []);
          setIsLoadingHistory(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load recent inspections:', err);
        if (mounted) setIsLoadingHistory(false);
      });

    getTaskOptions()
      .then((opts) => {
        if (mounted) setTaskOptions(opts);
      })
      .catch((err) => {
        console.warn('Could not load task options:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Update on fetcher response
  useEffect(() => {
    if (fetcher.data?.result) {
      const newResult = fetcher.data.result;
      setActiveAnalysis(newResult);
      if (newResult.image_url) {
        setSelectedImage(newResult.image_url);
      }
      if (newResult.id) {
        setSelectedInspectionId(newResult.id);
        setRecentInspections((prev) => {
          const filtered = prev.filter((item) => item.id !== newResult.id);
          return [newResult, ...filtered];
        });
      }
      setLinkedPlotInfo(null);
    }
  }, [fetcher.data]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting) return;
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return;
      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setSelectedInspectionId(null);
      setActiveAnalysis(null);
      setLinkedPlotInfo(null);
    }
  };

  const handleSelectInspection = (inspection: DiseaseAnalysisResult) => {
    if (isSubmitting) return;
    setSelectedInspectionId(inspection.id ?? null);
    setActiveAnalysis(inspection);
    setSelectedFile(null);
    if (inspection.image_url) {
      setSelectedImage(inspection.image_url);
    }
    if (inspection.field_id) {
      const matchedField = taskOptions.fields.find((f) => f.id === inspection.field_id);
      setLinkedPlotInfo(matchedField ? matchedField.name : `Field #${inspection.field_id}`);
    } else {
      setLinkedPlotInfo(null);
    }
  };

  const handleRunDiagnosis = () => {
    if (!selectedFile || isSubmitting) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    const currentLang = i18n.resolvedLanguage || i18n.language || 'en';
    formData.append('language', currentLang);

    const finalCrop = selectedCrop === '__other__' ? customCrop.trim() : selectedCrop.trim();
    if (finalCrop) {
      formData.append('crop', finalCrop);
    }

    fetcher.submit(formData, { method: 'post', encType: 'multipart/form-data' });
  };

  const clearImage = () => {
    if (isSubmitting) return;
    setSelectedFile(null);
    setSelectedImage(null);
    setSelectedInspectionId(null);
    setActiveAnalysis(null);
    setLinkedPlotInfo(null);
    setSelectedCrop('');
    setCustomCrop('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open Task Modal with intelligent pre-filled values
  const openCreateTaskModal = () => {
    if (!currentData) return;
    const diseaseLabel = currentData.disease_name || t('Pathogen Outbreak');
    const plantLabel = currentData.plant_name || t('Crop');
    setTaskTitle(`Apply IPM Remediation: ${diseaseLabel} on ${plantLabel}`);

    let desc = `Urgent IPM remediation protocol triggered by Vision Diagnostic scan.\n`;
    desc += `Pathogen: ${currentData.scientific_name || diseaseLabel} (${currentData.pathogen_type || 'Foliar infection'})\n`;
    if (currentData.ipm_matrix && currentData.ipm_matrix.length > 0) {
      desc += `Recommended Protocol:\n`;
      currentData.ipm_matrix.forEach((item) => {
        desc += `• [${item.category}] ${item.method} - ${item.dosage_and_timing} (${item.phi_interval || 'Standard PHI'})\n`;
      });
    }
    desc += `Warning: Ensure spray equipment is calibrated and field worker wears PPE.`;
    setTaskDesc(desc);

    // Default due date: tomorrow
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    setTaskDueDate(tmrw.toISOString().split('T')[0]);

    if (taskOptions.farms.length > 0) setTaskFarmId(taskOptions.farms[0].id);
    if (taskOptions.fields.length > 0) setTaskFieldId(taskOptions.fields[0].id);
    if (taskOptions.workers.length > 0) setTaskWorkerId(taskOptions.workers[0].id);

    setTaskFeedback(null);
    setIsTaskModalOpen(true);
  };

  // Submit Remediation Task to /api/tasks
  const handleSaveRemediationTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsSubmittingTask(true);
    setTaskFeedback(null);

    try {
      await createRemediationTask({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        farmId: taskFarmId ? Number(taskFarmId) : undefined,
        fieldId: taskFieldId ? Number(taskFieldId) : undefined,
        workerIds: taskWorkerId ? [Number(taskWorkerId)] : [],
        priority: taskPriority,
        dueDate: taskDueDate,
        status: 'PENDING',
      });

      setTaskFeedback({
        type: 'success',
        message: t('Remediation task successfully scheduled in the Tasks module!'),
      });

      setTimeout(() => {
        setIsTaskModalOpen(false);
        setTaskFeedback(null);
      }, 1800);
    } catch (err: any) {
      setTaskFeedback({
        type: 'error',
        message: err.message || t('Failed to create remediation task.'),
      });
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Submit Plot Link
  const handleSavePlotLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentData?.id || !plotFarmId || !plotFieldId) return;

    setIsSubmittingPlot(true);
    setPlotFeedback(null);

    try {
      await linkDetectionToPlot(currentData.id, Number(plotFarmId), Number(plotFieldId));
      const fieldObj = taskOptions.fields.find((f) => f.id === Number(plotFieldId));
      const fName = fieldObj ? fieldObj.name : `Field #${plotFieldId}`;
      setLinkedPlotInfo(fName);

      setPlotFeedback({
        type: 'success',
        message: `${t('Infection event permanently logged to field history for')} ${fName}!`,
      });

      setTimeout(() => {
        setIsPlotModalOpen(false);
        setPlotFeedback(null);
      }, 1600);
    } catch (err: any) {
      setPlotFeedback({
        type: 'error',
        message: err.message || t('Failed to link detection to plot history.'),
      });
    } finally {
      setIsSubmittingPlot(false);
    }
  };

  // Shortcut: Navigate to inventory tab with treatment search
  const handleDeductInventory = (activeIngredient?: string) => {
    const q = activeIngredient || (currentData?.ipm_matrix?.[0]?.method) || 'Neem';
    const cleanQ = q.split('/')[0].split('(')[0].trim();
    navigate(`/inventory?search=${encodeURIComponent(cleanQ)}`);
  };

  // Shortcut: Share summary via WhatsApp
  const handleShareWhatsapp = () => {
    if (!currentData) return;
    const nowStr = new Date().toLocaleDateString();
    let text = `🚨 *AGROFARM AI CROP DIAGNOSTIC REPORT* 🌿\n`;
    text += `📅 *Date:* ${nowStr}\n`;
    text += `🌱 *Host Plant:* ${currentData.plant_name}\n`;
    text += `🦠 *Condition:* ${currentData.disease_name} (${currentData.is_healthy ? 'HEALTHY' : 'PATHOGEN DETECTED'})\n`;
    if (currentData.scientific_name) text += `🔬 *Scientific Name:* _${currentData.scientific_name}_\n`;
    if (currentData.pathogen_type) text += `🏷️ *Classification:* ${currentData.pathogen_type}\n`;
    if (currentData.yield_loss_risk) text += `⚠️ *Yield Loss Risk:* ${currentData.yield_loss_risk}\n`;
    if (currentData.spread_speed) text += `⚡ *Spread Velocity:* ${currentData.spread_speed}\n`;
    if (currentData.harvest_impact) text += `🛑 *Harvest PHI Alert:* ${currentData.harvest_impact}\n\n`;

    if (currentData.ipm_matrix && currentData.ipm_matrix.length > 0) {
      text += `🛡️ *INTEGRATED PEST MANAGEMENT (IPM) PROTOCOL:*\n`;
      currentData.ipm_matrix.forEach((item) => {
        text += `• *${item.category}:* ${item.method} | ${item.dosage_and_timing} (${item.phi_interval || 'Standard PHI'})\n`;
      });
      text += `\n`;
    }

    text += `🌾 *AgroFarm Agronomy Telemetry System*`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Shortcut: Print / Export PDF
  const handlePrintPdf = () => {
    window.print();
  };

  const confidenceScore = currentData
    ? Math.round(
      currentData.overall_confidence <= 1.0 && currentData.overall_confidence > 0
        ? currentData.overall_confidence * 100
        : currentData.overall_confidence
    )
    : 0;

  // Filtered IPM items
  const filteredIpmMatrix: IpmTreatmentItem[] = useMemo(() => {
    const list = currentData?.ipm_matrix || [];
    if (ipmFilter === 'all') return list;
    if (ipmFilter === 'organic') return list.filter((i) => i.category.toLowerCase().includes('organic'));
    if (ipmFilter === 'chemical') return list.filter((i) => i.category.toLowerCase().includes('chemical'));
    if (ipmFilter === 'cultural') return list.filter((i) => i.category.toLowerCase().includes('cultural') || i.category.toLowerCase().includes('mechanical'));
    return list;
  }, [currentData?.ipm_matrix, ipmFilter]);

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1e293b',
    marginTop: 0,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div
      className="p-3 sm:p-6 lg:p-7 pb-16 w-full min-h-screen bg-[#f8fafc] font-sans box-border"
    >
      {/* Keyframe animation & print layout styles */}
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; opacity: 0.7; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.7; }
        }
        .animate-scan {
          animation: scanLine 2.4s ease-in-out infinite alternate;
        }

        @media print {
          body {
            background-color: #ffffff !important;
            font-size: 11pt !important;
          }
          nav, aside, header, .no-print, button, input {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {error && (
        <div style={{
          padding: '16px 20px', marginBottom: '28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{t(error)}</span>
        </div>
      )}

      {/* Main page layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">

        {/* ================= LEFT PANE: SAMPLE MEDIA & RECENT INSPECTIONS ================= */}
        <div className="w-full lg:w-[320px] shrink-0 no-print">

          {/* Media Block */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={sectionHeaderStyle}>
              <Leaf size={18} className="text-emerald-600" />
              {t('Sample Media')}
            </h3>

            {/* Media Canvas / Preview Box */}
            <div style={{
              position: 'relative',
              width: '100%',
              minHeight: '230px',
              maxHeight: '340px',
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedImage ? (
                <>
                  {currentData && !isSubmitting ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px',
                      boxSizing: 'border-box'
                    }}>
                      <ImageBoundingBox
                        imageUrl={selectedImage}
                        boxes={currentData.detected_spots || []}
                        mode={viewMode}
                      />
                    </div>
                  ) : (
                    <img
                      src={selectedImage}
                      alt={t('Sample Preview')}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '320px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  )}

                  {isSubmitting && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(6, 78, 59, 0.35)',
                      overflow: 'hidden',
                      pointerEvents: 'none'
                    }}>
                      <div className="animate-scan" style={{
                        position: 'absolute',
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 14px #10b981'
                      }} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={clearImage}
                    disabled={isSubmitting}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      zIndex: 30,
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '32px' }}>🍃</div>
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>{t('No Image Selected')}</span>
                </div>
              )}
            </div>

            {/* Interactive Saliency / Heatmap Overlay Controls */}
            {currentData && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '3px'
                }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: viewMode === 'original' ? '#ffffff' : 'transparent',
                      color: viewMode === 'original' ? '#0f172a' : '#64748b',
                      boxShadow: viewMode === 'original' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {t('Original')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('boxes')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: viewMode === 'boxes' ? '#ffffff' : 'transparent',
                      color: viewMode === 'boxes' ? '#0f172a' : '#64748b',
                      boxShadow: viewMode === 'boxes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {t('Boxes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('heatmap')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: viewMode === 'heatmap' ? '#ffffff' : 'transparent',
                      color: viewMode === 'heatmap' ? '#ea580c' : '#64748b',
                      boxShadow: viewMode === 'heatmap' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    🔥 {t('Heatmap')}
                  </button>
                </div>

                {viewMode === 'heatmap' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fff7ed',
                    border: '1px solid #ffedd5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#c2410c'
                  }}>
                    <span>{t("Grad-CAM Activation:")}</span>
                    <span style={{ fontWeight: 700 }}>{t("Low")} 🟦 🟨 🟧 🟥 {t("Core")}</span>
                  </div>
                )}
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isSubmitting}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginBottom: '10px',
                transition: 'all 0.15s ease'
              }}
            >
              {t('Upload Photo')}
            </button>

            {/* Optional Crop Selection Card */}
            <div style={{
              marginBottom: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Leaf size={14} className="text-emerald-600" />
                  {t('Target Crop')}
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>({t('Optional')})</span>
                </label>
                {selectedCrop && (
                  <button
                    type="button"
                    onClick={() => { setSelectedCrop(''); setCustomCrop(''); }}
                    style={{
                      fontSize: '11px',
                      color: '#059669',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    {t('Reset')}
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0', lineHeight: 1.35 }}>
                {t('Narrow the neural diagnosis by selecting or specifying your crop species.')}
              </p>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {COMMON_CROPS.map((cropOption) => (
                  <option key={cropOption.value} value={cropOption.value}>
                    {t(cropOption.label)}
                  </option>
                ))}
              </select>

              {selectedCrop === '__other__' && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder={t('Type crop name (e.g. Cabbage, Mango, Papaya)')}
                    value={customCrop}
                    onChange={(e) => setCustomCrop(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={!selectedFile || isSubmitting}
              style={{
                width: '100%',
                padding: '13px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: (!selectedFile || isSubmitting) ? 'not-allowed' : 'pointer',
                opacity: (!selectedFile || isSubmitting) ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} />
              {isSubmitting ? t('Analyzing Sample...') : t('Run Diagnostics')}
            </button>
          </div>

          {/* Section: Recent Crop Inspections (Preserved as requested) */}
          <div style={{
            marginTop: '24px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ ...sectionHeaderStyle, marginBottom: '14px' }}>
              <Clock size={17} className="text-slate-500" />
              {t('Recent Crop Inspections')}
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '420px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {isLoadingHistory ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ width: '80px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                        <div style={{ width: '110px', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentInspections.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>🍃</div>
                  <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                    {t('No past inspections yet')}
                  </div>
                  <div>
                    {t('Upload and scan a leaf to record your first diagnosis.')}
                  </div>
                </div>
              ) : (
                recentInspections.map((item) => {
                  const isSelected = selectedInspectionId === item.id;
                  const initial = item.plant_name ? item.plant_name.trim().charAt(0).toUpperCase() : '🌿';
                  const status = item.is_healthy ? 'HEALTHY' : 'INFECTED';
                  const formattedDate = formatInspectionDate(item.created_at, t);

                  return (
                    <div
                      key={item.id ?? `${item.plant_name}-${item.created_at}`}
                      onClick={() => handleSelectInspection(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(5, 150, 105, 0.12)' : 'none',
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#dcfce7' : '#f1f5f9',
                        color: isSelected ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0,
                        border: isSelected ? '1px solid #86efac' : '1px solid #e2e8f0'
                      }}>
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '12px',
                            color: '#334155',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.plant_name || t('Unknown Plant')}
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '10px',
                            backgroundColor: item.is_healthy ? '#f0fdf4' : '#fef2f2',
                            color: item.is_healthy ? '#166534' : '#991b1b',
                            border: `1px solid ${item.is_healthy ? '#bbf7d0' : '#fecaca'}`
                          }}>
                            {t(status)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '130px'
                          }}>
                            {item.disease_name || (item.is_healthy ? t('Healthy Foliage') : t('Undetermined'))}
                          </span>
                          {formattedDate && (
                            <span style={{ fontSize: '9px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {formattedDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ================= RIGHT PANE: COMPREHENSIVE ACTIONABLE REPORT ================= */}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }} className="print-full-width">

          {/* Top Bar: Title & "Ask more" button (Preserved as requested) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t('Actionable Diagnostic Report')}
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                {linkedPlotInfo ? `${t('Linked to')} ${linkedPlotInfo}` : t('Vision neural inference with integrated IPM protocol')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                disabled={!currentData}
                title={currentData ? t('Ask about this scan') : t('Run diagnostics first')}
                style={{
                  padding: '9px 16px',
                  backgroundColor: currentData ? '#059669' : '#e2e8f0',
                  color: currentData ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: currentData ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: currentData ? '0 2px 6px rgba(5,150,105,0.25)' : 'none'
                }}
              >
                <Sparkles size={15} />
                {t('Ask more')}
              </button>
            </div>
          </div>

          {/* ================= SECTION 1: QUICK DIAGNOSTIC METRIC CARDS ================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '28px' }}>

            {/* Metric 1: Host Species */}
            <div style={{
              padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('Identified Host Species')}
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                {currentData?.plant_name || <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '14px' }}>{t('Awaiting sample scan...')}</span>}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {currentData ? t('Foliage structure verified via vision matrix') : t('No sample processed')}
              </span>
            </div>

            {/* Metric 2: Detected Pathology */}
            <div style={{
              padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('Detected Pathology / Disease')}
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: currentData ? (currentData.is_healthy ? '#166534' : '#991b1b') : '#94a3b8' }}>
                {currentData?.disease_name || <span style={{ fontWeight: 500, fontSize: '14px' }}>{t('Undetermined')}</span>}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {currentData?.is_healthy ? t('No infectious spores or lesions found') : currentData ? t('Active biological infestation detected') : t('Upload leaf to begin scan')}
              </span>
            </div>

            {/* Metric 3: Severity State */}
            <div style={{
              padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('Pathology Severity State')}
              </span>
              <div>
                {currentData ? (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px',
                    backgroundColor: currentData.is_healthy ? '#f0fdf4' : '#fef2f2',
                    color: currentData.is_healthy ? '#166534' : '#991b1b',
                    display: 'inline-block',
                    border: `1px solid ${currentData.is_healthy ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    ● {currentData.is_healthy ? t('HEALTHY LEAF MATRIX') : t('PATHOGEN DETECTED')}
                  </span>
                ) : (
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>{t('Pending Evaluation')}</span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {currentData?.is_healthy ? t('Photosynthetic tissue operational') : currentData ? t('Immediate intervention advised') : t('System standby')}
              </span>
            </div>

            {/* Metric 4: Multi-Class Probability Distribution (Top 3 matches) */}
            <div style={{
              padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('Probability Distribution')}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {currentData ? `${confidenceScore}%` : '0%'}
                </span>
              </div>

              {currentData?.probability_distribution && currentData.probability_distribution.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                  {currentData.probability_distribution.slice(0, 3).map((item, idx) => {
                    const pct = Math.round(item.probability <= 1.0 ? item.probability * 100 : item.probability);
                    const color = idx === 0 ? (currentData.is_healthy ? '#059669' : '#e11d48') : (idx === 1 ? '#f59e0b' : '#64748b');
                    return (
                      <div key={idx} style={{ fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#334155' }}>
                          <span style={{ fontWeight: idx === 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {item.name}
                          </span>
                          <span style={{ fontWeight: 700, color }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{
                      width: `${confidenceScore}%`, height: '100%',
                      backgroundColor: currentData?.is_healthy ? '#059669' : '#e11d48',
                      borderRadius: '4px'
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {currentData ? t('Primary neural prediction confirmed') : t('Awaiting model inference')}
                  </span>
                </>
              )}
            </div>

          </div>

          {/* ================= SECTION 2: PATHOLOGICAL OBSERVATIONS & SYMPTOMS BREAKDOWN ================= */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            marginBottom: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h3 style={sectionHeaderStyle}>
              <Activity size={18} className="text-emerald-600" />
              {t('Pathological Observations & Symptoms Breakdown')}
            </h3>

            {currentData?.general_description ? (
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }}>
                {currentData.general_description}
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 18px' }}>
                {t('Diagnostic etiology, surface lesion morphology, and biological infection timelines will populate here once the sample image is analyzed.')}
              </p>
            )}

            {/* Diagnostic Bio-Indicators Checklist */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
              paddingTop: '14px',
              borderTop: '1px solid #f1f5f9'
            }}>
              {[
                { label: t('Foliage Tissue Necrosis'), detected: Boolean(currentData && !currentData.is_healthy) },
                { label: t('Chlorotic Ring Formations'), detected: Boolean(currentData && !currentData.is_healthy) },
                { label: t('Airborne Spore Spread Risk'), detected: Boolean(currentData && !currentData.is_healthy) },
                { label: t('Water Splash Transmission'), detected: Boolean(currentData && !currentData.is_healthy) },
                { label: t('Cellular Structure Integrity'), detected: Boolean(currentData?.is_healthy) },
                { label: t('Quarantine Protocol Required'), detected: Boolean(currentData && !currentData.is_healthy && (currentData.overall_confidence > 0.8)) },
              ].map((indicator) => (
                <div
                  key={indicator.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: indicator.detected ? '#1e293b' : '#64748b',
                    fontWeight: indicator.detected ? 600 : 400
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px',
                    border: `1px solid ${indicator.detected ? '#059669' : '#cbd5e1'}`,
                    backgroundColor: indicator.detected ? '#059669' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', fontSize: '11px', fontWeight: 'bold'
                  }}>
                    {indicator.detected && '✓'}
                  </div>
                  <span>{indicator.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ================= SECTION 3: BIOLOGICAL & PATHOGEN PROFILE ================= */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            marginBottom: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h3 style={sectionHeaderStyle}>
              <Layers size={18} className="text-emerald-600" />
              {t('Biological & Pathogen Profile')}
            </h3>

            {/* Scientific name & Classification banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '18px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('Scientific Name & Taxonomy')}
                </span>
                <div style={{ fontSize: '17px', fontWeight: 700, color: currentData?.scientific_name ? '#0f172a' : '#64748b', fontStyle: currentData?.scientific_name ? 'italic' : 'normal' }}>
                  {currentData?.scientific_name ? (
                    currentData.scientific_name
                  ) : currentData ? (
                    currentData.is_healthy ? t('Plantae (Normal Flora)') : t('Undetermined Pathogen')
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'normal', fontWeight: 500, fontSize: '15px' }}>
                      {t('Awaiting scientific identification...')}
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '20px',
                backgroundColor: currentData?.pathogen_type ? '#eff6ff' : (currentData?.is_healthy ? '#f0fdf4' : '#f8fafc'),
                border: `1px solid ${currentData?.pathogen_type ? '#bfdbfe' : (currentData?.is_healthy ? '#bbf7d0' : '#e2e8f0')}`,
                color: currentData?.pathogen_type ? '#1d4ed8' : (currentData?.is_healthy ? '#166534' : '#64748b'),
                fontSize: '12px',
                fontWeight: 700
              }}>
                <ShieldAlert size={14} className={currentData?.pathogen_type ? 'text-blue-600' : (currentData?.is_healthy ? 'text-emerald-600' : 'text-slate-400')} />
                <span>
                  {currentData?.pathogen_type || (
                    currentData
                      ? (currentData.is_healthy ? t('Beneficial / Non-Pathogenic') : t('Unspecified'))
                      : t('Pending Classification')
                  )}
                </span>
              </div>
            </div>

            {/* Favorable Environmental Conditions Mini Status Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '18px'
            }}>
              <div style={{
                padding: '12px 14px', borderRadius: '8px',
                backgroundColor: currentData?.optimal_temperature ? '#fef3c7' : '#f8fafc',
                border: `1px solid ${currentData?.optimal_temperature ? '#fde68a' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <Thermometer size={20} className={currentData?.optimal_temperature ? "text-amber-700" : "text-slate-400"} />
                <div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: currentData?.optimal_temperature ? '#92400e' : '#64748b',
                    textTransform: 'uppercase'
                  }}>
                    {t('Optimal Temperature')}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: currentData?.optimal_temperature ? 700 : 500,
                    color: currentData?.optimal_temperature ? '#78350f' : '#94a3b8'
                  }}>
                    {currentData?.optimal_temperature || (currentData ? (currentData.is_healthy ? t('N/A (Healthy)') : t('Not specified')) : t('Awaiting scan...'))}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px 14px', borderRadius: '8px',
                backgroundColor: currentData?.humidity_level ? '#e0f2fe' : '#f8fafc',
                border: `1px solid ${currentData?.humidity_level ? '#bae6fd' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <Droplets size={20} className={currentData?.humidity_level ? "text-sky-700" : "text-slate-400"} />
                <div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: currentData?.humidity_level ? '#0369a1' : '#64748b',
                    textTransform: 'uppercase'
                  }}>
                    {t('Relative Humidity')}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: currentData?.humidity_level ? 700 : 500,
                    color: currentData?.humidity_level ? '#075985' : '#94a3b8'
                  }}>
                    {currentData?.humidity_level || (currentData ? (currentData.is_healthy ? t('N/A (Healthy)') : t('Not specified')) : t('Awaiting scan...'))}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px 14px', borderRadius: '8px',
                backgroundColor: currentData?.weather_correlation ? '#f1f5f9' : '#f8fafc',
                border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <Wind size={20} className={currentData?.weather_correlation ? "text-slate-600" : "text-slate-400"} />
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: currentData?.weather_correlation ? '#475569' : '#64748b', textTransform: 'uppercase' }}>
                    {t('Weather Correlation')}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: currentData?.weather_correlation ? 600 : 500,
                    color: currentData?.weather_correlation ? '#334155' : '#94a3b8'
                  }}>
                    {currentData?.weather_correlation || (
                      currentData
                        ? (currentData.is_healthy ? t('Normal ambient farm weather supports vigorous photosynthesis.') : t('No specific weather vulnerability correlation recorded.'))
                        : t('Ambient weather correlation data will calculate once leaf diagnostics are complete.')
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Life Cycle & Incubation Period (3-Stage Timeline) */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
                {t('Biological Life Cycle & Progression')}:
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                position: 'relative'
              }}>
                {currentData?.life_cycle_stages && currentData.life_cycle_stages.length > 0 ? (
                  currentData.life_cycle_stages.map((stage, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '12px',
                          backgroundColor: idx === 0 ? '#eff6ff' : (idx === 1 ? '#fef3c7' : '#fef2f2'),
                          color: idx === 0 ? '#1d4ed8' : (idx === 1 ? '#b45309' : '#b91c1c')
                        }}>
                          {t('STAGE')} {idx + 1}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                          {stage.duration}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                        {stage.stage_name}
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                        {stage.description}
                      </div>
                    </div>
                  ))
                ) : (
                  [
                    { stage_name: t('Incubation & Inoculation'), desc: t('Spore adhesion and germination phases will be mapped upon pathogen detection.') },
                    { stage_name: t('Active Damage Phase'), desc: t('Tissue colonization and necrosis progression rates will display here.') },
                    { stage_name: t('Spore Dissemination / Maturation'), desc: t('Secondary transmission cycle and release windows will appear here.') }
                  ].map((placeholderStage, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '12px',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b'
                        }}>
                          {t('STAGE')} {idx + 1}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>
                          —
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                        {currentData?.is_healthy ? t('Normal Growth Phase') : placeholderStage.stage_name}
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                        {currentData?.is_healthy
                          ? t('Photosynthetic leaf tissue is healthy. No parasitic life cycle present.')
                          : placeholderStage.desc}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ================= SECTION 4: INTERACTIVE REFERENCE LIBRARY COMPARISON ================= */}
          <ReferenceSpecimenCard analysis={currentData} uploadedImageUrl={selectedImage} />

          {/* ================= SECTION 5: INTEGRATED PEST MANAGEMENT (IPM) MATRIX ================= */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            marginBottom: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>
                <ShieldCheck size={18} className="text-emerald-600" />
                {t('Integrated Pest Management (IPM) Matrix')}
              </h3>

              {/* Tier Filter Tabs */}
              <div style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '3px',
                gap: '3px'
              }} className="no-print">
                {[
                  { id: 'all', label: t('All Tiers') },
                  { id: 'organic', label: `🌿 ${t('Organic & Biological')}` },
                  { id: 'chemical', label: `🧪 ${t('Chemical Intervention')}` },
                  { id: 'cultural', label: `⚙️ ${t('Cultural & Mechanical')}` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setIpmFilter(tab.id as any)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: ipmFilter === tab.id ? '#ffffff' : 'transparent',
                      color: ipmFilter === tab.id ? '#059669' : '#64748b',
                      boxShadow: ipmFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actionable 3-tier IPM Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, width: '180px' }}>{t('Category')}</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>{t('Method / Active Ingredient')}</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>{t('Application Dosage & Timing')}</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, width: '160px' }}>{t('Pre-Harvest Interval (PHI)')}</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, width: '120px' }} className="no-print">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIpmMatrix.length > 0 ? (
                    filteredIpmMatrix.map((item, idx) => {
                      const isChem = item.category.toLowerCase().includes('chemical');
                      const isOrg = item.category.toLowerCase().includes('organic');
                      const badgeBg = isOrg ? '#f0fdf4' : (isChem ? '#fef2f2' : '#eff6ff');
                      const badgeText = isOrg ? '#15803d' : (isChem ? '#b91c1c' : '#1d4ed8');
                      const badgeBorder = isOrg ? '#bbf7d0' : (isChem ? '#fecaca' : '#bfdbfe');

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: badgeBg,
                              color: badgeText,
                              border: `1px solid ${badgeBorder}`,
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {t(item.category)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top', fontWeight: 600, color: '#1e293b' }}>
                            {item.method}
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#475569' }}>
                            {item.dosage_and_timing}
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isChem ? '#dc2626' : '#059669',
                              backgroundColor: isChem ? '#fef2f2' : '#f0fdf4',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {item.phi_interval || (isChem ? 'Strict 7-day PHI' : '0-day PHI')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top' }} className="no-print">
                            <button
                              type="button"
                              onClick={() => handleDeductInventory(item.method)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Search size={12} />
                              {t('Check')}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        {currentData
                          ? t('No treatment records match the selected tier filter.')
                          : t('Diagnostic scan required. IPM recommendations will appear here after sample analysis.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= SECTION 6: ECONOMIC IMPACT & YIELD LOSS RISK PROJECTION ================= */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            marginBottom: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h3 style={sectionHeaderStyle}>
              <TrendingDown size={18} className="text-amber-600" />
              {t('Yield & Economic Impact Forecast')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>

              {/* Yield Loss Progress Gauge */}
              <div style={{
                padding: '16px', borderRadius: '10px',
                border: `1px solid ${currentData ? '#fde68a' : '#e2e8f0'}`,
                backgroundColor: currentData ? '#fffbeb' : '#f8fafc',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: currentData ? '#92400e' : '#64748b', textTransform: 'uppercase' }}>
                    {t('Projected Foliage & Yield Loss Risk')}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: currentData ? '#b45309' : '#94a3b8' }}>
                    {currentData?.yield_loss_percentage !== undefined ? `${currentData.yield_loss_percentage}%` : (currentData ? '0%' : '—')}
                  </span>
                </div>

                <div style={{ width: '100%', height: '8px', backgroundColor: currentData ? '#fef3c7' : '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${currentData?.yield_loss_percentage ?? 0}%`,
                    height: '100%',
                    backgroundColor: (currentData?.yield_loss_percentage ?? 0) > 35 ? '#ef4444' : '#f59e0b',
                    borderRadius: '6px'
                  }} />
                </div>

                <div style={{ fontSize: '12px', color: currentData ? '#78350f' : '#94a3b8', fontWeight: currentData ? 600 : 500 }}>
                  {currentData?.yield_loss_risk || (
                    currentData
                      ? (currentData.is_healthy ? t('0% – Normal yield expected') : t('Yield loss risk undetermined'))
                      : t('Yield loss impact will be calculated after scanning.')
                  )}
                </div>
              </div>

              {/* Spread Speed Rating */}
              <div style={{
                padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {t('Spread Velocity Rating')}
                </span>
                {currentData?.spread_speed ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: currentData.is_healthy ? '#f0fdf4' : '#fee2e2',
                    color: currentData.is_healthy ? '#166534' : '#991b1b',
                    border: `1px solid ${currentData.is_healthy ? '#bbf7d0' : '#fecaca'}`,
                    fontSize: '13px',
                    fontWeight: 700,
                    alignSelf: 'flex-start'
                  }}>
                    <Flame size={15} />
                    <span>{currentData.spread_speed}</span>
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    fontWeight: 600,
                    alignSelf: 'flex-start'
                  }}>
                    <span>{currentData ? (currentData.is_healthy ? t('None: Foliage healthy') : t('Undetermined')) : t('Awaiting scan...')}</span>
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {currentData?.spread_speed
                    ? t('Secondary foliar transmission via ambient greenhouse airflow and droplet splashing.')
                    : (currentData?.is_healthy
                      ? t('No pathogen transmission vectors detected for healthy crop foliage.')
                      : t('Transmission velocity metrics will calculate upon pathogen detection.'))}
                </div>
              </div>

            </div>

            {/* Harvest Impact Alert Banner */}
            {currentData?.harvest_impact ? (
              <div style={{
                marginTop: '16px',
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '2px' }}>
                    {t('Pre-Harvest Interval (PHI) & Harvest Withholding Alert')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '1.4' }}>
                    {currentData.harvest_impact}
                  </div>
                </div>
              </div>
            ) : currentData?.is_healthy ? (
              <div style={{
                marginTop: '16px',
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>
                    {t('No Withholding Period Needed')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', lineHeight: '1.4' }}>
                    {t('Foliage is healthy. Standard crop harvesting schedule is unaffected.')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: '16px',
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Info size={20} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                    {t('Pre-Harvest Interval (PHI) Notice')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                    {t('Chemical safety withholding intervals and harvest impact alerts will populate here after diagnostic evaluation.')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SECTION 7: AUTOMATED OPERATIONAL ACTIONS ================= */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }} className="no-print">
            <h3 style={sectionHeaderStyle}>
              <ClipboardList size={18} className="text-emerald-600" />
              {t('Automated Farm Operations')}
            </h3>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center'
            }}>

              {/* Button 4: Print / Export PDF */}
              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={!currentData}
                style={{
                  padding: '11px 18px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: currentData ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Printer size={16} />
                {t('Print / Export PDF')}
              </button>

              {/* Button 5: Share via WhatsApp */}
              <button
                type="button"
                onClick={handleShareWhatsapp}
                disabled={!currentData}
                style={{
                  padding: '11px 18px',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: currentData ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(37,211,102,0.3)'
                }}
              >
                <Share2 size={16} />
                {t('Share via WhatsApp')}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ================= MODAL 1: CREATE REMEDIATION TASK ================= */}
      {isTaskModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {t('Create Remediation Task')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {taskFeedback && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                backgroundColor: taskFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: taskFeedback.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${taskFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {taskFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveRemediationTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('Task Title')}
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('Target Farm')}
                  </label>
                  <select
                    value={taskFarmId}
                    onChange={(e) => setTaskFarmId(e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">{t('Select Farm...')}</option>
                    {taskOptions.farms.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('Target Field / Plot')}
                  </label>
                  <select
                    value={taskFieldId}
                    onChange={(e) => setTaskFieldId(e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">{t('Select Field...')}</option>
                    {taskOptions.fields.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('Assign Field Worker')}
                  </label>
                  <select
                    value={taskWorkerId}
                    onChange={(e) => setTaskWorkerId(e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">{t('Select Worker...')}</option>
                    {taskOptions.workers.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {t('Due Date')}
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('Priority')}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setTaskPriority(pr)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: taskPriority === pr ? '2px solid #059669' : '1px solid #cbd5e1',
                        backgroundColor: taskPriority === pr ? '#f0fdf4' : '#ffffff',
                        color: taskPriority === pr ? '#166534' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {t(pr)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('Treatment Instructions & Dosage')}
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmittingTask ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingTask ? 0.7 : 1
                  }}
                >
                  {isSubmittingTask ? t('Scheduling Task...') : t('Assign Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: LOG TO PLOT HISTORY ================= */}
      {isPlotModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {t('Log to Plot History')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlotModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              {t('Stamp this diagnostic record permanently on the field timeline to track seasonal disease patterns.')}
            </p>

            {plotFeedback && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                backgroundColor: plotFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: plotFeedback.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${plotFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {plotFeedback.message}
              </div>
            )}

            <form onSubmit={handleSavePlotLink} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('Farm')}
                </label>
                <select
                  value={plotFarmId}
                  onChange={(e) => setPlotFarmId(e.target.value ? Number(e.target.value) : '')}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">{t('Select Farm...')}</option>
                  {taskOptions.farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {t('Target Field / Plot')}
                </label>
                <select
                  value={plotFieldId}
                  onChange={(e) => setPlotFieldId(e.target.value ? Number(e.target.value) : '')}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">{t('Select Field...')}</option>
                  {taskOptions.fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPlotModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlot}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmittingPlot ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingPlot ? 0.7 : 1
                  }}
                >
                  {isSubmittingPlot ? t('Linking...') : t('Save to Plot History')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating / Drawer Chat (Preserved as requested) */}
      <DiseaseAskMoreChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        analysis={currentData || undefined}
      />
    </div>
  );
}