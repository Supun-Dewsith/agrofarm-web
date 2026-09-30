import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { askReportAi, type ReportAiChatRequest } from '../services/reportService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[11px] border border-emerald-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function FormattedAiMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentBullets: string[] = [];
  let currentNumbers: string[] = [];

  const flushLists = () => {
    if (currentBullets.length > 0) {
      const items = [...currentBullets];
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-1.5 space-y-1 pl-4 list-disc marker:text-emerald-600">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
    if (currentNumbers.length > 0) {
      const items = [...currentNumbers];
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-1.5 space-y-1 pl-4 list-decimal marker:text-slate-500 font-medium">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
      currentNumbers = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushLists();
      continue;
    }

    // Markdown tables
    if (line.startsWith('|') && line.endsWith('|')) {
      flushLists();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--;

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').slice(1, -1).map((c) => c.trim());
        const dataRows = tableLines.slice(tableLines[1].includes('---') ? 2 : 1);

        elements.push(
          <div key={`table-${elements.length}`} className="my-2 overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="p-1.5 font-bold text-slate-700">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataRows.map((r, rIdx) => {
                  const cells = r.split('|').slice(1, -1).map((c) => c.trim());
                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/60">
                      {cells.map((c, cIdx) => (
                        <td key={cIdx} className="p-1.5 text-slate-700">
                          {renderInlineFormatting(c)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings
    if (line.startsWith('### ')) {
      flushLists();
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-slate-900 mt-2 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushLists();
      const text = line.replace(/^#+\s*/, '');
      elements.push(
        <h3 key={`h2-${i}`} className="text-xs font-bold text-emerald-800 uppercase tracking-wide mt-2.5 mb-1 pb-0.5 border-b border-slate-100">
          {renderInlineFormatting(text)}
        </h3>
      );
      continue;
    }

    // Bullet items
    const bulletMatch = line.match(/^[-*•]\s+(.*)/);
    if (bulletMatch) {
      if (currentNumbers.length > 0) flushLists();
      currentBullets.push(bulletMatch[1]);
      continue;
    }

    // Numbered items
    const numberMatch = line.match(/^\d+[.)]\s+(.*)/);
    if (numberMatch) {
      if (currentBullets.length > 0) flushLists();
      currentNumbers.push(numberMatch[1]);
      continue;
    }

    // Normal paragraph
    flushLists();
    elements.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed text-slate-800">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  flushLists();

  return <div className="space-y-0.5 text-xs text-slate-800 leading-relaxed">{elements}</div>;
}

interface ReportAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  activeTabLabel: string;
  farmId?: number;
  farmName?: string;
  fromDate?: string;
  toDate?: string;
}

export function ReportAiDrawer({
  isOpen,
  onClose,
  activeTab,
  activeTabLabel,
  farmId,
  farmName,
  fromDate,
  toDate,
}: ReportAiDrawerProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().slice(0, 2);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Context-specific suggested questions
  const getSuggestedQuestions = () => {
    switch (activeTab) {
      case 'financial':
        return [
          t("Analyze our current revenue and profit margin"),
          t("How do I record a new expense or crop sale?"),
          t("What are our major expense categories?"),
        ];
      case 'crops':
        return [
          t("Which crops are lagging behind in maturation?"),
          t("Summarize active crop growth stages"),
          t("How do I download this cultivation report?"),
        ];
      case 'attendance':
        return [
          t("Summarize labor attendance and total hours"),
          t("Were there any absent or flagged shifts?"),
          t("How can I filter attendance for a specific date?"),
        ];
      case 'tasks':
        return [
          t("Which high-priority tasks are still pending?"),
          t("Summarize field operations workload"),
          t("How do I change the date range filter?"),
        ];
      case 'disease':
        return [
          t("Which plant diseases were detected recently?"),
          t("What are the recommended treatments for infections?"),
          t("What is our average diagnostic confidence?"),
        ];
      default:
        return [
          t("Summarize current farm operations"),
          t("How do I use the filters on this page?"),
          t("Any operational bottlenecks or risks?"),
        ];
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textToSend) setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const payload: ReportAiChatRequest = {
        message: text,
        activeTab,
        farmId,
        farmName: farmName || (farmId ? `Farm #${farmId}` : undefined),
        from: fromDate,
        to: toDate,
        language: currentLang,
        history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      };

      const res = await askReportAi(payload);
      setMessages([...nextHistory, { role: 'assistant', content: res.answer }]);
    } catch (err: any) {
      setError(err?.message || t("Failed to get an answer. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Drawer */}
      <div className="relative w-full sm:w-[430px] max-w-full bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 z-10 font-sans">

        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{t("Reports AI Assistant")}</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  {currentLang.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[240px]">
                {activeTabLabel} • {farmName || t("All Farms")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                title={t("Clear Chat")}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Current Context Pill Bar */}
        <div className="px-4 py-2 bg-emerald-50/50 border-b border-emerald-100/80 flex items-center justify-between text-[11px] text-emerald-900 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span className="truncate">
              {t("Context")}: <strong className="font-semibold text-emerald-950">{activeTabLabel}</strong>
            </span>
          </div>
          {fromDate && toDate && (
            <span className="text-[10px] text-emerald-700 shrink-0 font-mono">
              {fromDate.slice(5)} → {toDate.slice(5)}
            </span>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

          {/* Welcome Intro Card */}
          {messages.length === 0 && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <Bot size={16} />
                  <span>{t("How can I assist you with this report?")}</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[12px]">
                  {t("I have real-time access to the data in your active view, as well as the complete page structure. You can ask for analytical insights or guidance on how to perform actions.")}
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide px-1">
                  {t("Suggested Prompts")}
                </p>
                <div className="flex flex-col gap-1.5">
                  {getSuggestedQuestions().map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="text-left p-2.5 rounded-md border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-emerald-300 text-slate-700 text-xs font-medium transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                    >
                      <span className="line-clamp-2">{q}</span>
                      <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Render Chat Messages */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 leading-relaxed text-[12px] shadow-2xs ${isUser
                    ? 'bg-emerald-700 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-line break-words">{msg.content}</div>
                  ) : (
                    <FormattedAiMessage content={msg.content} />
                  )}
                </div>
                {isUser && (
                  <div className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Loading Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 items-center text-slate-500 text-xs">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                <RefreshCw size={12} className="animate-spin text-emerald-600" />
              </div>
              <div className="bg-slate-100 px-3 py-2 rounded-lg text-slate-600 border border-slate-200 text-xs flex items-center gap-1.5">
                <span>{t("Analyzing report data...")}</span>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Ask anything about this report or how to do something...")}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Send size={13} />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>{t("AI is grounded in live data for this view")}</span>
            <span className="font-mono">Agrisense AI</span>
          </div>
        </div>

      </div>
    </div>
  );
}
