import React, { useState } from 'react';
import { useFetcher } from 'react-router';
import { analyzePlantImage } from '../services/diseaseService';
import type { DiseaseAnalysisResult } from '../types/disease';
import { ImageBoundingBox } from '../components/ImageBoundingBox';

export async function clientAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file || file.size === 0) {
    return { error: 'Please select a valid image file.' };
  }

  try {
    const result = await analyzePlantImage(file);
    return { result };
  } catch (error: any) {
    return { error: error.message || 'Analysis failed. Please try again.' };
  }
}

export default function DiseaseDetectionPage() {
  const fetcher = useFetcher<typeof clientAction>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isSubmitting = fetcher.state === 'submitting';
  const data = fetcher.data?.result as DiseaseAnalysisResult | undefined;
  const error = fetcher.data?.error;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting) return; // Guard clause
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append('file', file);
      fetcher.submit(formData, { method: 'post', encType: 'multipart/form-data' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-stone-50 text-stone-900 font-sans p-2 sm:p-2 selection:bg-emerald-800 selection:text-white">
      
      {/* Dynamic Inline CSS for the Laser Scan Keyframes */}
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0.8; }
        }
        .animate-scan {
          animation: scanLine 2s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Main Grid Interface */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Upload & Canvas Panel */}
        <section className={`transition-all duration-300 ${data ? 'lg:col-span-5' : 'lg:col-span-12 max-w-2xl mx-auto w-full'}`}>
          <div className="bg-white p-6 shadow-sm">
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase text-stone-500 tracking-wider font-semibold flex items-center gap-2">
                <span className={`w-1.5 h-1.5 inline-block ${isSubmitting ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
                {isSubmitting ? 'Matrix Scanning Active' : 'Image Input Matrix'}
              </span>
              {selectedImage && (
                <span className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase ${
                  isSubmitting 
                    ? 'text-amber-900 bg-amber-50 animate-pulse' 
                    : 'text-emerald-900 bg-emerald-50'
                }`}>
                  {isSubmitting ? 'Processing' : 'Loaded'}
                </span>
              )}
            </div>

            <fetcher.Form method="post" encType="multipart/form-data">
              <div className="bg-stone-50 p-6 text-center flex flex-col items-center justify-center min-h-[260px] relative transition-colors group">
                
                {!selectedImage ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-white text-stone-700 flex items-center justify-center mx-auto group-hover:bg-emerald-800 group-hover:text-white transition-colors shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-stone-800">
                        Select leaf sample for diagnostic scan
                      </p>
                      <p className="text-xs text-stone-400 font-mono">
                        RAW, JPG, PNG UP TO 10MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full mb-6 overflow-hidden bg-stone-900 relative group">
                    {/* Render Image or Bounding Box */}
                    {data && !isSubmitting ? (
                      <ImageBoundingBox imageUrl={selectedImage} boxes={data.detected_spots} />
                    ) : (
                      <img src={selectedImage} alt="Preview" className="max-h-80 mx-auto object-contain block" />
                    )}

                    {/* Scanning Line & Grid Overlay Animation */}
                    {isSubmitting && (
                      <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex flex-col justify-between overflow-hidden">
                        {/* Scanning Laser Line */}
                        <div className="w-full h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] absolute left-0 z-10 animate-scan" />
                        
                        {/* Corner Target Markers */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

                        {/* Status Overlay Badge */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-stone-900/90 text-emerald-400 border border-emerald-800/50 text-[11px] font-mono font-bold px-3 py-1 shadow-lg flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                          SCANNING LEAF MATRIX...
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Button - Disabled when isSubmitting is true */}
                <label 
                  className={`mt-4 font-semibold text-xs uppercase tracking-wider px-6 py-3 inline-flex items-center gap-2 transition-all ${
                    isSubmitting
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-80 pointer-events-none'
                      : 'bg-stone-900 hover:bg-emerald-900 text-white cursor-pointer active:translate-y-0.5'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-stone-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing Image...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {selectedImage ? 'Replace Image' : 'Select Image'}
                    </>
                  )}
                  <input 
                    type="file" 
                    name="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    disabled={isSubmitting} 
                    className="hidden" 
                  />
                </label>

              </div>
            </fetcher.Form>

            {error && (
              <div className="mt-4 p-4 bg-rose-50 text-rose-900 text-xs font-mono flex items-start gap-2">
                <span className="text-rose-700 font-bold">[ERROR]</span>
                <span>{error}</span>
              </div>
            )}

          </div>
        </section>

        {/* Right Column: Disease Details & Diagnostic Output */}
        {data && (
          <section className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 space-y-6 shadow-sm">
              
              {/* Header Title & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
                <div>
                  <div className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1 font-semibold">
                    Image Classification
                  </div>
                  <h2 className="text-3xl font-light text-stone-900 tracking-tight uppercase">
                    {data.plant_name}
                  </h2>
                  <p className="text-emerald-800 font-mono text-sm font-bold tracking-wide mt-1 uppercase">
                    {data.disease_name}
                  </p>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2">
                  <span className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider ${
                    data.is_healthy 
                      ? 'bg-emerald-50 text-emerald-900' 
                      : 'bg-rose-50 text-rose-900'
                  }`}>
                    {data.is_healthy ? 'Status: Healthy' : 'Status: Infected'}
                  </span>
                  <span className="text-xs font-mono text-stone-600 bg-stone-100 px-3 py-1 font-semibold">
                    CONFIDENCE: {(data.overall_confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Analysis Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono text-stone-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-700 inline-block" />
                  Diagnostic Overview
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed bg-stone-50 p-4 font-sans">
                  {data.general_description}
                </p>
              </div>

              {/* Treatments & Prevention Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Treatments */}
                <div className="bg-amber-50/50 p-5 space-y-3">
                  <h3 className="text-amber-900 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 pb-1">
                    <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Remedial Measures
                  </h3>
                  <ul className="space-y-2">
                    {data.possible_treatments.map((treatment, idx) => (
                      <li key={idx} className="text-xs text-stone-800 flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-800 font-mono font-bold select-none">{`[>]`}</span>
                        <span>{treatment}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Prevention */}
                <div className="bg-emerald-50/50 p-5 space-y-3">
                  <h3 className="text-emerald-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 pb-1">
                    <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Preventative Protocol
                  </h3>
                  <ul className="space-y-2">
                    {data.prevention_tips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-stone-800 flex items-start gap-2 leading-relaxed">
                        <span className="text-emerald-800 font-mono font-bold select-none">{`[+]`}</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>
          </section>
        )}

      </main>
    </div>
  );
}