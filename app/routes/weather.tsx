import { useState, useEffect } from 'react';
import SunnyIcon from '../asserts/icons/animated/day.svg';
import CloudSun from '../asserts/icons/animated/cloudy-day-1.svg';
import CloudFog from '../asserts/icons/animated/cloudy-day-3.svg';
import CloudDrizzle from '../asserts/icons/animated/rainy-1.svg';
import CloudSlowRain from '../asserts/icons/animated/rainy-5.svg';
import CloudHeavyRain from '../asserts/icons/animated/rainy-7.svg';
import SlowSnowy from '../asserts/icons/animated/snowy-5.svg';
import HeavySnowy from '../asserts/icons/animated/snowy-6.svg';
import Thunder from '../asserts/icons/animated/thunder.svg';
import { fetchWithAuth } from '../utils/auth';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  Thermometer,
  CalendarDays
} from 'lucide-react';

// Define the Farm interface matching your backend DTO
interface Farms {
  farmIDs: number;
  farmNames: string;
}

// Get weather icon according to weather code
function getWeatherIcons(code: number | undefined) {
  const containerClass = "w-[100px] h-[100px]";

  if (code === undefined || code === null) {
    return (
      <div className={containerClass}>
        <img
          src={CloudSun}
          alt="N/A"
          className="w-full h-full object-contain opacity-40"
        />
      </div>
    );
  }

  switch (code) {
    case 0:
      return (
        <div className={containerClass}>
          <img
            src={SunnyIcon}
            alt="Sunny"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 1:
    case 2:
    case 3:
      return (
        <div className={containerClass}>
          <img
            src={CloudSun}
            alt="Cloudy"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 45:
    case 48:
    case 51:
    case 53:
    case 55:
      return (
        <div className={containerClass}>
          <img
            src={CloudFog}
            alt="Foggy"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 56:
    case 57:
      return (
        <div className={containerClass}>
          <img
            src={CloudDrizzle}
            alt="Drizzle"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 61:
    case 63:
    case 65:
      return (
        <div className={containerClass}>
          <img
            src={CloudSlowRain}
            alt="Rain"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 66:
    case 67:
      return (
        <div className={containerClass}>
          <img
            src={CloudHeavyRain}
            alt="Heavy Rain"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 71:
    case 73:
    case 75:
    case 77:
      return (
        <div className={containerClass}>
          <img
            src={SlowSnowy}
            alt="Snow"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 80:
    case 81:
    case 82:
      return (
        <div className={containerClass}>
          <img
            src={CloudHeavyRain}
            alt="Heavy Rain"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 85:
    case 86:
      return (
        <div className={containerClass}>
          <img
            src={HeavySnowy}
            alt="Heavy Snow"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 95:
    case 96:
    case 99:
      return (
        <div className={containerClass}>
          <img
            src={Thunder}
            alt="Thunderstorm"
            className="w-full h-full object-contain"
          />
        </div>
      );

    default:
      return (
        <div className={containerClass}>
          <img
            src={CloudSun}
            alt="Cloudy"
            className="w-full h-full object-contain"
          />
        </div>
      );
  }
}

function getWeatherCondition(code: number | undefined, t: (k: string) => string) {
  if (code === undefined || code === null) {
    return <h2>N/A</h2>;
  }

  switch (code) {
    case 0:
      return <h2>{t("Clear Sky")}</h2>;

    case 1:
    case 2:
    case 3:
      return <h2>{t("Partly Cloudy")}</h2>;

    case 45:
    case 48:
      return <h2>{t("Foggy")}</h2>;

    case 51:
    case 53:
    case 55:
      return <h2>{t("Light Drizzle")}</h2>;

    case 56:
    case 57:
      return <h2>{t("Freezing Drizzle")}</h2>;

    case 61:
    case 63:
    case 65:
      return <h2>{t("Slightly Rainy")}</h2>;

    case 66:
    case 67:
      return <h2>{t("Freezing Rain")}</h2>;

    case 71:
    case 73:
    case 75:
    case 77:
      return <h2>{t("Snowy")}</h2>;

    case 80:
    case 81:
    case 82:
      return <h2>{t("Heavy Rain")}</h2>;

    case 85:
    case 86:
      return <h2>{t("Heavy Snow")}</h2>;

    case 95:
      return <h2>{t("Thunderstorm")}</h2>;

    case 96:
    case 99:
      return <h2>{t("Heavy Thunderstorm")}</h2>;

    default:
      return <h2>{t("Clear Sky")}</h2>;
  }
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  status?: number;
}

// Helper safely extracting text/data or fallback to "N/A"
const val = (value: any, suffix: string = '') => {
  if (value === undefined || value === null || value === '') {
    return 'N/A';
  }

  return `${value}${suffix}`;
};

export default function WeatherPage() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Farm selection states
  const [items, setItems] = useState<Farms[]>([]);
  const [selected, setSelected] = useState<string>('');

  // Fetch available farms
  useEffect(() => {
    fetchWithAuth('/api/crops/farms')
      .then((res) => res.json())
      .then((data: unknown) => {
        const farmsList = data as Farms[];

        if (farmsList.length === 0) {
          setErrorMessage(t('No farms found.'));
        } else {
          setItems(farmsList);

          // Automatically select the first farm
          setSelected(String(farmsList[0].farmIDs));
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(t('Failed to load farms.'));
      });
  }, [t]);

  // Fetch weather whenever selected farm changes
  useEffect(() => {
    if (!selected) {
      setWeather(null);
      return;
    }

    const loadWeather = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchWithAuth(
          '/api/weather/all',
          {
            method: 'POST',
            body: JSON.stringify(Number(selected))
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ApiErrorResponse;

          setErrorMessage(
            errorData.message ||
            t('Weather data is empty. Please configure your farm location.')
          );

          setWeather(null);
        } else {
          setWeather(data);
        }
      } catch (err) {
        console.error('Failed to fetch weather data:', err);

        setErrorMessage(
          t('Location data is empty or server error occurred.')
        );

        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, [selected, t]);

  return (
    <div className="bg-white min-h-full w-full flex flex-col gap-4 sm:gap-6 p-3 sm:p-5">

      {/* Farm Selection */}
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">
                {t("Weather Location")}
              </p>

              <h2 className="text-lg font-bold text-gray-900">
                {t("Select Farm")}
              </h2>
            </div>
          </div>

          <div className="relative w-full sm:w-72">

            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />

            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl pl-10 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              <option value="">{t("Select a farm")}</option>

              {items.map((item) => (
                <option
                  key={item.farmIDs}
                  value={item.farmIDs}
                >
                  {item.farmNames}
                </option>
              ))}
            </select>

          </div>

        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-medium text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="w-full bg-white border border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm">
          <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>

          <p className="font-semibold text-gray-700">
            {t("Loading weather details...")}
          </p>

          <p className="text-sm text-gray-400 mt-1">
            {t("Getting the latest weather information")}
          </p>
        </div>
      )}

      {/* Weather Content */}
      {!loading && selected && weather && (
        <>

          {/* Current + Additional */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

            {/* Current Weather */}
            <div className="w-full min-w-0">

              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-5 h-5 text-emerald-600" />

                <h1 className="text-xl font-bold text-gray-900">
                  {t("Current Weather")}
                </h1>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-2xl shadow-lg min-h-[380px]">

                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/10"></div>

                <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-white/5"></div>

                <div className="relative z-10 flex flex-col h-full justify-between gap-6">

                  <div>
                    <p className="text-sm text-emerald-100">
                      {t("Current temperature")}
                    </p>

                    <div className="flex items-end gap-2 mt-1">
                      <h2 className="text-5xl font-bold">
                        {val(weather?.current?.temperature_2m)}
                      </h2>

                      <span className="text-2xl mb-1">
                        °C
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-sm text-emerald-100 mb-1">
                        {t("Weather Condition")}
                      </p>

                      <div className="text-xl font-bold">
                        {getWeatherCondition(
                          weather?.current?.weather_code,
                          t
                        )}
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-2xl p-2 backdrop-blur-sm shrink-0">
                      {getWeatherIcons(
                        weather?.current?.weather_code
                      )}
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center gap-2 text-emerald-100 mb-1">
                        <Droplets className="w-4 h-4" />

                        <span className="text-xs">
                          {t("Humidity")}
                        </span>
                      </div>

                      <p className="text-lg font-bold">
                        {val(
                          weather?.current?.relative_humidity_2m
                        )}%
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center gap-2 text-emerald-100 mb-1">
                        <Wind className="w-4 h-4" />

                        <span className="text-xs">
                          {t("Wind Speed")}
                        </span>
                      </div>

                      <p className="text-lg font-bold">
                        {val(
                          weather?.current?.wind_speed_10m
                        )} km/h
                      </p>
                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* Additional Data */}
            <div className="w-full min-w-0">

              <div className="flex items-center gap-2 mb-3">
                <Thermometer className="w-5 h-5 text-emerald-600" />

                <h1 className="text-xl font-bold text-gray-900">
                  {t("Additional Data")}
                </h1>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-2xl shadow-lg min-h-[380px]">

                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/10"></div>

                <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-white/5"></div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full content-center">

                  {/* UV */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">

                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <Sun className="w-5 h-5" />
                    </div>

                    <p className="text-sm text-emerald-100">
                      {t("UV Index")}
                    </p>

                    <p className="text-3xl font-bold mt-1">
                      {val(
                        weather?.daily?.uv_index_max?.[0]
                      )}
                    </p>

                    <p className="text-xs text-emerald-100 mt-2">
                      {t("Maximum UV index expected today")}
                    </p>

                  </div>

                  {/* Rain */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">

                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <CloudRain className="w-5 h-5" />
                    </div>

                    <p className="text-sm text-emerald-100">
                      {t("Expected Rainfall")}
                    </p>

                    <p className="text-3xl font-bold mt-1">
                      {val(weather?.current?.rain)} mm
                    </p>

                    <p className="text-xs text-emerald-100 mt-2">
                      {t("Current rainfall measurement")}
                    </p>

                  </div>

                </div>

              </div>
            </div>

          </div>

          {/* Daily Forecast */}
          <div className="w-full">

            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-emerald-600" />

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {t("Daily Forecast")}
                </h1>

                <p className="text-sm text-gray-500">
                  {t("Weather forecast for the upcoming days")}
                </p>
              </div>
            </div>

            {/* items-start prevents cards from stretching */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">

              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (

                <div
                  key={index}
                  className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-md p-4 min-w-0 min-h-[330px] h-fit transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >

                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10"></div>

                  <div className="relative z-10">

                    {/* Date */}
                    <div className="flex items-center gap-2 pb-3 border-b border-white/20">

                      <CalendarDays className="w-4 h-4 text-emerald-100 shrink-0" />

                      <div className="min-w-0">
                        <p className="text-[11px] text-emerald-100">
                          {t("Date")}
                        </p>

                        <p className="font-bold text-sm truncate">
                          {val(
                            weather?.daily?.time?.[index]
                          )}
                        </p>
                      </div>

                    </div>

                    {/* Weather Icon */}
                    <div className="flex justify-center py-3">
                      {getWeatherIcons(
                        weather?.daily?.weather_code?.[index]
                      )}
                    </div>

                    {/* Condition */}
                    <div className="text-center mb-4">

                      <div className="text-sm font-semibold">
                        {getWeatherCondition(
                          weather?.daily?.weather_code?.[index],
                          t
                        )}
                      </div>

                    </div>

                    {/* Temperatures */}
                    <div className="grid grid-cols-2 gap-2">

                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-[11px] text-emerald-100 mb-1">
                          {t("High")}
                        </p>

                        <p className="font-bold text-sm">
                          {val(
                            weather?.daily?.temperature_2m_max?.[index],
                            '°C'
                          )}
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-[11px] text-emerald-100 mb-1">
                          {t("Low")}
                        </p>

                        <p className="font-bold text-sm">
                          {val(
                            weather?.daily?.temperature_2m_min?.[index],
                            '°C'
                          )}
                        </p>
                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </>
      )}

      {/* No farm selected */}
      {!selected && !loading && !errorMessage && (
        <div className="w-full text-center py-12 text-gray-500 font-medium">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <img
              src={CloudSun}
              alt="Weather"
              className="w-10 h-10 object-contain"
            />
          </div>

          <p>
            {t("Please select a farm from the dropdown above to view weather details.")}
          </p>
        </div>
      )}

    </div>
  );
}