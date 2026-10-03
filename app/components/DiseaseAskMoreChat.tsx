import React, { useEffect, useRef, useState } from 'react';
import { askAboutDetection } from '../services/diseaseService';
import type { ChatMessage, DiseaseAnalysisResult } from '../types/disease';
import { useTranslation } from 'react-i18next';

export function DiseaseAskMoreChat({
  open,
  onClose,
  analysis,
}: {
  open: boolean;
  onClose: () => void;
  analysis?: DiseaseAnalysisResult;
}) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    // New scan = new conversation grounded in that result
    setMessages([]);
    setError(null);
  }, [analysis]);

  if (!open) return null;

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const nextHistory = [...messages, { role: 'user' as const, content: question }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
      const { answer } = await askAboutDetection(question, analysis, nextHistory, currentLanguage);
      setMessages([...nextHistory, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      setError(e.message || 'Failed to get a reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24, width: 380, height: 520,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      boxShadow: '0 12px 40px rgba(15,23,42,0.18)', zIndex: 80,
      display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{t('Ask more')}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {analysis
              ? `${analysis.plant_name} · ${analysis.disease_name}`
              : t('Run diagnostics first for crop-specific answers')}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{
          border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b'
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            {t('Ask about treatment, spread risk, or what this scan means.')}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', padding: '8px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.45,
            background: m.role === 'user' ? '#059669' : '#f1f5f9',
            color: m.role === 'user' ? '#fff' : '#334155'
          }}>
            {m.content}
          </div>
        ))}
        {loading && <div style={{ fontSize: 12, color: '#64748b' }}>{t('Thinking...')}</div>}
        {error && <div style={{ fontSize: 12, color: '#991b1b' }}>{t(error)}</div>}
        <div ref={endRef} />
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('Ask about this detection...')}
          style={{
            flex: 1, border: '1px solid #cbd5e1', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, outline: 'none'
          }}
        />
        <button type="button" onClick={send} disabled={loading || !input.trim()} style={{
          background: '#059669', color: '#fff', border: 'none', borderRadius: 8,
          padding: '0 14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
        }}>
          {t('Send')}
        </button>
      </div>
    </div>
  );
}