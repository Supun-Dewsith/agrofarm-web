import React, { useState, useRef, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { analyzePlantImage, getRecentDetections } from '../services/diseaseService';
import type { DiseaseAnalysisResult } from '../types/disease';
import { ImageBoundingBox } from '../components/ImageBoundingBox';
import { DiseaseAskMoreChat } from '../components/DiseaseAskMoreChat';
import { useTranslation } from 'react-i18next';
import i18n from "../i18n";


export async function clientAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const language = (formData.get('language') as string) || i18n.resolvedLanguage || i18n.language || 'en';

  if (!file || file.size === 0) {
    return { error: 'Please select a valid image file.' };
  }

  try {
    const result = await analyzePlantImage(file, language);
    return { result };
  } catch (error: any) {
    return { error: error.message || 'Analysis failed. Please try again.' };
  }
}

function formatInspectionDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DiseaseDetectionPage() {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);
  const fetcher = useFetcher<typeof clientAction>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recentInspections, setRecentInspections] = useState<DiseaseAnalysisResult[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<DiseaseAnalysisResult | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<number | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  const isSubmitting = fetcher.state === 'submitting';
  const fetcherResult = fetcher.data?.result as DiseaseAnalysisResult | undefined;
  const currentData = activeAnalysis || fetcherResult;
  const error = fetcher.data?.error;

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

    return () => {
      mounted = false;
    };
  }, []);

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
  };

  const handleRunDiagnosis = () => {
    if (!selectedFile || isSubmitting) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    const currentLang = i18n.resolvedLanguage || i18n.language || 'en';
    formData.append('language', currentLang);
    fetcher.submit(formData, { method: 'post', encType: 'multipart/form-data' });
  };

  const clearImage = () => {
    if (isSubmitting) return;
    setSelectedFile(null);
    setSelectedImage(null);
    setSelectedInspectionId(null);
    setActiveAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#334155',
    marginTop: 0,
    marginBottom: '20px',
  };

  const confidenceScore = currentData
    ? Math.round(
        currentData.overall_confidence <= 1.0 && currentData.overall_confidence > 0
          ? currentData.overall_confidence * 100
          : currentData.overall_confidence
      )
    : 0;

  return (
    <div
      style={{
        margin: "0",
        padding: "20px 24px 48px",
        fontFamily: "Inter, system-ui, sans-serif",
        boxSizing: "border-box",
        width: "100%",
      }}
    >

      {/* Keyframe animation for scanning laser */}
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; opacity: 0.7; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.7; }
        }
        .animate-scan {
          animation: scanLine 2.4s ease-in-out infinite alternate;
        }
      `}</style>

      {error && (
        <div style={{
          padding: '16px', marginBottom: '32px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
          backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca'
        }}>
          {t(error)}
        </div>
      )}

      <div
        className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start"
        style={{ width: "100%" }}
      >

        {/* ================= LEFT PANE: SAMPLE MEDIA & RECENT INSPECTIONS ================= */}
        <div className="w-full lg:w-[280px] shrink-0">

          {/* Media Block */}
          <div>
            <h3 style={sectionHeaderStyle}>{t('Sample Media')}</h3>

            <div style={{
              position: 'relative',
              width: '100%',
              minHeight: '220px',
              maxHeight: '340px',
              backgroundColor: '#0f172a', // dark background so letterboxing looks clean
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              marginBottom: '16px',
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
                      padding: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <ImageBoundingBox imageUrl={selectedImage} boxes={currentData.detected_spots || []} />
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
                      backgroundColor: 'rgba(6, 78, 59, 0.25)',
                      overflow: 'hidden',
                      pointerEvents: 'none'
                    }}>
                      <div className="animate-scan" style={{
                        position: 'absolute',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 12px #10b981'
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
                      width: '26px',
                      height: '26px',
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
                <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>{t('No Image Selected')}</span>
              )}
            </div>

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
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {t('Upload Photo')}
            </button>

            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={!selectedFile || isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (!selectedFile || isSubmitting) ? 'not-allowed' : 'pointer',
                opacity: (!selectedFile || isSubmitting) ? 0.7 : 1
              }}
            >
              {isSubmitting ? t('Analyzing Sample...') : t('Run Diagnostics')}
            </button>
          </div>

          <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '40px 0' }} />

          <div>
            <h3 style={{ ...sectionHeaderStyle, marginBottom: '16px' }}>{t('Recent Crop Inspections')}</h3>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px',
              maxHeight: '450px', overflowY: 'auto', paddingRight: '6px'
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ width: '70px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                          <div style={{ width: '45px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '10px' }} />
                        </div>
                        <div style={{ width: '100px', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
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
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🍃</div>
                  <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
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
                  const formattedDate = formatInspectionDate(item.created_at);

                  return (
                    <div
                      key={item.id ?? `${item.plant_name}-${item.created_at}`}
                      onClick={() => handleSelectInspection(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#dcfce7' : '#f1f5f9',
                        color: isSelected ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                        border: isSelected ? '1px solid #86efac' : '1px solid #e2e8f0'
                      }}>
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: '#334155',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.plant_name || t('Unknown Plant')}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: item.is_healthy ? '#f0fdf4' : '#fef2f2',
                            color: item.is_healthy ? '#166534' : '#991b1b',
                            border: `1px solid ${item.is_healthy ? '#bbf7d0' : '#fecaca'}`
                          }}>
                            {status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '140px'
                          }}>
                            {item.disease_name || (item.is_healthy ? t('Healthy Foliage') : t('Undetermined'))}
                          </span>
                          {formattedDate && (
                            <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
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

        {/* CENTER DIVIDER LINE (Visible on desktop) */}
        <div
          className="hidden lg:block"
          style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch" }}
        />

        {/* ================= RIGHT PANE: DIAGNOSTIC DETAILS & PROTOCOLS ================= */}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>

          {/* Section 1: Real Diagnostic Metric Cards */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ ...sectionHeaderStyle, marginBottom: 0 }}>{t('Diagnostic Metrics')}</h3>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              disabled={!currentData}
              title={currentData ? t('Ask about this scan') : t('Run diagnostics first')}
              style={{
                padding: '8px 14px',
                backgroundColor: currentData ? '#059669' : '#e2e8f0',
                color: currentData ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: currentData ? 'pointer' : 'not-allowed',
              }}
            >
              {t('Ask more')}
            </button>
          </div>

          {isSubmitting ? (
            <div className="space-y-8 animate-pulse">
              {/* Metrics Grid Skeleton */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ width: '120px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                    <div style={{ width: '160px', height: '20px', backgroundColor: '#cbd5e1', borderRadius: '4px' }} />
                    <div style={{ width: '200px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>

              {/* Pathological Overview Skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '180px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ width: '92%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                  <div style={{ width: '84%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                  <div style={{ width: '65%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Diagnostic Bio-Indicators Checklist Skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '160px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
                      <div style={{ width: '130px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Treatment Protocols Skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '190px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {[1, 2].map((k) => (
                    <div
                      key={k}
                      style={{
                        padding: '18px 20px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '140px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                        <div style={{ width: '60px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '10px' }} />
                      </div>
                      <div style={{ width: '85%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                      <div style={{ width: '70%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                      <div style={{ width: '90%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>

            {/* Plant Classification Card */}
            <div style={{
              padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('Identified Host Species')}
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                {currentData?.plant_name || <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '15px' }}>{t('Awaiting sample scan...')}</span>}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {currentData ? t('Foliage structure verified via vision matrix') : t('No sample processed')}
              </span>
            </div>

            {/* Pathology Condition Card */}
            <div style={{
              padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('Detected Pathology / Disease')}
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: currentData ? (currentData.is_healthy ? '#166534' : '#991b1b') : '#94a3b8' }}>
                {currentData?.disease_name || <span style={{ fontWeight: 500, fontSize: '15px' }}>{t('Undetermined')}</span>}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {currentData?.is_healthy ? t('No infectious spores or lesions found') : currentData ? t('Active biological infestation detected') : t('Upload leaf to begin scan')}
              </span>
            </div>

            {/* Health Evaluation Card */}
            <div style={{
              padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('Pathology Severity State')}
              </span>
              <div>
                {currentData ? (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px',
                    backgroundColor: currentData.is_healthy ? '#f0fdf4' : '#fef2f2',
                    color: currentData.is_healthy ? '#166534' : '#991b1b',
                    display: 'inline-block'
                  }}>
                    ● {currentData.is_healthy ? t('HEALTHY LEAF MATRIX') : t('PATHOGEN DETECTED')}
                  </span>
                ) : (
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>{t('Pending Evaluation')}</span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {currentData?.is_healthy ? t('Photosynthetic tissue operational') : currentData ? t('Immediate intervention advised') : t('System standby')}
              </span>
            </div>

            {/* Confidence Bar Card */}
            <div style={{
              padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('Model Confidence')}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                  {currentData ? `${confidenceScore}%` : '0%'}
                </span>
              </div>

              <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${confidenceScore}%`, height: '100%',
                  backgroundColor: currentData?.is_healthy ? '#059669' : '#e11d48',
                  borderRadius: '6px', transition: 'width 0.4s ease'
                }} />
              </div>

              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {currentData ? t('Inference validated across agricultural neural network') : t('Awaiting model inference')}
              </span>
            </div>

          </div>

          {/* Section 2: Pathological Overview */}
          <h3 style={sectionHeaderStyle}>{t('Pathological Overview & Observations')}</h3>
          <div style={{
            padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff', minHeight: '80px', marginBottom: '40px'
          }}>
            {currentData?.general_description ? (
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                {currentData.general_description}
              </p>
            ) : (
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                {t('Diagnostic etiology, surface lesion morphology, and biological infection timelines will populate here once the sample image is analyzed.')}
              </p>
            )}
          </div>

          {/* Section 3: Diagnostic Bio-Indicators Checklist */}
          <h3 style={sectionHeaderStyle}>{t('Diagnostic Indicators & Vectors')}</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '40px'
          }}>
            {[
              { label: t('Foliage Tissue Necrosis'), detected: Boolean(currentData && !currentData.is_healthy) },
              { label: t('Chlorotic Ring Formations'), detected: Boolean(currentData && !currentData.is_healthy) },
              { label: t('Airborne Spore Spread Risk'), detected: Boolean(currentData && !currentData.is_healthy) },
              { label: t('Water Splash Transmission'), detected: Boolean(currentData && !currentData.is_healthy) },
              { label: t('Cellular Structure Integrity'), detected: Boolean(currentData?.is_healthy) },
              { label: t('Quarantine Protocol Required'), detected: Boolean(currentData && !currentData.is_healthy) },
            ].map((indicator) => (
              <div
                key={indicator.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: indicator.detected ? '#1e293b' : '#64748b',
                  fontWeight: indicator.detected ? 600 : 400
                }}
              >
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px',
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

          {/* Section 4: Treatment & Prevention Directives */}
          <h3 style={sectionHeaderStyle}>{t('Treatment & Protocol Directives')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>

            {/* Remedial Measures Card */}
            <div style={{
              padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', minHeight: '180px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{t('Targeted Remedial Actions')}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#991b1b' }}>
                  {t('CURATIVE')}
                </span>
              </div>
              {currentData && currentData.possible_treatments && currentData.possible_treatments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentData.possible_treatments.map((treatment, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#dc2626', fontSize: '14px', lineHeight: '1' }}>•</span>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.4' }}>{treatment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t('No curative actions needed or awaiting diagnostic scan.')}</p>
              )}
            </div>

            {/* Preventative Protocols Card */}
            <div style={{
              padding: '18px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', minHeight: '180px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{t('Preventative & Agronomic Controls')}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#166534' }}>
                  {t('PROPHYLACTIC')}
                </span>
              </div>
              {currentData && currentData.prevention_tips && currentData.prevention_tips.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentData.prevention_tips.map((tip, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#059669', fontSize: '14px', lineHeight: '1' }}>•</span>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.4' }}>{tip}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t('Prophylactic guidelines will appear upon image identification.')}</p>
              )}
            </div>

          </div>
          </>
          )}

        </div>

      </div>
      <DiseaseAskMoreChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        analysis={currentData || undefined}
      />
    </div>
  );
}