import React from 'react';

/**
 * Parses and formats inline markdown tokens:
 * - `code`
 * - ***bold italic***
 * - **bold**
 * - *italic*
 * - [label](url)
 */
export function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  const inlineRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(inlineRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[11px] border border-emerald-200/80 font-medium"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          <em className="italic">{part.slice(3, -3)}</em>
        </strong>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2 font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

/**
 * Full Markdown message renderer:
 * Supports headings (#, ##, ###, ####), bullet lists, numbered lists,
 * blockquotes, markdown tables, fenced code blocks, and inline formatting.
 */
export function FormattedMarkdown({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

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
            <li key={idx} className="leading-relaxed text-slate-800 pl-0.5">
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
        <ol key={`ol-${elements.length}`} className="my-1.5 space-y-1 pl-4 list-decimal marker:text-emerald-700 marker:font-semibold">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed text-slate-800 pl-0.5">
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

    // Fenced Code Block (``` ... ```)
    if (line.startsWith('```')) {
      flushLists();
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div
          key={`code-${elements.length}`}
          className="my-2.5 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-200 text-[11px] font-mono shadow-xs"
        >
          {lang && (
            <div className="px-3 py-1 bg-slate-800/90 text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider border-b border-slate-700/60">
              {lang}
            </div>
          )}
          <pre className="p-3 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Markdown Tables (| Header | ... |)
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
          <div key={`table-${elements.length}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-200">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="p-2 font-bold text-slate-800">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataRows.map((r, rIdx) => {
                  const cells = r.split('|').slice(1, -1).map((c) => c.trim());
                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                      {cells.map((c, cIdx) => (
                        <td key={cIdx} className="p-2 text-slate-700">
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

    // Blockquotes (> Quote)
    if (line.startsWith('>')) {
      flushLists();
      const quoteText = line.replace(/^>\s*/, '');
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="my-2 border-l-3 border-emerald-500 bg-emerald-50/40 pl-3 py-1.5 text-slate-700 italic rounded-r text-[12px] leading-relaxed"
        >
          {renderInlineFormatting(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Horizontal Rule (--- or ***)
    if (/^([-*_]){3,}$/.test(line)) {
      flushLists();
      elements.push(<hr key={`hr-${elements.length}`} className="my-2.5 border-slate-200" />);
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushLists();
      elements.push(
        <h5 key={`h4-${i}`} className="text-[12px] font-bold text-slate-800 mt-2 mb-1">
          {renderInlineFormatting(line.slice(5))}
        </h5>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushLists();
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushLists();
      const text = line.replace(/^#+\s*/, '');
      elements.push(
        <h3 key={`h2-${i}`} className="text-xs font-bold text-emerald-800 uppercase tracking-wide mt-3 mb-1 pb-0.5 border-b border-slate-100">
          {renderInlineFormatting(text)}
        </h3>
      );
      continue;
    }

    // Bullet list items (- , * , • )
    const bulletMatch = line.match(/^[-*•]\s+(.*)/);
    if (bulletMatch) {
      if (currentNumbers.length > 0) flushLists();
      currentBullets.push(bulletMatch[1]);
      continue;
    }

    // Numbered list items (1. , 1) )
    const numberMatch = line.match(/^\d+[.)]\s+(.*)/);
    if (numberMatch) {
      if (currentBullets.length > 0) flushLists();
      currentNumbers.push(numberMatch[1]);
      continue;
    }

    // Standard paragraph
    flushLists();
    elements.push(
      <p key={`p-${i}`} className="my-1.5 leading-relaxed text-slate-800">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  flushLists();

  return (
    <div className={`space-y-0.5 text-xs text-slate-800 leading-relaxed ${className}`}>
      {elements}
    </div>
  );
}
