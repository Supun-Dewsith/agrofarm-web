import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, Legend
} from 'recharts';

// --- DATA DEFINITIONS ---
const financialChartData = [
  { month: 'Jan', Revenue: 27000, Expense: 18000 },
  { month: 'Feb', Revenue: 31000, Expense: 19000 },
  { month: 'Mar', Revenue: 33000, Expense: 21000 },
  { month: 'Apr', Revenue: 37000, Expense: 22000 },
  { month: 'May', Revenue: 41000, Expense: 24000 },
  { month: 'Jun', Revenue: 44000, Expense: 25000 },
];

const cropChartData = [
  { crop: 'Tomato', planned: 900, actual: 1050 },
  { crop: 'chili', planned: 1000, actual: 1100 },
  { crop: 'Rice', planned: 950, actual: 1050 },
  { crop: 'Corn', planned: 1050, actual: 880 },
  { crop: 'Potato', planned: 1100, actual: 1150 },
];

const cropSummary = [
  { name: 'Tomato', planned: '1000 kg', actual: '850 kg', efficiency: '85%' },
  { name: 'chili', planned: '1000 kg', actual: '920 kg', efficiency: '92%' },
  { name: 'Rice', planned: '1000 kg', actual: '780 kg', efficiency: '78%' },
  { name: 'Corn', planned: '1000 kg', actual: '890 kg', efficiency: '89%' },
];

const exportItems = [
  { title: 'Financial Report', desc: 'Income, expenses, and profit analysis' },
  { title: 'Crop Yield Report', desc: 'Harvest data and crop performance' },
  { title: 'Inventory Report', desc: 'Stock levels and reorder requirement' },
  { title: 'Task Report', desc: 'Completed and pending tasks' },
  { title: 'Attendance Report', desc: 'Employee attendance records' },
  { title: 'Disease Report', desc: 'AI detection and treatment history' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'crop' | 'export'>('financial');

  return (
    <div className="space-y-6 p-2">
      {/* Top Title Section */}
      <div>
        <h1 className="text-3xl font-bold text-[#1e3a1e]">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Comprehensive farm performance reports</p>
      </div>

      {/* Metrics Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Total Income</p>
          <h3 className="text-3xl font-bold text-gray-800 mt-2">LKR220.2K</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Total Expense</p>
          <h3 className="text-3xl font-bold text-red-500 mt-2">LKR129K</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Net Profit</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-2">$91.2K</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Profit Margin</p>
          <h3 className="text-3xl font-bold text-blue-600 mt-2">41.4%</h3>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div className="bg-gray-200/80 p-1 rounded-full inline-flex gap-1 text-sm font-medium text-gray-700">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-5 py-1.5 rounded-full transition-all ${
            activeTab === 'financial'
              ? 'bg-white text-gray-900 shadow-sm font-semibold'
              : 'hover:text-gray-900'
          }`}
        >
          Financial report
        </button>
        <button
          onClick={() => setActiveTab('crop')}
          className={`px-5 py-1.5 rounded-full transition-all ${
            activeTab === 'crop'
              ? 'bg-white text-gray-900 shadow-sm font-semibold'
              : 'hover:text-gray-900'
          }`}
        >
          crop performance
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-5 py-1.5 rounded-full transition-all ${
            activeTab === 'export'
              ? 'bg-white text-gray-900 shadow-sm font-semibold'
              : 'hover:text-gray-900'
          }`}
        >
          Export opertions
        </button>
      </div>

      {/* TAB 1: FINANCIAL REPORT */}
      {activeTab === 'financial' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-gray-600">Revenue & Expenses</h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 60000]} ticks={[0, 20000, 40000, 60000]} />
                <Tooltip />
                <Area type="monotone" dataKey="Revenue" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="Expense" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-12 pt-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-sm"></span>
              <span className="text-xs text-gray-600 font-medium">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#0f4c5c] rounded-sm"></span>
              <span className="text-xs text-gray-600 font-medium">Expense</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CROP PERFORMANCE */}
      {activeTab === 'crop' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-gray-600">Crop Performance Overview</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="crop" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={[0, 1000]} ticks={[0, 250, 500, 750, 1000]} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="planned" name="Planned Yield (kg)" fill="#15803d" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Yield (kg)" fill="#86efac" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cropSummary.map((item) => (
              <div key={item.name} className="bg-gray-200/60 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-gray-800 text-lg">{item.name}</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><span className="font-medium">Planned:</span> {item.planned}</p>
                  <p><span className="font-medium">Actual:</span> {item.actual}</p>
                  <p><span className="font-medium">Efficiency:</span> {item.efficiency}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EXPORT OPERATIONS */}
      {activeTab === 'export' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportItems.map((item) => (
              <div key={item.title} className="bg-gray-200/60 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-transparent text-[#0F7640] rounded-xl">
                    <FileText size={36} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <button className="p-2 border border-[#0F7640] text-[#0F7640] rounded-xl hover:bg-emerald-50 transition-colors">
                  <Download size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}