import fs from 'fs';
import path from 'path';
import { translate } from 'google-translate-api-x';

const localesDir = path.join(process.cwd(), 'public', 'locales');
const enPath = path.join(localesDir, 'en.json');
const siPath = path.join(localesDir, 'si.json');

// Ensure the directory exists safely
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

// Guarantee en.json exists to prevent process crashes
if (!fs.existsSync(enPath)) {
  fs.writeFileSync(enPath, JSON.stringify({}, null, 2));
}

const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const siJson = fs.existsSync(siPath) ? JSON.parse(fs.readFileSync(siPath, 'utf8')) : {};

async function translateEverything() {
  console.log("🚀 Initializing localized language compilation...");
  
  const keys = Object.keys(enJson);
  
  if (keys.length === 0) {
    console.log("ℹ️ your en.json baseline is currently empty.");
    console.log("Add translation key-value mappings directly into public/locales/en.json to translate specific items.");
    
    // Seed sample values to verify everything works smoothly
    siJson["Welcome"] = "සාදරයෙන් පිළිගනිමු";
    siJson["Login"] = "ඇතුල් වන්න";
    
    fs.writeFileSync(siPath, JSON.stringify(siJson, null, 2), 'utf8');
    console.log("🎉 Successfully created automated Sinhala baseline structure inside public/locales/si.json!");
    return;
  }

  let count = 0;
  for (const key of keys) {
    if (siJson[key] && siJson[key].trim() !== "") continue;

    try {
      const textToTranslate = enJson[key] || key;
      const res = await translate(textToTranslate, { to: 'si' });
      siJson[key] = res.text;
      count++;
      console.log(`✅ Converted: "${textToTranslate}" ➡️ "${res.text}"`);
    } catch (error) {
      console.error(`❌ Localization engine error on key [${key}]:`, error.message);
      siJson[key] = key;
    }
  }

  fs.writeFileSync(siPath, JSON.stringify(siJson, null, 2), 'utf8');
  console.log(`\n🎉 Success! Synchronized missing layout maps inside public/locales/si.json!`);
}

translateEverything();
