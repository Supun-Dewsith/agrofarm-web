import fs from 'fs';
import path from 'path';
import { translate } from 'google-translate-api-x';

const localesDir = path.join(process.cwd(), 'public', 'locales');
const enPath = path.join(localesDir, 'en.json');
const siPath = path.join(localesDir, 'si.json');

if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

if (!fs.existsSync(enPath)) {
  fs.writeFileSync(enPath, JSON.stringify({}, null, 2));
}

const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const siJson = fs.existsSync(siPath) ? JSON.parse(fs.readFileSync(siPath, 'utf8')) : {};

async function translateEverything() {
  console.log("🚀 Running absolute translation syncing execution...");
  const keys = Object.keys(enJson);
  let count = 0;

  for (const key of keys) {
    if (siJson[key] && siJson[key].trim() !== "") continue;

    try {
      const textToTranslate = enJson[key] || key;
      const res = await translate(textToTranslate, { to: 'si' });
      siJson[key] = res.text;
      count++;
      console.log(`[Success] Translated: "${textToTranslate}" ➡️ "${res.text}"`);
    } catch (error) {
      console.error(`[Error] Translation skipped on [${key}]:`, error.message);
      siJson[key] = key;
    }
  }

  fs.writeFileSync(siPath, JSON.stringify(siJson, null, 2), 'utf8');
  console.log(`\n🎉 Sync complete! Total modified translation strings: ${count}`);
}

translateEverything();
