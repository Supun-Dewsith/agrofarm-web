// app/components/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = (lang: 'en' | 'si') => {
    i18n.changeLanguage(lang);
    // ⚠️ THE SAVE FIX: Remember the user's choice across route jumps and logins
    localStorage.setItem('i18nextLng', lang); 
  };

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
          fontWeight: currentLang.startsWith('en') ? '600' : 'normal',
          backgroundColor: currentLang.startsWith('en') ? '#0d321d' : 'transparent',
          color: currentLang.startsWith('en') ? '#ffffff' : '#475569',
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
          fontWeight: currentLang.startsWith('si') ? '600' : 'normal',
          backgroundColor: currentLang.startsWith('si') ? '#0d321d' : 'transparent',
          color: currentLang.startsWith('si') ? '#ffffff' : '#475569',
        }}
      >
        සිං
      </button>
    </div>
  );
}
