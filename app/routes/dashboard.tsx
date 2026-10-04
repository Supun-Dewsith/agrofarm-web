import { fetchWithAuth, getAuthData } from "../utils/auth";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { useTranslation } from "react-i18next";
import FarmWeatherSlideshow, { getWeatherCondition } from "../components/dashboard/FarmWeatherSlideshow";
import type { FarmWeatherItem } from "../components/dashboard/FarmWeatherSlideshow";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Label, Pie, Cell
} from 'recharts';
import {
  Sprout,
  Tractor,
  DollarSign,
  Users,
  Package,
  ShieldAlert,
  ArrowUpRight,
  BarChart3,
  Activity,
  Layers,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MapPin,
  Plus,
  Compass,
  PieChart as PieIcon,
  Tag,
  Store
} from "lucide-react";

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
  type: "disease" | "task" | "system" | "harvest" | "finance" | "attendance" | "inventory";
  title: string;
  description: string;
  time: string;
}

export interface TaskDistribution {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  completionRate: number;
}

export interface InventoryAlertItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  alertLimit: number;
  farmName: string;
  status: string;
}

export interface FarmOverviewItem {
  farmId: number;
  farmName: string;
  location: string;
  fieldsCount: number;
  cropsCount: number;
  activeTasksCount: number;
}

export interface CropStageDistribution {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export interface UpcomingHarvestItem {
  cropId: number;
  cropName: string;
  variety: string;
  farmName: string;
  progress: number;
  harvestDate: string;
  daysRemaining: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface AttendanceTrendDay {
  day: string;
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface DiseasePrevalenceItem {
  diseaseName: string;
  plantName: string;
  detectionCount: number;
  avgConfidence: number;
}

export interface LandUtilization {
  totalAreaAcres: number;
  totalFields: number;
  soilDistribution: Record<string, number>;
}

export interface MarketPriceItem {
  commodity: string;
  market: string;
  priceLkrPerKg: number;
  observedOn: string;
}

export interface DashboardData {
  username: string;
  userRole: string;
  stats: StatCardProp[];
  farmsWeather: FarmWeatherItem[];
  cropHealth: CropHealth[];
  financeData: FinanceData[];
  harvestSummary: HarvestSummary[];
  recentActivities: ActivityItem[];
  taskDistribution?: TaskDistribution;
  lowStockAlerts?: InventoryAlertItem[];
  farmOverviews?: FarmOverviewItem[];
  cropStages?: CropStageDistribution[];
  upcomingHarvests?: UpcomingHarvestItem[];
  expenseBreakdown?: ExpenseCategoryBreakdown[];
  attendanceTrend?: AttendanceTrendDay[];
  diseasePrevalence?: DiseasePrevalenceItem[];
  landUtilization?: LandUtilization;
  marketPrices?: MarketPriceItem[];
}

export interface DashboardOverviewResponse {
  stats: StatCardProp[];
  weather: Weather | null;
  cropHealth: CropHealth[];
  financeData: FinanceData[];
  harvestSummary: HarvestSummary[];
  recentActivities: ActivityItem[];
  taskDistribution?: TaskDistribution;
  lowStockAlerts: InventoryAlertItem[];
  farmOverviews: FarmOverviewItem[];
  cropStages: CropStageDistribution[];
  upcomingHarvests: UpcomingHarvestItem[];
  expenseBreakdown: ExpenseCategoryBreakdown[];
  attendanceTrend: AttendanceTrendDay[];
  diseasePrevalence: DiseasePrevalenceItem[];
  landUtilization?: LandUtilization;
}

/**
 * 1. Fast Database Overview Loader (~100-200ms)
 * Pulls all core enterprise stats, financial ledger, crop stages,
 * upcoming harvests, attendance, task distribution, inventory & pathology.
 */
export async function fetchOverviewData(): Promise<DashboardOverviewResponse> {
  const overviewRes = await fetchWithAuth("/api/dashboard/overview");
  if (!overviewRes.ok) {
    throw new Error(`Overview API responded with status ${overviewRes.status}`);
  }
  const data = (await overviewRes.json()) as DashboardOverviewResponse;
  return {
    stats: data.stats || [],
    weather: data.weather || null,
    cropHealth: data.cropHealth || [],
    financeData: data.financeData || [],
    harvestSummary: data.harvestSummary || [],
    recentActivities: data.recentActivities || [],
    taskDistribution: data.taskDistribution,
    lowStockAlerts: data.lowStockAlerts || [],
    farmOverviews: data.farmOverviews || [],
    cropStages: data.cropStages || [],
    upcomingHarvests: data.upcomingHarvests || [],
    expenseBreakdown: data.expenseBreakdown || [],
    attendanceTrend: data.attendanceTrend || [],
    diseasePrevalence: data.diseasePrevalence || [],
    landUtilization: data.landUtilization,
  };
}

/**
 * 2. CBSL Market Prices Loader
 * Fetches official commodity benchmark prices in parallel.
 */
export async function fetchMarketPrices(): Promise<MarketPriceItem[]> {
  try {
    const pricesRes = await fetchWithAuth("/api/harvest/official-prices").catch(() => null);
    if (pricesRes && pricesRes.ok) {
      const pData = (await pricesRes.json()) as any;
      if (Array.isArray(pData?.prices)) {
        return pData.prices.slice(0, 8);
      }
    }
  } catch (e) {
    console.warn("Failed to fetch official prices:", e);
  }
  return [];
}

/**
 * 3. Open-Meteo Per-Farm Weather Loader
 * Fetches real coordinates per farm and polls live 5-day forecast.
 */
export async function fetchFarmsWeather(fallbackWeather?: Weather | null): Promise<FarmWeatherItem[]> {
  try {
    const farmsRes = await fetchWithAuth("/api/crops/farms").catch(() => null);
    if (farmsRes && farmsRes.ok) {
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

        const results = await Promise.all(weatherPromises);
        if (results.length > 0) return results;
      }
    }
  } catch (e) {
    console.error("Failed to load farms weather:", e);
  }

  if (fallbackWeather) {
    return [
      {
        farmId: 0,
        farmName: "Main Estate",
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

  return [];
}

/**
 * Backward compatibility aggregator
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const authData = getAuthData();
  const username = authData?.username || "Grower";
  const userRole = authData?.role || "FARMER";

  const [overview, marketPrices] = await Promise.all([
    fetchOverviewData().catch(() => null),
    fetchMarketPrices().catch(() => []),
  ]);

  const farmsWeather = await fetchFarmsWeather(overview?.weather).catch(() => []);

  return {
    username,
    userRole,
    stats: overview?.stats || [],
    farmsWeather,
    cropHealth: overview?.cropHealth || [],
    financeData: overview?.financeData || [],
    harvestSummary: overview?.harvestSummary || [],
    recentActivities: overview?.recentActivities || [],
    taskDistribution: overview?.taskDistribution,
    lowStockAlerts: overview?.lowStockAlerts || [],
    farmOverviews: overview?.farmOverviews || [],
    cropStages: overview?.cropStages || [],
    upcomingHarvests: overview?.upcomingHarvests || [],
    expenseBreakdown: overview?.expenseBreakdown || [],
    attendanceTrend: overview?.attendanceTrend || [],
    diseasePrevalence: overview?.diseasePrevalence || [],
    landUtilization: overview?.landUtilization,
    marketPrices,
  };
}

// ==========================================
// DEDICATED COMPONENT-BY-COMPONENT SKELETONS
// ==========================================

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-3 sm:px-3.5 sm:py-3 rounded-xl shadow-xs border border-slate-100 flex items-center gap-3 animate-pulse h-[64px]"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-16 bg-slate-200 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-10 bg-slate-200 rounded" />
              <div className="h-3.5 w-14 bg-slate-100 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketPricesSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100" />
          <div className="h-3.5 w-64 bg-slate-200 rounded-md" />
        </div>
        <div className="h-3 w-24 bg-slate-100 rounded-md" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="min-w-[170px] p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0 space-y-2"
          >
            <div className="flex justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-2.5 w-10 bg-slate-100 rounded" />
            </div>
            <div className="h-5 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeatherCardSkeleton() {
  return (
    <div className="min-h-[380px] rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6 flex flex-col justify-between text-white border border-slate-800 animate-pulse relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-slate-700/80 rounded-md" />
          <div className="h-3 w-20 bg-slate-800 rounded-md" />
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-700/60" />
      </div>

      <div className="my-6 flex items-baseline gap-4">
        <div className="h-16 w-24 bg-slate-700/70 rounded-2xl" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-slate-700/80 rounded-md" />
          <div className="h-3 w-16 bg-slate-800 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
        <div className="h-8 bg-slate-800/80 rounded-xl" />
        <div className="h-8 bg-slate-800/80 rounded-xl" />
        <div className="h-8 bg-slate-800/80 rounded-xl" />
      </div>

      <div className="pt-4 border-t border-white/10 flex justify-between gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 h-12 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ChartCardSkeleton({ height = "min-h-[380px]", title = "Loading Chart..." }: { height?: string; title?: string }) {
  return (
    <div className={`lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between ${height} animate-pulse`}>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <div className="h-4 w-48 bg-slate-200 rounded-md" />
          <div className="h-3 w-32 bg-slate-100 rounded-md" />
        </div>
        <div className="h-4 w-24 bg-slate-100 rounded-md" />
      </div>
      <div className="flex-1 w-full bg-slate-50/60 rounded-2xl border border-dashed border-slate-200/80 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-emerald-500 animate-spin" />
          <span>{title}</span>
        </div>
      </div>
    </div>
  );
}

export function WidgetCardSkeleton({ titleWidth = "w-36" }: { titleWidth?: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px] animate-pulse">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={`h-4 ${titleWidth} bg-slate-200 rounded-md`} />
          <div className="h-3 w-14 bg-slate-100 rounded-md" />
        </div>
        <div className="h-3 w-48 bg-slate-100 rounded-md mb-4" />
      </div>

      <div className="space-y-3 my-auto">
        <div className="h-10 bg-slate-50 rounded-2xl border border-slate-100" />
        <div className="h-10 bg-slate-50 rounded-2xl border border-slate-100" />
        <div className="h-10 bg-slate-50 rounded-2xl border border-slate-100" />
      </div>

      <div className="h-8 w-full bg-slate-100 rounded-xl mt-4" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-1.5">
          <div className="h-4 w-44 bg-slate-200 rounded-md" />
          <div className="h-3 w-64 bg-slate-100 rounded-md" />
        </div>
        <div className="h-7 w-48 bg-slate-100 rounded-xl" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-100 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-40 bg-slate-200 rounded-md" />
                <div className="h-2.5 w-60 bg-slate-100 rounded-md" />
              </div>
            </div>
            <div className="h-3 w-14 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-slate-800 animate-pulse">
      <div className="h-44 bg-slate-200 rounded-3xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 p-4" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-slate-100" />
        <div className="h-96 bg-white rounded-3xl border border-slate-100" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const authData = getAuthData();
  const username = authData?.username || "Grower";
  const userRole = authData?.role || "FARMER";

  const [overviewData, setOverviewData] = useState<DashboardOverviewResponse | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceItem[]>([]);
  const [farmsWeather, setFarmsWeather] = useState<FarmWeatherItem[]>([]);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [activeCropIndex, setActiveCropIndex] = useState(0);
  const [activeExpenseIndex, setActiveExpenseIndex] = useState(0);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const { t } = useTranslation();

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setOverviewLoading(true);
      setWeatherLoading(true);
      setMarketLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setOverviewError(null);

    // 1. Kick off unified database overview (fast query: stats, charts, tasks, etc.)
    const overviewPromise = fetchOverviewData()
      .then((overview) => {
        setOverviewData(overview);
        setOverviewLoading(false);
        return overview;
      })
      .catch((err: any) => {
        console.error("Failed to load overview data:", err);
        setOverviewError(err?.message || "Failed to load dashboard metrics");
        setOverviewLoading(false);
        return null;
      });

    // 2. Kick off official CBSL market prices in parallel
    const marketPromise = fetchMarketPrices()
      .then((prices) => {
        setMarketPrices(prices);
        setMarketLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load market prices:", err);
        setMarketLoading(false);
      });

    // 3. Kick off real per-farm live weather in parallel
    const weatherPromise = fetchFarmsWeather()
      .then(async (weatherList) => {
        if (weatherList.length > 0) {
          setFarmsWeather(weatherList);
          setWeatherLoading(false);
        } else {
          // If no farm weather returned, await overview for fallback weather
          const ov = await overviewPromise;
          if (ov?.weather) {
            setFarmsWeather([
              {
                farmId: 0,
                farmName: "Main Estate",
                temp: ov.weather.temp,
                condition: ov.weather.condition,
                weatherCode: 2,
                humidity: ov.weather.humidity,
                rainfall: ov.weather.rainfall,
                wind: ov.weather.wind,
                date: ov.weather.date,
              },
            ]);
          }
          setWeatherLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load farms weather:", err);
        setWeatherLoading(false);
      });

    Promise.allSettled([overviewPromise, marketPromise, weatherPromise]).then(() => {
      setIsRefreshing(false);
      const now = new Date();
      setLastRefreshedAt(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredActivities = useMemo(() => {
    if (!overviewData?.recentActivities) return [];
    if (activityFilter === "all") return overviewData.recentActivities;
    return overviewData.recentActivities.filter((act) => act.type === activityFilter);
  }, [overviewData?.recentActivities, activityFilter]);

  if (overviewError && !overviewData) {
    return (
      <div className="p-6 max-w-[600px] mx-auto mt-16 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t("Dashboard Error")}</h2>
        <p className="text-sm text-slate-600 mb-6">{overviewError || t("Failed to load dashboard data.")}</p>
        <button
          onClick={() => loadData(false)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-emerald-200 cursor-pointer"
        >
          {t("Retry Connection")}
        </button>
      </div>
    );
  }

  const stats = overviewData?.stats || [];
  const cropHealth = overviewData?.cropHealth || [];
  const financeData = overviewData?.financeData || [];
  const harvestSummary = overviewData?.harvestSummary || [];
  const taskDistribution = overviewData?.taskDistribution;
  const lowStockAlerts = overviewData?.lowStockAlerts || [];
  const farmOverviews = overviewData?.farmOverviews || [];
  const cropStages = overviewData?.cropStages || [];
  const upcomingHarvests = overviewData?.upcomingHarvests || [];
  const expenseBreakdown = overviewData?.expenseBreakdown || [];
  const attendanceTrend = overviewData?.attendanceTrend || [];
  const diseasePrevalence = overviewData?.diseasePrevalence || [];
  const landUtilization = overviewData?.landUtilization;


  const getStatIcon = (type: string) => {
    switch (type) {
      case "farms":
        return <Tractor className="w-[18px] h-[18px] text-emerald-600" />;
      case "crops":
        return <Sprout className="w-[18px] h-[18px] text-green-600" />;
      case "tasks":
        return <CheckSquare className="w-[18px] h-[18px] text-blue-600" />;
      case "alerts":
        return <ShieldAlert className="w-[18px] h-[18px] text-rose-600" />;
      case "harvest":
        return <Package className="w-[18px] h-[18px] text-amber-600" />;
      case "revenue":
        return <DollarSign className="w-[18px] h-[18px] text-emerald-700" />;
      case "inventory":
        return <AlertTriangle className="w-[18px] h-[18px] text-orange-600" />;
      case "workers":
      default:
        return <Users className="w-[18px] h-[18px] text-indigo-600" />;
    }
  };

  const getStatBg = (type: string) => {
    switch (type) {
      case "farms":
        return "bg-emerald-50 text-emerald-700";
      case "crops":
        return "bg-green-50 text-green-700";
      case "tasks":
        return "bg-blue-50 text-blue-700";
      case "alerts":
        return "bg-rose-50 text-rose-700";
      case "harvest":
        return "bg-amber-50 text-amber-700";
      case "revenue":
        return "bg-emerald-50 text-emerald-700";
      case "inventory":
        return "bg-orange-50 text-orange-700";
      case "workers":
      default:
        return "bg-indigo-50 text-indigo-700";
    }
  };

  const getStatLink = (type: string) => {
    switch (type) {
      case "farms":
        return "/home/farm-management";
      case "crops":
        return "/home/crops";
      case "tasks":
        return "/home/tasks";
      case "alerts":
        return "/home/disease-detection";
      case "harvest":
        return "/home/harvest";
      case "revenue":
        return "/home/reports";
      case "inventory":
        return "/home/inventory";
      case "workers":
      default:
        return "/home/farmers";
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "disease":
        return (
          <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </span>
        );
      case "task":
        return (
          <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <CheckSquare className="w-4 h-4" />
          </span>
        );
      case "harvest":
        return (
          <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </span>
        );
      case "finance":
        return (
          <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </span>
        );
      case "attendance":
        return (
          <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </span>
        );
      case "inventory":
        return (
          <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </span>
        );
      default:
        return (
          <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </span>
        );
    }
  };

  const totalFinancialRevenue = financeData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalFinancialExpense = financeData.reduce((acc, curr) => acc + (curr.expense || 0), 0);
  const netFinancialProfit = totalFinancialRevenue - totalFinancialExpense;

  const totalExpenseCategoryAmount = (expenseBreakdown || []).reduce((acc, curr) => acc + curr.amount, 0);

  const formatStatChange = (change: string) => {
    if (!change) return "";
    const match = change.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (match) {
      return `${match[1]} ${t(match[2])}`;
    }
    return t(change);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 mx-auto text-slate-800">
      {/* 2. Official Central Bank Commodity Market Prices Ticker */}
      {marketLoading ? (
        <MarketPricesSkeleton />
      ) : marketPrices && marketPrices.length > 0 ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Store className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {t("Live Official Market Commodity Prices (LKR/kg)")}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                {t("CBSL Benchmark")}
              </span>
            </div>
            <Link
              to="/home/harvest"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>{t("Price Intelligence")}</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
            {marketPrices.map((item, idx) => (
              <div
                key={idx}
                className="min-w-[170px] p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all flex flex-col justify-between shrink-0"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 truncate">{item.commodity}</span>
                  <span className="text-[10px] text-slate-400 truncate">{item.market}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-extrabold text-emerald-700">
                    LKR {item.priceLkrPerKg}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">{t("/ kg")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 3. 8 Key System Stat Cards Grid */}
      {overviewLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, idx) => (
            <Link
              key={idx}
              to={getStatLink(stat.type)}
              className="bg-white p-3 sm:px-3.5 sm:py-3 rounded-xl shadow-xs border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all flex items-center gap-3 group relative overflow-hidden"
            >
              <div
                className={`w-9 h-9 rounded-xl ${getStatBg(
                  stat.type
                )} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
              >
                {getStatIcon(stat.type)}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  {t(stat.title)}
                </span>
                <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    {stat.value}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${stat.isPositive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                  >
                    {formatStatChange(stat.change)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 4. Section 1: Financial Trajectory & Live Weather Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {overviewLoading ? (
          <ChartCardSkeleton height="min-h-[380px]" title={t("Financial Performance Trajectory")} />
        ) : (
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[380px]">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">{t("Financial Performance Trajectory")}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                    {t("Monthly Inflows vs Outflows")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("Real ledger performance across all registered farms")}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">{t("Revenue")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-800" />
                  <span className="text-slate-600">{t("Expense")}</span>
                </div>
                <Link
                  to="/home/reports"
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 ml-1"
                >
                  <span>{t("Details")}</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-2xl mb-4 border border-slate-100/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">{t("Recorded Revenue")}</span>
                <span className="font-bold text-emerald-700 text-sm">
                  LKR {totalFinancialRevenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">{t("Recorded Expenses")}</span>
                <span className="font-bold text-slate-700 text-sm">
                  LKR {totalFinancialExpense.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">{t("Net Inflow Margin")}</span>
                <span className={`font-bold text-sm ${netFinancialProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  LKR {netFinancialProfit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#334155" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#334155" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name: any) => [
                      `LKR ${Number(value || 0).toLocaleString()}`,
                      name === "revenue" ? t("Revenue") : t("Expense"),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#334155"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex flex-col">
          {weatherLoading ? (
            <WeatherCardSkeleton />
          ) : (
            <FarmWeatherSlideshow farmsWeather={farmsWeather} />
          )}
        </div>
      </div>

      {/* 5. Section 2: Crop Lifecycle Pipeline, Harvest Countdown & Crop Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewLoading ? (
          <>
            <WidgetCardSkeleton titleWidth="w-36" />
            <WidgetCardSkeleton titleWidth="w-40" />
            <WidgetCardSkeleton titleWidth="w-44" />
          </>
        ) : (
          <>
            {/* Crop Growth Lifecycle Pipeline */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Crop Lifecycle Stages")}</h3>
                  <Link to="/home/crops" className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span>{t("Crops")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Active crops by phenological growth phase")}</p>
              </div>

              {cropStages && cropStages.length > 0 ? (
                <>
                  <div className="my-4 space-y-3">
                    {cropStages.map((stage, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                            <span className="font-medium text-slate-700">{t(stage.stage)}</span>
                          </div>
                          <span className="font-bold text-slate-800">{stage.count} {t("crops")} ({stage.percentage}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${stage.percentage}%`, backgroundColor: stage.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100/70 text-xs flex items-center justify-between">
                    <span className="text-emerald-800 font-medium">{t("Active Cultivation")}</span>
                    <span className="font-bold text-emerald-900">
                      {cropStages.reduce((acc, curr) => acc + curr.count, 0)} {t("Total Plots")}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 my-auto">
                  <Sprout className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">{t("No active crops in lifecycle")}</p>
                  <Link to="/home/cropInsert" className="inline-block mt-2 text-xs text-emerald-600 font-semibold hover:underline">
                    + {t("Plant First Crop")}
                  </Link>
                </div>
              )}
            </div>

            {/* Upcoming Harvest Countdown */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Upcoming Harvests")}</h3>
                  <Link to="/home/harvest" className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                    <span>{t("Harvest")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Crops approaching peak maturity and harvest readiness")}</p>
              </div>

              {upcomingHarvests && upcomingHarvests.length > 0 ? (
                <div className="my-3 space-y-2.5 flex-1 overflow-y-auto max-h-[220px] pr-1">
                  {upcomingHarvests.map((item) => (
                    <div
                      key={item.cropId}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-all text-xs"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <h5 className="font-bold text-slate-800">{t(item.cropName)}</h5>
                          <span className="text-[10px] text-slate-400">{item.variety} • {item.farmName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {item.daysRemaining > 0 ? `${item.daysRemaining} ${t("days")}` : t("Ready")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.progress}%` }} />
                        </div>
                        <span className="font-bold text-slate-600 text-[10px]">{item.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 my-auto">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">{t("No upcoming harvests scheduled")}</p>
                </div>
              )}

              <Link
                to="/home/harvest"
                className="w-full text-center py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold transition-colors mt-2"
              >
                {t("Log Harvest Production")}
              </Link>
            </div>

            {/* Crop Health Status Donut */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Crop Health Distribution")}</h3>
                  <Link to="/home/disease-detection" className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span>{t("Scan")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Plant vigor based on field diagnosis & AI")}</p>
              </div>

              {cropHealth && cropHealth.length > 0 ? (
                <>
                  <div className="flex-1 w-full min-h-[180px] flex items-center justify-center py-1">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={cropHealth}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          dataKey="value"
                          stroke="none"
                          onMouseEnter={(_, index) => setActiveCropIndex(index)}
                          onMouseLeave={() => setActiveCropIndex(0)}
                        >
                          {cropHealth.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              style={{ outline: "none", cursor: "pointer", transition: "all 0.3s ease" }}
                            />
                          ))}
                          <Label
                            content={({ viewBox }) => {
                              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                              const { cx, cy } = viewBox;
                              const activeData = cropHealth[activeCropIndex] || cropHealth[0];
                              return (
                                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                  <tspan x={cx} dy="-0.2em" fontSize="22" fontWeight="bold" fill={activeData?.color || "#10b981"}>
                                    {activeData?.value ?? 0}%
                                  </tspan>
                                  <tspan x={cx} dy="1.6em" fontSize="10" fontWeight="600" fill="#64748b">
                                    {t(activeData?.name || "STATUS").toUpperCase()}
                                  </tspan>
                                </text>
                              );
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 w-full pt-2 border-t border-slate-100">
                    {cropHealth.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-xs rounded-xl px-2 py-1 cursor-pointer transition-colors ${activeCropIndex === idx ? "bg-slate-50 font-semibold" : "hover:bg-slate-50/50"
                          }`}
                        onMouseEnter={() => setActiveCropIndex(idx)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700">{t(item.name)}</span>
                        </div>
                        <span className="font-bold text-slate-800">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 my-auto">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">{t("No crop health assessments logged")}</p>
                  <Link to="/home/disease-detection" className="inline-block mt-2 text-xs text-emerald-600 font-semibold hover:underline">
                    {t("Run Crop Diagnostic")}
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 6. Section 3: Operating Expense Breakdown & Harvest Yield Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {overviewLoading ? (
          <>
            <WidgetCardSkeleton titleWidth="w-44" />
            <ChartCardSkeleton height="min-h-[340px]" title={t("Harvest Production Performance")} />
          </>
        ) : (
          <>
            {/* Operating Expense Breakdown by Category */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Expense Allocation Breakdown")}</h3>
                  <Link to="/home/reports" className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span>{t("P&L")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Capital deployment across farm operations")}</p>
              </div>

              {expenseBreakdown && expenseBreakdown.length > 0 ? (
                <>
                  <div className="flex-1 w-full min-h-[190px] flex items-center justify-center py-1">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          dataKey="amount"
                          stroke="none"
                          onMouseEnter={(_, index) => setActiveExpenseIndex(index)}
                          onMouseLeave={() => setActiveExpenseIndex(0)}
                        >
                          {expenseBreakdown.map((entry, index) => (
                            <Cell
                              key={`exp-cell-${index}`}
                              fill={entry.color}
                              style={{ outline: "none", cursor: "pointer", transition: "all 0.3s ease" }}
                            />
                          ))}
                          <Label
                            content={({ viewBox }) => {
                              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                              const { cx, cy } = viewBox;
                              const active = expenseBreakdown[activeExpenseIndex] || expenseBreakdown[0];
                              return (
                                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                  <tspan x={cx} dy="-0.2em" fontSize="16" fontWeight="bold" fill="#1e293b">
                                    {active ? `${active.percentage}%` : "100%"}
                                  </tspan>
                                  <tspan x={cx} dy="1.6em" fontSize="9" fontWeight="600" fill="#64748b">
                                    {active ? t(active.category).slice(0, 10).toUpperCase() : t("EXPENSE")}
                                  </tspan>
                                </text>
                              );
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 w-full pt-2 border-t border-slate-100">
                    {expenseBreakdown.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-xs rounded-xl px-2 py-1 cursor-pointer transition-colors ${activeExpenseIndex === idx ? "bg-slate-50 font-semibold" : "hover:bg-slate-50/50"
                          }`}
                        onMouseEnter={() => setActiveExpenseIndex(idx)}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700 truncate">{t(item.category)}</span>
                        </div>
                        <span className="font-bold text-slate-800 shrink-0">LKR {item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 my-auto">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">{t("No expense allocations recorded")}</p>
                  <Link to="/home/reports" className="inline-block mt-2 text-xs text-emerald-600 font-semibold hover:underline">
                    {t("Record Farm Expenses")}
                  </Link>
                </div>
              )}
            </div>

            {/* Harvest Production Bar Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[340px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">{t("Harvest Production Performance")}</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {t("Actual vs Target Yield (kg)")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{t("Crop yield comparisons against production benchmarks")}</p>
                </div>
                <Link to="/home/harvest" className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <span>{t("All Records")}</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {harvestSummary && harvestSummary.length > 0 ? (
                <div className="flex-1 w-full min-h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={harvestSummary} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="crop" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }}
                        formatter={(val: any) => [`${Number(val).toLocaleString()} kg`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                      <Bar dataKey="actual" name={t("Actual Yield")} fill="#059669" radius={[6, 6, 0, 0]} barSize={22} />
                      <Bar dataKey="target" name={t("Target Yield")} fill="#a7f3d0" radius={[6, 6, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 my-auto">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">{t("No harvest records logged yet")}</p>
                  <Link to="/home/harvest" className="inline-block mt-2 text-xs text-emerald-600 font-semibold hover:underline">
                    + {t("Log First Harvest")}
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 7. Section 4: Workforce 7-Day Attendance, Task Operations & Inventory / Land Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overviewLoading ? (
          <>
            <WidgetCardSkeleton titleWidth="w-40" />
            <WidgetCardSkeleton titleWidth="w-32" />
            <WidgetCardSkeleton titleWidth="w-36" />
          </>
        ) : (
          <>
            {/* 7-Day Attendance & Workforce Turnout */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("7-Day Workforce Turnout")}</h3>
                  <Link to="/home/attendance" className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                    <span>{t("Attendance")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Daily field crew availability & on-time presence")}</p>
              </div>

              <div className="flex-1 w-full min-h-[180px] my-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={attendanceTrend} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "11px" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="present" name={t("Present")} fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="late" name={t("Late")} fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="absent" name={t("Absent")} fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Link
                to="/home/attendance"
                className="w-full text-center py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-semibold transition-colors"
              >
                {t("View Shift Logs & QR Scanning")}
              </Link>
            </div>

            {/* Task Operations Widget */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Task Operations")}</h3>
                  <Link to="/home/tasks" className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                    <span>{t("Tasks")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Field assignments and workflow completion")}</p>
              </div>

              <div className="my-5">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {taskDistribution ? `${taskDistribution.completionRate}%` : "100%"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {taskDistribution?.completed ?? 0} {t("of")} {taskDistribution?.total ?? 0} {t("completed")}
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${taskDistribution?.completionRate ?? 100}%` }}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{
                      width: `${taskDistribution && taskDistribution.total > 0
                        ? (taskDistribution.inProgress / taskDistribution.total) * 100
                        : 0
                        }%`,
                    }}
                  />
                  <div
                    className="bg-blue-400 h-full transition-all duration-500"
                    style={{
                      width: `${taskDistribution && taskDistribution.total > 0
                        ? (taskDistribution.pending / taskDistribution.total) * 100
                        : 0
                        }%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">{t("Pending")}</span>
                  <span className="font-bold text-slate-800 text-sm">{taskDistribution?.pending ?? 0}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">{t("In Progress")}</span>
                  <span className="font-bold text-amber-600 text-sm">{taskDistribution?.inProgress ?? 0}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">{t("Completed")}</span>
                  <span className="font-bold text-emerald-600 text-sm">{taskDistribution?.completed ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Low Stock Watch & Land Profile */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Inventory Stock Watch")}</h3>
                  <Link to="/home/inventory" className="text-xs text-orange-700 font-semibold flex items-center gap-1">
                    <span>{t("Supplies")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Critical items below reorder limit")}</p>
              </div>

              <div className="my-2 space-y-2 flex-1 overflow-y-auto max-h-[140px] pr-1">
                {lowStockAlerts && lowStockAlerts.length > 0 ? (
                  lowStockAlerts.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-orange-50/70 border border-orange-100 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <h5 className="font-bold text-slate-800 truncate">{item.name}</h5>
                        <span className="text-[10px] text-slate-400">{t(item.category)} • {item.farmName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-orange-700">{item.quantity} {t(item.unit)}</span>
                        <span className="text-[10px] text-slate-400 block">{t("Alert")}: {item.alertLimit}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-slate-700">{t("All Inventory Healthy")}</span>
                  </div>
                )}
              </div>

              {/* Land Utilization Banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">{t("Cultivated Land Area")}</span>
                  <span className="font-bold text-emerald-700">
                    {landUtilization && landUtilization.totalAreaAcres > 0
                      ? `${landUtilization.totalAreaAcres} ${t("Acres")} (${landUtilization.totalFields} ${t("fields")})`
                      : t("0 Acres Registered")}
                  </span>
                </div>
                {landUtilization && Object.keys(landUtilization.soilDistribution || {}).length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(landUtilization.soilDistribution).map(([farm, cnt], i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 font-medium">
                        {farm} ({cnt} {cnt === 1 ? t("field") : t("fields")})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">{t("No fields registered yet")}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 8. Section 5: Top Plant Diseases Detected & Real-Time Operations Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {overviewLoading ? (
          <>
            <WidgetCardSkeleton titleWidth="w-44" />
            <TimelineSkeleton />
          </>
        ) : (
          <>
            {/* Plant Pathology Diagnostics */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{t("Crop Pathology Intelligence")}</h3>
                  <Link to="/home/disease-detection" className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                    <span>{t("AI Scanner")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-slate-400">{t("Most prevalent disease detections & AI confidence")}</p>
              </div>

              <div className="my-4 space-y-3 flex-1 overflow-y-auto max-h-[260px] pr-1">
                {diseasePrevalence && diseasePrevalence.length > 0 ? (
                  diseasePrevalence.map((pathogen, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <h5 className="font-bold text-slate-800">{t(pathogen.diseaseName)}</h5>
                        <span className="text-[10px] text-slate-400">{t("Plant")}: {t(pathogen.plantName)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-700">{pathogen.detectionCount} {t("Incidents")}</span>
                        <span className="text-[10px] text-slate-500 block">{pathogen.avgConfidence}% {t("Conf.")}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 my-auto">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs font-semibold text-slate-700">{t("No active plant disease detections")}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t("Crops are clear of identified pathogens")}</p>
                  </div>
                )}
              </div>

              <Link
                to="/home/disease-detection"
                className="w-full text-center py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-semibold transition-colors mt-2"
              >
                {t("Open Vision Disease Diagnostic")}
              </Link>
            </div>

            {/* Real-Time Operations Timeline */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">{t("Real-Time Operations Feed")}</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {t("System-Wide Logs")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("Live timeline of field detections, completed tasks, harvests, and ledger updates")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  {["all", "disease", "task", "harvest", "finance", "attendance"].map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setActivityFilter(filterKey)}
                      className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer capitalize ${activityFilter === filterKey
                        ? "bg-white text-slate-900 font-bold shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                      {t(filterKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        {getActivityBadge(act.type)}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 truncate">{t(act.title)}</h4>
                          <p className="text-xs text-slate-400 truncate">{t(act.description)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">
                        {act.time}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">{t("No activities found for this filter")}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
    <div className="p-6 max-w-[600px] mx-auto mt-16 bg-white rounded-3xl shadow-sm border border-slate-100 text-center">
      <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t("Dashboard Error")}</h2>
      <p className="text-sm text-slate-600 mb-6">{errorMessage}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {t("Reload Application")}
      </button>
    </div>
  );
}