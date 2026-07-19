import type { ClientLoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { fetchWithAuth, getAuthData } from "../utils/auth";
import { useState } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Label, Pie, Cell 
} from 'recharts';

// --- Interfaces ---
interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  type: string;
}

interface ActivityItem {
  id: string;
  type: "disease" | "task" | "system";
  title: string;
  description: string;
  time: string;
}

interface CropHealth {
  name: string;
  value: number;
  color: string;
}

// --- Client Loader ---
export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const authData = getAuthData();

  const stats: StatCardProps[] = [
    { title: "Total Farmers", value: 156, change: "+12%", isPositive: true, type: "farmers" },
    { title: "Total Workers", value: 342, change: "+8%", isPositive: true, type: "workers" },
    { title: "Active Crops", value: 24, change: "+3", isPositive: true, type: "crops" },
    { title: "Active Tasks", value: 67, change: "-6", isPositive: false, type: "tasks" },
    { title: "Disease Alerts", value: 8, change: "+1", isPositive: false, type: "alerts" },
    { title: "Total Revenue", value: "$45.2K", change: "+18%", isPositive: true, type: "revenue" },
  ];

  const weather = {
    temp: 28,
    condition: "Partly Cloudy",
    date: "Today, June 21",
    humidity: "65%",
    rainfall: "12mm",
    wind: "8 km/h",
  };

  const cropHealth: CropHealth[] = [
  { name: "Healthy", value: 68, color: "#10b981" }, // Emerald green
    { name: "Moderate", value: 22, color: "#eab308" }, // Yellow/Amber
    { name: "Critical", value: 10, color: "#ef4444" }, // Red
  ];

  // Formatted for Recharts AreaChart
  const financeData = [
    { month: 'Jan', revenue: 28000, expense: 18000 },
    { month: 'Feb', revenue: 32000, expense: 20000 },
    { month: 'Mar', revenue: 35000, expense: 21000 },
    { month: 'Apr', revenue: 39000, expense: 22000 },
    { month: 'May', revenue: 43000, expense: 24000 },
    { month: 'Jun', revenue: 45000, expense: 25000 },
  ];

  // Formatted for Recharts BarChart
  const harvestSummary = [
    { crop: "Tomato", actual: 480, target: 550 },
    { crop: "Chili", actual: 510, target: 600 },
    { crop: "Rice", actual: 490, target: 530 },
    { crop: "Corn", actual: 520, target: 410 },
    { crop: "Potato", actual: 540, target: 560 },
  ];

  const recentActivities: ActivityItem[] = [
    {
      id: "1",
      type: "disease",
      title: "New disease detected",
      description: "Tomato crop in Field A",
      time: "5 minutes ago",
    },
    {
      id: "2",
      type: "task",
      title: "Task assigned",
      description: "Irrigation for Field B",
      time: "2 hours ago",
    },
  ];

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
      

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
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
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'undefined']}
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
                  // Update state on hover, revert to 0 on leave (optional)
                  onMouseEnter={(_, index) => setActiveCropIndex(index)}
                  onMouseLeave={() => setActiveCropIndex(0)}
                  // External label lines matching Figma
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
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1, length1: 15, length2: 10 }}
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
                className={`flex justify-between items-center text-xs text-slate-600 transition-colors ${
                  activeCropIndex === idx ? 'bg-slate-50 p-1.5 -m-1.5 rounded-md' : 'p-1.5 -m-1.5'
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
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ring-4 ${
                  act.type === 'disease' ? 'bg-rose-500 ring-rose-100' : 'bg-blue-500 ring-blue-100'
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