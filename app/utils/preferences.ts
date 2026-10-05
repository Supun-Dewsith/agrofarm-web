import { useState, useEffect } from 'react';

export type MeasurementUnit = 'metric' | 'imperial';

export interface CurrencyOption {
  value: string;
  label: string;
  code: string;
  symbol: string;
}

export const PREFERENCE_CHANGE_EVENT = 'agrofarm_preference_update';

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'LKR (Rs)', label: 'LKR (Rs) - Sri Lankan Rupee', code: 'LKR', symbol: 'Rs' },
  { value: 'USD ($)', label: 'USD ($) - US Dollar', code: 'USD', symbol: '$' },
  { value: 'EUR (€)', label: 'EUR (€) - Euro', code: 'EUR', symbol: '€' },
  { value: 'GBP (£)', label: 'GBP (£) - British Pound', code: 'GBP', symbol: '£' },
  { value: 'INR (₹)', label: 'INR (₹) - Indian Rupee', code: 'INR', symbol: '₹' },
  { value: 'AUD ($)', label: 'AUD ($) - Australian Dollar', code: 'AUD', symbol: 'A$' },
  { value: 'CAD ($)', label: 'CAD ($) - Canadian Dollar', code: 'CAD', symbol: 'C$' },
  { value: 'AED (د.إ)', label: 'AED (د.إ) - UAE Dirham', code: 'AED', symbol: 'AED' },
];

export function getStoredCurrency(): string {
  if (typeof window === 'undefined') return 'LKR (Rs)';
  return localStorage.getItem('agrofarm_currency') || 'LKR (Rs)';
}

export function setStoredCurrency(val: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('agrofarm_currency', val);
  window.dispatchEvent(new CustomEvent(PREFERENCE_CHANGE_EVENT, { detail: { currency: val } }));
}

export function getStoredMeasurementUnit(): MeasurementUnit {
  if (typeof window === 'undefined') return 'metric';
  const u = localStorage.getItem('agrofarm_measurement_unit');
  return u === 'imperial' ? 'imperial' : 'metric';
}

export function setStoredMeasurementUnit(unit: MeasurementUnit): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('agrofarm_measurement_unit', unit);
  window.dispatchEvent(new CustomEvent(PREFERENCE_CHANGE_EVENT, { detail: { measurementUnit: unit } }));
}

export function getCurrencyInfo(rawCurrency?: string): CurrencyOption {
  const target = rawCurrency || getStoredCurrency();
  const matched = CURRENCY_OPTIONS.find((c) => c.value === target || target.includes(c.code));
  return matched || CURRENCY_OPTIONS[0];
}

export function formatMoney(
  amount: number | string | null | undefined,
  options?: { hideDecimals?: boolean; includeCode?: boolean; customCurrency?: string }
): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numeric) || numeric === null || numeric === undefined) {
    const cur = getCurrencyInfo(options?.customCurrency);
    return `${cur.symbol} 0`;
  }

  const cur = getCurrencyInfo(options?.customCurrency);
  const formattedNum = numeric.toLocaleString(undefined, {
    minimumFractionDigits: options?.hideDecimals ? 0 : 2,
    maximumFractionDigits: options?.hideDecimals ? 0 : 2,
  });

  if (options?.includeCode) {
    return `${cur.code} ${cur.symbol} ${formattedNum}`;
  }
  return `${cur.symbol} ${formattedNum}`;
}

export function convertArea(hectares: number | null | undefined, unitOverride?: MeasurementUnit): {
  value: number;
  unit: string;
  formatted: string;
} {
  const unit = unitOverride || getStoredMeasurementUnit();
  const val = Number(hectares) || 0;
  if (unit === 'imperial') {
    const acres = val * 2.47105;
    return {
      value: acres,
      unit: 'ac',
      formatted: `${acres.toFixed(2)} ac`,
    };
  }
  return {
    value: val,
    unit: 'ha',
    formatted: `${val.toFixed(2)} ha`,
  };
}

export function convertWeight(kg: number | null | undefined, unitOverride?: MeasurementUnit): {
  value: number;
  unit: string;
  formatted: string;
} {
  const unit = unitOverride || getStoredMeasurementUnit();
  const val = Number(kg) || 0;
  if (unit === 'imperial') {
    const lbs = val * 2.20462;
    return {
      value: lbs,
      unit: 'lbs',
      formatted: `${Math.round(lbs).toLocaleString()} lbs`,
    };
  }
  return {
    value: val,
    unit: 'kg',
    formatted: `${Math.round(val).toLocaleString()} kg`,
  };
}

export function convertTemperature(celsius: number | null | undefined, unitOverride?: MeasurementUnit): {
  value: number;
  unit: string;
  formatted: string;
} {
  const unit = unitOverride || getStoredMeasurementUnit();
  const val = Number(celsius) || 0;
  if (unit === 'imperial') {
    const fahr = Math.round((val * 9) / 5 + 32);
    return {
      value: fahr,
      unit: '°F',
      formatted: `${fahr}°F`,
    };
  }
  return {
    value: Math.round(val),
    unit: '°C',
    formatted: `${Math.round(val)}°C`,
  };
}

export function convertAreaFromAcres(acres: number | null | undefined, unitOverride?: MeasurementUnit): {
  value: number;
  unit: string;
  formatted: string;
} {
  const unit = unitOverride || getStoredMeasurementUnit();
  const val = Number(acres) || 0;
  if (unit === 'metric') {
    const ha = val * 0.404686;
    return {
      value: ha,
      unit: 'ha',
      formatted: `${ha.toFixed(2)} ha`,
    };
  }
  return {
    value: val,
    unit: 'ac',
    formatted: `${val.toFixed(2)} ac`,
  };
}

export function usePreferences() {
  const [currency, setCurrency] = useState<CurrencyOption>(() => getCurrencyInfo());
  const [unit, setUnit] = useState<MeasurementUnit>(() => getStoredMeasurementUnit());

  useEffect(() => {
    const handleUpdate = () => {
      setCurrency(getCurrencyInfo());
      setUnit(getStoredMeasurementUnit());
    };

    window.addEventListener(PREFERENCE_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(PREFERENCE_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    currency,
    measurementUnit: unit,
    formatMoney: (amount: number | string | null | undefined, options?: { hideDecimals?: boolean; includeCode?: boolean }) =>
      formatMoney(amount, { ...options, customCurrency: currency.value }),
    convertArea: (ha: number | null | undefined) => convertArea(ha, unit),
    convertAreaFromAcres: (ac: number | null | undefined) => convertAreaFromAcres(ac, unit),
    convertWeight: (kg: number | null | undefined) => convertWeight(kg, unit),
    convertTemperature: (c: number | null | undefined) => convertTemperature(c, unit),
  };
}
