import React, { useState, useRef } from 'react';
import { useFetcher } from 'react-router';
import { analyzePlantImage } from '../services/diseaseService';
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

const RECENT_INSPECTIONS = [
  { id: 1, initial: 'T', crop: 'Tomato Field A', condition: 'Early Blight (Alternaria)', status: 'INFECTED', date: 'Today, 11:20 AM' },
  { id: 2, initial: 'C', crop: 'Corn Parcel #4', condition: 'Common Rust', status: 'INFECTED', date: 'Yesterday' },
  { id: 3, initial: 'A', crop: 'Apple Orchard', condition: 'Healthy Foliage', status: 'HEALTHY', date: '10 Sep 2026' },
];

export default function DiseaseDetectionPage() {
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = useState(false);
  const fetcher = useFetcher<typeof clientAction>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = fetcher.state === 'submitting';
  const data = fetcher.data?.result as DiseaseAnalysisResult | undefined;
  const error = fetcher.data?.error;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting) return;
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return;
      setSelectedFile(file);
      setSelectedImage(URL.createObjectURL(file));
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#334155',
    marginTop: 0,
    marginBottom: '20px',
  };

  const confidenceScore = data ? Math.round(data.overall_confidence * 100) : 0;

  return (
    <div style={{ margin: '10px auto', padding: '0 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
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

      <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>

        {/* ================= LEFT PANE: SAMPLE MEDIA & RECENT INSPECTIONS ================= */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          
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
                  {data && !isSubmitting ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <ImageBoundingBox imageUrl={selectedImage} boxes={data.detected_spots} />
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
              {RECENT_INSPECTIONS.map((item) => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                  border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff'
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9',
                    color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px', flexShrink: 0
                  }}>
                    {item.initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.crop}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '12px',
                        backgroundColor: item.status === 'HEALTHY' ? '#f0fdf4' : '#fef2f2',
                        color: item.status === 'HEALTHY' ? '#166534' : '#991b1b'
                      }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.condition}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div style={{ width: '1px', backgroundColor: '#e2e8f0', alignSelf: 'stretch' }} />

        {/* ================= RIGHT PANE: DIAGNOSTIC DETAILS & PROTOCOLS ================= */}
        <div style={{ flex: 1 }}>

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
              disabled={!data}
              title={data ? t('Ask about this scan') : t('Run diagnostics first')}
              style={{
                padding: '8px 14px',
                backgroundColor: data ? '#059669' : '#e2e8f0',
                color: data ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: data ? 'pointer' : 'not-allowed',
              }}
            >
              {t('Ask more')}
            </button>
          </div>
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
                {data?.plant_name || <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '15px' }}>{t('Awaiting sample scan...')}</span>}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {data ? t('Foliage structure verified via vision matrix') : t('No sample processed')}
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
              <div style={{ fontSize: '18px', fontWeight: 700, color: data ? (data.is_healthy ? '#166534' : '#991b1b') : '#94a3b8' }}>
                {data?.disease_name || <span style={{ fontWeight: 500, fontSize: '15px' }}>{t('Undetermined')}</span>}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {data?.is_healthy ? t('No infectious spores or lesions found') : data ? t('Active biological infestation detected') : t('Upload leaf to begin scan')}
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
                {data ? (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px',
                    backgroundColor: data.is_healthy ? '#f0fdf4' : '#fef2f2',
                    color: data.is_healthy ? '#166534' : '#991b1b',
                    display: 'inline-block'
                  }}>
                    ● {data.is_healthy ? t('HEALTHY LEAF MATRIX') : t('PATHOGEN DETECTED')}
                  </span>
                ) : (
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>{t('Pending Evaluation')}</span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {data?.is_healthy ? t('Photosynthetic tissue operational') : data ? t('Immediate intervention advised') : t('System standby')}
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
                  {data ? `${confidenceScore}%` : '0%'}
                </span>
              </div>
              
              <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${confidenceScore}%`, height: '100%',
                  backgroundColor: data?.is_healthy ? '#059669' : '#e11d48',
                  borderRadius: '6px', transition: 'width 0.4s ease'
                }} />
              </div>

              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {data ? t('Inference validated across agricultural neural network') : t('Awaiting model inference')}
              </span>
            </div>

          </div>

          {/* Section 2: Pathological Overview */}
          <h3 style={sectionHeaderStyle}>{t('Pathological Overview & Observations')}</h3>
          <div style={{
            padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff', minHeight: '80px', marginBottom: '40px'
          }}>
            {data?.general_description ? (
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                {data.general_description}
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
              { label: t('Foliage Tissue Necrosis'), detected: Boolean(data && !data.is_healthy) },
              { label: t('Chlorotic Ring Formations'), detected: Boolean(data && !data.is_healthy) },
              { label: t('Airborne Spore Spread Risk'), detected: Boolean(data && !data.is_healthy) },
              { label: t('Water Splash Transmission'), detected: Boolean(data && !data.is_healthy) },
              { label: t('Cellular Structure Integrity'), detected: Boolean(data?.is_healthy) },
              { label: t('Quarantine Protocol Required'), detected: Boolean(data && !data.is_healthy) },
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
              {data && data.possible_treatments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.possible_treatments.map((treatment, idx) => (
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
              {data && data.prevention_tips.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.prevention_tips.map((tip, idx) => (
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

        </div>

      </div>
      <DiseaseAskMoreChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        analysis={data}
      />
    </div>
  );
}