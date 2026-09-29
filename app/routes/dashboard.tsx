import type { ClientLoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { fetchWithAuth, getAuthData } from "../utils/auth";
import { useState } from "react";
import { useRouteError, isRouteErrorResponse } from "react-router";
import { useTranslation } from "react-i18next";
import FarmWeatherSlideshow, { getWeatherCondition } from "../components/dashboard/FarmWeatherSlideshow";
import type { FarmWeatherItem } from "../components/dashboard/FarmWeatherSlideshow";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Label, Pie, Cell
} from 'recharts';


export interface StatCardProp {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  type: string;
}

export interface Weather {
  temp: number;
  condition: string;
  date: string;
  humidity: string;
  rainfall: string;
  wind: string;
}

export interface CropHealth {
  name: string;
  value: number;
  color: string;
}

export interface FinanceData {
  month: string;
  revenue: number;
  expense: number;
}

export interface HarvestSummary {
  crop: string;
  actual: number;
  target: number;
}

export interface ActivityItem {
  id: string;
  type: "disease" | "task" | "system";
  title: string;
  description: string;
  time: string;
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const authData = getAuthData();

  const [
    statsRes,
    weatherRes,
    cropHealthRes,
    financeRes,
    harvestRes,
    activityRes,
    farmsRes,
  ] = await Promise.all([
    fetchWithAuth("/api/dashboard/stats"),
    fetchWithAuth("/api/dashboard/weather"),
    fetchWithAuth("/api/dashboard/health"),
    fetchWithAuth("/api/dashboard/finance"),
    fetchWithAuth("/api/dashboard/harvest"),
    fetchWithAuth("/api/dashboard/activity"),
    fetchWithAuth("/api/crops/farms").catch(() => null),
  ]);

  if (
    !statsRes.ok ||
    !cropHealthRes.ok ||
    !financeRes.ok ||
    !harvestRes.ok ||
    !activityRes.ok
  ) {
    throw new Error("Failed to fetch dashboard metrics from server");
  }

  const [
    stats,
    fallbackWeather,
    cropHealth,
    financeData,
    harvestSummary,
    recentActivities,
  ] = await Promise.all([
    statsRes.json() as Promise<StatCardProp[]>,
    weatherRes.ok ? (weatherRes.json() as Promise<Weather>) : Promise.resolve(null),
    cropHealthRes.json() as Promise<CropHealth[]>,
    financeRes.json() as Promise<FinanceData[]>,
    harvestRes.json() as Promise<HarvestSummary[]>,
    activityRes.json() as Promise<ActivityItem[]>,
  ]);

  // Fetch real weather per farm via Open-Meteo backend integration
  let farmsWeather: FarmWeatherItem[] = [];

  if (farmsRes && farmsRes.ok) {
    try {
      const farms = (await farmsRes.json()) as { farmIDs: number; farmNames: string }[];
      if (Array.isArray(farms) && farms.length > 0) {
        const weatherPromises = farms.map(async (farm): Promise<FarmWeatherItem> => {
          try {
            const res = await fetchWithAuth("/api/weather/all", {
              method: "POST",
              body: JSON.stringify(Number(farm.farmIDs)),
            });

            if (!res.ok) {
              const errData = (await res.json().catch(() => ({}))) as any;
              return {
                farmId: farm.farmIDs,
                farmName: farm.farmNames || `Farm #${farm.farmIDs}`,
                temp: 0,
                condition: "Coordinates Missing",
                humidity: "N/A",
                rainfall: "N/A",
                wind: "N/A",
                date: "Today",
                hasError: true,
                errorMessage: errData?.message || "Location coordinates missing for this farm",
              };
            }

            const data = (await res.json()) as any;
            const current = data?.current;
            const daily = data?.daily;

            const dateStr = current?.time
              ? new Date(current.time).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

            // Extract daily 5-day forecast
            const forecastDays = [];
            if (daily && Array.isArray(daily.time)) {
              const maxDays = Math.min(daily.time.length, 5);
              for (let i = 0; i < maxDays; i++) {
                const dayDate = new Date(daily.time[i]);
                const dayName = i === 0 ? "Today" : dayDate.toLocaleDateString("en-US", { weekday: "short" });
                forecastDays.push({
                  date: daily.time[i],
                  dayName,
                  weatherCode: daily.weather_code?.[i] ?? 0,
                  condition: getWeatherCondition(daily.weather_code?.[i]),
                  maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? current?.temperature_2m ?? 0),
                  minTemp: Math.round(daily.temperature_2m_min?.[i] ?? current?.temperature_2m ?? 0),
                  rainProb: daily.precipitation_probability_max?.[i] ?? 0,
                });
              }
            }

            const todayHigh = daily?.temperature_2m_max?.[0] != null
              ? Math.round(daily.temperature_2m_max[0])
              : Math.round(current?.temperature_2m ?? 0);
            const todayLow = daily?.temperature_2m_min?.[0] != null
              ? Math.round(daily.temperature_2m_min[0])
              : Math.round(current?.temperature_2m ?? 0);
            const uvIndex = daily?.uv_index_max?.[0] != null
              ? Number(daily.uv_index_max[0].toFixed(1))
              : undefined;
            const rainProbability = daily?.precipitation_probability_max?.[0] != null
              ? daily.precipitation_probability_max[0]
              : undefined;

            return {
              farmId: farm.farmIDs,
              farmName: farm.farmNames || `Farm #${farm.farmIDs}`,
              temp: current?.temperature_2m ?? 0,
              condition: getWeatherCondition(current?.weather_code),
              weatherCode: current?.weather_code,
              humidity: `${current?.relative_humidity_2m ?? 0}%`,
              rainfall: `${current?.rain ?? 0}mm`,
              wind: `${current?.wind_speed_10m ?? 0} km/h`,
              date: dateStr,
              highTemp: todayHigh,
              lowTemp: todayLow,
              uvIndex,
              rainProbability,
              forecast: forecastDays,
            };
          } catch (err) {
            return {
              farmId: farm.farmIDs,
              farmName: farm.farmNames || `Farm #${farm.farmIDs}`,
              temp: 0,
              condition: "Unavailable",
              humidity: "N/A",
              rainfall: "N/A",
              wind: "N/A",
              date: "Today",
              hasError: true,
              errorMessage: "Unable to load live weather",
            };
          }
        });

        farmsWeather = await Promise.all(weatherPromises);
      }
    } catch (e) {
      console.error("Failed to load farms weather:", e);
    }
  }

  // Fallback to general dashboard weather if no user farms found
  if (farmsWeather.length === 0 && fallbackWeather) {
    farmsWeather = [
      {
        farmId: 0,
        farmName: "Main Farm",
        temp: fallbackWeather.temp,
        condition: fallbackWeather.condition,
        weatherCode: 2,
        humidity: fallbackWeather.humidity,
        rainfall: fallbackWeather.rainfall,
        wind: fallbackWeather.wind,
        date: fallbackWeather.date,
      },
    ];
  }

  return {
    username: authData?.username || "Grower",
    stats,
    farmsWeather,
    cropHealth,
    financeData,
    harvestSummary,
    recentActivities,
  };
}

// --- Component ---
export default function DashboardPage() {
  const { username, stats, farmsWeather, cropHealth, financeData, harvestSummary, recentActivities } = useLoaderData<typeof clientLoader>();
  const [activeCropIndex, setActiveCropIndex] = useState(0);
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-slate-800">


      {/* Stats Row - Horizontally Scrollable */}
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-w-[220px] flex-shrink-0"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
                {t(stat.title)}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${stat.isPositive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                  }`}
              >
                {stat.change}
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Interactive Revenue & Expenses Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[360px]">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-700">{t("Revenue & Expenses")}</h3>
              <p className="text-xs text-slate-400">{t("Monthly financial performance breakdown")}</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm" /> {t("Revenue")}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-800 rounded-sm" /> {t("Expense")}</span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [
                    value !== undefined ? `$${Number(value).toLocaleString()}` : '$0',
                    'Revenue'
                  ]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="expense" stroke="#1e293b" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Widget - Farm Slideshow */}
        <FarmWeatherSlideshow farmsWeather={farmsWeather} />
      </div>

      {/* Analytics Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Crop Health Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-700 mb-2">{t("Crop Health Status")}</h3>

          <div className="flex-1 w-full min-h-[220px] -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setActiveCropIndex(index)}
                  onMouseLeave={() => setActiveCropIndex(0)}
                  label={({ name, value, cx, x, y }) => (
                    <text
                      x={x}
                      y={y}
                      fill="#64748b"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {`${name} ${value}%`}
                    </text>
                  )}
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} // Removed length1 and length2
                >
                  {cropHealth.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{ outline: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                    />
                  ))}

                  {/* Custom Center Label injected via Recharts */}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                      const { cx, cy } = viewBox;
                      const activeData = cropHealth[activeCropIndex];

                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                          <tspan
                            x={cx}
                            dy="-0.2em"
                            fontSize="28"
                            fontWeight="bold"
                            fill={activeData.color}
                          >
                            {activeData.value}%
                          </tspan>
                          <tspan
                            x={cx}
                            dy="1.6em"
                            fontSize="11"
                            fontWeight="600"
                            fill="#64748b"
                            letterSpacing="0.05em"
                          >
                            {activeData.name.toUpperCase()}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                {/* Tooltip removed as requested */}
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div className="space-y-3 mt-2 w-full px-2">
            {cropHealth.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center text-xs text-slate-600 transition-colors ${activeCropIndex === idx ? 'bg-slate-50 p-1.5 -m-1.5 rounded-md' : 'p-1.5 -m-1.5'
                  }`}
                onMouseEnter={() => setActiveCropIndex(idx)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={`font-medium ${activeCropIndex === idx ? 'text-slate-900' : ''}`}>
                    {t(item.name)}
                  </span>
                </div>
                <span className={`font-semibold ${activeCropIndex === idx ? 'text-slate-900' : 'text-slate-800'}`}>
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Harvest Summary Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[320px]">
          <div className="mb-4">
            <h3 className="font-bold text-slate-700">{t("Harvest Summary")}</h3>
            <p className="text-xs text-slate-400">{t("Actual Yield vs Target Yield metrics (kg)")}</p>
          </div>

          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={harvestSummary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="crop" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="actual" name={t("Actual Yield")} fill="#047857" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="target" name={t("Target Yield")} fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-4">{t("Recent Activities")}</h3>
        <div className="divide-y divide-slate-100">
          {recentActivities.map((act) => (
            <div key={act.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3.5">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ring-4 ${act.type === 'disease' ? 'bg-rose-500 ring-rose-100' : 'bg-blue-500 ring-blue-100'
                  }`} />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{t(act.title)}</h4>
                  <p className="text-xs text-slate-400">{t(act.description)}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{act.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export function ErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();

  let errorMessage = t("An unexpected error occurred.");

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="p-6 max-w-[600px] mx-auto mt-12 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
      <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
        !
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t("Dashboard Error")}</h2>
      <p className="text-sm text-slate-600 mb-6">{errorMessage}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
      >
        {t("Retry")}
      </button>
    </div>
  );
}