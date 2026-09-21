import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend'; // <-- Import the file loader plugin

i18n
  .use(Backend) // <-- Tells i18next to fetch your json files from the public folder
  .use(initReactI18next)
  .init({
    lng: 'si', // <-- Change this to 'si' temporarily to test your Sinhala translation immediately!
    fallbackLng: 'en',
    debug: true, // Turn on debug logs so we can trace it in the browser inspect console
    interpolation: {
      escapeValue: false
    },
    backend: {
      // Points exactly to your public folder path layout
      loadPath: '/locales/{{lng}}.json', 
    }
  });

export default i18n;
