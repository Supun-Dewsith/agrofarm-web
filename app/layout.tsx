import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router";
import { logout, getAuthData, fetchWithAuth } from "./utils/auth";
import { menuItems } from "./utils/constants";
import {
  Menu,
  X,
  Sprout,
  LogOut
} from "lucide-react";
import NotificationBell from "./components/NotificationBell";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { Label } from "recharts";
import { useTranslation } from 'react-i18next';


export default function DashboardLayout() {
  const [user, setUser] = useState(() => getAuthData());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const LOGO_TEXT = "AgriSense AI";
  const { t } = useTranslation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          const data = (await res.json()) as { firstName?: string | null; lastName?: string | null; username?: string; imageUrl?: string };
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

    if (currentPath === "farmers") {
      return t("Workers");
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

      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-[#1b3b2b] text-slate-300 flex flex-col hidden md:flex border-r border-[#244A38]/30">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[#244A38]/50">
          <img src="/logo.png" alt="AgriSense AI Logo" className="h-8 w-8 object-contain rounded-lg" />
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

      {/* MOBILE DRAWER BACKDROP & SLIDE-OVER */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <aside
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#1b3b2b] text-slate-300 flex flex-col shadow-2xl border-r border-[#244A38]/50 z-50 transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Top Header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-[#244A38]/50">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AgriSense AI Logo" className="h-8 w-8 object-contain rounded-lg" />
              <span className="text-base font-bold text-white tracking-wider uppercase">
                {LOGO_TEXT}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#244A38] transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User profile card inside mobile drawer */}
          <div className="p-3.5 mx-3 my-3 rounded-2xl bg-[#244A38]/50 border border-[#244A38]/80 flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-emerald-400/40 border border-white shrink-0"
              />
            ) : (
              <div className="h-10 w-10 bg-emerald-600 text-white font-bold rounded-full flex items-center justify-center text-sm shadow-sm shrink-0">
                {userInitials}
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-white truncate">
                {displayName}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mt-0.5 truncate">
                {user?.role || t("SUPERVISOR")}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar pb-3">
            {visibleMenuItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 tracking-wide ${
                    isActive
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

          {/* Mobile Drawer Footer with Logout */}
          <div className="p-3 border-t border-[#244A38]/50">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t("Sign out")}
            </button>
          </div>
        </aside>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
      
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-6 md:px-8 sticky top-0 z-10 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-emerald-900 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="h-6 w-6" />
            </button>

            <h2 className="text-base sm:text-xl font-bold tracking-wide text-emerald-950 uppercase truncate">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile Card Group */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200/80">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover shadow-sm ring-2 ring-emerald-900/20 border border-white"
                  onError={(e) => {
                    // Fallback if the image URL fails to resolve or 404s
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}

              {/* Initials fallback (displayed if no imageUrl exists or if the image fails to load) */}
              <div
                className={`h-8 w-8 sm:h-9 sm:w-9 bg-emerald-900 text-white font-bold rounded-full flex items-center justify-center text-xs tracking-wider shadow-sm ring-2 ring-emerald-900/10 ${avatarUrl ? "hidden" : ""
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
                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* INNER SCROLLABLE STAGE */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}