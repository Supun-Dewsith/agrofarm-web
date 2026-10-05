import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router";
import { logout, getAuthData, fetchWithAuth } from "./utils/auth";
import { menuItems } from "./utils/constants";
import {
  Sprout,
  LogOut
} from "lucide-react";
import NotificationBell from "./components/NotificationBell";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { Label } from "recharts";
import { useTranslation } from 'react-i18next';


export default function DashboardLayout() {
  const [user, setUser] = useState(() => getAuthData());
  const location = useLocation();
  const LOGO_TEXT = "AgriSense AI";
  const { t } = useTranslation();

  const [profile, setProfile] = useState<{ firstName?: string | null; lastName?: string | null; username?: string; imageUrl?: string } | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("user_profile");
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
    }
    return null;
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const cached = localStorage.getItem("user_profile");
        if (cached) setProfile(JSON.parse(cached));
        setUser(getAuthData());
      } catch {}
    };

    window.addEventListener("user_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    fetchWithAuth("/api/v1/settings/profile")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          localStorage.setItem("user_profile", JSON.stringify(data));
        }
      })
      .catch((err) => console.warn("Could not load user profile in layout:", err));

    return () => {
      window.removeEventListener("user_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const currentPath = location.pathname.split("/").pop();

  const getPageTitle = () => {
    if (!currentPath || currentPath === "home" || location.pathname === "/home/dashboard") {
      return t("Dashboard");
    }

    const currentItem = menuItems.find(item => item.path === location.pathname);
    if (currentItem) {
      return t(currentItem.label);
    }

    const formattedTitle = currentPath
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return t(formattedTitle);
  };

  const userRole = user?.role?.toUpperCase();
  const userPermissions = user?.permissions || [];

  const visibleMenuItems = menuItems.filter(item => {
    if (userRole === "ADMIN") return true;
    return !item.permission || userPermissions.includes(item.permission);
  });

  const currentMenuItem = menuItems.find(item => item.path === location.pathname);

  if (currentMenuItem?.permission && userRole !== "ADMIN") {
    const hasAccess = userPermissions.includes(currentMenuItem.permission);

    // Redirect unauthorized direct access attempts back to dashboard
    if (!hasAccess) {
      return <Navigate to="/home/dashboard" replace />;
    }
  }

  const firstName = (profile?.firstName ?? user?.firstName ?? "").trim();
  const lastName = (profile?.lastName ?? user?.lastName ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const username = (user?.username || profile?.username || "").trim();

  // If first and last name exist show full name; otherwise fallback to username
  const displayName = fullName || username || t("User");

  const avatarUrl = profile?.imageUrl || user?.imageUrl;
  const userInitials = (firstName && lastName)
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : (firstName || username || "AD").slice(0, 2).toUpperCase();

  return (
    <div className="h-screen overflow-hidden flex bg-white text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1b3b2b] text-slate-300 flex flex-col hidden md:flex border-r border-[#244A38]/30">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[#244A38]/50">
          <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
            <Sprout className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-base font-bold text-white tracking-wider uppercase">
            {LOGO_TEXT}
          </span>
        </div>

        <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {visibleMenuItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 tracking-wide ${isActive
                  ? "bg-[#244A38] text-white shadow-md shadow-black/10 font-semibold"
                  : "text-slate-300/80 font-medium hover:bg-[#244A38]/40 hover:text-white"
                  }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? "scale-110 text-emerald-400" : ""}`} />
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
      
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-md bg-white/95">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-wide text-emerald-900 uppercase">
            {getPageTitle()}
          </h2>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile Card Group */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200/80">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-9 w-9 rounded-full object-cover shadow-sm ring-2 ring-emerald-900/20 border border-white"
                  onError={(e) => {
                    // Fallback if the image URL fails to resolve or 404s
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}

              {/* Initials fallback (displayed if no imageUrl exists or if the image fails to load) */}
              <div
                className={`h-9 w-9 bg-emerald-900 text-white font-bold rounded-full flex items-center justify-center text-xs tracking-wider shadow-sm ring-2 ring-emerald-900/10 ${avatarUrl ? "hidden" : ""
                  }`}
              >
                {userInitials}
              </div>
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="text-sm font-semibold text-slate-800 leading-none">
                  {displayName}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-emerald-700/80 uppercase mt-1">
                  {user?.role || t("SUPERVISOR")}
                </span>
              </div>

              {/* Sleek Action Logout Button */}
              <button
                onClick={logout}
                title={t("Sign out")}
                className="ml-1 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* INNER SCROLLABLE STAGE */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className=" mx-auto">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}