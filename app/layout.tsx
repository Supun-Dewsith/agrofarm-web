import { Link, Outlet, useLocation } from "react-router"; 
import { logout, getAuthData } from "./utils/auth";
import {
  LayoutDashboard,
  Users,
  Sprout,
  ClipboardList,
  CloudSun,
  CheckSquare,
  ScanFace,
  Boxes,
  Wheat,
  FileText,
  Settings,
  LogOut
} from "lucide-react";

export default function DashboardLayout() {
  const user = getAuthData();
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop();

  const getPageTitle = () => {
    if (!currentPath || currentPath === "home") {
      return "Dashboard Overview";
    }

    return currentPath
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/home" },
    { icon: Users, label: "Farmers", path: "/home/farmers" },
    { icon: Sprout, label: "Crops", path: "/home/crops" },
    { icon: ClipboardList, label: "Attendance", path: "/home/attendance" },
    { icon: CloudSun, label: "Weather", path: "/home/weather" },
    { icon: CheckSquare, label: "Tasks", path: "/home/tasks" },
    { icon: ScanFace, label: "Disease detection", path: "/home/disease-detection" },
    { icon: Boxes, label: "Inventory", path: "/home/inventory" },
    { icon: Wheat, label: "Harvest", path: "/home/harvest" },
    { icon: FileText, label: "Reports", path: "/home/reports" },
    { icon: Settings, label: "Settings", path: "/home/settings" },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1b3b2b] text-slate-300 flex flex-col hidden md:flex border-r border-[#244A38]/30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#244A38]/50">
          <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
            <Sprout className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">AgriSense AI</span>
        </div>

        <nav className="mt-5 px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 tracking-wide ${
                  isActive 
                    ? "bg-[#244A38] text-white shadow-md shadow-black/10 font-semibold" 
                    : "text-slate-400 hover:bg-[#244A38]/40 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? "scale-110 text-emerald-400" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-md bg-white/95">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 transition-all duration-300 ease-out">
            {getPageTitle()}
          </h2>

          <div className="flex items-center gap-4">
            {/* User Profile Card Group */}
            <div className="flex items-center gap-3 pl-4 border-slate-200">
              <div className="h-9 w-9 bg-emerald-800 text-white font-semibold rounded-full flex items-center justify-center text-sm shadow-sm ring-2 ring-emerald-800/10">
                {user?.username?.substring(0, 2).toUpperCase() || "AD"}
              </div>
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="text-sm font-semibold text-slate-700 leading-tight">
                  {user?.username || "Admin User"}
                </span>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                  {user?.role || "SUPERVISOR"}
                </span>
              </div>
              
              {/* Sleek Action Logout Button */}
              <button 
                onClick={logout} 
                title="Sign out"
                className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* INNER SCROLLABLE STAGE */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}