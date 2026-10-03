import React, { useEffect, useRef, useState } from 'react';
import { askAboutDetection } from '../services/diseaseService';
import type { ChatMessage, DiseaseAnalysisResult } from '../types/disease';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Send,
  Sparkles,
  X,
  RotateCcw,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { FormattedMarkdown } from './FormattedMarkdown';

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
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    // New scan = new conversation grounded in that result
    setMessages([]);
    setError(null);
  }, [analysis]);

  if (!open) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
  };

  const send = async (questionOverride?: string) => {
    const question = (questionOverride !== undefined ? questionOverride : input).trim();
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
      setError(e.message || t('Failed to get a reply'));
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    t('What is the recommended treatment for this?'),
    t('How do I prevent this disease from spreading?'),
    t('Are there organic or biological remedies?'),
    t('What weather conditions worsen this condition?'),
  ];

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 430,
        maxWidth: 'calc(100vw - 32px)',
        height: 560,
        maxHeight: 'calc(100vh - 48px)',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 16,
        boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.22), 0 10px 20px -5px rgba(15, 23, 42, 0.08)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#dcfce7',
              border: '1px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', lineHeight: 1.2 }}>
              {t('Diagnostic AI Assistant')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={
                analysis
                  ? `${analysis.plant_name} · ${analysis.disease_name}`
                  : t('Run diagnostics first for crop-specific answers')
              }
            >
              {analysis ? (
                <span>
                  <strong style={{ color: '#047857' }}>{analysis.plant_name}</strong> ·{' '}
                  <span style={{ color: analysis.is_healthy ? '#166534' : '#b91c1c' }}>
                    {analysis.disease_name}
                  </span>
                </span>
              ) : (
                t('Run diagnostics first for crop-specific answers')
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              title={t('Clear conversation')}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 6,
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title={t('Close')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 6,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES THREAD */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          backgroundColor: '#fafbfc',
        }}
      >
        {/* Welcome Intro & Suggested Prompts */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                <Bot size={16} />
                <span>{t('How can I help with this diagnostic?')}</span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: '#475569',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {analysis
                  ? t(
                      'I have contextual analysis of your scanned sample. Ask any question regarding treatment dosages, organic alternatives, spreading prevention, or recovery timelines.'
                    )
                  : t(
                      'Run a leaf scan to ground the discussion in your crop pathology, or ask general agronomy disease questions.'
                    )}
              </p>
            </div>

            {/* Suggested Prompts */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 8,
                  paddingLeft: 2,
                }}
              >
                {t('Suggested Questions')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => send(q)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#86efac';
                      e.currentTarget.style.color = '#065f46';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    <span>{q}</span>
                    <ArrowRight size={13} style={{ color: '#059669', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const isCopied = copiedIdx === i;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {/* Bot Avatar Icon */}
              {!isUser && (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    backgroundColor: '#dcfce7',
                    border: '1px solid #a7f3d0',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Bot size={14} />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                style={{
                  maxWidth: isUser ? '85%' : '88%',
                  position: 'relative',
                  group: 'msg',
                }}
              >
                <div
                  style={{
                    padding: isUser ? '9px 13px' : '12px 14px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: 12,
                    lineHeight: 1.5,
                    backgroundColor: isUser ? '#059669' : '#ffffff',
                    color: isUser ? '#ffffff' : '#1e293b',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    boxShadow: isUser
                      ? '0 1px 3px rgba(5, 150, 105, 0.25)'
                      : '0 1px 3px rgba(0, 0, 0, 0.04)',
                    wordBreak: 'break-word',
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  ) : (
                    <FormattedMarkdown content={m.content} />
                  )}
                </div>

                {/* Copy Action Button for Assistant Messages */}
                {!isUser && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      marginTop: 4,
                      paddingLeft: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleCopy(m.content, i)}
                      title={isCopied ? t('Copied!') : t('Copy response')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        color: isCopied ? '#059669' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = isCopied ? '#059669' : '#94a3b8')
                      }
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? t('Copied') : t('Copy')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* LOADING INDICATOR */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: '#dcfce7',
                border: '1px solid #a7f3d0',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Bot size={14} />
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 2px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#64748b',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    animation: 'bounce 1s infinite alternate',
                  }}
                />
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    animation: 'bounce 1s infinite alternate 0.2s',
                  }}
                />
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    animation: 'bounce 1s infinite alternate 0.4s',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500 }}>
                {t('Analyzing agronomy diagnostics...')}
              </span>
            </div>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={15} style={{ shrink: 0 }} />
            <span style={{ flex: 1 }}>{t(error)}</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* INPUT FORM FOOTER */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('Ask about treatment, spread, prevention...')}
          disabled={loading}
          style={{
            flex: 1,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            outline: 'none',
            color: '#1e293b',
            backgroundColor: loading ? '#f8fafc' : '#ffffff',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#059669';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(5, 150, 105, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            backgroundColor: loading || !input.trim() ? '#94a3b8' : '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: 13,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background-color 0.15s, opacity 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = '#047857';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.backgroundColor = '#059669';
            }
          }}
        >
          <Send size={14} />
          <span>{t('Send')}</span>
        </button>
      </form>
    </div>
  );
}