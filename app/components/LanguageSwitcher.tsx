import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';

interface LanguageOption {
  code: 'en' | 'si' | 'ta';
  label: string;
  native: string;
  sub: string;
  badge: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English', sub: 'International', badge: 'EN' },
  { code: 'si', label: 'Sinhala', native: 'සිංහල', sub: 'ශ්‍රී ලංකාව', badge: 'සිං' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', sub: 'இலங்கை', badge: 'த' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rawLang = i18n.language || 'en';
  const currentLang: 'en' | 'si' | 'ta' = rawLang.startsWith('si')
    ? 'si'
    : rawLang.startsWith('ta')
    ? 'ta'
    : 'en';

  const activeOption = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const handleSelect = (lang: 'en' | 'si' | 'ta') => {
    i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lang);
      document.documentElement.lang = lang;
    }
    setIsOpen(false);
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Trigger Button: Sleek Translation Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={t("Switch language")}
        aria-label={t("Switch language")}
        className={`
          relative flex h-10 w-10 items-center justify-center
          rounded-xl border transition-all duration-200 cursor-pointer shadow-xs
          ${
            isOpen
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-emerald-800"
          }
        `}
      >
        <Languages className="h-5 w-5" />

        {/* Small Active Language Badge Indicator */}
        <span
          className={`
            absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-[9px] font-bold leading-none uppercase tracking-tighter border
            ${
              isOpen
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }
          `}
        >
          {activeOption.badge}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="
            absolute right-0 top-12 mt-1 w-60 rounded-2xl bg-white shadow-2xl
            border border-slate-200 ring-1 ring-black/5 p-2 z-50
            animate-in fade-in zoom-in-95 duration-150 origin-top-right
          "
        >
          <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("Select Language")}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              3 Languages
            </span>
          </div>

          <div className="space-y-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang;

              return (
                <button
                  key={lang.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left
                    transition-all duration-150 cursor-pointer
                    ${
                      isSelected
                        ? "bg-emerald-50/90 text-emerald-950 font-semibold border border-emerald-200/80 shadow-xs"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`
                        w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                        ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {lang.badge}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-tight text-slate-800">
                        {lang.native}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {lang.label} ({lang.sub})
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
