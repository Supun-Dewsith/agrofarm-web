// app/components/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = (lang: 'en' | 'si') => {
    i18n.changeLanguage(lang);
  };

  // Check which language is active to highlight the correct button
  const currentLang = i18n.language;

  return (
    <div style={{ display: 'inline-flex', gap: '6px', padding: '4px', background: '#f1f5f9', borderRadius: '8px' }}>
      <button
        onClick={() => toggleLanguage('en')}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          border: 'none',
          fontWeight: currentLang === 'en' ? '600' : 'normal',
          backgroundColor: currentLang === 'en' ? '#0d321d' : 'transparent',
          color: currentLang === 'en' ? '#ffffff' : '#475569',
          transition: 'all 0.2s'
        }}
      >
        EN
      </button>
      <button
        onClick={() => toggleLanguage('si')}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          border: 'none',
          fontWeight: currentLang === 'si' ? '600' : 'normal',
          backgroundColor: currentLang === 'si' ? '#0d321d' : 'transparent',
          color: currentLang === 'si' ? '#ffffff' : '#475569',
          transition: 'all 0.2s'
        }}
      >
        සිං
      </button>
    </div>
  );
}
