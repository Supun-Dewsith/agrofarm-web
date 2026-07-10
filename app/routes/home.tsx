// app/routes/home.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { authStorage, apiFetch } from "../utils/auth";

export default function Home() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
  const name = authStorage.getUsername();
  if (!authStorage.getAccessToken() || !name) {
    navigate("/login");
  } else {
    setUsername(name);
  }
}, [navigate]);

  const handleLogout = () => {
    authStorage.clearTokens();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex font-sans text-gray-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1e4636] text-white flex flex-col justify-between p-6 hidden md:flex">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 3l4 4M12 3L8 7" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide">AgriSmart AI</h1>
              <p className="text-[10px] text-emerald-300 opacity-80">Management System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-white/10 rounded-xl text-xs font-medium tracking-wide transition-all">
              Overview
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-xs font-medium tracking-wide text-gray-300 hover:text-white transition-all">
              Crop Monitoring
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-xs font-medium tracking-wide text-gray-300 hover:text-white transition-all">
              Inventory & Resources
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-xs font-medium tracking-wide text-gray-300 hover:text-white transition-all">
              Analytics & Yield
            </a>
          </nav>
        </div>

        {/* User Footer Profile Summary inside Sidebar */}
        <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
          <div className="truncate">
            <p className="text-[10px] text-emerald-300/80 uppercase font-bold tracking-wider">Signed In As</p>
            <p className="text-xs font-medium truncate opacity-90">{userEmail || "Loading..."}</p>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-xs font-medium text-red-300 hover:text-red-200 transition-colors pt-1">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 md:px-10">
          <h2 className="text-base font-semibold text-gray-800 tracking-tight">System Overview</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded-full border border-emerald-100">
              Operational Cloud Node
            </span>
            <button onClick={handleLogout} className="md:hidden text-xs font-semibold text-red-600">
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic Metric Grid Panels Container */}
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto space-y-6">
          {/* Welcome Alert Panel Banner */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Welcome to your AgriSmart Engine dashboard.</h3>
              <p className="text-xs text-gray-500 mt-0.5">Real-time edge telemetry logs and farm environment control metrics are ready.</p>
            </div>
          </div>

          {/* Status KPI Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Monitoring Areas</p>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">12 Sectors</h4>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Automated Tasks</p>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">84% Complete</h4>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Yield Health Coefficient</p>
              <h4 className="text-2xl font-bold text-[#2d5a47] mt-1">Optimal</h4>
            </div>
            <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">System Memory Runtime</p>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">Edge Active</h4>
            </div>
          </div>

          {/* Large Center Main Mock Graphic Block */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="bg-gray-50 text-gray-400 p-4 rounded-full mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-gray-800">Telemetry Visualizations & Graphs</h4>
            <p className="text-xs text-gray-400 max-w-xs mt-1">This space is allocated to display your active dynamic AI-driven agricultural insight analytics charts.</p>
          </div>
        </div>
      </main>
    </div>
  );
}