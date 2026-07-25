import type { ClientLoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { fetchWithAuth, getAuthData } from "../utils/auth";
import { useState } from "react";
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
  ] = await Promise.all([
    fetchWithAuth("/api/dashboard/stats"),
    fetchWithAuth("/api/dashboard/weather"),
    fetchWithAuth("/api/dashboard/health"),
    fetchWithAuth("/api/dashboard/finance"),
    fetchWithAuth("/api/dashboard/harvest"),
    fetchWithAuth("/api/dashboard/activity"),
  ]);

  if (
    !statsRes.ok ||
    !weatherRes.ok ||
    !cropHealthRes.ok ||
    !financeRes.ok ||
    !harvestRes.ok ||
    !activityRes.ok
  ) {
    throw new Error("Failed to fetch dashboard metrics from server");
  }

  const [
    stats,
    weather,
    cropHealth,
    financeData,
    harvestSummary,
    recentActivities,
  ] = await Promise.all([
    statsRes.json() as Promise<StatCardProp[]>,
    weatherRes.json() as Promise<Weather>,
    cropHealthRes.json() as Promise<CropHealth[]>,
    financeRes.json() as Promise<FinanceData[]>,
    harvestRes.json() as Promise<HarvestSummary[]>,
    activityRes.json() as Promise<ActivityItem[]>,
  ]);

  return {
    username: authData?.username || "Grower",
    stats,
    weather,
    cropHealth,
    financeData,
    harvestSummary,
    recentActivities,
  };
}

// --- Component ---
export default function DashboardPage() {
  const { username, stats, weather, cropHealth, financeData, harvestSummary, recentActivities } = useLoaderData<typeof clientLoader>();
  const [activeCropIndex, setActiveCropIndex] = useState(0);

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
                {stat.title}
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
              <h3 className="font-bold text-slate-700">Revenue & Expenses</h3>
              <p className="text-xs text-slate-400">Monthly financial performance breakdown</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-800 rounded-sm" /> Expense</span>
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

        {/* Weather Widget */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider opacity-80 uppercase">Weather Forecast</span>
            <div className="flex justify-between items-start mt-2">
              <div>
                <h2 className="text-6xl font-light tracking-tighter">{weather.temp}°C</h2>
                <p className="font-medium mt-1">{weather.condition}</p>
                <p className="text-xs opacity-70">{weather.date}</p>
              </div>
              <div className="w-16 h-16 relative">
                <div className="w-10 h-10 bg-amber-300 rounded-full absolute top-0 right-0 animate-pulse" />
                <div className="w-12 h-8 bg-white/30 backdrop-blur-sm rounded-full absolute bottom-2 left-0" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-white/20 pt-4 text-center text-xs">
            <div><p className="opacity-70">Temp</p><p className="font-semibold mt-0.5">{weather.temp}°C</p></div>
            <div><p className="opacity-70">Humidity</p><p className="font-semibold mt-0.5">{weather.humidity}</p></div>
            <div><p className="opacity-70">Rainfall</p><p className="font-semibold mt-0.5">{weather.rainfall}</p></div>
            <div><p className="opacity-70">Wind</p><p className="font-semibold mt-0.5">{weather.wind}</p></div>
          </div>
        </div>
      </div>

      {/* Analytics Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Crop Health Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-700 mb-2">Crop Health Status</h3>

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
                    {item.name}
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
            <h3 className="font-bold text-slate-700">Harvest Summary</h3>
            <p className="text-xs text-slate-400">Actual Yield vs Target Yield metrics (kg)</p>
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
                <Bar dataKey="actual" name="Actual Yield" fill="#047857" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="target" name="Target Yield" fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-4">Recent Activities</h3>
        <div className="divide-y divide-slate-100">
          {recentActivities.map((act) => (
            <div key={act.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3.5">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ring-4 ${act.type === 'disease' ? 'bg-rose-500 ring-rose-100' : 'bg-blue-500 ring-blue-100'
                  }`} />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">{act.title}</h4>
                  <p className="text-xs text-slate-400">{act.description}</p>
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