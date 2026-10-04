import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Droplets, Wind, CloudRain, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import SunnyIcon from '../../asserts/icons/animated/day.svg';
import CloudSun from '../../asserts/icons/animated/cloudy-day-1.svg';
import CloudFog from '../../asserts/icons/animated/cloudy-day-3.svg';
import CloudDrizzle from '../../asserts/icons/animated/rainy-1.svg';
import CloudSlowRain from '../../asserts/icons/animated/rainy-5.svg';
import CloudHeavyRain from '../../asserts/icons/animated/rainy-7.svg';
import SlowSnowy from '../../asserts/icons/animated/snowy-5.svg';
import HeavySnowy from '../../asserts/icons/animated/snowy-6.svg';
import Thunder from '../../asserts/icons/animated/thunder.svg';

export interface DailyForecastDay {
  date: string;
  dayName: string;
  weatherCode: number;
  condition: string;
  maxTemp: number;
  minTemp: number;
  rainProb: number;
}

export interface FarmWeatherItem {
  farmId: number;
  farmName: string;
  temp: number;
  condition: string;
  weatherCode?: number;
  humidity: string;
  rainfall: string;
  wind: string;
  date: string;
  highTemp?: number;
  lowTemp?: number;
  uvIndex?: number;
  rainProbability?: number;
  forecast?: DailyForecastDay[];
  hasError?: boolean;
  errorMessage?: string;
}

interface FarmWeatherSlideshowProps {
  farmsWeather: FarmWeatherItem[];
}

export function getWeatherCondition(code: number | undefined | null): string {
  if (code === undefined || code === null) return "Partly Cloudy";
  switch (code) {
    case 0:
      return "Clear Sky";
    case 1:
      return "Mainly Clear";
    case 2:
      return "Partly Cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Foggy";
    case 51:
    case 53:
    case 55:
      return "Light Drizzle";
    case 56:
    case 57:
      return "Freezing Drizzle";
    case 61:
    case 63:
      return "Moderate Rain";
    case 65:
      return "Heavy Rain";
    case 66:
    case 67:
      return "Freezing Rain";
    case 71:
    case 73:
    case 75:
    case 77:
      return "Snow Fall";
    case 80:
    case 81:
    case 82:
      return "Rain Showers";
    case 85:
    case 86:
      return "Snow Showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with Hail";
    default:
      return "Partly Cloudy";
  }
}

export function getWeatherIconSrc(code: number | undefined | null): string {
  if (code === undefined || code === null) return CloudSun;
  switch (code) {
    case 0:
      return SunnyIcon;
    case 1:
    case 2:
    case 3:
      return CloudSun;
    case 45:
    case 48:
      return CloudFog;
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return CloudDrizzle;
    case 61:
    case 63:
      return CloudSlowRain;
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return CloudHeavyRain;
    case 71:
    case 73:
    case 75:
    case 77:
      return SlowSnowy;
    case 85:
    case 86:
      return HeavySnowy;
    case 95:
    case 96:
    case 99:
      return Thunder;
    default:
      return CloudSun;
  }
}

export default function FarmWeatherSlideshow({ farmsWeather }: FarmWeatherSlideshowProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalFarms = farmsWeather.length;

  const handlePrev = useCallback(() => {
    if (totalFarms <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? totalFarms - 1 : prev - 1));
  }, [totalFarms]);

  const handleNext = useCallback(() => {
    if (totalFarms <= 1) return;
    setCurrentIndex((prev) => (prev === totalFarms - 1 ? 0 : prev + 1));
  }, [totalFarms]);

  // Auto-play slideshow that pauses on hover
  useEffect(() => {
    if (totalFarms <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 8000);

    return () => clearInterval(timer);
  }, [totalFarms, isPaused, handleNext]);

  // If no farms or empty data
  if (!farmsWeather || farmsWeather.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
        <div>
          <span className="text-xs font-semibold tracking-wider opacity-80 uppercase">{t("Weather Forecast")}</span>
          <h3 className="text-lg font-bold mt-2">{t("No Farms Available")}</h3>
          <p className="text-sm opacity-80 mt-1">{t("Assign or configure farm locations to view live weather data.")}</p>
        </div>
      </div>
    );
  }

  const current = farmsWeather[currentIndex] || farmsWeather[0];
  const iconSrc = getWeatherIconSrc(current.weatherCode);

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px] h-full group select-none transition-all duration-300 gap-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header: Farm Name & Slideshow Controls */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="space-y-0.5 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-100/90 uppercase">
              {t("Live Farm Weather")}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-white">
            <MapPin className="w-4 h-4 text-emerald-200 flex-shrink-0" />
            <h3 className="font-bold text-lg leading-tight truncate max-w-[210px] sm:max-w-[260px]" title={current.farmName}>
              {current.farmName}
            </h3>
          </div>
        </div>

        {/* Left & Right Slideshow Buttons + Counter */}
        {totalFarms > 1 && (
          <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md px-2 py-1 rounded-xl border border-white/15 flex-shrink-0">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-white/20 active:scale-95 transition-all text-white/90 hover:text-white"
              title={t("Previous Farm")}
              aria-label={t("Previous Farm")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-1 text-white/90 tabular-nums">
              {currentIndex + 1} / {totalFarms}
            </span>

            <button
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-white/20 active:scale-95 transition-all text-white/90 hover:text-white"
              title={t("Next Farm")}
              aria-label={t("Next Farm")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Hero: Current Weather + Animated Weather Icon */}
      <div className="relative z-10">
        {current.hasError ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 my-2 text-center">
            <p className="font-semibold text-sm text-amber-200">⚠️ {t("Coordinates Missing")}</p>
            <p className="text-xs text-white/80 mt-1">
              {current.errorMessage ? t(current.errorMessage) : t("Please configure GPS latitude/longitude for this farm.")}
            </p>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <div className="flex items-baseline">
                <span className="text-5xl font-light tracking-tighter">
                  {Math.round(current.temp)}
                </span>
                <span className="text-2xl font-light text-emerald-100/90 ml-0.5">°C</span>
                {current.highTemp !== undefined && current.lowTemp !== undefined && (
                  <span className="ml-2.5 text-xs font-semibold bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full text-white/90">
                    {t("H")}: {current.highTemp}° · {t("L")}: {current.lowTemp}°
                  </span>
                )}
              </div>
              <p className="font-semibold text-base text-white tracking-wide">
                {t(current.condition)}
              </p>
              <p className="text-xs text-emerald-100/75 font-medium">
                {current.date}
              </p>
            </div>

            {/* Animated Weather SVG Icon */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 flex items-center justify-center filter drop-shadow-md">
              <img
                src={iconSrc}
                alt={t(current.condition)}
                className="w-full h-full object-contain scale-110 transform hover:scale-120 transition-transform duration-300 pointer-events-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Farm-Centric Conditions (Humidity, Wind, Rain Probability, UV Index) */}
      <div className="relative z-10 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 opacity-80 mb-0.5">
            <Droplets className="w-3 h-3 text-cyan-200" />
            <span className="text-[10px] uppercase font-semibold">{t("Humidity")}</span>
          </div>
          <p className="font-bold text-sm tracking-tight">{current.humidity}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 opacity-80 mb-0.5">
            <Wind className="w-3 h-3 text-teal-200" />
            <span className="text-[10px] uppercase font-semibold">{t("Wind")}</span>
          </div>
          <p className="font-bold text-sm tracking-tight">{current.wind}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 opacity-80 mb-0.5">
            <CloudRain className="w-3 h-3 text-blue-200" />
            <span className="text-[10px] uppercase font-semibold">{t("Precip")}</span>
          </div>
          <p className="font-bold text-sm tracking-tight">
            {current.rainProbability !== undefined ? `${current.rainProbability}%` : current.rainfall}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 opacity-80 mb-0.5">
            <Sun className="w-3 h-3 text-amber-200" />
            <span className="text-[10px] uppercase font-semibold">{t("UV Index")}</span>
          </div>
          <p className="font-bold text-sm tracking-tight">
            {current.uvIndex !== undefined ? current.uvIndex : t('Normal')}
          </p>
        </div>
      </div>

      {/* 4. 5-Day Outlook Strip */}
      {current.forecast && current.forecast.length > 0 && (
        <div className="relative z-10 bg-black/15 backdrop-blur-md rounded-xl p-2 border border-white/10">
          <div className="flex items-center justify-between text-[10px] font-semibold text-white/80 mb-1 px-1">
            <span className="tracking-wide uppercase text-emerald-200">{t("5-Day Outlook")}</span>
            <span className="opacity-70">{t("High / Low")}</span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {current.forecast.map((day, idx) => (
              <div
                key={idx}
                className={`flex flex-col items-center py-1 px-0.5 rounded-lg transition-colors ${
                  idx === 0 ? 'bg-white/15' : 'hover:bg-white/5'
                }`}
              >
                <span className="text-[10px] font-semibold text-white/90">
                  {t(day.dayName)}
                </span>
                <img
                  src={getWeatherIconSrc(day.weatherCode)}
                  alt={t(day.condition)}
                  className="w-6 h-6 object-contain my-0.5"
                />
                <div className="flex items-center gap-1 text-[11px] leading-tight">
                  <span className="font-bold">{day.maxTemp}°</span>
                  <span className="text-white/60 text-[10px]">{day.minTemp}°</span>
                </div>
                {day.rainProb > 0 ? (
                  <span className="text-[9px] font-medium text-cyan-200 mt-0.5">
                    💧{day.rainProb}%
                  </span>
                ) : (
                  <span className="text-[9px] text-white/40 mt-0.5">-</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Pagination Dots */}
      {totalFarms > 1 && (
        <div className="relative z-10 flex justify-center items-center gap-1.5 pt-0.5">
          {farmsWeather.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-6 bg-white'
                  : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`${t("Go to slide")} ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
